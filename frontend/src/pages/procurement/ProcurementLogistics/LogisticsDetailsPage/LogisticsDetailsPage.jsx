import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiTruck, FiAlertCircle, FiPackage, FiDollarSign } from 'react-icons/fi';
import { logisticsService } from '../../../../services/procurement/logisticsService';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../../components/common/Snackbar2/Snackbar2';
import './LogisticsDetailsPage.scss';

const LogisticsDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [logistics, setLogistics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchLogisticsData();
    }, [id]);

    const fetchLogisticsData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await logisticsService.getById(id);
            setLogistics(data);
        } catch (err) {
            console.error('Error fetching logistics:', err);
            setError('Failed to load logistics details.');
        } finally {
            setIsLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    if (isLoading) {
        return (
            <div className="logistics-details-page">
                <div className="logistics-details-loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading logistics details...</p>
                </div>
            </div>
        );
    }

    if (error || !logistics) {
        return (
            <div className="logistics-details-page">
                <div className="logistics-details-error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading Logistics</h3>
                    <p>{error || 'Logistics entry not found'}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING_APPROVAL': 'Pending Approval',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected',
            'PAID': 'Paid'
        };
        return displayMap[status] || status;
    };

    const breadcrumbs = [
        { label: 'Logistics', onClick: () => navigate('/procurement/logistics') },
        { label: logistics.logisticsNumber }
    ];

    const stats = [
        {
            value: formatDate(logistics.createdAt),
            label: 'Created'
        },
        {
            value: logistics.purchaseOrders?.length || 0,
            label: 'Purchase Orders'
        },
        {
            value: `${logistics.currency} ${parseFloat(logistics.totalCost).toFixed(2)}`,
            label: 'Total Cost'
        }
    ];

    return (
        <div className="logistics-details-page">
            {/* IntroCard Header */}
            <IntroCard
                title={logistics.logisticsNumber}
                label={getStatusDisplay(logistics.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiTruck />}
                stats={stats}
            />

            {/* Overview Content */}
            <div className="logistics-details-overview-tab">
                {/* Basic Information Section */}
                <div className="logistics-details-section">
                    <div className="logistics-details-section-title">
                        <FiTruck />
                        Basic Information
                    </div>

                    <div className="logistics-details-grid">
                        <div className="logistics-details-item">
                            <div className="logistics-details-icon">
                                <FiPackage />
                            </div>
                            <div className="logistics-details-content">
                                <div className="logistics-details-label">Service Provider</div>
                                <div className="logistics-details-value">{logistics.merchantName}</div>
                            </div>
                        </div>

                        <div className="logistics-details-item">
                            <div className="logistics-details-icon">
                                <FiTruck />
                            </div>
                            <div className="logistics-details-content">
                                <div className="logistics-details-label">Carrier Company</div>
                                <div className="logistics-details-value">{logistics.carrierCompany}</div>
                            </div>
                        </div>

                        <div className="logistics-details-item">
                            <div className="logistics-details-icon">
                                <FiPackage />
                            </div>
                            <div className="logistics-details-content">
                                <div className="logistics-details-label">Driver Name</div>
                                <div className="logistics-details-value">{logistics.driverName}</div>
                            </div>
                        </div>

                        {logistics.driverPhone && (
                            <div className="logistics-details-item">
                                <div className="logistics-details-icon">
                                    <FiPackage />
                                </div>
                                <div className="logistics-details-content">
                                    <div className="logistics-details-label">Driver Phone</div>
                                    <div className="logistics-details-value">{logistics.driverPhone}</div>
                                </div>
                            </div>
                        )}

                        <div className="logistics-details-item">
                            <div className="logistics-details-icon">
                                <FiDollarSign />
                            </div>
                            <div className="logistics-details-content">
                                <div className="logistics-details-label">Total Cost</div>
                                <div className="logistics-details-value">
                                    {logistics.currency} {parseFloat(logistics.totalCost).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="logistics-details-item">
                            <div className="logistics-details-icon">
                                <FiPackage />
                            </div>
                            <div className="logistics-details-content">
                                <div className="logistics-details-label">Created By</div>
                                <div className="logistics-details-value">{logistics.createdBy}</div>
                            </div>
                        </div>

                        {logistics.approvedBy && (
                            <div className="logistics-details-item">
                                <div className="logistics-details-icon">
                                    <FiPackage />
                                </div>
                                <div className="logistics-details-content">
                                    <div className="logistics-details-label">Approved By</div>
                                    <div className="logistics-details-value">{logistics.approvedBy}</div>
                                </div>
                            </div>
                        )}

                        {logistics.approvedAt && (
                            <div className="logistics-details-item">
                                <div className="logistics-details-icon">
                                    <FiPackage />
                                </div>
                                <div className="logistics-details-content">
                                    <div className="logistics-details-label">Approved Date</div>
                                    <div className="logistics-details-value">{formatDate(logistics.approvedAt)}</div>
                                </div>
                            </div>
                        )}

                        {logistics.rejectedBy && (
                            <div className="logistics-details-item">
                                <div className="logistics-details-icon">
                                    <FiPackage />
                                </div>
                                <div className="logistics-details-content">
                                    <div className="logistics-details-label">Rejected By</div>
                                    <div className="logistics-details-value">{logistics.rejectedBy}</div>
                                </div>
                            </div>
                        )}

                        {logistics.rejectedAt && (
                            <div className="logistics-details-item">
                                <div className="logistics-details-icon">
                                    <FiPackage />
                                </div>
                                <div className="logistics-details-content">
                                    <div className="logistics-details-label">Rejected Date</div>
                                    <div className="logistics-details-value">{formatDate(logistics.rejectedAt)}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {logistics.notes && (
                        <div className="logistics-details-notes">
                            <div className="logistics-details-notes-label">Notes</div>
                            <div className="logistics-details-notes-text">{logistics.notes}</div>
                        </div>
                    )}
                </div>

                {/* Purchase Orders Section */}
                {logistics.purchaseOrders && logistics.purchaseOrders.length > 0 && (
                    <div className="logistics-details-section">
                        <div className="logistics-details-section-title">
                            <FiPackage />
                            Purchase Orders ({logistics.purchaseOrders.length})
                        </div>

                        <div className="logistics-details-po-grid">
                            {logistics.purchaseOrders.map((po) => (
                                <div key={po.purchaseOrderId} className="logistics-details-po-card">
                                    <div className="logistics-details-po-header">
                                        <div className="logistics-details-po-number">{po.poNumber}</div>
                                        <div className="logistics-details-po-cost">
                                            {logistics.currency} {parseFloat(po.allocatedCost).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="logistics-details-po-body">
                                        <div className="logistics-details-po-meta">
                                            <span className="logistics-details-po-meta-label">Cost Percentage:</span>
                                            <span className="logistics-details-po-meta-value">
                                                {parseFloat(po.costPercentage).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="logistics-details-po-meta">
                                            <span className="logistics-details-po-meta-label">Items Value:</span>
                                            <span className="logistics-details-po-meta-value">
                                                {logistics.currency} {parseFloat(po.totalItemsValue).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    {po.items && po.items.length > 0 && (
                                        <div className="logistics-details-po-items">
                                            <div className="logistics-details-po-items-title">
                                                Items ({po.items.length})
                                            </div>
                                            <div className="logistics-details-items-list-wrapper">
                                                <div className="logistics-details-items-list">
                                                    {po.items.map((item) => (
                                                        <div key={item.purchaseOrderItemId} className="logistics-details-item-tag">
                                                            <div className="logistics-details-item-main">
                                                                <FiPackage size={14} />
                                                                <span className="logistics-details-item-name">{item.itemTypeName}</span>
                                                            </div>
                                                            <div className="logistics-details-item-details">
                            <span className="logistics-details-item-qty">
                                {item.quantity} {item.measuringUnit}
                            </span>
                                                                <span className="logistics-details-item-separator">•</span>
                                                                <span className="logistics-details-item-price">
                                {logistics.currency} {parseFloat(item.unitPrice).toFixed(2)}/unit
                            </span>
                                                                <span className="logistics-details-item-separator">•</span>
                                                                <span className="logistics-details-item-total">
                                Total: {logistics.currency} {parseFloat(item.totalValue).toFixed(2)}
                            </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}                                </div>
                            ))}
                        </div>
                    </div>
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

export default LogisticsDetailsPage;