import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiChevronLeft,
    FiCalendar,
    FiUser,
    FiDollarSign,
    FiClock,
    FiFileText,
    FiPackage,
    FiTruck,
    FiCheckCircle,
    FiXCircle,
    FiAlertCircle,
    FiMoreVertical,
    FiDownload,
    FiEdit3,
    FiMail
} from 'react-icons/fi';
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './PurchaseOrderDetails.scss';

const PurchaseOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showActions, setShowActions] = useState(false);

    // Define your API URL based on your project setup
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

    useEffect(() => {
        fetchPurchaseOrderDetails();
    }, [id]);

    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        };

        const response = await fetch(url, { ...defaultOptions, ...options });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
    };

    const fetchPurchaseOrderDetails = async () => {
        try {
            setLoading(true);
            const data = await fetchWithAuth(`${API_URL}/purchaseOrders/purchase-orders/${id}`);
            setPurchaseOrder(data);
        } catch (err) {
            console.error('Error fetching purchase order details:', err);
            setError('Failed to load purchase order details. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount, currency = 'USD') => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'approved':
            case 'accepted':
                return <FiCheckCircle />;
            case 'cancelled':
            case 'rejected':
                return <FiXCircle />;
            case 'pending':
            case 'created':
                return <FiAlertCircle />;
            default:
                return <FiClock />;
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await fetchWithAuth(
                `${API_URL}/purchaseOrders/purchase-orders/${id}/status?status=${newStatus}`,
                {
                    method: 'PUT'
                }
            );
            fetchPurchaseOrderDetails();
        } catch (err) {
            console.error('Error updating purchase order status:', err);
            setError('Failed to update status. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="po-detail-loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <h3>Loading Purchase Order</h3>
                    <p>Please wait while we fetch the details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="po-detail-error">
                <div className="error-container">
                    <FiXCircle className="error-icon" />
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/procurement/purchase-orders')}>
                        <FiChevronLeft /> Back to Purchase Orders
                    </button>
                </div>
            </div>
        );
    }

    if (!purchaseOrder) {
        return (
            <div className="po-detail-not-found">
                <div className="not-found-container">
                    <FiFileText className="not-found-icon" />
                    <h3>Purchase Order Not Found</h3>
                    <p>The purchase order you're looking for doesn't exist.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/procurement/purchase-orders')}>
                        <FiChevronLeft /> Back to Purchase Orders
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="po-detail-container">
            {/* Header Section */}
            <div className="po-header">
                <div className="po-header-top">
                    <button className="back-btn" onClick={() => navigate('/procurement/purchase-orders')}>
                        <FiChevronLeft />
                        <span>Back</span>
                    </button>

                    <div className="header-actions">
                        <button className="btn btn-secondary">
                            <FiDownload />
                            Export
                        </button>
                        <button className="btn btn-secondary">
                            <FiMail />
                            Share
                        </button>
                        <div className="action-dropdown">
                            <button
                                className="btn btn-secondary dropdown-trigger"
                                onClick={() => setShowActions(!showActions)}
                            >
                                <FiMoreVertical />
                            </button>
                            {showActions && (
                                <div className="dropdown-menu">
                                    <button className="dropdown-item">
                                        <FiEdit3 />
                                        Edit Order
                                    </button>
                                    <button className="dropdown-item">
                                        <FiCheckCircle />
                                        Mark Complete
                                    </button>
                                    <button className="dropdown-item danger">
                                        <FiXCircle />
                                        Cancel Order
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="po-header-main">
                    <div className="po-title-section">
                        <div className="po-number">#{purchaseOrder.poNumber}</div>
                        <h1 className="po-title">Purchase Order Details</h1>
                        <div className="po-subtitle">
                            Created on {formatDate(purchaseOrder.createdAt)}
                        </div>
                    </div>

                    <div className="po-status-section">
                        <div className={`status-badge status-${purchaseOrder.status?.toLowerCase()} large`}>
                            {getStatusIcon(purchaseOrder.status)}
                            <span>{purchaseOrder.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <StatisticsCards
                cards={[
                    {
                        icon: <FiDollarSign />,
                        label: "Total Amount",
                        value: formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency),
                        variant: "primary"
                    },
                    {
                        icon: <FiCalendar />,
                        label: "Expected Delivery",
                        value: formatDate(purchaseOrder.expectedDeliveryDate),
                        variant: "info"
                    },
                    {
                        icon: <FiUser />,
                        label: "Requester",
                        value: purchaseOrder.requestOrder?.requesterName || '-',
                        variant: "purple"
                    },
                    {
                        icon: <FiPackage />,
                        label: "Items",
                        value: purchaseOrder.offer?.offerItems?.length || 0,
                        variant: "success"
                    }
                ]}
                columns={4}
            />

            {/* Main Content Grid */}
            <div className="content-grid">
                {/* Request Order Section */}
                <div className="content-card">
                    <div className="card-header">
                        <div className="card-title">
                            <FiFileText className="card-icon" />
                            <h3>Request Order</h3>
                        </div>
                        {purchaseOrder.requestOrder?.status && (
                            <div className={`status-badge status-${purchaseOrder.requestOrder.status.toLowerCase()}`}>
                                {getStatusIcon(purchaseOrder.requestOrder.status)}
                                <span>{purchaseOrder.requestOrder.status}</span>
                            </div>
                        )}
                    </div>

                    {purchaseOrder.requestOrder ? (
                        <div className="card-content">
                            <h4 className="request-title">{purchaseOrder.requestOrder.title}</h4>
                            <p className="request-description">{purchaseOrder.requestOrder.description}</p>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Created By</span>
                                    <span className="detail-value">{purchaseOrder.requestOrder.createdBy}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Created Date</span>
                                    <span className="detail-value">{formatDate(purchaseOrder.requestOrder.createdAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Approved By</span>
                                    <span className="detail-value">{purchaseOrder.requestOrder.approvedBy || 'Pending'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Deadline</span>
                                    <span className="detail-value">{formatDate(purchaseOrder.requestOrder.deadline)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiFileText className="empty-icon" />
                            <p>No request order information available</p>
                        </div>
                    )}
                </div>

                {/* Offer Details Section */}
                <div className="content-card">
                    <div className="card-header">
                        <div className="card-title">
                            <FiTruck className="card-icon" />
                            <h3>Offer Details</h3>
                        </div>
                    </div>

                    {purchaseOrder.offer ? (
                        <div className="card-content">
                            <h4 className="offer-title">{purchaseOrder.offer.title}</h4>
                            <p className="offer-description">{purchaseOrder.offer.description}</p>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Created By</span>
                                    <span className="detail-value">{purchaseOrder.offer.createdBy}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Created Date</span>
                                    <span className="detail-value">{formatDate(purchaseOrder.offer.createdAt)}</span>
                                </div>
                                <div className="detail-item span-2">
                                    <span className="detail-label">Notes</span>
                                    <span className="detail-value">{purchaseOrder.offer.notes || 'No additional notes'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiTruck className="empty-icon" />
                            <p>No offer information available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table Section */}
            <div className="content-card full-width">
                <div className="card-header">
                    <div className="card-title">
                        <FiPackage className="card-icon" />
                        <h3>Order Items</h3>
                    </div>
                    <div className="items-summary">
                        {purchaseOrder.offer?.offerItems?.length || 0} items
                    </div>
                </div>

                {purchaseOrder.offer?.offerItems && purchaseOrder.offer.offerItems.length > 0 ? (
                    <div className="items-table-container">
                        <div className="items-table">
                            <div className="table-header">
                                <div className="th">Item Details</div>
                                <div className="th">Quantity</div>
                                <div className="th">Unit Price</div>
                                <div className="th">Total</div>
                                <div className="th">Merchant</div>
                                <div className="th">Delivery</div>
                                <div className="th">Status</div>
                            </div>

                            <div className="table-body">
                                {purchaseOrder.offer.offerItems.map((item, index) => (
                                    <div className="table-row" key={item.id}>
                                        <div className="td item-details">
                                            <div className="item-name">
                                                {item.requestOrderItem?.itemType?.name || 'Unknown Item'}
                                            </div>
                                            <div className="item-meta">
                                                ID: {item.id}
                                            </div>
                                        </div>
                                        <div className="td">
                                            <span className="quantity">
                                                {item.quantity} {item.requestOrderItem?.itemType?.measuringUnit || ''}
                                            </span>
                                        </div>
                                        <div className="td">
                                            <span className="price">
                                                {formatCurrency(item.unitPrice, item.currency)}
                                            </span>
                                        </div>
                                        <div className="td">
                                            <span className="total-price">
                                                {formatCurrency(item.totalPrice, item.currency)}
                                            </span>
                                        </div>
                                        <div className="td">
                                            <div className="merchant-info">
                                                <span className="merchant-name">
                                                    {item.merchant?.name || 'TBD'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="td">
                                            <div className="delivery-info">
                                                <FiClock className="delivery-icon" />
                                                <span>{item.estimatedDeliveryDays} days</span>
                                            </div>
                                        </div>
                                        <div className="td">
                                            <div className={`status-badge status-${item.financeStatus?.toLowerCase()}`}>
                                                {getStatusIcon(item.financeStatus)}
                                                <span>{item.financeStatus?.replace(/_/g, ' ') || 'Pending'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="order-summary">
                            <div className="summary-row">
                                <span className="summary-label">Subtotal:</span>
                                <span className="summary-value">
                                    {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}
                                </span>
                            </div>
                            <div className="summary-row total">
                                <span className="summary-label">Total Amount:</span>
                                <span className="summary-value">
                                    {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state large">
                        <FiPackage className="empty-icon" />
                        <h4>No Items Found</h4>
                        <p>This purchase order doesn't have any items yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderDetails;