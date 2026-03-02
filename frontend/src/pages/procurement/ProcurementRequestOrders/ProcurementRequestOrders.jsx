import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { ROLES } from '../../../utils/roles.js';
import "./ProcurementRequestOrder.scss";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx"
import DraftRequestOrders from './DraftRequests/DraftRequestOrders.jsx';
import IncomingRequestOrders from './IncomingRequests/IncomingRequestOrders.jsx';
import ApprovedRequestOrders from './ApprovedRequests/ApprovedRequestOrders.jsx';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Tabs from "../../../components/common/Tabs/Tabs.jsx"
import { requestOrderService } from '../../../services/procurement/requestOrderService.js';

const ProcurementRequestOrders = ({ onEdit, onDelete }) => {
    const { theme } = useTheme();
    const { currentUser } = useAuth();
    const [requestOrders, setRequestOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Check if user is EQUIPMENT_MANAGER (should only see EQUIPMENT requests)
    const isEquipmentManager = useMemo(() => {
        if (!currentUser) return false;
        const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
        return userRoles.includes(ROLES.EQUIPMENT_MANAGER) && !userRoles.includes(ROLES.ADMIN) && !userRoles.includes(ROLES.PROCUREMENT);
    }, [currentUser]);

    // Tab state
    const [activeTab, setActiveTab] = useState('incoming'); // 'drafts', 'incoming', or 'approved'

    useEffect(() => {
        fetchRequestOrders();
    }, []);

    const fetchRequestOrders = async () => {
        try {
            setLoading(true);
            const data = await requestOrderService.getAll();
            setRequestOrders(data);
            setError(null);
        } catch (err) {
            setError('Failed to load request orders.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Apply role-based filtering: EQUIPMENT_MANAGER only sees EQUIPMENT orders
    const filteredOrders = useMemo(() => {
        if (isEquipmentManager) {
            return requestOrders.filter(order => order.partyType === 'EQUIPMENT');
        }
        return requestOrders;
    }, [requestOrders, isEquipmentManager]);

    const draftOrders = useMemo(() =>
        filteredOrders.filter(order => order.status === 'DRAFT'),
        [filteredOrders]
    );

    const pendingOrders = useMemo(() =>
        filteredOrders.filter(order => order.status === 'PENDING'),
        [filteredOrders]
    );

    const approvedOrders = useMemo(() =>
        filteredOrders.filter(order => order.status === 'APPROVED'),
        [filteredOrders]
    );

    return (
        <div className="pro-ro-procurement-requests-container">
            <PageHeader
                title="Request Orders"
                subtitle="Create, manage, and approve procurement request orders across your organization"
            />

            <Tabs
                tabs={[
                    {
                        id: 'drafts',
                        label: 'Draft Requests',
                        badge: draftOrders.length
                    },
                    {
                        id: 'incoming',
                        label: 'Incoming Requests',
                        badge: pendingOrders.length
                    },
                    {
                        id: 'approved',
                        label: 'Approved Requests'
                    }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Table Container with Theme Support */}
            <div className="pro-ro-table-container">
                {/* Conditionally render the appropriate table based on active tab */}
                {activeTab === 'drafts' ? (
                    <DraftRequestOrders
                        onDataChange={fetchRequestOrders}
                        requestOrders={draftOrders}
                        loading={loading}
                    />
                ) : activeTab === 'incoming' ? (
                    <IncomingRequestOrders
                        onDataChange={fetchRequestOrders}
                        requestOrders={pendingOrders}
                        loading={loading}
                    />
                ) : (
                    <ApprovedRequestOrders
                        onDataChange={fetchRequestOrders}
                        requestOrders={approvedOrders}
                        loading={loading}
                    />
                )}
            </div>

            {/* Notification */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default ProcurementRequestOrders;