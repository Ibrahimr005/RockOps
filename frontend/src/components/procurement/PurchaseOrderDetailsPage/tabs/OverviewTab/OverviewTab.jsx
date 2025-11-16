import React from 'react';
import './OverviewTab.scss';

const OverviewTab = ({ purchaseOrder }) => {
    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Format currency
    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Get item name
    const getItemName = (item) => {
        return item.itemType?.name ||
            item.offerItem?.requestOrderItem?.itemType?.name ||
            item.itemTypeName ||
            "Unknown Item";
    };

    // Get item category
    const getItemCategory = (item) => {
        return item.itemType?.category?.name ||
            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
            item.itemCategory ||
            null;
    };

    // Format quantity
    const formatQuantity = (item) => {
        const unit = item.itemType?.measuringUnit ||
            item.offerItem?.requestOrderItem?.itemType?.measuringUnit ||
            'units';
        const quantity = item.quantity || 0;
        return `${quantity} ${unit}`;
    };

    return (
        <div className="overview-tab">
            {/* Purchase Order Overview Section */}
            <div className="overview-section">
                <h3 className="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Purchase Order Details
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
                            <span className="overview-label">PO Number</span>
                            <span className="overview-value">#{purchaseOrder.poNumber}</span>
                        </div>
                    </div>

                    <div className="overview-item">
                        <div className="overview-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div className="overview-content">
                            <span className="overview-label">Created Date</span>
                            <span className="overview-value">{formatDate(purchaseOrder.createdAt)}</span>
                        </div>
                    </div>

                    {purchaseOrder.expectedDeliveryDate && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12,6 12,12 16,14"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Expected Delivery</span>
                                <span className="overview-value">{formatDate(purchaseOrder.expectedDeliveryDate)}</span>
                            </div>
                        </div>
                    )}

                    {purchaseOrder.createdBy && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created By</span>
                                <span className="overview-value">{purchaseOrder.createdBy}</span>
                            </div>
                        </div>
                    )}

                    <div className="overview-item">
                        <div className="overview-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="overview-content">
                            <span className="overview-label">Total Amount</span>
                            <span className="overview-value">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</span>
                        </div>
                    </div>

                    {purchaseOrder.paymentTerms && (
                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                    <line x1="1" y1="10" x2="23" y2="10"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Payment Terms</span>
                                <span className="overview-value">{purchaseOrder.paymentTerms}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Request Order Section */}
            {purchaseOrder.requestOrder && (
                <div className="overview-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                            <path d="M20 4v7a2 2 0 01-2 2H6"/>
                        </svg>
                        Request Order Information
                    </h3>
                    <div className="request-info">
                        <div className="request-item">
                            <div className="request-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <div className="request-content">
                                <span className="request-label">Title</span>
                                <span className="request-value">{purchaseOrder.requestOrder.title}</span>
                            </div>
                        </div>

                        {purchaseOrder.requestOrder.description && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14.828 14.828a4 4 0 010-5.656l5.657 5.656a4 4 0 01-5.657 0z"/>
                                        <path d="M9.17 9.17a4 4 0 010-5.656L14.828 9.17a4 4 0 01-5.657 0z"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Description</span>
                                    <span className="request-value">{purchaseOrder.requestOrder.description}</span>
                                </div>
                            </div>
                        )}

                        <div className="request-item">
                            <div className="request-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="request-content">
                                <span className="request-label">Requester</span>
                                <span className="request-value">{purchaseOrder.requestOrder.requesterName}</span>
                            </div>
                        </div>

                        {purchaseOrder.requestOrder.deadline && (
                            <div className="request-item">
                                <div className="request-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                </div>
                                <div className="request-content">
                                    <span className="request-label">Deadline</span>
                                    <span className="request-value">{formatDate(purchaseOrder.requestOrder.deadline)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Offer Section */}
            {purchaseOrder.offer && (
                <div className="overview-section">
                    <h3 className="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                            <path d="M3 12h6m12 0h-6"/>
                        </svg>
                        Related Offer
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
                                <span className="overview-value">{purchaseOrder.offer.title}</span>
                            </div>
                        </div>

                        {purchaseOrder.offer.description && (
                            <div className="overview-item">
                                <div className="overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14.828 14.828a4 4 0 010-5.656l5.657 5.656a4 4 0 01-5.657 0z"/>
                                        <path d="M9.17 9.17a4 4 0 010-5.656L14.828 9.17a4 4 0 01-5.657 0z"/>
                                    </svg>
                                </div>
                                <div className="overview-content">
                                    <span className="overview-label">Description</span>
                                    <span className="overview-value">{purchaseOrder.offer.description}</span>
                                </div>
                            </div>
                        )}

                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created By</span>
                                <span className="overview-value">{purchaseOrder.offer.createdBy}</span>
                            </div>
                        </div>

                        <div className="overview-item">
                            <div className="overview-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <div className="overview-content">
                                <span className="overview-label">Created Date</span>
                                <span className="overview-value">{formatDate(purchaseOrder.offer.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Order Items Section */}
            <div className="overview-section">
                <h3 className="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    Purchase Order Items ({purchaseOrder.purchaseOrderItems?.length || 0})
                </h3>

                {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                    <div className="items-grid">
                        {purchaseOrder.purchaseOrderItems.map((item, index) => (
                            <div key={item.id || index} className="item-card">
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

                                <div className="item-divider"></div>

                                <div className="item-details">
                                    <div className="item-detail-row">
                                        <span className="item-detail-label">Unit Price:</span>
                                        <span className="item-detail-value">
                                            {formatCurrency(item.unitPrice, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                    <div className="item-detail-row">
                                        <span className="item-detail-label">Total Price:</span>
                                        <span className="item-detail-value">
                                            {formatCurrency(item.totalPrice, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                    {item.estimatedDeliveryDays && (
                                        <div className="item-detail-row">
                                            <span className="item-detail-label">Delivery:</span>
                                            <span className="item-detail-value">
                                                {item.estimatedDeliveryDays} days
                                            </span>
                                        </div>
                                    )}
                                    {item.status && (
                                        <div className="item-detail-row">
                                            <span className="item-detail-label">Status:</span>
                                            <span className={`item-status ${item.status.toLowerCase()}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {item.comment && (
                                    <>
                                        <div className="item-divider"></div>
                                        <div className="item-comment">
                                            <div className="item-comment-label">Comment:</div>
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
                            <p className="empty-description">This purchase order doesn't contain any items.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OverviewTab;