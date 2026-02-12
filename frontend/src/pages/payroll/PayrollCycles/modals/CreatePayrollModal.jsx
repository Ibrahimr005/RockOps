import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import { payrollService } from '../../../../services/payroll/payrollService'; // Ensure import path is correct
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './CreatePayrollModal.scss';

const CreatePayrollModal = ({ onClose, onSubmit }) => {
    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper to format date as YYYY-MM-DD for inputs
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        overrideContinuity: false,
        overrideReason: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [calculatingDates, setCalculatingDates] = useState(true);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // ⭐ NEW: Effect to fetch latest payroll and calculate dates
    useEffect(() => {
        const fetchLatestAndSetDates = async () => {
            try {
                const latestPayroll = await payrollService.getLatestPayroll();

                if (latestPayroll && latestPayroll.endDate) {
                    // 1. Calculate Start Date: (Last End Date + 1 Day)
                    const lastEndDate = new Date(latestPayroll.endDate);
                    const nextStartDate = new Date(lastEndDate);
                    nextStartDate.setDate(lastEndDate.getDate() + 1);

                    // 2. Calculate End Date: (Start Date + 1 Month - 1 Day)
                    // This maintains cycle consistency (e.g., Jan 26 -> Feb 25)
                    const nextEndDate = new Date(nextStartDate);
                    nextEndDate.setMonth(nextEndDate.getMonth() + 1);
                    nextEndDate.setDate(nextEndDate.getDate() - 1);

                    setFormData(prev => ({
                        ...prev,
                        startDate: formatDateForInput(nextStartDate),
                        endDate: formatDateForInput(nextEndDate)
                    }));
                } else {
                    // Fallback for first payroll: Default to current month 1st - Last
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                    setFormData(prev => ({
                        ...prev,
                        startDate: formatDateForInput(firstDay), // Shift to local time string if timezone issues arise
                        endDate: formatDateForInput(lastDay)
                    }));
                }
            } catch (error) {
                console.error("Failed to auto-calculate dates", error);
            } finally {
                setCalculatingDates(false);
            }
        };

        fetchLatestAndSetDates();
    }, []);

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleChange = (e) => {
        setIsFormDirty(true);
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                newErrors.endDate = 'End date must be after start date';
            }
        }

        if (formData.overrideContinuity && !formData.overrideReason) {
            newErrors.overrideReason = 'Reason is required when overriding continuity';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            await onSubmit(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="modal-overlay" onClick={handleCloseAttempt}>
            <div className="create-payroll-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FaCalendarAlt />
                        Create New Payroll Cycle
                    </h2>
                    <button className="close-btn" onClick={handleCloseAttempt}>
                        <FaTimes />
                    </button>
                </div>

                <form id="create-payroll-form" onSubmit={handleSubmit} className="modal-body">
                    {/* Show loading state while fetching previous payroll */}
                    {calculatingDates && (
                        <div className="calculating-dates-banner">
                            Calculating next period based on history...
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Start Date *</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className={errors.startDate ? 'error' : ''}
                            />
                            {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                        </div>

                        <div className="form-group">
                            <label>End Date *</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className={errors.endDate ? 'error' : ''}
                            />
                            {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                        </div>
                    </div>

                    <div className="override-section">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="overrideContinuity"
                                name="overrideContinuity"
                                checked={formData.overrideContinuity}
                                onChange={handleChange}
                            />
                            <label htmlFor="overrideContinuity">
                                <FaExclamationTriangle />
                                Override Continuity Check
                            </label>
                        </div>
                        <p className="help-text">
                            Check this if creating a payroll that doesn't follow the previous period's end date
                        </p>

                        {formData.overrideContinuity && (
                            <div className="form-group">
                                <label>Override Reason *</label>
                                <textarea
                                    name="overrideReason"
                                    value={formData.overrideReason}
                                    onChange={handleChange}
                                    placeholder="Explain why you're overriding continuity (e.g., 'Skipped period due to company holiday')"
                                    rows="3"
                                    className={errors.overrideReason ? 'error' : ''}
                                />
                                {errors.overrideReason && <span className="error-text">{errors.overrideReason}</span>}
                            </div>
                        )}
                    </div>
                </form>

                <div className="modal-footer">
                    <button type="button" onClick={handleCloseAttempt} className="btn-cancel">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-payroll-form"
                        className="btn-submit"
                        disabled={loading || calculatingDates}
                    >
                        {loading ? 'Creating...' : 'Create Payroll'}
                    </button>
                </div>
            </div>
        </div>

        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        </>
    );
};

export default CreatePayrollModal;