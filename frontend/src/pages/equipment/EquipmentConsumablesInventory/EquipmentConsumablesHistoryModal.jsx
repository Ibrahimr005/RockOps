import React from "react";
import "./EquipmentConsumablesHistoryModal.scss";

const EquipmentConsumablesHistoryModal = ({ isOpen, onClose, consumableHistory, consumableResolutions, itemDetails }) => {
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
        
        // If the item was resolved through counting error, use the corrected quantity
        if (relevantItem.isResolved && relevantItem.resolutionType === 'COUNTING_ERROR' && relevantItem.correctedQuantity !== null) {
            return relevantItem.correctedQuantity;
        }
        
        // For failed counting error resolutions, show the attempted corrected quantity
        if (relevantItem.isResolved && relevantItem.resolutionType === 'COUNTING_ERROR' && !relevantItem.fullyResolved && relevantItem.correctedQuantity !== null) {
            return relevantItem.correctedQuantity;
        }
        
        // 🆕 SIMPLIFIED: Use the new equipmentReceivedQuantity field when available
        if (relevantItem.equipmentReceivedQuantity !== undefined && relevantItem.equipmentReceivedQuantity !== null) {
            return relevantItem.equipmentReceivedQuantity;
        }
        
        // Fallback to old logic for backward compatibility with existing data
        if (transaction.receiverType === 'EQUIPMENT' && transaction.sentFirst === transaction.receiverId) {
            // Equipment initiated/created the transaction - show the quantity they specified
            return relevantItem.quantity;
        } else {
            // Equipment validated the transaction - show the receivedQuantity they specified
            return relevantItem.receivedQuantity !== undefined ? relevantItem.receivedQuantity : relevantItem.quantity;
        }
    };

    // Get resolution message for display
    const getResolutionMessage = (relevantItem) => {
        console.log("🔍 [HISTORY-MODAL] getResolutionMessage called with item:", relevantItem);
        console.log("🔍 [HISTORY-MODAL] Item isResolved:", relevantItem?.isResolved, "fullyResolved:", relevantItem?.fullyResolved);
        console.log("🔍 [HISTORY-MODAL] Item resolutionType:", relevantItem?.resolutionType);
        
        if (!relevantItem || (!relevantItem.isResolved && relevantItem.isResolved !== true)) {
            console.log("🔍 [HISTORY-MODAL] No resolution message - item not resolved (isResolved:", relevantItem?.isResolved, ")");
            return null;
        }
        
        // Don't show resolution message for failed resolutions
        if (!relevantItem.fullyResolved) {
            console.log("🔍 [HISTORY-MODAL] No resolution message - resolution not fully completed");
            return null;
        }
        
        switch (relevantItem.resolutionType) {
            case 'ACCEPT_SURPLUS':
                return {
                    type: 'success',
                    message: 'Surplus accepted and resolved',
                    details: 'This discrepancy was resolved by accepting the surplus items.'
                };
            case 'COUNTING_ERROR':
                return {
                    type: 'info',
                    message: 'Resolved through counting error correction',
                    details: `Quantity corrected from ${relevantItem.quantity} to ${relevantItem.correctedQuantity} units.`
                };
            case 'ACKNOWLEDGE_LOSS':
                return {
                    type: 'warning',
                    message: 'Loss acknowledged',
                    details: 'This discrepancy was resolved by acknowledging the loss of items.'
                };
            case 'FOUND_ITEMS':
                return {
                    type: 'success',
                    message: 'Items found and restored',
                    details: 'Missing items were found and restored to inventory.'
                };
            case 'REPORT_THEFT':
                return {
                    type: 'danger',
                    message: 'Theft reported',
                    details: 'This discrepancy was resolved by reporting theft of items.'
                };
            case 'RETURN_TO_SENDER':
                return {
                    type: 'info',
                    message: 'Returned to sender',
                    details: 'Surplus items were returned to the original sender.'
                };
            default:
                return {
                    type: 'info',
                    message: 'Resolved',
                    details: 'This discrepancy has been resolved.'
                };
        }
    };

    // Get discrepancy message for unresolved items
    const getDiscrepancyMessage = (relevantItem, transaction) => {
        console.log("🔍 [HISTORY-MODAL] getDiscrepancyMessage called with item:", relevantItem);
        console.log("🔍 [HISTORY-MODAL] Transaction:", transaction.id, "batch:", transaction.batchNumber);
        console.log("🔍 [HISTORY-MODAL] Item status:", relevantItem?.status, "isResolved:", relevantItem?.isResolved, "fullyResolved:", relevantItem?.fullyResolved);
        
        if (!relevantItem) return null;
        
        // If resolved, don't show discrepancy message
        if ((relevantItem.isResolved === true) && (relevantItem.fullyResolved === true)) {
            console.log("🔍 [HISTORY-MODAL] No discrepancy message - item is resolved");
            return null;
        }
        
        // Check if there was a failed counting error resolution
        if (relevantItem.isResolved && relevantItem.resolutionType === 'COUNTING_ERROR' && !relevantItem.fullyResolved) {
            return {
                type: 'danger',
                message: 'Counting error resolution failed',
                details: `Attempted to correct quantity to ${relevantItem.correctedQuantity} units but validation failed. Please try again with the correct quantity.`
            };
        }
        
        // Only show discrepancy messages for items that are actually rejected
        if (relevantItem.status !== 'REJECTED' && relevantItem.status !== 'MISSING' && relevantItem.status !== 'OVERRECEIVED') {
            return null;
        }
        
        // 🆕 SIMPLIFIED LOGIC: Use clear warehouse vs equipment quantities
        let warehouseSentQuantity;
        let equipmentReceivedQuantity;
        
        // Get warehouse sent quantity
        if (transaction.receiverType === 'EQUIPMENT' && transaction.sentFirst === transaction.senderId) {
            // Warehouse initiated: quantity field is what warehouse sent
            warehouseSentQuantity = relevantItem.quantity;
        } else if (transaction.receiverType === 'EQUIPMENT' && transaction.sentFirst === transaction.receiverId) {
            // Equipment initiated: receivedQuantity is what warehouse validates they sent
            warehouseSentQuantity = relevantItem.receivedQuantity;
        } else {
            // Not an equipment transaction, skip discrepancy logic
            return null;
        }
        
        // Get equipment received quantity using the new field or fallback
        if (relevantItem.equipmentReceivedQuantity !== undefined && relevantItem.equipmentReceivedQuantity !== null) {
            equipmentReceivedQuantity = relevantItem.equipmentReceivedQuantity;
        } else {
            // Fallback to old logic for backward compatibility
            equipmentReceivedQuantity = getEquipmentQuantity(transaction, relevantItem);
        }
        
        // Check for discrepancies
        if (warehouseSentQuantity === undefined || warehouseSentQuantity === equipmentReceivedQuantity) {
            return null; // No discrepancy
        }
        
        if (equipmentReceivedQuantity > warehouseSentQuantity) {
            return {
                type: 'warning',
                message: 'Equipment over-claimed received items',
                details: `Equipment claimed to receive ${equipmentReceivedQuantity} units but warehouse only sent ${warehouseSentQuantity} units. Check the over-received items tab to resolve this discrepancy.`
            };
        } else {
            return {
                type: 'danger',
                message: 'Equipment received less than sent',
                details: `Equipment received ${equipmentReceivedQuantity} units but warehouse sent ${warehouseSentQuantity} units. This discrepancy needs warehouse attention.`
            };
        }
    };

    // Get resolution type display name
    const getResolutionTypeDisplayName = (resolutionType) => {
        switch(resolutionType) {
            case 'ACKNOWLEDGE_LOSS':
                return 'Loss Acknowledged';
            case 'COUNTING_ERROR':
                return 'Counting Error';
            case 'FOUND_ITEMS':
                return 'Items Found';
            case 'REPORT_THEFT':
                return 'Theft Reported';
            case 'ACCEPT_SURPLUS':
                return 'Surplus Accepted';
            case 'RETURN_TO_SENDER':
                return 'Return to Sender';
            default:
                return resolutionType || 'Unknown';
        }
    };

    // Get resolution status badge class
    const getResolutionStatusClass = (resolutionType) => {
        switch(resolutionType) {
            case 'ACKNOWLEDGE_LOSS':
            case 'REPORT_THEFT':
                return 'consumable-history-status-badge resolved-loss';
            case 'COUNTING_ERROR':
                return 'consumable-history-status-badge counting-error';
            case 'FOUND_ITEMS':
                return 'consumable-history-status-badge found-items';
            case 'ACCEPT_SURPLUS':
                return 'consumable-history-status-badge surplus-accepted';
            case 'RETURN_TO_SENDER':
                return 'consumable-history-status-badge return-sender';
            default:
                return 'consumable-history-status-badge resolved';
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
                                    <button className="btn-close" onClick={onClose} aria-label="Close"></button>
                </div>

                <div className="consumables-history-modal-body">
                    {(consumableHistory.length > 0 || (consumableResolutions && consumableResolutions.length > 0)) ? (
                        <div className="history-timeline">
                            {/* Combine transactions and resolutions into a single timeline */}
                            {(() => {
                                const allEntries = [];
                                
                                // Add transactions
                                consumableHistory.forEach((transaction, index) => {
                                    allEntries.push({
                                        type: 'transaction',
                                        data: transaction,
                                        date: transaction.completedAt || transaction.transactionDate,
                                        index
                                    });
                                });
                                
                                // Add resolutions
                                if (consumableResolutions) {
                                    consumableResolutions.forEach((resolution, index) => {
                                        allEntries.push({
                                            type: 'resolution',
                                            data: resolution,
                                            date: resolution.resolvedAt,
                                            index
                                        });
                                    });
                                }
                                
                                // Sort by date (most recent first)
                                allEntries.sort((a, b) => {
                                    if (!a.date && !b.date) return 0;
                                    if (!a.date) return 1;
                                    if (!b.date) return -1;
                                    return new Date(b.date) - new Date(a.date);
                                });
                                
                                                                return allEntries.map((entry, index) => {
                                    if (entry.type === 'transaction') {
                                        const transaction = entry.data;
                                        
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
                                            <div key={`transaction-${transaction.id || index}`} className="history-entry">
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
                                                        <span className="consumable-history-contribution-label">Equipment Claims:</span>
                                                        <div className="consumable-history-quantity-info">
                                                            <span className="quantity-value">{getEquipmentQuantity(transaction, relevantItem)}</span>
                                                            <span className="quantity-unit">{relevantItem.itemUnit || 'units'}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Show resolution message if resolved */}
                                                    {(() => {
                                                        const resolutionMessage = getResolutionMessage(relevantItem);
                                                        if (resolutionMessage) {
                                                            return (
                                                                <div className={`consumable-history-resolution-message ${resolutionMessage.type}`}>
                                                                    <span className="resolution-message-label">{resolutionMessage.message}</span>
                                                                    <span className="resolution-message-details">{resolutionMessage.details}</span>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // Show discrepancy message if not resolved
                                                        const discrepancyMessage = getDiscrepancyMessage(relevantItem, transaction);
                                                        if (discrepancyMessage) {
                                                            return (
                                                                <div className={`consumable-history-discrepancy-message ${discrepancyMessage.type}`}>
                                                                    <span className="discrepancy-message-label">{discrepancyMessage.message}</span>
                                                                    <span className="discrepancy-message-details">{discrepancyMessage.details}</span>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // Show original discrepancy info as fallback


                                                    })()}
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
                            } else if (entry.type === 'resolution') {
                                const resolution = entry.data;
                                
                                return (
                                    <div key={`resolution-${resolution.id || index}`} className="history-entry resolution-entry">
                                        <div className="history-entry-header">
                                            <div className="consumable-history-entry-type">
                                                <span className={getResolutionStatusClass(resolution.resolutionType)}>
                                                    {getResolutionTypeDisplayName(resolution.resolutionType)}
                                                </span>
                                            </div>
                                            <div className="consumable-history-entry-date">
                                                {formatDateTime(resolution.resolvedAt)}
                                            </div>
                                        </div>
                                        <div className="consumable-history-entry-body">
                                            <div className="consumable-history-resolution-info">
                                                <div className="resolution-details">
                                                    <div className="resolution-quantity-info">
                                                        <span className="resolution-label">Original Quantity:</span>
                                                        <span className="resolution-value">{resolution.originalQuantity} units</span>
                                                    </div>
                                                    {resolution.correctedQuantity !== null && (
                                                        <div className="resolution-quantity-info">
                                                            <span className="resolution-label">Corrected Quantity:</span>
                                                            <span className="resolution-value">{resolution.correctedQuantity} units</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {resolution.resolvedBy && (
                                                    <div className="consumable-history-transaction-user">
                                                        <span className="user-label">Resolved by:</span>
                                                        <span className="user-value">{resolution.resolvedBy}</span>
                                                    </div>
                                                )}
                                                
                                                {resolution.notes && (
                                                    <div className="consumable-history-entry-comment">
                                                        <span className="comment-label">Resolution Notes:</span>
                                                        <span className="comment-value">{resolution.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    )()}
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