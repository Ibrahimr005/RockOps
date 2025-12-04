import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaShoppingBag, FaPlus, FaTrash } from 'react-icons/fa';
import { merchantService } from '../../../services/merchant/merchantService';

const Step2PurchasingForm = ({ ticketId, ticketData, onSave, onComplete, isLoading }) => {
    const [formData, setFormData] = useState({
        merchantId: '',
        downPayment: 0,
        items: []
    });

    const [merchantList, setMerchantList] = useState([]);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadMerchants();
    }, []);

    useEffect(() => {
        // Load existing data from ticketData
        if (ticketData) {
            setFormData({
                merchantId: ticketData.merchantId || '',
                downPayment: ticketData.downPayment || 0,
                items: ticketData.items || []
            });
        }
    }, [ticketData]);

    const loadMerchants = async () => {
        try {
            const response = await merchantService.getAllMerchants();
            setMerchantList(response.data || []);
        } catch (error) {
            console.error('Error loading merchants:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'downPayment' ? (value === '' ? '' : parseFloat(value) || '') : value
        }));

        // Clear error
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];

        if (field === 'expectedCostPerUnit') {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value === '' ? '' : parseFloat(value) || ''
            };
        } else {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };
        }

        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));

        // Clear item-specific error
        if (errors[`item_${index}_${field}`]) {
            setErrors(prev => ({
                ...prev,
                [`item_${index}_${field}`]: ''
            }));
        }
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));

        // Clear errors for this item
        const updatedErrors = { ...errors };
        delete updatedErrors[`item_${index}_cost`];
        setErrors(updatedErrors);
    };

    const calculateTotalExpectedCost = () => {
        return formData.items.reduce((total, item) => {
            return total + (item.quantity * (item.expectedCostPerUnit || 0));
        }, 0);
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.merchantId) {
            newErrors.merchantId = 'Merchant is required';
        }

        if (formData.items.length === 0) {
            newErrors.items = 'At least one item is required';
        }

        // Check each item for expected cost
        formData.items.forEach((item, index) => {
            if (!item.expectedCostPerUnit || item.expectedCostPerUnit <= 0) {
                newErrors[`item_${index}_cost`] = 'Required';
            }
        });

        if (formData.downPayment && formData.downPayment < 0) {
            newErrors.downPayment = 'Down payment cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        onSave({
            merchantId: formData.merchantId,
            downPayment: formData.downPayment,
            items: formData.items
        });
    };

    const handleComplete = () => {
        if (validate()) {
            onComplete({
                merchantId: formData.merchantId,
                downPayment: formData.downPayment,
                items: formData.items
            });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <div className="step-form step2-form">

            <div className="form-grid">
                {/* Merchant */}
                <div className="form-group full-width">
                    <label className="required">Merchant</label>
                    <select
                        name="merchantId"
                        value={formData.merchantId}
                        onChange={handleInputChange}
                        className={errors.merchantId ? 'error' : ''}
                    >
                        <option value="">Select merchant...</option>
                        {merchantList.map(merchant => (
                            <option key={merchant.id} value={merchant.id}>
                                {merchant.name}
                            </option>
                        ))}
                    </select>
                    {errors.merchantId && <span className="error-message">{errors.merchantId}</span>}
                </div>

                {/* Down Payment */}
                <div className="form-group">
                    <label>Down Payment</label>
                    <input
                        type="number"
                        name="downPayment"
                        value={formData.downPayment === '' || formData.downPayment === null ? '' : formData.downPayment}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={errors.downPayment ? 'error' : ''}
                        onWheel={(e) => e.target.blur()}
                    />
                    {errors.downPayment && <span className="error-message">{errors.downPayment}</span>}
                    <small className="field-hint">Optional - leave empty or enter 0 if no down payment</small>
                </div>
            </div>

            {/* Items Section */}
            <div className="items-section">
                <h4>Items with Expected Costs</h4>
                {errors.items && <span className="error-message">{errors.items}</span>}

                {formData.items.length === 0 ? (
                    <div className="initial-item-form">
                        <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
                            Items from Step 1 will appear here. Add expected cost per unit for each item.
                        </p>
                    </div>
                ) : (
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50%' }}>Item Name *</th>
                                <th style={{ width: '15%' }}>Quantity *</th>
                                <th style={{ width: '20%' }}>Expected Cost/Unit *</th>
                                <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <input
                                            type="text"
                                            className="cost-input"
                                            value={item.itemName}
                                            readOnly
                                            style={{ backgroundColor: 'var(--color-surface-hover)', cursor: 'not-allowed' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="cost-input"
                                            value={item.quantity}
                                            readOnly
                                            style={{ backgroundColor: 'var(--color-surface-hover)', cursor: 'not-allowed' }}
                                            onWheel={(e) => e.target.blur()}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className={`cost-input ${errors[`item_${index}_cost`] ? 'error' : ''}`}
                                            value={item.expectedCostPerUnit === '' || item.expectedCostPerUnit === null ? '' : item.expectedCostPerUnit}
                                            onChange={(e) => handleItemChange(index, 'expectedCostPerUnit', e.target.value)}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            onWheel={(e) => e.target.blur()}
                                        />
                                        {errors[`item_${index}_cost`] && (
                                            <span className="error-message" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                                                {errors[`item_${index}_cost`]}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn-icon btn-danger"
                                            onClick={() => removeItem(index)}
                                            title="Remove item"
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Total Expected Cost Display */}
                {formData.items.length > 0 && (
                    <div className="cost-summary">
                        <div className="cost-summary-row total">
                            <span className="cost-label">Total Expected Purchasing Cost:</span>
                            <span className="cost-value">{formatCurrency(calculateTotalExpectedCost())}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    Save Progress
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleComplete}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Complete Step 2'}
                </button>
            </div>
        </div>
    );
};

export default Step2PurchasingForm;
