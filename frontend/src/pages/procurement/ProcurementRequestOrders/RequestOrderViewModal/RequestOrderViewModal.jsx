import React, { useState, useEffect } from "react";
import "./RequestOrderViewModal.scss";

const RequestOrderViewModal = ({ requestOrder, isOpen, onClose }) => {
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
        return item.itemType?.category || item.itemCategory || null;
    };

    // Format quantity display
    const formatQuantity = (item) => {
        const unit = item.itemType?.measuringUnit || item.itemUnit || 'units';
        const quantity = item.quantity || 0;
        return `${quantity} ${unit}`;
    };

    // Get items array from requestOrder
    const getItems = () => {
        if (requestOrder.items && Array.isArray(requestOrder.items)) {
            return requestOrder.items;
        }
        if (requestOrder.requestItems && Array.isArray(requestOrder.requestItems)) {
            return requestOrder.requestItems;
        }
        return [];
    };

    const items = getItems();

    return (
        <div className="request-order-view-modal-overlay" onClick={onClose}>
            <div className="request-order-view-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="request-order-view-modal-header">
                    <div className="request-order-view-modal-header-content">
                        <h2 className="request-order-view-modal-title">Request Order Details</h2>
                        <div className={getStatusClass(requestOrder.status)}>
                            {requestOrder.status || 'Unknown'}
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
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

                            {requestOrder.description && (
                                <div className="request-order-view-modal-overview-item request-order-view-modal-description-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Description</span>
                                        <span className="request-order-view-modal-value request-order-view-modal-description-text">{requestOrder.description}</span>
                                    </div>
                                </div>
                            )}

                            <div className="request-order-view-modal-overview-item">
                                <div className="request-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="request-order-view-modal-overview-content">
                                    <span className="request-order-view-modal-label">Created By</span>
                                    <span className="request-order-view-modal-value">{requestOrder.createdBy || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="request-order-view-modal-overview-item">
                                <div className="request-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div className="request-order-view-modal-overview-content">
                                    <span className="request-order-view-modal-label">Deadline</span>
                                    <span className="request-order-view-modal-value">{formatDateTime(requestOrder.deadline)}</span>
                                </div>
                            </div>

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

                            <div className="request-order-view-modal-overview-item">
                                <div className="request-order-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                </div>
                                <div className="request-order-view-modal-overview-content">
                                    <span className="request-order-view-modal-label">Warehouse</span>
                                    <span className="request-order-view-modal-value">{requestOrder.requesterName || 'N/A'}</span>
                                </div>
                            </div>

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

                            {requestOrder.approvedBy && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Approved By</span>
                                        <span className="request-order-view-modal-value">{requestOrder.approvedBy}</span>
                                    </div>
                                </div>
                            )}

                            {requestOrder.approvedAt && (
                                <div className="request-order-view-modal-overview-item">
                                    <div className="request-order-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="request-order-view-modal-overview-content">
                                        <span className="request-order-view-modal-label">Approved At</span>
                                        <span className="request-order-view-modal-value">{formatDateTime(requestOrder.approvedAt)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="request-order-view-modal-content-section">
                        <h3 className="request-order-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Request Items ({items.length})
                        </h3>

                        {items && items.length > 0 ? (
                            <div className="request-order-view-modal-items-grid">
                                {items.map((item, index) => (
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
                                            <div className="request-order-view-modal-item-divider"></div>
                                        )}
                                        {item.comment && (
                                            <div className="request-order-view-modal-item-comment">
                                                <div className="request-order-view-modal-item-comment-label">COMMENT</div>
                                                <div className="request-order-view-modal-item-comment-text">{item.comment}</div>
                                            </div>
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

                    {/*/!* Status Information *!/*/}
                    {/*{(requestOrder.updatedAt || requestOrder.updatedBy) && (*/}
                    {/*    <div className="request-order-view-modal-content-section">*/}
                    {/*        <h3 className="request-order-view-modal-section-title">*/}
                    {/*            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">*/}
                    {/*                <path d="M20 6L9 17l-5-5"/>*/}
                    {/*            </svg>*/}
                    {/*            Status Information*/}
                    {/*        </h3>*/}
                    {/*        <div className="request-order-view-modal-overview-grid">*/}
                    {/*            {requestOrder.updatedAt && (*/}
                    {/*                <div className="request-order-view-modal-overview-item">*/}
                    {/*                    <div className="request-order-view-modal-overview-icon">*/}
                    {/*                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">*/}
                    {/*                            <circle cx="12" cy="12" r="10"/>*/}
                    {/*                            <polyline points="12,6 12,12 16,14"/>*/}
                    {/*                        </svg>*/}
                    {/*                    </div>*/}
                    {/*                    <div className="request-order-view-modal-overview-content">*/}
                    {/*                        <span className="request-order-view-modal-label">Last Updated</span>*/}
                    {/*                        <span className="request-order-view-modal-value">{formatDateTime(requestOrder.updatedAt)}</span>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            )}*/}
                    {/*            {requestOrder.updatedBy && (*/}
                    {/*                <div className="request-order-view-modal-overview-item">*/}
                    {/*                    <div className="request-order-view-modal-overview-icon">*/}
                    {/*                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">*/}
                    {/*                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>*/}
                    {/*                            <circle cx="12" cy="7" r="4"/>*/}
                    {/*                        </svg>*/}
                    {/*                    </div>*/}
                    {/*                    <div className="request-order-view-modal-overview-content">*/}
                    {/*                        <span className="request-order-view-modal-label">Updated By</span>*/}
                    {/*                        <span className="request-order-view-modal-value">{requestOrder.updatedBy}</span>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            )}*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*)}*/}
                </div>
            </div>
        </div>
    );
};

export default RequestOrderViewModal;