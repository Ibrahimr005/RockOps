import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import "./ProcurementRequestOrder.scss";
import procurementImage from "../../../assets/imgs/pro_icon.png";
import procurementImageDark from "../../../assets/imgs/pro_icon_dark.png";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx"
import IncomingRequestOrders from './IncomingRequests/IncomingRequestOrders';
import ApprovedRequestOrders from './ApprovedRequests/ApprovedRequestOrders';
import ProcurementIntroCard from '../../../components/procurement//ProcurementIntroCard';
import PageHeader from '../../../components/common/PageHeader/PageHeader';

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

    // Get the appropriate image based on theme
    const currentProcurementImage = theme === 'dark' ? procurementImageDark : procurementImage;

    useEffect(() => {
        fetchRequestOrders();
    }, []);

    const fetchRequestOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/requestOrders', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load request orders');
            }

            const data = await response.json();
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

    // Prepare stats data for the intro card
    const statsData = [
        {
            value: requestOrders.filter(order => order.status === 'PENDING').length,
            label: 'Pending Requests'
        },
        {
            value: requestOrders.filter(order => order.status === 'APPROVED').length,
            label: 'Approved Requests'
        }
    ];

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
            {/* Intro Card using the new component */}
            <ProcurementIntroCard
                title="Request Orders"
                label="PROCUREMENT CENTER"
                lightModeImage={procurementImage}
                darkModeImage={procurementImageDark}
                stats={statsData}
                onInfoClick={handleInfoClick}
            />

            {/* Tabs Navigation */}
            <div className="pro-ro-procurement-tabs">
                <button
                    className={`pro-ro-procurement-tab ${activeTab === 'incoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('incoming')}
                >
                    Incoming Requests
                </button>
                <button
                    className={`pro-ro-procurement-tab ${activeTab === 'approved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approved')}
                >
                    Approved Requests
                </button>
            </div>

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