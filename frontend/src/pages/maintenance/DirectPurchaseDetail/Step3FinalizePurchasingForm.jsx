import React, { useState, useEffect } from 'react';
import { FaCalculator, FaCheckCircle } from 'react-icons/fa';

const Step3FinalizePurchasingForm = ({ ticketId, ticketData, onSave, onComplete, isLoading }) => {
    const [formData, setFormData] = useState({
        items: []
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Load existing items from ticketData
        if (ticketData && ticketData.items) {
            setFormData({
                items: ticketData.items.map(item => ({
                    ...item,
                    actualCostPerUnit: item.actualCostPerUnit || 0
                }))
            });
        }
    }, [ticketData]);

    const handleActualCostChange = (index, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            actualCostPerUnit: value
        };
        setFormData(prev => ({
            ...prev,
            items: updatedItems
        }));

        // Clear error if user enters a valid cost
        if (parseFloat(value) > 0 && errors.items) {
            setErrors(prev => ({
                ...prev,
                items: ''
            }));
        }
    };

    const calculateActualTotalCost = () => {
        return formData.items.reduce((total, item) => {
            return total + (item.quantity * (item.actualCostPerUnit || 0));
        }, 0);
    };

    const calculateRemainingPayment = () => {
        const actualTotal = calculateActualTotalCost();
        const downPayment = ticketData?.downPayment || 0;
        return Math.max(0, actualTotal - downPayment);
    };

    const validate = () => {
        const newErrors = {};

        // Check that all items have actual costs
        const itemsWithoutCost = formData.items.filter(item => !item.actualCostPerUnit || item.actualCostPerUnit <= 0);
        if (itemsWithoutCost.length > 0) {
            newErrors.items = 'All items must have actual cost per unit greater than 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        const submittedItems = formData.items.map(item => ({
            ...item,
            actualCostPerUnit: parseFloat(item.actualCostPerUnit) || 0
        }));
        onSave({
            items: submittedItems
        });
    };

    const handleComplete = () => {
        if (validate()) {
            const submittedItems = formData.items.map(item => ({
                ...item,
                actualCostPerUnit: parseFloat(item.actualCostPerUnit) || 0
            }));
            onComplete({
                items: submittedItems
            });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const getCostDifference = (item) => {
        const expected = item.quantity * (item.expectedCostPerUnit || 0);
        const actual = item.quantity * (item.actualCostPerUnit || 0);
        return actual - expected;
    };

    return (
        <div className="step-form step3-form">
            {/* Items Table */}
            <div className="items-section">
                <h4>Enter Actual Costs</h4>
                {errors.items && <span className="error-message">{errors.items}</span>}

                {formData.items.length > 0 ? (
                    <div className="items-list">
                        <table className="items-table detailed">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Quantity</th>
                                    <th>Expected Cost/Unit</th>
                                    <th>Actual Cost/Unit</th>
                                    <th>Total Expected</th>
                                    <th>Total Actual</th>
                                    <th>Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, index) => {
                                    const difference = getCostDifference(item);
                                    const isOverBudget = difference > 0;
                                    return (
                                        <tr key={index}>
                                            <td><strong>{item.itemName}</strong></td>
                                            <td>{item.quantity}</td>
                                            <td className="cost-cell">
                                                {formatCurrency(item.expectedCostPerUnit || 0)}
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.actualCostPerUnit}
                                                    onChange={(e) => handleActualCostChange(index, e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="cost-input"
                                                />
                                            </td>
                                            <td className="cost-cell">
                                                {formatCurrency(item.quantity * (item.expectedCostPerUnit || 0))}
                                            </td>
                                            <td className="cost-cell">
                                                {formatCurrency(item.quantity * (item.actualCostPerUnit || 0))}
                                            </td>
                                            <td className={`cost-cell difference ${isOverBudget ? 'over-budget' : 'under-budget'}`}>
                                                {difference !== 0 && (
                                                    <span>
                                                        {isOverBudget ? '+' : ''}{formatCurrency(Math.abs(difference))}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No items found. Please complete Step 2 first.</p>
                    </div>
                )}

                {/* Cost Summary */}
                {formData.items.length > 0 && (
                    <div className="cost-summary">
                        <div className="cost-summary-row">
                            <span className="cost-label">Actual Total Purchasing Cost:</span>
                            <span className="cost-value">{formatCurrency(calculateActualTotalCost())}</span>
                        </div>
                        <div className="cost-summary-row">
                            <span className="cost-label">Down Payment (from Step 2):</span>
                            <span className="cost-value">-{formatCurrency(ticketData?.downPayment || 0)}</span>
                        </div>
                        <div className="cost-summary-divider"></div>
                        <div className="cost-summary-row total highlight">
                            <span className="cost-label">Remaining Payment Due:</span>
                            <span className="cost-value">{formatCurrency(calculateRemainingPayment())}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Information Box */}
            <div className="info-box">
                <FaCheckCircle className="info-icon" />
                <div className="info-content">
                    <strong>Important:</strong> The remaining payment will be calculated automatically.
                    Make sure all actual costs are entered correctly before completing this step.
                </div>
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
                    {isLoading ? 'Saving...' : 'Complete Step 3'}
                </button>
            </div>
        </div>
    );
};

export default Step3FinalizePurchasingForm;
