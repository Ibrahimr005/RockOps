import React, { useState, useEffect } from "react";
import "./PurchaseOrderViewModal.scss";

const PurchaseOrderViewModal = ({ purchaseOrder, isOpen, onClose }) => {
    const [userRole, setUserRole] = useState(null);

    // Get user role from localStorage
    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen]);

    if (!isOpen || !purchaseOrder) return null;



    // Format date helper functions
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Get status badge class
    const getStatusClass = (status) => {
        return `purchase-order-view-modal-status-badge ${status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    };

    // Updated helper functions to use the simplified data structure
    const getItemName = (item) => {
        // Try direct itemType first, then fallback to deep navigation for backward compatibility
        return item.itemType?.name ||
            item.offerItem?.requestOrderItem?.itemType?.name ||
            item.itemTypeName ||
            "Unknown Item";
    };

    const getItemCategory = (item) => {
        // Try direct itemType first, then fallback to deep navigation for backward compatibility
        return item.itemType?.category?.name ||
            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
            item.itemCategory ||
            null;
    };

    // Format quantity display
    const formatQuantity = (item) => {
        // Try direct itemType first, then fallback to deep navigation for backward compatibility
        const unit = item.itemType?.measuringUnit ||
            item.offerItem?.requestOrderItem?.itemType?.measuringUnit ||
            'units';
        const quantity = item.quantity || 0;

        return `${quantity} ${unit}`;
    };

    // Get merchant name
    const getMerchantName = (item) => {
        // Try direct merchant first, then fallback to deep navigation for backward compatibility
        return item.merchant?.name ||
            item.offerItem?.merchant?.name ||
            "Unknown Merchant";
    };

    // Format currency
    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };

    return (
        <div className="purchase-order-view-modal-overlay" onClick={onClose}>
            <div className="purchase-order-view-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="purchase-order-view-modal-header">
                    <div className="purchase-order-view-modal-header-content">
                        <h2 className="purchase-order-view-modal-title">Purchase Order Details</h2>
                        <div className={getStatusClass(purchaseOrder.status)}>
                            {purchaseOrder.status || 'Unknown'}
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="purchase-order-view-modal-content">
                    {/* Overview Section */}
                    <div className="purchase-order-view-modal-content-section">
                        <h3 className="purchase-order-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            Overview
                        </h3>
                        <div className="purchase-order-view-modal-overview-grid">
                            <div className="purchase-order-view-modal-overview-item">
                                <div className="purchase-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10,9 9,9 8,9"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-view-modal-overview-content">
                                    <span className="purchase-order-view-modal-label">PO Number</span>
                                    <span className="purchase-order-view-modal-value">#{purchaseOrder.poNumber}</span>
                                </div>
                            </div>

                            <div className="purchase-order-view-modal-overview-item">
                                <div className="purchase-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-view-modal-overview-content">
                                    <span className="purchase-order-view-modal-label">Created Date</span>
                                    <span className="purchase-order-view-modal-value">{formatDate(purchaseOrder.createdAt)}</span>
                                </div>
                            </div>

                            {purchaseOrder.expectedDeliveryDate && (
                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Expected Delivery</span>
                                        <span className="purchase-order-view-modal-value">{formatDate(purchaseOrder.expectedDeliveryDate)}</span>
                                    </div>
                                </div>
                            )}

                            {purchaseOrder.createdBy && (
                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Created By</span>
                                        <span className="purchase-order-view-modal-value">{purchaseOrder.createdBy}</span>
                                    </div>
                                </div>
                            )}

                            <div className="purchase-order-view-modal-overview-item">
                                <div className="purchase-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="1" x2="12" y2="23"/>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-view-modal-overview-content">
                                    <span className="purchase-order-view-modal-label">Total Amount</span>
                                    <span className="purchase-order-view-modal-value">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</span>
                                </div>
                            </div>

                            {purchaseOrder.paymentTerms && (
                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Payment Terms</span>
                                        <span className="purchase-order-view-modal-value">{purchaseOrder.paymentTerms}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Request Order Information */}
                    {purchaseOrder.requestOrder && (
                        <div className="purchase-order-view-modal-content-section">
                            <h3 className="purchase-order-view-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                                    <path d="M20 4v7a2 2 0 01-2 2H6"/>
                                </svg>
                                Request Order Information
                            </h3>
                            <div className="purchase-order-view-modal-request-info">
                                <div className="purchase-order-view-modal-request-item">
                                    <div className="purchase-order-view-modal-request-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-request-content">
                                        <span className="purchase-order-view-modal-request-label">Title</span>
                                        <span className="purchase-order-view-modal-request-value">
                                            {purchaseOrder.requestOrder.title}
                                        </span>
                                    </div>
                                </div>

                                <div className="purchase-order-view-modal-request-item">
                                    <div className="purchase-order-view-modal-request-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-request-content">
                                        <span className="purchase-order-view-modal-request-label">Requester</span>
                                        <span className="purchase-order-view-modal-request-value">
                                            {purchaseOrder.requestOrder.requesterName}
                                        </span>
                                    </div>
                                </div>

                                {purchaseOrder.requestOrder.deadline && (
                                    <div className="purchase-order-view-modal-request-item">
                                        <div className="purchase-order-view-modal-request-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12,6 12,12 16,14"/>
                                            </svg>
                                        </div>
                                        <div className="purchase-order-view-modal-request-content">
                                            <span className="purchase-order-view-modal-request-label">Deadline</span>
                                            <span className="purchase-order-view-modal-request-value">
                                                {formatDate(purchaseOrder.requestOrder.deadline)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Purchase Order Items Section */}
                    <div className="purchase-order-view-modal-content-section">
                        <h3 className="purchase-order-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Purchase Order Items ({purchaseOrder.purchaseOrderItems?.length || 0})
                        </h3>

                        {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                            <div className="purchase-order-view-modal-items-grid">
                                {purchaseOrder.purchaseOrderItems.map((item, index) => (
                                    <div key={item.id || index} className="purchase-order-view-modal-item-preview-card">
                                        <div className="purchase-order-view-modal-item-preview-header">
                                            <div className="purchase-order-view-modal-item-icon-container">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="purchase-order-view-modal-item-icon">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                </svg>
                                            </div>
                                            <div className="purchase-order-view-modal-item-title-container">
                                                <div className="purchase-order-view-modal-item-name">
                                                    {getItemName(item)}
                                                </div>
                                                {getItemCategory(item) && (
                                                    <div className="purchase-order-view-modal-item-category">{getItemCategory(item)}</div>
                                                )}
                                            </div>
                                            <div className="purchase-order-view-modal-item-quantity">{formatQuantity(item)}</div>
                                        </div>

                                        <div className="purchase-order-view-modal-item-divider"></div>

                                        <div className="purchase-order-view-modal-item-details">
                                            <div className="purchase-order-view-modal-item-detail-row">
                                                <span className="purchase-order-view-modal-item-detail-label">Unit Price:</span>
                                                <span className="purchase-order-view-modal-item-detail-value">
                                                    {formatCurrency(item.unitPrice, purchaseOrder.currency)}
                                                </span>
                                            </div>
                                            <div className="purchase-order-view-modal-item-detail-row">
                                                <span className="purchase-order-view-modal-item-detail-label">Total Price:</span>
                                                <span className="purchase-order-view-modal-item-detail-value">
                                                    {formatCurrency(item.totalPrice, purchaseOrder.currency)}
                                                </span>
                                            </div>
                                            {item.estimatedDeliveryDays && (
                                                <div className="purchase-order-view-modal-item-detail-row">
                                                    <span className="purchase-order-view-modal-item-detail-label">Delivery:</span>
                                                    <span className="purchase-order-view-modal-item-detail-value">
                                                        {item.estimatedDeliveryDays} days
                                                    </span>
                                                </div>
                                            )}
                                            {item.status && (
                                                <div className="purchase-order-view-modal-item-detail-row">
                                                    <span className="purchase-order-view-modal-item-detail-label">Status:</span>
                                                    <span className={`purchase-order-view-modal-item-status ${item.status.toLowerCase()}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {item.comment && (
                                            <>
                                                <div className="purchase-order-view-modal-item-divider"></div>
                                                <div className="purchase-order-view-modal-item-comment">
                                                    <div className="purchase-order-view-modal-item-comment-label">Comment:</div>
                                                    <div className="purchase-order-view-modal-item-comment-text">{item.comment}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="purchase-order-view-modal-empty-state">
                                <div className="purchase-order-view-modal-empty-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12h8"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-view-modal-empty-content">
                                    <p className="purchase-order-view-modal-empty-title">No items found</p>
                                    <p className="purchase-order-view-modal-empty-description">This purchase order doesn't contain any items.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Offer Information */}
                    {purchaseOrder.offer && (
                        <div className="purchase-order-view-modal-content-section">
                            <h3 className="purchase-order-view-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4"/>
                                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                                    <path d="M3 12h6m12 0h-6"/>
                                </svg>
                                Related Offer
                            </h3>
                            <div className="purchase-order-view-modal-overview-grid">
                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10,9 9,9 8,9"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Title</span>
                                        <span className="purchase-order-view-modal-value">{purchaseOrder.offer.title}</span>
                                    </div>
                                </div>

                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14.828 14.828a4 4 0 010-5.656l5.657 5.656a4 4 0 01-5.657 0z"/>
                                            <path d="M9.17 9.17a4 4 0 010-5.656L14.828 9.17a4 4 0 01-5.657 0z"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Description</span>
                                        <span className="purchase-order-view-modal-value">{purchaseOrder.offer.description || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Created By</span>
                                        <span className="purchase-order-view-modal-value">{purchaseOrder.offer.createdBy}</span>
                                    </div>
                                </div>

                                <div className="purchase-order-view-modal-overview-item">
                                    <div className="purchase-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                    </div>
                                    <div className="purchase-order-view-modal-overview-content">
                                        <span className="purchase-order-view-modal-label">Created Date</span>
                                        <span className="purchase-order-view-modal-value">{formatDate(purchaseOrder.offer.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderViewModal;