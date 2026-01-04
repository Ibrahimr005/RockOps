import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
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
    const [requestOrders, setRequestOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');


    // Tab state
    const [activeTab, setActiveTab] = useState('drafts'); // 'drafts', 'incoming', or 'approved'

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

    const draftOrders = useMemo(() =>
            requestOrders.filter(order => order.status === 'DRAFT'),
        [requestOrders]
    );

    const pendingOrders = useMemo(() =>
            requestOrders.filter(order => order.status === 'PENDING'),
        [requestOrders]
    );

    const approvedOrders = useMemo(() =>
            requestOrders.filter(order => order.status === 'APPROVED'),
        [requestOrders]
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