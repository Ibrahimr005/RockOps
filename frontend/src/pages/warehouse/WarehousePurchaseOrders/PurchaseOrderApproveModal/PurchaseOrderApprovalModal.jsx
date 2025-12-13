import React, { useState, useEffect } from "react";
import { purchaseOrderService } from "../../../../services/procurement/purchaseOrderService";
import "./PurchaseOrderApprovalModal.scss";

const PurchaseOrderApprovalModal = ({ purchaseOrder, isOpen, onClose, onApprove }) => {
    const [itemStatuses, setItemStatuses] = useState({});
    const [inputValues, setInputValues] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
            // Initialize item statuses when modal opens
            if (purchaseOrder?.purchaseOrderItems) {
                const initialStatuses = {};
                const initialInputValues = {};
                purchaseOrder.purchaseOrderItems.forEach(item => {
                    // Check if item is already partially received
                    const alreadyReceived = item.receivedQuantity || 0;
                    const remaining = item.quantity - alreadyReceived;

                    initialStatuses[item.id] = {
                        hasArrived: false,
                        arrivedQuantity: 0,
                        maxQuantity: remaining, // Only allow receiving what's left
                        alreadyReceived: alreadyReceived,
                        totalOrdered: item.quantity
                    };
                    initialInputValues[item.id] = '0';
                });
                setItemStatuses(initialStatuses);
                setInputValues(initialInputValues);
            }
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen, purchaseOrder]);

    if (!isOpen || !purchaseOrder) return null;

    // Helper functions
    const getItemName = (item) => {
        return item.itemType?.name ||
            item.offerItem?.requestOrderItem?.itemType?.name ||
            item.itemTypeName ||
            "Unknown Item";
    };

    const getItemCategory = (item) => {
        return item.itemType?.itemCategory?.name ||
            item.itemType?.category?.name ||
            item.offerItem?.requestOrderItem?.itemType?.category?.name ||
            item.itemCategory ||
            null;
    };

    const formatQuantity = (quantity, item) => {
        const unit = item.itemType?.measuringUnit ||
            item.offerItem?.requestOrderItem?.itemType?.measuringUnit ||
            'units';
        return `${quantity} ${unit}`;
    };

    const formatCurrency = (amount, currency = 'EGP') => {
        return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Handle item arrival status change
    const handleItemArrivalChange = (itemId, hasArrived) => {
        const maxQuantity = itemStatuses[itemId]?.maxQuantity || 0;
        const newQuantity = hasArrived ? maxQuantity : 0;

        setItemStatuses(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                hasArrived,
                arrivedQuantity: newQuantity
            }
        }));

        setInputValues(prev => ({
            ...prev,
            [itemId]: newQuantity.toString()
        }));
    };

