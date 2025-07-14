import React, { useState, useEffect } from "react";
import "./TransactionViewModal.scss";

const TransactionViewModal = ({ transaction, isOpen, onClose, hideItemQuantities = false, currentWarehouseId }) => {
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

    if (!isOpen || !transaction) return null;

    // Check if quantities should be shown
    // Show quantities if:
    // 1. hideItemQuantities is false AND
    // 2. Either the current warehouse initiated the transaction OR the user is a WAREHOUSE_MANAGER OR the transaction is ACCEPTED/RESOLVED
    const shouldShowQuantities = !hideItemQuantities && (
        (currentWarehouseId && (currentWarehouseId === transaction.sentFirst || currentWarehouseId === transaction.senderId)) ||
        userRole === 'WAREHOUSE_MANAGER' ||
        transaction.status === 'ACCEPTED' ||
        transaction.status === 'RESOLVED'
    );

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

    // Get entity name helper
    const getEntityName = (entity) => {
        if (!entity) return "N/A";
        return entity.name || entity.fullModelName || entity.equipment?.fullModelName || "N/A";
    };

    // Get status badge class
    const getStatusClass = (status) => {
        return `transaction-view-modal-status-badge ${status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    };

    // Get item name from the correct property
    const getItemName = (item) => {
        return item.itemType?.name || item.itemTypeName || "Unknown Item";
    };

    // Get item category from the correct property
    const getItemCategory = (item) => {
        return item.itemType?.category || item.itemCategory || null;
    };

    // Get item status class
    const getItemStatusClass = (status) => {
        return `transaction-view-modal-item-status ${status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    };

    // Format quantity display
    const formatQuantity = (item) => {
        if (!shouldShowQuantities) return null;

        const unit = item.itemUnit || 'units';
        const sentQty = item.quantity || 0;
        const receivedQty = item.receivedQuantity;

        // Always show sent quantity
        let quantityText = `${sentQty} sent`;

        // If there's a received quantity, show it as well
        if (receivedQty !== null && receivedQty !== undefined) {
            quantityText += `, ${receivedQty} received`;
        }

        // Add unit if present
        if (unit) {
            quantityText += ` ${unit}`;
        }

        return quantityText;
    };

    return (
        <div className="transaction-view-modal-overlay" onClick={onClose}>
            <div className="transaction-view-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="transaction-view-modal-header">
                    <div className="transaction-view-modal-header-content">
                        <h2 className="transaction-view-modal-title">Transaction Details</h2>
                        {(['ACCEPTED', 'REJECTED', 'RESOLVING', 'RESOLVED'].includes(transaction.status)) && (
                            <div className={getStatusClass(transaction.status)}>
                                {transaction.status || 'Unknown'}
                            </div>
                        )}
                    </div>
                    <button className="btn-close" onClick={onClose}>

                    </button>
                </div>

                {/* Content */}
                <div className="transaction-view-modal-content">
                    {/* Overview Section */}
                    <div className="transaction-view-modal-content-section">
                        <h3 className="transaction-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                                <path d="M20 4v7a2 2 0 01-2 2H6"/>
                            </svg>
                            Overview
                        </h3>
                        <div className="transaction-view-modal-overview-grid">
                            {transaction.batchNumber && (
                                <div className="transaction-view-modal-overview-item">
                                    <div className="transaction-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14,2 14,8 20,8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10,9 9,9 8,9"/>
                                        </svg>
                                    </div>
                                    <div className="transaction-view-modal-overview-content">
                                        <span className="transaction-view-modal-label">Batch Number</span>
                                        <span className="transaction-view-modal-value">#{transaction.batchNumber}</span>
                                    </div>
                                </div>
                            )}

                            <div className="transaction-view-modal-overview-item">
                                <div className="transaction-view-modal-overview-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                </div>
                                <div className="transaction-view-modal-overview-content">
                                    <span className="transaction-view-modal-label">Transaction Date</span>
                                    <span className="transaction-view-modal-value">{formatDate(transaction.transactionDate)}</span>
                                </div>
                            </div>

                            {transaction.createdAt && (
                                <div className="transaction-view-modal-overview-item">
                                    <div className="transaction-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </div>
                                    <div className="transaction-view-modal-overview-content">
                                        <span className="transaction-view-modal-label">Created At</span>
                                        <span className="transaction-view-modal-value">{formatDateTime(transaction.createdAt)}</span>
                                    </div>
                                </div>
                            )}

                            {transaction.addedBy && (
                                <div className="transaction-view-modal-overview-item">
                                    <div className="transaction-view-modal-overview-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div className="transaction-view-modal-overview-content">
                                        <span className="transaction-view-modal-label">Created By</span>
                                        <span className="transaction-view-modal-value">{transaction.addedBy}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parties Section */}
                    <div className="transaction-view-modal-content-section">
                        <h3 className="transaction-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Transaction Parties
                        </h3>
                        <div className="transaction-view-modal-parties-grid">
                            <div className="transaction-view-modal-party-item">
                                <div className="transaction-view-modal-party-icon sender">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="transaction-view-modal-party-content">
                                    <span className="transaction-view-modal-party-label">Sender</span>
                                    <span className="transaction-view-modal-party-name">
                                        {transaction.senderName || getEntityName(transaction.sender)}
                                    </span>
                                    <span className="transaction-view-modal-party-type">
                                        {transaction.senderType || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="transaction-view-modal-party-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                    <polyline points="12,5 19,12 12,19"/>
                                </svg>
                            </div>

                            <div className="transaction-view-modal-party-item">
                                <div className="transaction-view-modal-party-icon receiver">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </div>
                                <div className="transaction-view-modal-party-content">
                                    <span className="transaction-view-modal-party-label">Receiver</span>
                                    <span className="transaction-view-modal-party-name">
                                        {transaction.receiverName || getEntityName(transaction.receiver)}
                                    </span>
                                    <span className="transaction-view-modal-party-type">
                                        {transaction.receiverType || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="transaction-view-modal-content-section">
                        <h3 className="transaction-view-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Transaction Items
                        </h3>

                        {transaction.items && transaction.items.length > 0 ? (
                            <div className="transaction-view-modal-items-grid">
                                {transaction.items.map((item, index) => (
                                    <div key={index} className="transaction-view-modal-item-preview-card">
                                        <div className="transaction-view-modal-item-preview-header">
                                            <div className="transaction-view-modal-item-icon-container">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transaction-view-modal-item-icon">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                </svg>
                                            </div>
                                            <div className="transaction-view-modal-item-title-container">
                                                <div className="transaction-view-modal-item-name">{getItemName(item)}</div>
                                                {getItemCategory(item) && (
                                                    <div className="transaction-view-modal-item-category">{getItemCategory(item)}</div>
                                                )}
                                            </div>
                                            {shouldShowQuantities && (
                                                <div className="transaction-view-modal-item-quantity">{formatQuantity(item)}</div>
                                            )}
                                        </div>

                                        {(item.rejectionReason || (item.status === 'ACCEPTED' || item.status === 'REJECTED' || item.status === 'RESOLVED')) && (
                                            <div className="transaction-view-modal-item-divider"></div>
                                        )}
                                        {item.rejectionReason && (
                                            <div className="transaction-view-modal-item-rejection-simple">
                                                <div className="transaction-view-modal-item-rejection-label">REJECTED</div>
                                                <div className="transaction-view-modal-item-rejection-text">{item.rejectionReason}</div>
                                            </div>
                                        )}
                                        {!item.rejectionReason && item.status === 'ACCEPTED' && (
                                            <div className="transaction-view-modal-item-status-simple">
                                                <div className="transaction-view-modal-item-status-label accepted">
                                                    ACCEPTED
                                                </div>
                                                <div className="transaction-view-modal-item-rejection-text">
                                                    Quantity match between quantity sent and quantity received
                                                </div>
                                            </div>
                                        )}
                                        {!item.rejectionReason && item.status === 'RESOLVED' && (
                                            <div className="transaction-view-modal-item-status-simple">
                                                <div className="transaction-view-modal-item-status-label resolved">
                                                    RESOLVED
                                                </div>
                                                <div className="transaction-view-modal-item-rejection-text">
                                                    Quantity mismatch was identified and successfully resolved
                                                </div>
                                            </div>
                                        )}
                                        {!item.rejectionReason && item.status === 'REJECTED' && (
                                            <div className="transaction-view-modal-item-status-simple">
                                                <div className="transaction-view-modal-item-status-label rejected">
                                                    REJECTED
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="transaction-view-modal-empty-state">
                                <div className="transaction-view-modal-empty-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12h8"/>
                                    </svg>
                                </div>
                                <div className="transaction-view-modal-empty-content">
                                    <p className="transaction-view-modal-empty-title">No items found</p>
                                    <p className="transaction-view-modal-empty-description">This transaction doesn't contain any items.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comments Section */}
                    {transaction.acceptanceComment && (
                        <div className="transaction-view-modal-content-section">
                            <h3 className="transaction-view-modal-section-title">Comments</h3>
                            <div className="transaction-view-modal-comment-box">
                                <div className="transaction-view-modal-comment-header">
                                    <span className="transaction-view-modal-comment-type">Acceptance Comment</span>
                                </div>
                                <div className="transaction-view-modal-comment-text">{transaction.acceptanceComment}</div>
                            </div>
                        </div>
                    )}

                    {/* Completion Details */}
                    {(transaction.completedAt || transaction.approvedBy) && (
                        <div className="transaction-view-modal-content-section">
                            <h3 className="transaction-view-modal-section-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                Completion Details
                            </h3>
                            <div className="transaction-view-modal-overview-grid">
                                {transaction.completedAt && (
                                    <div className="transaction-view-modal-overview-item">
                                        <div className="transaction-view-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12,6 12,12 16,14"/>
                                            </svg>
                                        </div>
                                        <div className="transaction-view-modal-overview-content">
                                            <span className="transaction-view-modal-label">Completed At</span>
                                            <span className="transaction-view-modal-value">{formatDateTime(transaction.completedAt)}</span>
                                        </div>
                                    </div>
                                )}
                                {transaction.approvedBy && (
                                    <div className="transaction-view-modal-overview-item">
                                        <div className="transaction-view-modal-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <div className="transaction-view-modal-overview-content">
                                            <span className="transaction-view-modal-label">Completed By</span>
                                            <span className="transaction-view-modal-value">{transaction.approvedBy}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Maintenance Information */}
                    {transaction.maintenance && (
                        <div className="transaction-view-modal-content-section">
                            <h3 className="transaction-view-modal-section-title">Related Maintenance</h3>
                            <div className="transaction-view-modal-maintenance-info">
                                <div className="transaction-view-modal-maintenance-item">
                                    <span className="transaction-view-modal-label">Maintenance ID</span>
                                    <span className="transaction-view-modal-value transaction-view-modal-maintenance-id">{transaction.maintenance.id}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionViewModal;