import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import "./ProcurementRequestOrder.scss";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx"
import IncomingRequestOrders from './IncomingRequests/IncomingRequestOrders';
import ApprovedRequestOrders from './ApprovedRequests/ApprovedRequestOrders';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Tabs from "../../../components/common/Tabs/Tabs.jsx"
import { requestOrderService } from '../../../services/procurement/requestOrderService.js';

const ProcurementRequestOrders = ({ onEdit, onDelete }) => {
    const { theme } = useTheme(); // Use the same theme context as Sidebar
    const [requestOrders, setRequestOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Tab state
    const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' or 'approved'

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

    const handleInfoClick = () => {
        // Handle info button click - you can customize this
        console.log('Info button clicked');
    };

    const pendingOrders = useMemo(() =>
            requestOrders.filter(order => order.status === 'PENDING'),
        [requestOrders]
    );

    const approvedOrders = useMemo(() =>
            requestOrders.filter(order => order.status === 'APPROVED'),
        [requestOrders]
    );

    // Prepare stats data for the intro card
    const statsData = [
        {
            value: pendingOrders.length,
            label: 'Pending Requests'
        },
        {
            value: approvedOrders.length,
            label: 'Approved Requests'
        }
    ];

    return (
        <div className="pro-ro-procurement-requests-container">
            <PageHeader
                title="Request Orders"
                subtitle="Create, manage, and approve procurement request orders across your organization"
            />

            <Tabs
                tabs={[
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
                {activeTab === 'incoming' ? (
                    <IncomingRequestOrders
                        onDataChange={fetchRequestOrders}
                        requestOrders={pendingOrders}  // Use memoized data
                        loading={loading}
                    />
                ) : (
                    <ApprovedRequestOrders
                        onDataChange={fetchRequestOrders}
                        requestOrders={approvedOrders}  // Use memoized data
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