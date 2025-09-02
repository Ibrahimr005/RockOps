import React from "react";
import "./RequestOrderViewModal.scss";

const RequestOrderViewModal = ({ requestOrder, isOpen, onClose }) => {
    if (!isOpen || !requestOrder) return null;

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
        return `request-order-view-modal-status-badge ${status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    };

    // Get item name from the correct property
    const getItemName = (item) => {
        return item.itemType?.name || item.itemTypeName || "Unknown Item";
    };

    // Get item category from the correct property
    const getItemCategory = (item) => {
        return item.itemType?.itemCategory?.name || item.itemCategory || null;
    };

    // Get measuring unit
    const getMeasuringUnit = (item) => {
        return item.itemType?.measuringUnit || item.measuringUnit || 'units';
    };

    // Format quantity display
    const formatQuantity = (item) => {
        const unit = getMeasuringUnit(item);
        const quantity = item.quantity || 0;
        return `${quantity} ${unit}`;
    };

    return (
        <div className="request-order-view-modal-overlay" onClick={onClose}>
            <div className="request-order-view-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="request-order-view-modal-header">
                    <div className="request-order-view-modal-header-content">
                        <h2 className="request-order-view-modal-title">Request Order Details</h2>
                        {requestOrder.status && (
                            <div className={getStatusClass(requestOrder.status)}>
                                {requestOrder.status}
                            </div>
                        )}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                    </button>
                </div>

                {/* Content */}
                <div className="request-order-view-modal-content">
                    {/* Overview Section */}
                    <div className="request-order-view-modal-content-section">
                        <h3 className="request-order-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            Overview
                        </h3>
                        <div className="request-order-view-modal-overview-grid">
                            <div className="request-order-view-modal-overview-item">
                                <div className="request-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10,9 9,9 8,9"/>
                                    </svg>
                                </div>
                                <div className="request-order-view-modal-overview-content">
                                    <span className="request-order-view-modal-label">Title</span>
                                    <span className="request-order-view-modal-value">{requestOrder.title || 'N/A'}</span>
                                </div>
                            </div>

                            {requestOrder.deadline && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Deadline</span>
                                        <span className="request-order-view-modal-value">{formatDateTime(requestOrder.deadline)}</span>
                                    </div>
                                </div>
                            )}

                            {requestOrder.createdAt && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Created At</span>
                                        <span className="request-order-view-modal-value">{formatDateTime(requestOrder.createdAt)}</span>
                                    </div>
                                </div>
                            )}

                            {requestOrder.createdBy && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Created By</span>
                                        <span className="request-order-view-modal-value">{requestOrder.createdBy}</span>
                                    </div>
                                </div>
                            )}

                            {requestOrder.employeeRequestedBy && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Requested By Employee</span>
                                        <span className="request-order-view-modal-value">{requestOrder.employeeRequestedBy}</span>
                                    </div>
                                </div>
                            )}

                            {requestOrder.partyType && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9,22 9,12 15,12 15,22"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Party Type</span>
                                        <span className="request-order-view-modal-value">{requestOrder.partyType}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description Section */}
                    {requestOrder.description && (
                        <div className="request-order-view-modal-content-section">
                            <h3 className="request-order-view-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                                Description
                            </h3>
                            <div className="request-order-view-modal-description-box">
                                <p className="request-order-view-modal-description-text">{requestOrder.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Items Section */}
                    <div className="request-order-view-modal-content-section">
                        <h3 className="request-order-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Request Items ({(requestOrder.requestItems || requestOrder.items || []).length})
                        </h3>

                        {(requestOrder.requestItems || requestOrder.items || []).length > 0 ? (
                            <div className="request-order-view-modal-items-grid">
                                {(requestOrder.requestItems || requestOrder.items || []).map((item, index) => (
                                    <div key={index} className="request-order-view-modal-item-preview-card">
                                        <div className="request-order-view-modal-item-preview-header">
                                            <div className="request-order-view-modal-item-icon-container">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="request-order-view-modal-item-icon">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                </svg>
                                            </div>
                                            <div className="request-order-view-modal-item-title-container">
                                                <div className="request-order-view-modal-item-name">{getItemName(item)}</div>
                                                {getItemCategory(item) && (
                                                    <div className="request-order-view-modal-item-category">{getItemCategory(item)}</div>
                                                )}
                                            </div>
                                            <div className="request-order-view-modal-item-quantity">{formatQuantity(item)}</div>
                                        </div>

                                        {item.comment && (
                                            <>
                                                <div className="request-order-view-modal-item-divider"></div>
                                                <div className="request-order-view-modal-item-comment">
                                                    <div className="request-order-view-modal-item-comment-label">Comment</div>
                                                    <div className="request-order-view-modal-item-comment-text">{item.comment}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="request-order-view-modal-empty-state">
                                <div className="request-order-view-modal-empty-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12h8"/>
                                    </svg>
                                </div>
                                <div className="request-order-view-modal-empty-content">
                                    <p className="request-order-view-modal-empty-title">No items found</p>
                                    <p className="request-order-view-modal-empty-description">This request order doesn't contain any items.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Approval Details */}
                    {(requestOrder.approvedBy || requestOrder.validatedBy || requestOrder.approvedAt || requestOrder.validatedDate) && (
                        <div className="request-order-view-modal-content-section">
                            <h3 className="request-order-view-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                Approval Details
                            </h3>
                            <div className="request-order-view-modal-overview-grid">
                                {(requestOrder.approvedBy || requestOrder.validatedBy) && (
                                    <div className="request-order-view-modal-overview-item">
                                        <div className="request-order-view-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <div className="request-order-view-modal-overview-content">
                                            <span className="request-order-view-modal-label">Approved By</span>
                                            <span className="request-order-view-modal-value">{requestOrder.approvedBy || requestOrder.validatedBy}</span>
                                        </div>
                                    </div>
                                )}
                                {(requestOrder.approvedAt || requestOrder.validatedDate) && (
                                    <div className="request-order-view-modal-overview-item">
                                        <div className="request-order-view-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12,6 12,12 16,14"/>
                                            </svg>
                                        </div>
                                        <div className="request-order-view-modal-overview-content">
                                            <span className="request-order-view-modal-label">Approved At</span>
                                            <span className="request-order-view-modal-value">{formatDateTime(requestOrder.approvedAt || requestOrder.validatedDate)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestOrderViewModal;