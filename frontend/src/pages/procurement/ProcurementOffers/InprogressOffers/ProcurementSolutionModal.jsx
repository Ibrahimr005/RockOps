import React, { useState, useEffect } from 'react';
import { FiX, FiPlusCircle } from 'react-icons/fi';
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
    const handleSubmit = () => {
        if (!isFormValid()) return;

        onSave(formData);
    };

    // Check if form is valid
    const isFormValid = () => {
        return formData.merchantId &&
            formData.quantity !== '' && formData.quantity > 0 &&
            formData.unitPrice !== '' && formData.unitPrice >= 0;
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isVisible || !requestItem) return null;

    return (
        <div className="procurement-modal-overlay-inprogress" onClick={handleBackdropClick}>
            <div className="procurement-modal-container-inprogress">
                <div className="procurement-modal-header-inprogress">
                    <h4 className="procurement-modal-title-inprogress">
                        {mode === 'edit' ? 'Edit' : 'Add'} Procurement Solution for: {requestItem.itemType?.name || 'Item'}
                    </h4>
                    <button
                        className="procurement-modal-close-button-inprogress"
                        onClick={onClose}
                        type="button"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="procurement-modal-body-inprogress">
                    {/* Merchant Selection */}
                    <div className="procurement-form-group-inprogress">
                        <label className="procurement-form-label-inprogress">
                            Merchant <span className="required-asterisk">*</span>
                        </label>
                        <select
                            className="procurement-form-select-inprogress"
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

                    {/* Currency Selection */}
                    <div className="procurement-form-group-inprogress">
                        <label className="procurement-form-label-inprogress">
                            Currency <span className="required-asterisk">*</span>
                        </label>
                        <select
                            className="procurement-form-select-inprogress"
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

                    {/* Quantity and Unit Price Row */}
                    <div className="procurement-form-row-inprogress">
                        <div className="procurement-form-group-inprogress procurement-form-group-half-inprogress">
                            <label className="procurement-form-label-inprogress">
                                Quantity <span className="required-asterisk">*</span>
                            </label>
                            <div className="procurement-form-input-container-inprogress procurement-form-input-with-unit-inprogress">
                                <input
                                    type="number"
                                    className="procurement-form-input-inprogress procurement-form-input-with-unit-suffix-inprogress"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={handleQuantityChange}
                                    placeholder="Enter quantity"
                                />
                                <div className="procurement-unit-suffix-inprogress">
                                    {requestItem.itemType?.measuringUnit || 'units'}
                                </div>
                            </div>
                        </div>

                        <div className="procurement-form-group-inprogress procurement-form-group-half-inprogress">
                            <label className="procurement-form-label-inprogress">
                                Unit Price <span className="required-asterisk">*</span>
                            </label>
                            <div className="procurement-form-input-container-inprogress">
                                <input
                                    type="number"
                                    className="procurement-form-input-inprogress"
                                    step="0.01"
                                    min="0"
                                    value={formData.unitPrice}
                                    onChange={handleUnitPriceChange}
                                    placeholder="Enter unit price"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Price and Delivery Row */}
                    <div className="procurement-form-row-inprogress">
                        <div className="procurement-form-group-inprogress procurement-form-group-half-inprogress">
                            <label className="procurement-form-label-inprogress">Total Price</label>
                            <div className="procurement-form-input-container-inprogress procurement-form-input-with-currency-inprogress">
                                <input
                                    type="text"
                                    className="procurement-form-input-inprogress procurement-form-input-readonly-inprogress"
                                    value={formData.totalPrice.toFixed(2)}
                                    readOnly
                                />
                                <div className="procurement-currency-prefix-inprogress">{formData.currency}</div>
                            </div>
                        </div>

                        <div className="procurement-form-group-inprogress procurement-form-group-half-inprogress">
                            <label className="procurement-form-label-inprogress">
                                Est. Delivery (days) <span className="required-asterisk">*</span>
                            </label>
                            <div className="procurement-form-input-container-inprogress">
                                <input
                                    type="number"
                                    className="procurement-form-input-inprogress"
                                    min="1"
                                    value={formData.estimatedDeliveryDays}
                                    onChange={(e) => handleFieldChange('estimatedDeliveryDays', parseInt(e.target.value) || 7)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delivery Notes */}
                    <div className="procurement-form-group-inprogress">
                        <label className="procurement-form-label-inprogress">Delivery Notes</label>
                        <textarea
                            className="procurement-form-textarea-inprogress"
                            value={formData.deliveryNotes}
                            onChange={(e) => handleFieldChange('deliveryNotes', e.target.value)}
                            placeholder="Any special delivery instructions"
                            rows={3}
                        />
                    </div>

                    {/* Comments (only show in edit mode) */}
                    {mode === 'edit' && (
                        <div className="procurement-form-group-inprogress">
                            <label className="procurement-form-label-inprogress">Comments</label>
                            <textarea
                                className="procurement-form-textarea-inprogress"
                                value={formData.comment}
                                onChange={(e) => handleFieldChange('comment', e.target.value)}
                                placeholder="Additional comments about this item"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <div className="procurement-modal-footer-inprogress">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                    >
                        <FiPlusCircle size={16} />
                        {mode === 'edit' ? 'Save Changes' : 'Add to Offer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProcurementSolutionModal;