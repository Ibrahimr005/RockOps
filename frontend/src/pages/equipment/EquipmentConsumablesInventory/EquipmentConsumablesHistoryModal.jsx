import React from "react";
import "./EquipmentConsumablesHistoryModal.scss";

const EquipmentConsumablesHistoryModal = ({ isOpen, onClose, consumableHistory, itemDetails }) => {
    if (!isOpen || !consumableHistory) return null;

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Format date and time helper function
    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get item status badge class - Updated to handle individual item statuses
    const getItemStatusClass = (status) => {
        switch(status) {
            case 'ACCEPTED':
                return 'consumable-history-status-badge accepted';
            case 'PENDING':
                return 'consumable-history-status-badge pending';
            case 'REJECTED':
                return 'consumable-history-status-badge rejected';
            case 'PARTIALLY_ACCEPTED':
                return 'consumable-history-status-badge partially-accepted';
            case 'DELIVERING':
                return 'consumable-history-status-badge delivering';
            // Handle legacy statuses for backward compatibility
            case 'COMPLETED':
                return 'consumable-history-status-badge completed';
            default:
                return 'consumable-history-status-badge regular';
        }
    };

    // Get item status display name - Updated to handle individual item statuses
    const getItemStatusDisplayName = (status) => {
        switch(status) {
            case 'ACCEPTED':
                return 'Accepted';
            case 'PENDING':
                return 'Pending';
            case 'REJECTED':
                return 'Rejected';
            case 'PARTIALLY_ACCEPTED':
                return 'Partially Accepted';
            case 'DELIVERING':
                return 'Delivering';
            default:
                return status || 'Unknown';
        }
    };

    // Get sender/receiver display name
    const getPartyDisplayName = (partyType) => {
        switch(partyType) {
            case 'WAREHOUSE':
                return 'Warehouse';
            case 'EQUIPMENT':
                return 'Equipment';
            case 'MERCHANT':
                return 'Merchant';
            default:
                return partyType || 'Unknown';
        }
    };

    // Clean up rejection reason to avoid showing sender/receiver claims
    const cleanRejectionReason = (rejectionReason) => {
        if (!rejectionReason) return rejectionReason;
        
        // Check if it's a quantity mismatch message with sender/receiver claims
        if (rejectionReason.toLowerCase().includes('quantity mismatch') && 
            rejectionReason.toLowerCase().includes('sender claimed') && 
            rejectionReason.toLowerCase().includes('receiver claimed')) {
            return 'Quantity mismatch';
        }
        
        return rejectionReason;
    };

    // Get the actual quantity received by the equipment
    const getEquipmentQuantity = (transaction, relevantItem) => {
        if (!relevantItem) return 0;
        
        // Check if equipment was sentFirst (added the transaction to system first)
        if (transaction.receiverType === 'EQUIPMENT' && transaction.sentFirst === transaction.receiverId) {
            // Equipment initiated/created the transaction - show the quantity they specified
            return relevantItem.quantity;
        } else {
            // Equipment validated the transaction - show the receivedQuantity they specified
            return relevantItem.receivedQuantity !== undefined ? relevantItem.receivedQuantity : relevantItem.quantity;
        }
    };

    return (
        <div className="consumables-history-modal-backdrop">
            <div className="consumables-history-modal">
                <div className="consumables-history-modal-header">
                    <div className="header-content">
                        <div className="item-info">
                            <h2 className="item-name">{itemDetails?.itemTypeName}</h2>
                            <span className="item-category">{itemDetails?.itemTypeCategory}</span>
                            <span className="history-description">Transaction History - How This Consumable Came to Inventory</span>
                        </div>
                        <div className="summary-stats">
                            <div className="stat-item">
                                <span className="stat-value">{itemDetails?.quantity}</span>
                                <span className="stat-label">Available</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-value">{consumableHistory.length}</span>
                                <span className="stat-label">Transactions</span>
                            </div>
                        </div>
                    </div>
                    <button className="close-modal-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="consumables-history-modal-body">
                    {consumableHistory.length > 0 ? (
                        <div className="history-timeline">
                            {consumableHistory.map((transaction, index) => {
                                // Find the relevant transaction item for this consumable
                                let relevantItem = null;
                                
                                if (transaction.items && transaction.items.length > 0) {
                                    // Try matching by itemTypeId first
                                    relevantItem = transaction.items.find(item => 
                                        item.itemTypeId === itemDetails?.itemType?.id
                                    );
                                    
                                    // If not found, try matching by itemTypeName
                                    if (!relevantItem) {
                                        relevantItem = transaction.items.find(item => 
                                            item.itemTypeName === itemDetails?.itemTypeName
                                        );
                                    }
                                    
                                    // If still not found, just take the first item for now (fallback)
                                    if (!relevantItem) {
                                        relevantItem = transaction.items[0];
                                    }
                                }
                                
                                return (
                                    <div key={transaction.id || index} className="history-entry">
                                        <div className="history-entry-header">
                                            <div className="consumable-history-entry-type">
                                                <span className={getItemStatusClass(relevantItem?.status || transaction.status)}>
                                                    {getItemStatusDisplayName(relevantItem?.status || transaction.status)}
                                                </span>

                                                {transaction.batchNumber && (
                                                    <span className="consumable-history-batch-number">
                                                        Batch #{transaction.batchNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="consumable-history-entry-date">
                                                {formatDateTime(transaction.completedAt || transaction.transactionDate)}
                                            </div>
                                        </div>
                                        <div className="consumable-history-entry-body">
                                            {relevantItem && (
                                                <div className="consumable-history-quantity-contribution">
                                                    <div className="consumable-history-contribution-header">
                                                        <span className="consumable-history-contribution-label">Received:</span>
                                                        <div className="consumable-history-quantity-info">
                                                            <span className="quantity-value">{getEquipmentQuantity(transaction, relevantItem)}</span>
                                                            <span className="quantity-unit">{relevantItem.itemUnit || 'units'}</span>
                                                        </div>
                                                    </div>
                                                    {/*{relevantItem.receivedQuantity && relevantItem.receivedQuantity !== relevantItem.quantity && (*/}
                                                    {/*    <div className="consumable-history-received-info">*/}
                                                    {/*        <span className="received-label">Actually Received:</span>*/}
                                                    {/*        <span className="received-value">{relevantItem.receivedQuantity} {relevantItem.itemUnit || 'units'}</span>*/}
                                                    {/*    </div>*/}
                                                    {/*)}*/}
                                                </div>
                                            )}
                                            


                                            <div className="consumable-history-transaction-flow">
                                                <div className="consumable-history-flow-info">
                                                    <span className="flow-label">From:</span>
                                                    <span className="flow-value">
                                                        {transaction.senderName || getPartyDisplayName(transaction.senderType)}
                                                    </span>
                                                </div>
                                                <div className="consumable-history-flow-arrow">→</div>
                                                <div className="consumable-history-flow-info">
                                                    <span className="flow-label">To:</span>
                                                    <span className="flow-value">
                                                        {transaction.receiverName || getPartyDisplayName(transaction.receiverType)}
                                                    </span>
                                                </div>
                                            </div>

                                            {transaction.addedBy && (
                                                <div className="consumable-history-transaction-user">
                                                    <span className="user-label">Added by:</span>
                                                    <span className="user-value">{transaction.addedBy}</span>
                                                </div>
                                            )}

                                            {transaction.acceptanceComment && (
                                                <div className="consumable-history-entry-comment">
                                                    <span className="comment-label">Note:</span>
                                                    <span className="comment-value">{transaction.acceptanceComment}</span>
                                                </div>
                                            )}

                                            {/* Show item-specific rejection reason if exists, otherwise transaction rejection reason */}
                                            {(relevantItem?.rejectionReason || transaction.rejectionReason) && (
                                                <div className="consumable-history-entry-comment rejection">
                                                    <span className="comment-label">
                                                        {relevantItem?.rejectionReason ? 'Item Rejection Reason:' : 'Transaction Rejection Reason:'}
                                                    </span>
                                                    <span className="comment-value">
                                                        {cleanRejectionReason(relevantItem?.rejectionReason || transaction.rejectionReason)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="no-history">
                            <div className="empty-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3>No Transaction History Found</h3>
                            <p>No transactions found that contributed to this consumable being in inventory. This shows the transaction-based history of how this consumable came to exist in the equipment's inventory.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EquipmentConsumablesHistoryModal; 