import React, { useState } from 'react';
import { FaTimes, FaCheck, FaCalendarAlt, FaDollarSign } from 'react-icons/fa';
import '../../../styles/modal-styles.scss';
import './CompleteStepModal.scss';

const CompleteStepModal = ({ isOpen, onClose, onConfirm, step }) => {
    const [formData, setFormData] = useState({
        actualEndDate: new Date().toISOString().split('T')[0],
        actualCost: step?.stepCost || 0
    });
    const [errors, setErrors] = useState({});

    if (!isOpen) return null;

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

        if (!formData.actualEndDate) {
            newErrors.actualEndDate = 'Actual completion date is required';
        } else {
            // Validate that actual end date is not before step start date
            const actualEndDate = new Date(formData.actualEndDate + 'T00:00:00');
            const startDate = new Date(step.startDate);
            
            // Normalize dates to compare only the date part (ignore time)
            const actualDateOnly = new Date(actualEndDate.getFullYear(), actualEndDate.getMonth(), actualEndDate.getDate());
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            
            // Debug logging
            console.log('Date comparison:', {
                actualEndDate: formData.actualEndDate,
                actualDateOnly: actualDateOnly.toISOString().split('T')[0],
                startDate: step.startDate,
                startDateOnly: startDateOnly.toISOString().split('T')[0],
                isBefore: actualDateOnly < startDateOnly
            });
            
            if (actualDateOnly < startDateOnly) {
                newErrors.actualEndDate = 'Completion date cannot be before the step start date';
            }
        }

        if (!formData.actualCost && formData.actualCost !== 0) {
            newErrors.actualCost = 'Actual cost is required';
        } else if (isNaN(formData.actualCost)) {
            newErrors.actualCost = 'Cost must be a valid number';
        } else if (parseFloat(formData.actualCost) < 0) {
            newErrors.actualCost = 'Cost must be non-negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            onConfirm({
                actualEndDate: formData.actualEndDate + 'T' + new Date().toTimeString().split(' ')[0],
                actualCost: parseFloat(formData.actualCost)
            });
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <FaCheck />
                        Complete Maintenance Step
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="complete-step-info">
                        <p><strong>Step:</strong> {step?.description}</p>
                        <p><strong>Responsible Person:</strong> {step?.responsiblePerson}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="complete-step-form">
                        <div className="form-group">
                            <label htmlFor="actualEndDate">
                                <FaCalendarAlt /> Actual Completion Date <span className="required">*</span>
                            </label>
                            <input
                                type="date"
                                id="actualEndDate"
                                name="actualEndDate"
                                value={formData.actualEndDate}
                                onChange={handleInputChange}
                                className={errors.actualEndDate ? 'error' : ''}
                            />
                            {errors.actualEndDate && (
                                <span className="error-message">{errors.actualEndDate}</span>
                            )}
                            <span className="info-text">
                                Started: {step?.startDate ? new Date(step.startDate).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="actualCost">
                                <FaDollarSign /> Actual Cost <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                id="actualCost"
                                name="actualCost"
                                value={formData.actualCost}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                placeholder="Enter actual cost"
                                className={errors.actualCost ? 'error' : ''}
                            />
                            {errors.actualCost && (
                                <span className="error-message">{errors.actualCost}</span>
                            )}
                            <span className="info-text">
                                Estimated: ${step?.stepCost || 0}
                            </span>
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        <FaTimes /> Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-success"
                        onClick={handleSubmit}
                    >
                        <FaCheck /> Complete Step
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompleteStepModal;