// Handle arrived quantity change
    const handleArrivedQuantityChange = (itemId, inputValue) => {
        const maxQuantity = itemStatuses[itemId]?.maxQuantity || 0;

        // Always update the input value (for display)
        setInputValues(prev => ({
            ...prev,
            [itemId]: inputValue
        }));

        // Parse the quantity
        let quantity = 0;
        if (inputValue !== '' && !isNaN(inputValue)) {
            quantity = parseInt(inputValue) || 0;
        }

        const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));

        // FIXED: Don't uncheck if input is just empty (user is typing)
        // Only uncheck if user explicitly sets it to 0
        setItemStatuses(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                arrivedQuantity: validQuantity,
                // Keep hasArrived true if input is empty (user is typing) or if quantity > 0
                hasArrived: inputValue === '' ? prev[itemId].hasArrived : validQuantity > 0
            }
        }));
    };

    // Handle form submission - UPDATED to use new backend
    const handleApprove = async () => {
        if (isSubmitting) return;

        // Get items that have arrived
        const receivedItems = Object.entries(itemStatuses)
            .filter(([_, status]) => status.hasArrived && status.arrivedQuantity > 0)
            .map(([itemId, status]) => ({
                purchaseOrderItemId: itemId,
                receivedQuantity: status.arrivedQuantity
            }));

        if (receivedItems.length === 0) {
            alert('Please mark at least one item as arrived with a quantity greater than 0');
            return;
        }

        setIsSubmitting(true);
        try {
            console.log('Submitting received items:', receivedItems);

            // Call the new backend endpoint
            const response = await purchaseOrderService.receiveItems(
                purchaseOrder.id,
                receivedItems
            );

            console.log('Receive items response:', response);

            // Call parent's onApprove callback with the updated purchase order
            if (onApprove) {
                await onApprove(response.purchaseOrder || response);
            }

            onClose();
        } catch (error) {
            console.error('Error receiving items:', error);
            alert('Failed to receive items. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate summary stats
    const totalItems = purchaseOrder.purchaseOrderItems?.length || 0;
    const arrivedItems = Object.values(itemStatuses).filter(status => status.hasArrived && status.arrivedQuantity > 0).length;
    const hasAnyArrivals = arrivedItems > 0;

    return (
        <div className="purchase-order-approval-modal-overlay" onClick={onClose}>
            <div className="purchase-order-approval-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="purchase-order-approval-modal-header">
                    <div className="purchase-order-approval-modal-header-content">
                        <h2 className="purchase-order-approval-modal-title">Receive Purchase Order Items</h2>
                        <div className="purchase-order-approval-modal-po-number">
                            #{purchaseOrder.poNumber}
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="purchase-order-approval-modal-content">
                    {/* Summary Section */}
                    <div className="purchase-order-approval-modal-content-section">
                        <h3 className="purchase-order-approval-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4"/>
                                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                                <path d="M3 12h6m12 0h-6"/>
                            </svg>
                            Receipt Summary
                        </h3>
                        <div className="purchase-order-approval-modal-summary-grid">
                            <div className="purchase-order-approval-modal-summary-item">
                                <div className="purchase-order-approval-modal-summary-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-approval-modal-summary-content">
                                    <span className="purchase-order-approval-modal-summary-label">Total Items</span>
                                    <span className="purchase-order-approval-modal-summary-value">{totalItems}</span>
                                </div>
                            </div>

                            <div className="purchase-order-approval-modal-summary-item">
                                <div className="purchase-order-approval-modal-summary-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                </div>
                                <div className="purchase-order-approval-modal-summary-content">
                                    <span className="purchase-order-approval-modal-summary-label">Items Receiving</span>
                                    <span className="purchase-order-approval-modal-summary-value">{arrivedItems}</span>
                                </div>
                            </div>

                            <div className="purchase-order-approval-modal-summary-item">
                                <div className="purchase-order-approval-modal-summary-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="1" x2="12" y2="23"/>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-approval-modal-summary-content">
                                    <span className="purchase-order-approval-modal-summary-label">Total Value</span>
                                    <span className="purchase-order-approval-modal-summary-value">
                                        {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="purchase-order-approval-modal-instructions">
                            <p>Mark which items have arrived and specify the quantities received. The warehouse inventory will be updated automatically.</p>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="purchase-order-approval-modal-content-section">
                        <h3 className="purchase-order-approval-modal-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Purchase Order Items ({totalItems})
                        </h3>

                        {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                            <div className="purchase-order-approval-modal-items-grid">
                                {purchaseOrder.purchaseOrderItems.map((item, index) => {
                                    const itemStatus = itemStatuses[item.id] || {
                                        hasArrived: false,
                                        arrivedQuantity: 0,
                                        maxQuantity: item.quantity || 0,
                                        alreadyReceived: 0,
                                        totalOrdered: item.quantity || 0
                                    };

                                    return (
                                        <div key={item.id || index} className={`purchase-order-approval-modal-item-card ${itemStatus.hasArrived ? 'arrived' : ''}`}>
                                            <div className="purchase-order-approval-modal-item-header">
                                                <div className="purchase-order-approval-modal-item-info">
                                                    <div className="purchase-order-approval-modal-item-icon-container">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                        </svg>
                                                    </div>
                                                    <div className="purchase-order-approval-modal-item-details">
                                                        <div className="purchase-order-approval-modal-item-name">
                                                            {getItemName(item)}
                                                        </div>
                                                        {getItemCategory(item) && (
                                                            <div className="purchase-order-approval-modal-item-category">
                                                                {getItemCategory(item)}
                                                            </div>
                                                        )}
                                                        <div className="purchase-order-approval-modal-item-meta">
                                                            <span>Ordered: {formatQuantity(itemStatus.totalOrdered, item)}</span>
                                                            {itemStatus.alreadyReceived > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="already-received">
                                                                        Already received: {formatQuantity(itemStatus.alreadyReceived, item)}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span className="remaining">
                                                                        Remaining: {formatQuantity(itemStatus.maxQuantity, item)}
                                                                    </span>
                                                                </>
                                                            )}
                                                            <span>•</span>
                                                            <span>{formatCurrency(item.totalPrice, purchaseOrder.currency)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="purchase-order-approval-modal-item-controls">
                                                    <label className="purchase-order-approval-modal-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={itemStatus.hasArrived}
                                                            onChange={(e) => handleItemArrivalChange(item.id, e.target.checked)}
                                                            disabled={itemStatus.maxQuantity === 0}
                                                        />
                                                        <span className="purchase-order-approval-modal-checkmark"></span>
                                                        <span className="purchase-order-approval-modal-checkbox-label">
                                                            {itemStatus.maxQuantity === 0 ? 'Fully Received' : 'Arrived'}
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>

                                            {itemStatus.hasArrived && itemStatus.maxQuantity > 0 && (
                                                <div className="purchase-order-approval-modal-item-quantity-section">
                                                    <div className="purchase-order-approval-modal-quantity-divider"></div>
                                                    <div className="purchase-order-approval-modal-quantity-controls">
                                                        <label className="purchase-order-approval-modal-quantity-label">
                                                            Quantity Receiving Now:
                                                        </label>
                                                        <div className="purchase-order-approval-modal-quantity-input-group">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={itemStatus.maxQuantity}
                                                                value={inputValues[item.id] || ''}
                                                                onChange={(e) => handleArrivedQuantityChange(item.id, e.target.value)}
                                                                className="purchase-order-approval-modal-quantity-input"
                                                            />
                                                            <span className="purchase-order-approval-modal-quantity-unit">
                                                                / {formatQuantity(itemStatus.maxQuantity, item)}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="purchase-order-approval-modal-max-button"
                                                            onClick={() => {
                                                                const maxQuantity = itemStatus.maxQuantity;
                                                                handleArrivedQuantityChange(item.id, maxQuantity.toString());
                                                            }}
                                                        >
                                                            Max
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="purchase-order-approval-modal-empty-state">
                                <div className="purchase-order-approval-modal-empty-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12h8"/>
                                    </svg>
                                </div>
                                <div className="purchase-order-approval-modal-empty-content">
                                    <p className="purchase-order-approval-modal-empty-title">No items found</p>
                                    <p className="purchase-order-approval-modal-empty-description">This purchase order doesn't contain any items.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="purchase-order-approval-modal-footer">
                    <div className="purchase-order-approval-modal-footer-info">
                        {hasAnyArrivals ? (
                            <span className="purchase-order-approval-modal-footer-status success">
                                {arrivedItems} of {totalItems} items marked for receiving
                            </span>
                        ) : (
                            <span className="purchase-order-approval-modal-footer-status warning">
                                No items marked for receiving yet
                            </span>
                        )}
                    </div>
                    <div className="purchase-order-approval-modal-footer-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleApprove}
                            disabled={isSubmitting || !hasAnyArrivals}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="purchase-order-approval-modal-spinner"></div>
                                    Receiving Items...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    Receive Items
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderApprovalModal;