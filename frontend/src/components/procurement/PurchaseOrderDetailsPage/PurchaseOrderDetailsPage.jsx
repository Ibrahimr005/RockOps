import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiPackage, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { purchaseOrderService } from '../../../services/procurement/purchaseOrderService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2';
import OverviewTab from './tabs/OverviewTab/OverviewTab';
import ReceivingTab from './tabs/ReceivingTab/ReceivingTab2';
import IssuesTab from './tabs/IssuesTab/IssuesTab';
import './PurchaseOrderDetailsPage.scss';

const PurchaseOrderDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [issues, setIssues] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');
    const [activeTab, setActiveTab] = useState('overview');

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
    const breadcrumbs = [
        { label: 'Warehouse', onClick: () => navigate('/warehouse') },
        { label: 'Purchase Orders', onClick: () => navigate(-1) },
        { label: `PO #${purchaseOrder.poNumber}` }
    ];

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
            <div className="po-tabs">
                <button
                    className={`po-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overview')}
                >
                    <FiPackage />
                    <span>Overview</span>
                </button>

                <button
                    className={`po-tab ${activeTab === 'receiving' ? 'active' : ''}`}
                    onClick={() => handleTabChange('receiving')}
                >
                    <FiCheckCircle />
                    <span>Receiving</span>
                    {(() => {
                        const pendingCount = purchaseOrder.purchaseOrderItems?.filter(item =>
                            item.status === 'PENDING' || item.status === 'PARTIAL'
                        ).length || 0;

                        return pendingCount > 0 && (
                            <span className="tab-badge">{pendingCount}</span>
                        );
                    })()}
                </button>

                <button
                    className={`po-tab ${activeTab === 'issues' ? 'active' : ''}`}
                    onClick={() => handleTabChange('issues')}
                >
                    <FiAlertCircle />
                    <span>Issues</span>
                    {unresolvedIssuesCount > 0 && (
                        <span className="tab-badge">{unresolvedIssuesCount}</span>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="po-tab-content">
                {activeTab === 'overview' && (
                    <OverviewTab purchaseOrder={purchaseOrder} />
                )}
                {activeTab === 'receiving' && (
                    <ReceivingTab
                        purchaseOrder={purchaseOrder}
                        onSuccess={handleDeliveryProcessed}
                        onError={(msg) => showSnackbar(msg, 'error')}
                    />
                )}
                {activeTab === 'issues' && (
                    <IssuesTab
                        purchaseOrder={purchaseOrder}
                        issues={issues}
                        onRefresh={fetchPurchaseOrderData}
                        onResolveSuccess={handleIssuesResolved}
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