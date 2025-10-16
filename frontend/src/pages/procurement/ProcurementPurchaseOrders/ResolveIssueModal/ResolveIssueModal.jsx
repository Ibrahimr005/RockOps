import React, { useState, useEffect } from "react";
import "./ResolveIssueModal.scss";

const ResolveIssueModal = ({ purchaseOrder, isOpen, onClose, onSubmit }) => {
    const [resolutionType, setResolutionType] = useState('REDELIVERY');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
            // Reset state when modal opens
            setResolutionType('REDELIVERY');
            setResolutionNotes('');
            if (purchaseOrder?.purchaseOrderItems) {
                const initialSelected = {};
                purchaseOrder.purchaseOrderItems.forEach(item => {
                    initialSelected[item.id] = false;
                });
                setSelectedItems(initialSelected);
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

    // Handle item selection
    const handleItemSelect = (itemId, checked) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: checked
        }));
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (isSubmitting) return;

        // Get selected items
        const itemsToResolve = Object.entries(selectedItems)
            .filter(([_, selected]) => selected)
            .map(([itemId, _]) => itemId);

        if (itemsToResolve.length === 0) {
            alert('Please select at least one item to resolve');
            return;
        }

        if (!resolutionNotes.trim()) {
            alert('Please provide resolution notes');
            return;
        }

        setIsSubmitting(true);
        try {
            const resolutionData = {
                purchaseOrderId: purchaseOrder.id,
                resolutionType: resolutionType,
                items: itemsToResolve,
                notes: resolutionNotes
            };

            console.log('Resolving issue:', resolutionData);

            if (onSubmit) {
                await onSubmit(resolutionData);
            }

            onClose();
        } catch (error) {
            console.error('Error resolving issue:', error);
            alert('Failed to resolve issue. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate summary
    const totalItems = purchaseOrder.purchaseOrderItems?.length || 0;
    const selectedItemsCount = Object.values(selectedItems).filter(selected => selected).length;
    const hasSelection = selectedItemsCount > 0;

    return (
        <div className="resolve-issue-modal-overlay" onClick={onClose}>
            <div className="resolve-issue-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="resolve-issue-modal-header">
                    <div className="resolve-issue-modal-header-content">
                        <div className="resolve-issue-icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        </div>
                        <div>
                            <h2 className="resolve-issue-modal-title">Resolve Purchase Order Issue</h2>
                            <div className="resolve-issue-modal-po-number">
                                PO #{purchaseOrder.poNumber}
                            </div>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="resolve-issue-modal-content">
                    {/* Instructions */}
                    <div className="resolve-issue-instructions">
                        <div className="instruction-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4"/>
                                <path d="M12 8h.01"/>
                            </svg>
                        </div>
                        <div className="instruction-text">
                            <p><strong>Select the resolution type</strong> and specify which items are being resolved. Provide detailed notes about the resolution action taken.</p>
                        </div>
                    </div>

                    {/* Resolution Type Selection */}
                    <div className="resolution-type-section">
                        <h3 className="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                            Resolution Type
                        </h3>

                        <div className="resolution-type-grid">
                            <label className={`resolution-type-card ${resolutionType === 'REDELIVERY' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="resolutionType"
                                    value="REDELIVERY"
                                    checked={resolutionType === 'REDELIVERY'}
                                    onChange={(e) => setResolutionType(e.target.value)}
                                />
                                <div className="resolution-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M16 3h5v5"/>
                                        <path d="M8 3H3v5"/>
                                        <path d="M12 22v-8"/>
                                        <path d="M16 18l-4 4-4-4"/>
                                        <path d="M3 8l9-5 9 5"/>
                                    </svg>
                                </div>
                                <div className="resolution-type-content">
                                    <h4>Re-delivery</h4>
                                    <p>Merchant will reship the items</p>
                                </div>
                            </label>

                            <label className={`resolution-type-card ${resolutionType === 'REFUND' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="resolutionType"
                                    value="REFUND"
                                    checked={resolutionType === 'REFUND'}
                                    onChange={(e) => setResolutionType(e.target.value)}
                                />
                                <div className="resolution-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="1" x2="12" y2="23"/>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                </div>
                                <div className="resolution-type-content">
                                    <h4>Refund</h4>
                                    <p>Issue refund for the items</p>
                                </div>
                            </label>

                            <label className={`resolution-type-card ${resolutionType === 'REPLACEMENT_PO' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="resolutionType"
                                    value="REPLACEMENT_PO"
                                    checked={resolutionType === 'REPLACEMENT_PO'}
                                    onChange={(e) => setResolutionType(e.target.value)}
                                />
                                <div className="resolution-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <path d="M14 2v6h6"/>
                                        <path d="M12 18v-6"/>
                                        <path d="M9 15l3-3 3 3"/>
                                    </svg>
                                </div>
                                <div className="resolution-type-content">
                                    <h4>New Purchase Order</h4>
                                    <p>Create new PO with different merchant</p>
                                </div>
                            </label>

                            <label className={`resolution-type-card ${resolutionType === 'ACCEPT_SHORTAGE' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="resolutionType"
                                    value="ACCEPT_SHORTAGE"
                                    checked={resolutionType === 'ACCEPT_SHORTAGE'}
                                    onChange={(e) => setResolutionType(e.target.value)}
                                />
                                <div className="resolution-type-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                </div>
                                <div className="resolution-type-content">
                                    <h4>Accept Shortage</h4>
                                    <p>Accept the issue and close PO</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="resolve-issue-summary">
                        <div className="summary-item">
                            <span className="summary-label">Total Items:</span>
                            <span className="summary-value">{totalItems}</span>
                        </div>
                        <div className="summary-item highlight">
                            <span className="summary-label">Items Selected:</span>
                            <span className="summary-value">{selectedItemsCount}</span>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="resolve-issue-items-section">
                        <h3 className="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                            </svg>
                            Select Items to Resolve
                        </h3>

                        {purchaseOrder.purchaseOrderItems && purchaseOrder.purchaseOrderItems.length > 0 ? (
                            <div className="resolve-issue-items-list">
                                {purchaseOrder.purchaseOrderItems.map((item, index) => (
                                    <div key={item.id || index} className={`resolve-issue-item-card ${selectedItems[item.id] ? 'selected' : ''}`}>
                                        <div className="item-card-header">
                                            <div className="item-checkbox-section">
                                                <label className="resolve-issue-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems[item.id] || false}
                                                        onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                                                    />
                                                    <span className="resolve-issue-checkmark"></span>
                                                </label>
                                                <div className="item-info">
                                                    <div className="item-icon-container">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                        </svg>
                                                    </div>
                                                    <div className="item-details">
                                                        <div className="item-name">{getItemName(item)}</div>
                                                        {getItemCategory(item) && (
                                                            <div className="item-category">{getItemCategory(item)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="item-quantity-price">
                                                <span className="item-quantity">{formatQuantity(item.quantity, item)}</span>
                                                <span className="item-price">{formatCurrency(item.totalPrice, purchaseOrder.currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-items">
                                <p>No items found in this purchase order.</p>
                            </div>
                        )}
                    </div>

                    {/* Resolution Notes Section */}
                    <div className="resolve-issue-notes-section">
                        <label className="notes-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Resolution Notes <span className="required">*</span>
                        </label>
                        <textarea
                            className="notes-textarea"
                            placeholder="Provide detailed information about the resolution action. Include merchant communication, expected timelines, or any other relevant details..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            rows={5}
                        />
                        <div className="notes-help-text">
                            This information will be shared with the warehouse team.
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="resolve-issue-modal-footer">
                    <div className="footer-info">
                        {hasSelection && resolutionNotes.trim() ? (
                            <span className="footer-status ready">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Ready to resolve
                            </span>
                        ) : (
                            <span className="footer-status warning">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {!hasSelection ? 'Select items to resolve' : 'Provide resolution notes'}
                            </span>
                        )}
                    </div>
                    <div className="footer-actions">
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
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasSelection || !resolutionNotes.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="resolve-issue-spinner"></div>
                                    Resolving...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                    Resolve Issue
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResolveIssueModal;