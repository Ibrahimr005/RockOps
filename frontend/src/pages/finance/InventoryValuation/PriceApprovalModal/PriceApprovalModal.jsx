import React, { useState, useEffect } from 'react';
import './PriceApprovalModal.scss';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';

const PriceApprovalModal = ({
                                isOpen,
                                onClose,
                                selectedItems,
                                isBulkMode,
                                onApprovalComplete,
                                showSnackbar
                            }) => {
    const [itemPrices, setItemPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen && selectedItems.length > 0) {
            // Initialize prices with suggested prices
            const initialPrices = {};
            selectedItems.forEach(item => {
                initialPrices[item.itemId] = item.suggestedPrice || '';
            });
            setItemPrices(initialPrices);
            setErrors({});
        }
    }, [isOpen, selectedItems]);

    const handlePriceChange = (itemId, value) => {
        setItemPrices(prev => ({
            ...prev,
            [itemId]: value
        }));

        // Clear error for this item
        if (errors[itemId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[itemId];
                return newErrors;
            });
        }
    };

    const validatePrices = () => {
        const newErrors = {};
        let isValid = true;

        selectedItems.forEach(item => {
            const price = itemPrices[item.itemId];
            if (!price || price === '' || parseFloat(price) <= 0) {
                newErrors[item.itemId] = 'Price must be greater than 0';
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleApprove = async () => {
        if (!validatePrices()) {
            showSnackbar('Please enter valid prices for all items', 'error');
            return;
        }

        setLoading(true);
        try {
            if (isBulkMode) {
                // Bulk approval
                const items = selectedItems.map(item => ({
                    itemId: item.itemId,
                    unitPrice: parseFloat(itemPrices[item.itemId])
                }));

                await inventoryValuationService.bulkApproveItemPrices(items);
            } else {
                // Single approval
                const item = selectedItems[0];
                await inventoryValuationService.approveItemPrice(
                    item.itemId,
                    parseFloat(itemPrices[item.itemId])
                );
            }

            onApprovalComplete();
        } catch (error) {
            console.error('Failed to approve items:', error);
            showSnackbar('Failed to approve items', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const totalValue = selectedItems.reduce((sum, item) => {
        const price = parseFloat(itemPrices[item.itemId]) || 0;
        return sum + (price * item.quantity);
    }, 0);

    return (
        <div className="modal-backdrop" onClick={handleOverlayClick}>
            <div className="modal-container modal-xl">
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {isBulkMode ? 'Approve Multiple Items' : 'Approve Item Price'}
                    </div>
                    <button
                        className="btn-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    {/* Info Banner */}
                    <div className="modal-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                        </svg>
                        <div>
                            {isBulkMode ? (
                                <span>Review and set prices for <strong>{selectedItems.length} items</strong>. You can modify the suggested prices before approving.</span>
                            ) : (
                                <span>Set the unit price for this item. The suggested price is shown but can be modified.</span>
                            )}
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="approval-items-list">
                        {selectedItems.map((item, index) => (
                            <div key={item.itemId} className="approval-item-card">
                                <div className="approval-item-content">
                                    {/* Left Section - Item Info */}
                                    <div className="item-info-section">
                                        <div className="item-number">#{index + 1}</div>
                                        <div className="item-details">
                                            <h4 className="item-name">{item.itemTypeName}</h4>
                                            <div className="item-meta">
                                                <span className="meta-badge warehouse-badge">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                    </svg>
                                                    {item.warehouseName}
                                                </span>
                                                <span className="meta-badge category-badge">
                                                    {item.itemTypeCategory}
                                                </span>
                                                <span className="meta-badge quantity-badge">
                                                    {item.quantity} {item.measuringUnit}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Section - Price Input */}
                                    <div className="item-price-section">
                                        <div className="price-input-group">
                                            <label htmlFor={`price-${item.itemId}`}>
                                                Unit Price (EGP) <span className="required">*</span>
                                            </label>
                                            <div className="price-input-wrapper">
                                                <input
                                                    type="number"
                                                    id={`price-${item.itemId}`}
                                                    value={itemPrices[item.itemId] || ''}
                                                    onChange={(e) => handlePriceChange(item.itemId, e.target.value)}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className={errors[item.itemId] ? 'error' : ''}
                                                    disabled={loading}
                                                />
                                                {item.suggestedPrice && (
                                                    <button
                                                        type="button"
                                                        className="use-suggested-btn"
                                                        onClick={() => handlePriceChange(item.itemId, item.suggestedPrice)}
                                                        disabled={loading}
                                                        title="Use suggested price"
                                                    >
                                                        Use Suggested
                                                    </button>
                                                )}
                                            </div>
                                            {errors[item.itemId] && (
                                                <span className="error-message">{errors[item.itemId]}</span>
                                            )}
                                            {item.suggestedPrice && (
                                                <span className="suggested-price-hint">
                                                    Suggested: {item.suggestedPrice.toFixed(2)} EGP
                                                </span>
                                            )}
                                        </div>

                                        <div className="total-value-display">
                                            <span className="total-label">Total Value</span>
                                            <span className="total-amount">
                                                {itemPrices[item.itemId]
                                                    ? (parseFloat(itemPrices[item.itemId]) * item.quantity).toFixed(2)
                                                    : '0.00'
                                                } EGP
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    {isBulkMode && (
                        <div className="approval-summary">
                            <div className="summary-row">
                                <span className="summary-label">Total Items:</span>
                                <span className="summary-value">{selectedItems.length}</span>
                            </div>
                            <div className="summary-row summary-total">
                                <span className="summary-label">Total Value:</span>
                                <span className="summary-value">{totalValue.toFixed(2)} EGP</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button
                        className="modal-btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-success"
                        onClick={handleApprove}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="button-spinner"></div>
                                Approving...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {isBulkMode ? `Approve ${selectedItems.length} Items` : 'Approve Item'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PriceApprovalModal;