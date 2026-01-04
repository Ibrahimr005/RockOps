import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiFileText, FiAlertCircle } from 'react-icons/fi';
import { requestOrderService } from '../../../services/procurement/requestOrderService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2';
import './RequestOrderDetailsPage.scss';

const RequestOrderDetailsPage = () => {
    const { requestOrderId, id: warehouseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [requestOrder, setRequestOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Snackbar
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Determine if coming from warehouse or procurement
    const isFromWarehouse = location.pathname.includes('/warehouses/');

    useEffect(() => {
        fetchRequestOrderData();
    }, [requestOrderId]);

    const fetchRequestOrderData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await requestOrderService.getById(requestOrderId);
            setRequestOrder(data);
        } catch (err) {
            console.error('Error fetching request order:', err);
            console.error('Full error:', JSON.stringify(err.response?.data, null, 2));

            if (err.response) {
                console.error('Error response data:', err.response.data);
                console.error('Error response status:', err.response.status);
                console.error('Error response headers:', err.response.headers);

                setError(`Failed to load request order: ${err.response.data?.message || err.response.statusText || 'Server error'}`);
            } else if (err.request) {
                console.error('Error request:', err.request);
                setError('No response received from server. Please check your connection.');
            } else {
                console.error('Error message:', err.message);
                setError(`Error: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getStatusDisplay = (status) => {
        const displayMap = {
            'PENDING': 'Pending',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled'
        };
        return displayMap[status] || status;
    };

    // Get item name
    const getItemName = (item) => {
        return item.itemType?.name || item.itemTypeName || "Unknown Item";
    };

    // Get item category
    const getItemCategory = (item) => {
        // Log the item structure to debug
        console.log('Item structure:', item);
        console.log('Item type:', item.itemType);
        console.log('Item category from itemType:', item.itemType?.itemCategory);

        // Try different possible paths
        const category =
            item.itemType?.itemCategory?.name ||
            item.itemType?.itemCategoryName ||
            item.itemCategory?.name ||
            item.itemCategoryName ||
            null;

        console.log('Resolved category:', category);
        return category;
    };

    // Get measuring unit
    const getMeasuringUnit = (item) => {
        return item.itemType?.measuringUnit || item.measuringUnit || 'units';
    };

    // Format quantity
    const formatQuantity = (item) => {
        const unit = getMeasuringUnit(item);
        const quantity = item.quantity || 0;
        return `${quantity} ${unit}`;
    };

    if (isLoading) {
        return (
            <div className="ro-details-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading request order...</p>
                </div>
            </div>
        );
    }

    if (error || !requestOrder) {
        return (
            <div className="ro-details-page">
                <div className="error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading Request Order</h3>
                    <p>{error || 'Request order not found'}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Build breadcrumbs based on source
    const breadcrumbs = isFromWarehouse ? [
        { label: 'Warehouses', onClick: () => navigate('/warehouses') },
        { label: requestOrder.requesterName, onClick: () => navigate(`/warehouses/${warehouseId}`) },
        { label: requestOrder.title }
    ] : [
        { label: 'Procurement', onClick: () => navigate('/procurement') },
        { label: 'Request Orders', onClick: () => navigate('/procurement/request-orders') },
        { label: requestOrder.title }
    ];

    const stats = [
        {
            value: formatDate(requestOrder.createdAt),
            label: 'Created'
        },
        {
            value: (requestOrder.requestItems || requestOrder.items || []).length,
            label: 'Total Items'
        },
        {
            value: formatDate(requestOrder.deadline),
            label: 'Deadline'
        }
    ];

    return (
        <div className="ro-details-page">
            {/* IntroCard Header */}
            <IntroCard
                title={requestOrder.title}
                label={getStatusDisplay(requestOrder.status)}
                breadcrumbs={breadcrumbs}
                icon={<FiFileText />}
                stats={stats}
            />

            {/* Main Content */}
            <div className="ro-details-content">
                {/* Request Order Overview Section */}
                <div className="ro-details-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        Request Order Details
                    </h3>
                    <div className="overview-grid">
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Title</span>
                                <span className="overview-value">{requestOrder.title || 'N/A'}</span>
                            </div>
                        </div>

                        {requestOrder.deadline && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Deadline</span>
                                    <span className="overview-value">{formatDateTime(requestOrder.deadline)}</span>
                                </div>
                            </div>
                        )}

                        {requestOrder.createdAt && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Created At</span>
                                    <span className="overview-value">{formatDateTime(requestOrder.createdAt)}</span>
                                </div>
                            </div>
                        )}

                        {requestOrder.createdBy && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Created By</span>
                                    <span className="overview-value">{requestOrder.createdBy}</span>
                                </div>
                            </div>
                        )}

                        {requestOrder.employeeRequestedBy && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Requested By Employee</span>
                                    <span className="overview-value">{requestOrder.employeeRequestedBy}</span>
                                </div>
                            </div>
                        )}

                        {requestOrder.partyType && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Party Type</span>
                                    <span className="overview-value">{requestOrder.partyType}</span>
                                </div>
                            </div>
                        )}

                        {requestOrder.requesterName && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Requester</span>
                                    <span className="overview-value">{requestOrder.requesterName}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description Section */}
                {requestOrder.description && (
                    <div className="ro-details-section">
                        <h3 className="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            Description
                        </h3>
                        <div className="description-box">
                            <p className="description-text">{requestOrder.description}</p>
                        </div>
                    </div>
                )}

                {/* Request Items Section */}
                <div className="ro-details-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        Request Items ({(requestOrder.requestItems || requestOrder.items || []).length})
                    </h3>

                    {(requestOrder.requestItems || requestOrder.items || []).length > 0 ? (
                        <div className="items-grid">
                            {(requestOrder.requestItems || requestOrder.items || []).map((item, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-header">
                                        <div className="item-icon-container">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                                            </svg>
                                        </div>
                                        <div className="item-title-container">
                                            <div className="item-name">{getItemName(item)}</div>
                                            {getItemCategory(item) && (
                                                <div className="item-category">{getItemCategory(item)}</div>
                                            )}
                                        </div>
                                        <div className="item-quantity">{formatQuantity(item)}</div>
                                    </div>

                                    {item.comment && (
                                        <>
                                            <div className="item-divider"></div>
                                            <div className="item-comment">
                                                <div className="item-comment-label">Comment</div>
                                                <div className="item-comment-text">{item.comment}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 12h8"/>
                                </svg>
                            </div>
                            <div className="empty-content">
                                <p className="empty-title">No items found</p>
                                <p className="empty-description">This request order doesn't contain any items.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Approval Details */}
                {(requestOrder.approvedBy || requestOrder.validatedBy || requestOrder.approvedAt || requestOrder.validatedDate) && (
                    <div className="ro-details-section">
                        <h3 className="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Approval Details
                        </h3>
                        <div className="overview-grid">
                            {(requestOrder.approvedBy || requestOrder.validatedBy) && (
                                <div className="overview-item">
                                    <div className="overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="overview-content">
                                        <span className="overview-label">Approved By</span>
                                        <span className="overview-value">{requestOrder.approvedBy || requestOrder.validatedBy}</span>
                                    </div>
                                </div>
                            )}
                            {(requestOrder.approvedAt || requestOrder.validatedDate) && (
                                <div className="overview-item">
                                    <div className="overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="overview-content">
                                        <span className="overview-label">Approved At</span>
                                        <span className="overview-value">{formatDateTime(requestOrder.approvedAt || requestOrder.validatedDate)}</span>
                                    </div>
                                </div>
                            )}
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

export default RequestOrderDetailsPage;