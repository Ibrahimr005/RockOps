import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './EditDirectPurchaseStepModal.scss';

const EditDirectPurchaseStepModal = ({ isOpen, onClose, onSubmit, step }) => {
    const [formData, setFormData] = useState({
        status: '',
        responsiblePerson: '',
        phoneNumber: '',
        startDate: '',
        expectedEndDate: '',
        actualEndDate: '',
        expectedCost: '',
        advancedPayment: '',
        actualCost: '',
        description: '',
        lastChecked: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            // Prevent background scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll when modal is closed
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (step) {
            setFormData({
                status: step.status || '',
                responsiblePerson: step.responsiblePerson || '',
                phoneNumber: step.phoneNumber || '',
                startDate: step.startDate || '',
                expectedEndDate: step.expectedEndDate || '',
                actualEndDate: step.actualEndDate || '',
                expectedCost: step.expectedCost || '',
                advancedPayment: step.advancedPayment || '',
                actualCost: step.actualCost || '',
                description: step.description || '',
                lastChecked: step.lastChecked ? step.lastChecked.split('T')[0] : ''
            });
            setErrors({});
        }
    }, [step]);

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
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.advancedPayment && formData.actualCost) {
            const advanced = parseFloat(formData.advancedPayment);
            const actual = parseFloat(formData.actualCost);
            if (advanced > actual) {
                newErrors.advancedPayment = 'Advanced payment cannot exceed actual cost';
            }
        }

        if (formData.expectedCost && (isNaN(formData.expectedCost) || parseFloat(formData.expectedCost) < 0)) {
            newErrors.expectedCost = 'Expected cost must be a non-negative number';
        }

        if (formData.advancedPayment && (isNaN(formData.advancedPayment) || parseFloat(formData.advancedPayment) < 0)) {
            newErrors.advancedPayment = 'Advanced payment must be a non-negative number';
        }

        if (formData.actualCost && (isNaN(formData.actualCost) || parseFloat(formData.actualCost) < 0)) {
            newErrors.actualCost = 'Actual cost must be a non-negative number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            const submitData = {
                status: formData.status || undefined,
                responsiblePerson: formData.responsiblePerson || undefined,
                phoneNumber: formData.phoneNumber || undefined,
                startDate: formData.startDate || undefined,
                expectedEndDate: formData.expectedEndDate || undefined,
                actualEndDate: formData.actualEndDate || undefined,
                expectedCost: formData.expectedCost ? parseFloat(formData.expectedCost) : undefined,
                advancedPayment: formData.advancedPayment ? parseFloat(formData.advancedPayment) : undefined,
                actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
                description: formData.description || undefined,
                lastChecked: formData.lastChecked ? `${formData.lastChecked}T00:00:00` : undefined
            };

            // Remove undefined values
            Object.keys(submitData).forEach(key => submitData[key] === undefined && delete submitData[key]);

            onSubmit(submitData);
        }
    };

    const getRemainingCost = () => {
        if (formData.actualCost && formData.advancedPayment) {
            const remaining = parseFloat(formData.actualCost) - parseFloat(formData.advancedPayment);
            return remaining.toFixed(2);
        }
        return '0.00';
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container modal-lg edit-step-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        Edit Step: {step?.stepName}
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="edit-step-form" id="edit-step-form">
                        <div className="form-section">
                            <h3>Step Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="responsiblePerson">Responsible Person</label>
                                    <input
                                        type="text"
                                        id="responsiblePerson"
                                        name="responsiblePerson"
                                        value={formData.responsiblePerson}
                                        onChange={handleInputChange}
                                        placeholder="Enter responsible person name"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="phoneNumber">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter phone number"
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Dates</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="startDate">Start Date</label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="expectedEndDate">Expected End Date</label>
                                    <input
                                        type="date"
                                        id="expectedEndDate"
                                        name="expectedEndDate"
                                        value={formData.expectedEndDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="actualEndDate">Actual End Date</label>
                                    <input
                                        type="date"
                                        id="actualEndDate"
                                        name="actualEndDate"
                                        value={formData.actualEndDate}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="lastChecked">Last Checked</label>
                                    <input
                                        type="date"
                                        id="lastChecked"
                                        name="lastChecked"
                                        value={formData.lastChecked}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Costs</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="expectedCost">Expected Cost</label>
                                    <input
                                        type="number"
                                        id="expectedCost"
                                        name="expectedCost"
                                        value={formData.expectedCost}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={errors.expectedCost ? 'error' : ''}
                                    />
                                    {errors.expectedCost && <span className="error-message">{errors.expectedCost}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="actualCost">Actual Cost</label>
                                    <input
                                        type="number"
                                        id="actualCost"
                                        name="actualCost"
                                        value={formData.actualCost}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={errors.actualCost ? 'error' : ''}
                                    />
                                    {errors.actualCost && <span className="error-message">{errors.actualCost}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="advancedPayment">Advanced Payment</label>
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
                                    <label>Remaining Cost (Calculated)</label>
                                    <input
                                        type="text"
                                        value={`$${getRemainingCost()}`}
                                        readOnly
                                        className="readonly-field"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Description</h3>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Enter step description or notes..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" form="edit-step-form">
                        <FaSave />
                        Update Step
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditDirectPurchaseStepModal;
