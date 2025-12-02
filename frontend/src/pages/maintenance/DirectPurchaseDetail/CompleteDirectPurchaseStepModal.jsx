import React, { useState, useEffect } from 'react';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './CompleteDirectPurchaseStepModal.scss';

const CompleteDirectPurchaseStepModal = ({ isOpen, onClose, onSubmit, step }) => {
    const [formData, setFormData] = useState({
        actualEndDate: '',
        actualCost: '',
        advancedPayment: '',
        remainingCost: ''
    });

    const [errors, setErrors] = useState({});
    const [useManualRemaining, setUseManualRemaining] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';

            // Set default actual end date to today
            const today = new Date().toISOString().split('T')[0];
            setFormData({
                actualEndDate: today,
                actualCost: '',
                advancedPayment: '',
                remainingCost: ''
            });
            setErrors({});
            setUseManualRemaining(false);
        } else {
            // Restore scroll when modal is closed
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, step]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Auto-calculate remaining cost if not manual override
        if (name === 'actualCost' || name === 'advancedPayment') {
            if (!useManualRemaining) {
                const actual = name === 'actualCost' ? parseFloat(value) || 0 : parseFloat(formData.actualCost) || 0;
                const advanced = name === 'advancedPayment' ? parseFloat(value) || 0 : parseFloat(formData.advancedPayment) || 0;
                const remaining = actual - advanced;
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    remainingCost: remaining >= 0 ? remaining.toFixed(2) : ''
                }));
            }
        }
    };

    const handleRemainingCostChange = (e) => {
        setUseManualRemaining(true);
        setFormData(prev => ({
            ...prev,
            remainingCost: e.target.value
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.actualEndDate) {
            newErrors.actualEndDate = 'Actual end date is required';
        }

        if (!formData.actualCost) {
            newErrors.actualCost = 'Actual cost is required';
        } else {
            const actualCost = parseFloat(formData.actualCost);
            if (isNaN(actualCost) || actualCost <= 0) {
                newErrors.actualCost = 'Actual cost must be greater than 0';
            }
        }

        if (formData.advancedPayment) {
            const advanced = parseFloat(formData.advancedPayment);
            const actual = parseFloat(formData.actualCost);
            if (isNaN(advanced) || advanced < 0) {
                newErrors.advancedPayment = 'Advanced payment must be a non-negative number';
            } else if (advanced > actual) {
                newErrors.advancedPayment = 'Advanced payment cannot exceed actual cost';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            const submitData = {
                actualEndDate: formData.actualEndDate,
                actualCost: parseFloat(formData.actualCost),
                advancedPayment: formData.advancedPayment ? parseFloat(formData.advancedPayment) : 0,
                remainingCost: useManualRemaining && formData.remainingCost ? parseFloat(formData.remainingCost) : undefined
            };

            onSubmit(submitData);
        }
    };

    const getCalculatedRemaining = () => {
        if (formData.actualCost) {
            const actual = parseFloat(formData.actualCost) || 0;
            const advanced = parseFloat(formData.advancedPayment) || 0;
            return (actual - advanced).toFixed(2);
        }
        return '0.00';
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container complete-step-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaCheckCircle />
                        Complete Step: {step?.stepName}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="step-info-display">
                        <h3>Step Information</h3>
                        <div className="info-row">
                            <span className="label">Step Name:</span>
                            <span className="value">{step?.stepName}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Original Estimated Cost:</span>
                            <span className="value expected-cost">${step?.expectedCost?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="complete-step-form" id="complete-step-form">
                        <div className="form-section">
                            <h3>Completion Details</h3>
                            <div className="form-group">
                                <label htmlFor="actualEndDate">Actual End Date <span className="required">*</span></label>
                                <input
                                    type="date"
                                    id="actualEndDate"
                                    name="actualEndDate"
                                    value={formData.actualEndDate}
                                    onChange={handleInputChange}
                                    className={errors.actualEndDate ? 'error' : ''}
                                />
                                {errors.actualEndDate && <span className="error-message">{errors.actualEndDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="actualCost">Actual Cost <span className="required">*</span></label>
                                <input
                                    type="number"
                                    id="actualCost"
                                    name="actualCost"
                                    value={formData.actualCost}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className={errors.actualCost ? 'error' : ''}
                                />
                                {errors.actualCost && <span className="error-message">{errors.actualCost}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="advancedPayment">Advanced Payment (Optional)</label>
                                <input
                                    type="number"
                                    id="advancedPayment"
                                    name="advancedPayment"
                                    value={formData.advancedPayment}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className={errors.advancedPayment ? 'error' : ''}
                                />
                                {errors.advancedPayment && <span className="error-message">{errors.advancedPayment}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="remainingCost">
                                    Remaining Cost (Optional - Manual Override)
                                </label>
                                <input
                                    type="number"
                                    id="remainingCost"
                                    name="remainingCost"
                                    value={formData.remainingCost}
                                    onChange={handleRemainingCostChange}
                                    placeholder={getCalculatedRemaining()}
                                    step="0.01"
                                    min="0"
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                                <span className="help-text">
                                    Leave blank to auto-calculate: Actual Cost - Advanced Payment = ${getCalculatedRemaining()}
                                </span>
                            </div>
                        </div>

                        <div className="cost-calculation-display">
                            <div className="calc-row">
                                <span>Actual Cost:</span>
                                <strong>${formData.actualCost || '0.00'}</strong>
                            </div>
                            <div className="calc-row">
                                <span>Advanced Payment:</span>
                                <strong>- ${formData.advancedPayment || '0.00'}</strong>
                            </div>
                            <div className="calc-row total">
                                <span>Remaining Cost:</span>
                                <strong className="remaining-value">
                                    ${useManualRemaining && formData.remainingCost ? formData.remainingCost : getCalculatedRemaining()}
                                </strong>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="complete-step-form">
                        <FaCheckCircle />
                        Mark as Completed
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteDirectPurchaseStepModal;
