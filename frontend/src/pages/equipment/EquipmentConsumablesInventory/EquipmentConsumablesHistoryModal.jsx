import React from "react";
import "./EquipmentConsumablesHistoryModal.scss";

const EquipmentConsumablesHistoryModal = ({ isOpen, onClose, consumableHistory, itemDetails }) => {
    if (!isOpen || !consumableHistory) return null;

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
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
                                <span className="stat-label">{itemDetails?.unit}</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="stat-item">
                                <span className="stat-value">{consumableHistory.length}</span>
                                <span className="stat-label">Entries</span>
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
                            {consumableHistory.map((entry, index) => (
                                <div key={index} className="history-entry">
                                    <div className="history-entry-header">
                                        <div className="entry-type">
                                            <span className={`type-badge ${entry.type.toLowerCase()}`}>
                                                {entry.type}
                                            </span>
                                        </div>
                                        <div className="entry-date">
                                            {formatDate(entry.date)}
                                        </div>
                                    </div>
                                    <div className="history-entry-body">
                                        <div className="quantity-info">
                                            <span className="quantity-value">{entry.quantity}</span>
                                            <span className="quantity-unit">{entry.unit}</span>
                                        </div>
                                        <div className="transaction-flow">
                                            <div className="flow-info">
                                                <span className="flow-label">From:</span>
                                                <span className="flow-value">
                                                    {entry.senderName || 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="flow-arrow">→</div>
                                            <div className="flow-info">
                                                <span className="flow-label">To:</span>
                                                <span className="flow-value">
                                                    {entry.receiverName || 'This Equipment'}
                                                </span>
                                            </div>
                                        </div>
                                        {entry.batchNumber && (
                                            <div className="batch-info">
                                                <span className="batch-label">Batch:</span>
                                                <span className="batch-value">{entry.batchNumber}</span>
                                            </div>
                                        )}
                                        {entry.comment && (
                                            <div className="entry-comment">
                                                <span className="comment-label">Note:</span>
                                                <span className="comment-value">{entry.comment}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-history">
                            <div className="empty-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3>No History Available</h3>
                            <p>No transaction history found for this consumable.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EquipmentConsumablesHistoryModal; 