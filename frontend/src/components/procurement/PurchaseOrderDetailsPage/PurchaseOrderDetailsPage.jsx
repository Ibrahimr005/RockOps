import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiPackage, FiAlertCircle, FiCheckCircle, FiTruck } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2';
import Tabs from '../../../components/common/Tabs/Tabs'; // Add this import
import OverviewTab from './tabs/OverviewTab/OverviewTab';
import ReceivingTab from './tabs/ReceivingTab/ReceivingTab2';
import IssuesTab from './tabs/IssuesTab/IssuesTab';
import LogisticsTab from './tabs/LogisticsTab/LogisticsTab';

import './PurchaseOrderDetailsPage.scss';

const PurchaseOrderDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [issues, setIssues] = useState([]);
    const [userRole, setUserRole] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');
    const [activeTab, setActiveTab] = useState('overview');
    const fromState = location.state?.from;

    // Get user role
    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
        console.log("role is:" + userRole);
    }, []);

    // Add this useEffect to handle the initial tab from navigation state
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    useEffect(() => {
        fetchPurchaseOrderData();
    }, [id]);

    const fetchPurchaseOrderData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch PO with full delivery history (includes issues)
            const poData = await purchaseOrderService.getWithDeliveries(id);
            setPurchaseOrder(poData);

            // Extract all issues from all items' receipts
            const allIssues = [];
            if (poData.purchaseOrderItems) {
                poData.purchaseOrderItems.forEach(item => {
                    if (item.itemReceipts) {
                        item.itemReceipts.forEach(receipt => {
                            if (receipt.issues) {
                                allIssues.push(...receipt.issues);
                            }
                        });
                    }
                });
            }
            setIssues(allIssues);

        } catch (err) {
            console.error('Error fetching purchase order:', err);
            setError('Failed to load purchase order details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleDeliveryProcessed = () => {
        showSnackbar('Delivery processed successfully!', 'success');
        fetchPurchaseOrderData(); // Refresh data
    };

    const handleIssuesResolved = (resolvedCount, remainingCount) => {
        if (remainingCount > 0) {
            showSnackbar(
                `Successfully resolved ${resolvedCount} issue${resolvedCount !== 1 ? 's' : ''}. ${remainingCount} issue${remainingCount !== 1 ? 's' : ''} remaining.`,
                'success'
            );
        } else {
            showSnackbar(
                `Successfully resolved all ${resolvedCount} issue${resolvedCount !== 1 ? 's' : ''}`,
                'success'
            );
        }
        fetchPurchaseOrderData(); // Refresh data
    };

    if (isLoading) {
        return (
            <div className="po-details-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading purchase order...</p>
                </div>
            </div>
        );
    }

    if (error || !purchaseOrder) {
        return (
            <div className="po-details-page">
                <div className="error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading Purchase Order</h3>
                    <p>{error || 'Purchase order not found'}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Count unresolved issues
    const unresolvedIssuesCount = issues.filter(issue => issue.issueStatus === 'REPORTED').length;

    // Count pending items for receiving tab badge
    const pendingCount = purchaseOrder.purchaseOrderItems?.filter(item =>
        item.status === 'PENDING' || item.status === 'PARTIAL'
    ).length || 0;

    // Helper functions
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING': 'Pending',
            'PARTIAL': 'Partially Received',
            'DISPUTED': 'Disputed',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled'
        };
        return displayMap[status] || status;
    };

    // IntroCard props
    const breadcrumbs = (() => {
        if (fromState === 'warehouse') {
            const warehouseId = location.state?.warehouseId;
            const warehouseName = location.state?.warehouseName || 'Warehouse';

            return [
                { label: 'Warehouses', onClick: () => navigate('/warehouses') },
                { label: warehouseName, onClick: () => navigate(`/warehouses/${warehouseId}`) },
                { label: `PO #${purchaseOrder.poNumber}` }
            ];
        } else {
            // Default to procurement breadcrumbs
            return [
                { label: 'Purchase Orders', onClick: () => navigate('/procurement/purchase-orders') },
                { label: `PO #${purchaseOrder.poNumber}` }
            ];
        }
    })();

    const stats = [
        {
            value: formatDate(purchaseOrder.createdAt),
            label: 'Created'
        },
        {
            value: purchaseOrder.purchaseOrderItems?.length || 0,
            label: 'Total Items'
        },
        {
            value: `${purchaseOrder.currency || 'EGP'} ${parseFloat(purchaseOrder.totalAmount || 0).toFixed(2)}`,
            label: 'Total Amount'
        }
    ];

    // Build tabs array based on user role
// In the getTabs function, add the Logistics tab after the Issues tab:
    const getTabs = () => {
        const tabs = [
            {
                id: 'overview',
                label: 'Overview',
                icon: <FiPackage />
            }
        ];

        // Add Receiving tab for WAREHOUSE_MANAGER, WAREHOUSE_EMPLOYEE, or ADMIN
        if (userRole === 'WAREHOUSE_MANAGER' || userRole === 'WAREHOUSE_EMPLOYEE' || userRole === 'ADMIN') {
            tabs.push({
                id: 'receiving',
                label: 'Receiving',
                icon: <FiCheckCircle />,
                badge: pendingCount
            });
        }

        // Add Issues tab for PROCUREMENT or ADMIN
        if (userRole === 'PROCUREMENT' || userRole === 'ADMIN') {
            tabs.push({
                id: 'issues',
                label: 'Issues',
                icon: <FiAlertCircle />,
                badge: unresolvedIssuesCount
            });
        }

        // ADD THIS: Logistics tab for PROCUREMENT or ADMIN
        if (userRole === 'PROCUREMENT' || userRole === 'ADMIN') {
            tabs.push({
                id: 'logistics',
                label: 'Logistics',
                icon: <FiTruck />
            });
        }

        return tabs;
    };

// In the tab content section, add this after the Issues tab:


    return (
        <div className="po-details-page">
            {/* IntroCard Header */}
            <IntroCard
                title={`PO #${purchaseOrder.poNumber}`}
                label={getStatusDisplay(purchaseOrder.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiPackage />}
                stats={stats}
            />

            {/* Tabs */}
            <Tabs
                tabs={getTabs()}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Tab Content */}
            <div className="po-tab-content">
                {activeTab === 'overview' && (
                    <OverviewTab purchaseOrder={purchaseOrder} />
                )}
                {activeTab === 'receiving' && (userRole === 'WAREHOUSE_MANAGER' || userRole === 'WAREHOUSE_EMPLOYEE' || userRole === 'ADMIN') && (
                    <ReceivingTab
                        purchaseOrder={purchaseOrder}
                        onSuccess={handleDeliveryProcessed}
                        onError={(msg) => showSnackbar(msg, 'error')}
                    />
                )}
                {activeTab === 'issues' && (userRole === 'PROCUREMENT' || userRole === 'ADMIN') && (
                    <IssuesTab
                        purchaseOrder={purchaseOrder}
                        issues={issues}
                        onRefresh={fetchPurchaseOrderData}
                        onResolveSuccess={handleIssuesResolved}
                        onError={(msg) => showSnackbar(msg, 'error')}
                    />
                )}

                {activeTab === 'logistics' && (userRole === 'PROCUREMENT' || userRole === 'ADMIN') && (
                    <LogisticsTab
                        purchaseOrder={purchaseOrder}
                        onSuccess={(msg) => showSnackbar(msg, 'success')}
                        onError={(msg) => showSnackbar(msg, 'error')}
                    />
                )}
            </div>

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

export default PurchaseOrderDetailsPage;