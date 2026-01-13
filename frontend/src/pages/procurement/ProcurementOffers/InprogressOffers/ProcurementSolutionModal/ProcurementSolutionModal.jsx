import React, { useState, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import './ProcurementSolutionModal.scss';

const ProcurementSolutionModal = ({
                                      isVisible = false,
                                      mode = 'add', // 'add' or 'edit'
                                      requestItem = null,
                                      offerItem = null,
                                      merchants = [],
                                      onClose,
                                      onSave,
                                      defaultCurrency = 'EGP'
                                  }) => {
    const [formData, setFormData] = useState({
        merchantId: '',
        currency: defaultCurrency,
        quantity: '',
        unitPrice: '',
        totalPrice: 0,
        estimatedDeliveryDays: 7,
        deliveryNotes: '',
        comment: ''
    });

    // Initialize form data when modal opens
    useEffect(() => {
        if (!isVisible) return;

        if (mode === 'edit' && offerItem) {
            // Pre-populate form with existing offer item data
            setFormData({
                merchantId: offerItem.merchant?.id || offerItem.merchantId || '',
                currency: offerItem.currency || defaultCurrency,
                quantity: offerItem.quantity || '',
                unitPrice: parseFloat(offerItem.unitPrice) || '',
                totalPrice: parseFloat(offerItem.totalPrice) || 0,
                estimatedDeliveryDays: offerItem.estimatedDeliveryDays || 7,
                deliveryNotes: offerItem.deliveryNotes || '',
                comment: offerItem.comment || ''
            });
        } else if (mode === 'add' && requestItem) {
            // Reset form for new item
            setFormData({
                merchantId: '',
                currency: defaultCurrency,
                quantity: '',
                unitPrice: '',
                totalPrice: 0,
                estimatedDeliveryDays: 7,
                deliveryNotes: '',
                comment: ''
            });
        }
    }, [isVisible, mode, offerItem, requestItem, defaultCurrency]);

    // Handle form field changes
    const handleFieldChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate total price when quantity or unit price changes
            if (field === 'quantity' || field === 'unitPrice') {
                const quantity = field === 'quantity' ? value : updated.quantity;
                const unitPrice = field === 'unitPrice' ? value : updated.unitPrice;
                updated.totalPrice = (quantity || 0) * (unitPrice || 0);
            }

            return updated;
        });
    };

    // Handle quantity input
    const handleQuantityChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid positive integers
        if (value === '' || (!isNaN(value) && parseInt(value) >= 0)) {
            handleFieldChange('quantity', value === '' ? '' : parseInt(value));
        }
    };

    // Handle unit price input
    const handleUnitPriceChange = (e) => {
        const value = e.target.value;
        // Allow empty string or valid numbers (including 0)
        if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
            handleFieldChange('unitPrice', value === '' ? '' : parseFloat(value));
        }
    };

// Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Send itemTypeId instead of requestOrderItemId
        const submissionData = {
            itemTypeId: requestItem.itemTypeId, // Use itemTypeId from requestItem
            merchantId: formData.merchantId,
            currency: formData.currency,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            totalPrice: formData.totalPrice,
            estimatedDeliveryDays: formData.estimatedDeliveryDays,
            deliveryNotes: formData.deliveryNotes,
            comment: mode === 'edit' ? formData.comment : undefined
        };

        onSave(submissionData);
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible || !requestItem) return null;

    console.log("=== REQUEST ITEM DEBUG ===");
    console.log("Full requestItem object:", requestItem);

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content modal-lg procurement-solution-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {mode === 'edit' ? 'Edit' : 'Add'} Procurement Solution for: {requestItem.itemTypeName || 'Item'}
                    </h2>
                    <button className="btn-close" onClick={onClose} type="button">
                        <FiX />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="solution-form">
                            {/* Merchant and Currency Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Merchant <span className="required">*</span></label>
                                    <select
                                        value={formData.merchantId}
                                        onChange={(e) => handleFieldChange('merchantId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select a merchant</option>
                                        {merchants.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Currency <span className="required">*</span></label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => handleFieldChange('currency', e.target.value)}
                                        required
                                    >
                                        <option value="EGP">EGP (Egyptian Pound)</option>
                                        <option value="USD">USD (US Dollar)</option>
                                        <option value="EUR">EUR (Euro)</option>
                                        <option value="GBP">GBP (British Pound)</option>
                                        <option value="JPY">JPY (Japanese Yen)</option>
                                        <option value="CAD">CAD (Canadian Dollar)</option>
                                        <option value="AUD">AUD (Australian Dollar)</option>
                                        <option value="CHF">CHF (Swiss Franc)</option>
                                        <option value="CNY">CNY (Chinese Yuan)</option>
                                        <option value="INR">INR (Indian Rupee)</option>
                                        <option value="SGD">SGD (Singapore Dollar)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Quantity and Unit Price Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quantity <span className="required">*</span></label>
                                    <div className="input-with-unit">
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={handleQuantityChange}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                        <span className="unit-badge">
                                            {requestItem.itemTypeMeasuringUnit || 'units'}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Unit Price <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.unitPrice}
                                        onChange={handleUnitPriceChange}
                                        placeholder="Enter unit price"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Total Price and Delivery Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Total Price</label>
                                    <div className="input-with-unit">
                                        <input
                                            type="text"
                                            value={formData.totalPrice.toFixed(2)}
                                            readOnly
                                        />
                                        <span className="unit-badge currency">
                                            {formData.currency}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Est. Delivery (days) <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.estimatedDeliveryDays}
                                        onChange={(e) => handleFieldChange('estimatedDeliveryDays', parseInt(e.target.value) || 7)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Delivery Notes */}
                            <div className="form-group-full">
                                <label>Delivery Notes</label>
                                <textarea
                                    value={formData.deliveryNotes}
                                    onChange={(e) => handleFieldChange('deliveryNotes', e.target.value)}
                                    placeholder="Any special delivery instructions"
                                    rows={3}
                                />
                            </div>

                            {/* Comments (only show in edit mode) */}
                            {mode === 'edit' && (
                                <div className="form-group-full">
                                    <label>Comments</label>
                                    <textarea
                                        value={formData.comment}
                                        onChange={(e) => handleFieldChange('comment', e.target.value)}
                                        placeholder="Additional comments about this item"
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <div className="footer-left"></div>
                        <div className="footer-right">
                            <button type="button" className="btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-save">
                                <FiCheck /> {mode === 'edit' ? 'Save Changes' : 'Add to Offer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProcurementSolutionModal;