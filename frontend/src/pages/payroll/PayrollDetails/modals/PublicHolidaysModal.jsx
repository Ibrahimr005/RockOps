// ========================================
// FILE: PublicHolidaysModal.jsx
// ========================================

import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaTimes, FaPlus, FaTrash, FaInfoCircle } from 'react-icons/fa';
import payrollService from '../../../../services/payroll/payrollService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './PublicHolidaysModal.scss';

const PublicHolidaysModal = ({ payrollId, onClose, minDate, maxDate }) => {
    const { showSuccess, showError } = useSnackbar();

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [newHoliday, setNewHoliday] = useState({
        startDate: '',
        endDate: '',
        name: '',
        isPaid: true,
    });
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Helper to format date string for input type="date" (YYYY-MM-DD)
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().split('T')[0];
    };

    const minDateStr = formatDateForInput(minDate);
    const maxDateStr = formatDateForInput(maxDate);

    useEffect(() => {
        fetchHolidays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payrollId]);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const response = await payrollService.getPublicHolidays(payrollId);
            const data = response.data || response;
            setHolidays(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            showError('Failed to load existing holidays');
            setHolidays([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToList = () => {
        setIsFormDirty(true);
        // Validation
        if (!newHoliday.startDate) {
            showError('Please enter a start date');
            return;
        }
        if (!newHoliday.name.trim()) {
            showError('Please enter a holiday name');
            return;
        }

        // Validate Range Boundaries
        if (newHoliday.startDate < minDateStr || newHoliday.startDate > maxDateStr) {
            showError('Start date must be within the payroll period');
            return;
        }

        if (newHoliday.endDate) {
            if (newHoliday.endDate < newHoliday.startDate) {
                showError('End date cannot be before start date');
                return;
            }
            if (newHoliday.endDate > maxDateStr) {
                showError('End date must be within the payroll period');
                return;
            }
        }

        // Calculate duration
        const duration = newHoliday.endDate
            ? Math.floor((new Date(newHoliday.endDate) - new Date(newHoliday.startDate)) / (1000 * 60 * 60 * 24)) + 1
            : 1;

        // Add to list
        setHolidays([...holidays, {
            ...newHoliday,
            id: null,
            duration
        }]);

        showSuccess(`Holiday added to list (${duration} day${duration > 1 ? 's' : ''})`);

        // Reset form
        setNewHoliday({
            startDate: '',
            endDate: '',
            name: '',
            isPaid: true,
        });
    };

    const handleRemoveFromList = (index) => {
        setIsFormDirty(true);
        const holiday = holidays[index];
        setHolidays(holidays.filter((_, i) => i !== index));
        showSuccess(`${holiday.name} removed`);
    };

    const handleSubmit = async () => {
        if (holidays.length === 0) {
            showError('Please add at least one holiday');
            return;
        }

        try {
            setLoading(true);

            // Format holidays for backend
            const formattedHolidays = holidays.map(h => ({
                startDate: h.startDate,
                endDate: h.endDate || null, // null for single-day holidays
                name: h.name,
                isPaid: h.isPaid,
            }));




            await payrollService.addPublicHolidays(payrollId, formattedHolidays);

            showSuccess(`${holidays.length} holiday${holidays.length > 1 ? 's' : ''} added successfully`);
            onClose();
        } catch (error) {
            console.error('Error adding holidays:', error);
            showError(error.message || 'Failed to add holidays');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const formatDateRange = (holiday) => {
        const start = new Date(holiday.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        if (!holiday.endDate || holiday.startDate === holiday.endDate) {
            return start;
        }

        const end = new Date(holiday.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `${start} - ${end}`;
    };

    return (
        <>
        <div className="modal-overlay" onClick={handleCloseAttempt}>
            <div className="modal-content public-holidays-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        <FaCalendarAlt />
                        Manage Public Holidays
                    </h2>
                    <button className="close-button" onClick={handleCloseAttempt}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-state">Loading holidays...</div>
                    ) : (
                        <>
                            {/* Payroll Period Info Banner */}
                            <div className="payroll-period-info">
                                <FaInfoCircle />
                                <span>
                                    Allowable Range: <strong>{new Date(minDate).toLocaleDateString()}</strong> to <strong>{new Date(maxDate).toLocaleDateString()}</strong>
                                </span>
                            </div>

                            {/* Add New Holiday Form */}
                            <div className="add-holiday-form">
                                <h3>Add Holiday</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input
                                            type="date"
                                            value={newHoliday.startDate}
                                            min={minDateStr} // RESTRICTION
                                            max={maxDateStr} // RESTRICTION
                                            onChange={(e) => { setIsFormDirty(true); setNewHoliday({ ...newHoliday, startDate: e.target.value }); }}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Date (Optional)</label>
                                        <input
                                            type="date"
                                            value={newHoliday.endDate}
                                            min={newHoliday.startDate || minDateStr} // RESTRICTION (Cannot be before start)
                                            max={maxDateStr} // RESTRICTION
                                            onChange={(e) => { setIsFormDirty(true); setNewHoliday({ ...newHoliday, endDate: e.target.value }); }}
                                            className="form-input"
                                            placeholder="Leave empty for single day"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Holiday Name *</label>
                                    <input
                                        type="text"
                                        value={newHoliday.name}
                                        onChange={(e) => { setIsFormDirty(true); setNewHoliday({ ...newHoliday, name: e.target.value }); }}
                                        placeholder="e.g., Christmas, Eid al-Fitr"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={newHoliday.isPaid}
                                            onChange={(e) => { setIsFormDirty(true); setNewHoliday({ ...newHoliday, isPaid: e.target.checked }); }}
                                        />
                                        <span>Paid Holiday</span>
                                    </label>
                                    <p className="help-text">
                                        Check this if employees should be paid for this holiday
                                    </p>
                                </div>
                                <button
                                    className="btn-add"
                                    onClick={handleAddToList}
                                    disabled={loading}
                                >
                                    <FaPlus />
                                    Add to List
                                </button>
                            </div>

                            {/* Holidays List */}
                            <div className="holidays-list">
                                <h3>Holidays to Add ({holidays.length})</h3>
                                {holidays.length === 0 ? (
                                    <div className="empty-state">
                                        <FaCalendarAlt />
                                        <p>No holidays added yet</p>
                                    </div>
                                ) : (
                                    <table className="holidays-table">
                                        <thead>
                                        <tr>
                                            <th>Date Range</th>
                                            <th>Holiday Name</th>
                                            <th>Duration</th>
                                            <th>Type</th>
                                            <th>Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {holidays.map((holiday, index) => (
                                            <tr key={index}>
                                                <td className="date-cell">
                                                    <FaCalendarAlt />
                                                    {formatDateRange(holiday)}
                                                </td>
                                                <td className="name-cell">{holiday.name}</td>
                                                <td className="duration-cell">
                                                    {holiday.duration || 1} day{(holiday.duration || 1) > 1 ? 's' : ''}
                                                </td>
                                                <td>
                                                        <span className={`type-badge ${holiday.isPaid ? 'paid' : 'unpaid'}`}>
                                                            {holiday.isPaid ? 'Paid' : 'Unpaid'}
                                                        </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleRemoveFromList(index)}
                                                        title="Remove"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={handleCloseAttempt}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-submit"
                        onClick={handleSubmit}
                        disabled={loading || holidays.length === 0}
                    >
                        {loading ? 'Saving...' : `Save ${holidays.length} Holiday${holidays.length !== 1 ? 's' : ''}`}
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

export default PublicHolidaysModal;