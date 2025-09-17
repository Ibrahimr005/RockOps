// LeaveRequestModal.jsx
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUser, FaSave, FaTimes } from 'react-icons/fa';
import EmployeeSelector from '../../../components/common/EmployeeSelector/EmployeeSelector';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { leaveRequestService } from '../../../services/hr/leaveRequestService';
import { vacationBalanceService } from '../../../services/hr/vacationBalanceService';
import {employeeService} from "../../../services/hr/employeeService.js";

const LeaveRequestModal = ({
                               isOpen,
                               onClose,
                               onSuccess,
                               initialEmployeeId = null
                           }) => {
    const { showSnackbar } = useSnackbar();

    // Form state
    const [formData, setFormData] = useState({
        employeeId: initialEmployeeId || '',
        leaveType: 'VACATION',
        startDate: '',
        endDate: '',
        reason: '',
        emergencyContact: '',
        emergencyPhone: '',
        workDelegatedTo: '',
        delegationNotes: ''
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [vacationBalance, setVacationBalance] = useState(null);
    const [calculatedDays, setCalculatedDays] = useState(0);
    const [employees, setEmployees] = useState([])

    // Leave type options
    const leaveTypes = [
        { value: 'VACATION', label: 'Vacation Leave', requiresBalance: true },
        { value: 'SICK', label: 'Sick Leave', requiresBalance: false },
        { value: 'PERSONAL', label: 'Personal Leave', requiresBalance: true },
        { value: 'MATERNITY', label: 'Maternity Leave', requiresBalance: false },
        { value: 'PATERNITY', label: 'Paternity Leave', requiresBalance: false },
        { value: 'UNPAID', label: 'Unpaid Leave', requiresBalance: false },
        { value: 'EMERGENCY', label: 'Emergency Leave', requiresBalance: false },
        { value: 'BEREAVEMENT', label: 'Bereavement Leave', requiresBalance: false },
        { value: 'ANNUAL', label: 'Annual Leave', requiresBalance: true },
        { value: 'COMPENSATORY', label: 'Compensatory Leave', requiresBalance: false }
    ];
    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getMinimal();

            if (response.data) {
                setEmployees(response.data);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            showSnackbar('Failed to load employees', 'error');
        }
    };
    // Reset form when modal opens/closes
    useEffect(() => {



        if (isOpen) {
            fetchEmployees();
            setFormData({
                employeeId: initialEmployeeId || '',
                leaveType: 'VACATION',
                startDate: '',
                endDate: '',
                reason: '',
                emergencyContact: '',
                emergencyPhone: '',
                workDelegatedTo: '',
                delegationNotes: ''
            });
            setValidationErrors({});
            setVacationBalance(null);
            setCalculatedDays(0);
            if (!initialEmployeeId) {
                setSelectedEmployee(null);
            }
        }
    }, [isOpen, initialEmployeeId]);

    // Calculate working days between dates (excluding weekends)
    const calculateWorkingDays = (startDate, endDate) => {
        if (!startDate || !endDate) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    };

    // Update calculated days when dates change
    useEffect(() => {
        const days = calculateWorkingDays(formData.startDate, formData.endDate);
        setCalculatedDays(days);
    }, [formData.startDate, formData.endDate]);

    // Fetch vacation balance when employee is selected
    useEffect(() => {
        const fetchVacationBalance = async () => {
            if (!selectedEmployee?.id) return;

            try {
                const response = await vacationBalanceService.getVacationBalance(selectedEmployee.id);
                console.log(response)
                console.log(response.data)
                const data = response.data?.data || response.data;
                setVacationBalance(data);
            } catch (error) {
                console.error('Error fetching vacation balance:', error);
            }
        };

        fetchVacationBalance();
    }, [selectedEmployee]);

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear validation error when user starts typing
        if (validationErrors[field]) {
            setValidationErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
    };

    // Handle employee selection
    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
        setFormData(prev => ({
            ...prev,
            employeeId: employee?.id || ''
        }));
    };

    // Validate form
    const validateForm = () => {
        const errors = {};

        if (!formData.employeeId) {
            errors.employeeId = 'Please select an employee';
        }

        if (!formData.leaveType) {
            errors.leaveType = 'Please select a leave type';
        }

        if (!formData.startDate) {
            errors.startDate = 'Please select a start date';
        }

        if (!formData.endDate) {
            errors.endDate = 'Please select an end date';
        }

        if (formData.startDate && formData.endDate) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);

            if (startDate > endDate) {
                errors.endDate = 'End date must be after start date';
            }

            if (startDate < new Date().setHours(0, 0, 0, 0)) {
                errors.startDate = 'Start date cannot be in the past';
            }
        }

        if (!formData.reason?.trim()) {
            errors.reason = 'Please provide a reason for the leave request';
        }

        // Check vacation balance for leave types that require it
        const selectedLeaveType = leaveTypes.find(type => type.value === formData.leaveType);
        if (selectedLeaveType?.requiresBalance && vacationBalance) {
            if (calculatedDays > vacationBalance.remainingDays) {
                errors.balance = `Insufficient vacation balance. You have ${vacationBalance.remainingDays} days remaining, but requested ${calculatedDays} days.`;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showSnackbar('Please fix the form errors before submitting', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await leaveRequestService.submitLeaveRequest(formData);

            if (response.data?.success !== false) {
                showSnackbar('Leave request submitted successfully!', 'success');
                onSuccess?.(); // Refresh parent component
                onClose(); // Close modal
            } else {
                showSnackbar(response.data?.error || 'Failed to submit leave request', 'error');
            }
        } catch (error) {
            console.error('Error submitting leave request:', error);
            showSnackbar(error.response?.data?.error || 'Failed to submit leave request', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
        if (loading) return; // Prevent closing while submitting
        onClose();
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Get minimum date (today)
    const today = new Date().toISOString().split('T')[0];

    const selectedLeaveType = leaveTypes.find(type => type.value === formData.leaveType);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-container modal-container--large">
                {/* Modal Header */}
                <div className="modal-header">
                    <h2 className="modal-title modal-title-primary">
                        <FaCalendarAlt />
                        Submit Leave Request
                    </h2>
                    <button
                        className="btn-close-svg"
                        onClick={handleClose}
                        disabled={loading}
                        aria-label="Close modal"
                    />
                </div>

                {/* Modal Body */}
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        {/* Employee Selection */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaUser className="section-icon" />
                                Employee Information
                            </h3>

                            <div className="form-group">
                                <label className="form-label">
                                    Select Employee <span className="required">*</span>
                                </label>
                                <EmployeeSelector
                                    employees={employees}                    // Added: Required prop
                                    selectedEmployee={selectedEmployee}      // Kept: Current selection
                                    onSelect={handleEmployeeSelect}         // Fixed: Correct prop name
                                    placeholder="Search and select an employee..."
                                    error={validationErrors.employeeId}
                                />
                                {validationErrors.employeeId && (
                                    <div className="error-message">{validationErrors.employeeId}</div>
                                )}
                            </div>

                            {/* Vacation Balance Display */}
                            {vacationBalance && selectedLeaveType?.requiresBalance && (
                                <div className="vacation-balance-card">
                                    <h4>Current Vacation Balance</h4>
                                    <div className="balance-grid">
                                        <div className="balance-item">
                                            <span className="label">Total:</span>
                                            <span className="value">{vacationBalance.totalAllocated}</span>
                                        </div>
                                        <div className="balance-item">
                                            <span className="label">Used:</span>
                                            <span className="value">{vacationBalance.usedDays}</span>
                                        </div>
                                        <div className="balance-item">
                                            <span className="label">Pending:</span>
                                            <span className="value">{vacationBalance.pendingDays}</span>
                                        </div>
                                        <div className="balance-item highlight">
                                            <span className="label">Available:</span>
                                            <span className="value">{vacationBalance.remainingDays}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leave Details */}
                        <div className="form-section">
                            <h3 className="section-title">
                                <FaCalendarAlt className="section-icon" />
                                Leave Details
                            </h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Leave Type <span className="required">*</span>
                                    </label>
                                    <select
                                        value={formData.leaveType}
                                        onChange={(e) => handleInputChange('leaveType', e.target.value)}
                                        className={validationErrors.leaveType ? 'error' : ''}
                                    >
                                        {leaveTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.leaveType && (
                                        <div className="error-message">{validationErrors.leaveType}</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Start Date <span className="required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                                        min={today}
                                        className={validationErrors.startDate ? 'error' : ''}
                                    />
                                    {validationErrors.startDate && (
                                        <div className="error-message">{validationErrors.startDate}</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        End Date <span className="required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                                        min={formData.startDate || today}
                                        className={validationErrors.endDate ? 'error' : ''}
                                    />
                                    {validationErrors.endDate && (
                                        <div className="error-message">{validationErrors.endDate}</div>
                                    )}
                                </div>
                            </div>

                            {calculatedDays > 0 && (
                                <div className="calculated-days-display">
                                    <span className="days-count">{calculatedDays}</span>
                                    <span className="days-label">working days requested</span>
                                </div>
                            )}

                            {/* Balance validation error */}
                            {validationErrors.balance && (
                                <div className="error-message balance-error">{validationErrors.balance}</div>
                            )}

                            <div className="form-group">
                                <label className="form-label">
                                    Reason for Leave <span className="required">*</span>
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => handleInputChange('reason', e.target.value)}
                                    placeholder="Please provide a detailed reason for your leave request..."
                                    rows={3}
                                    className={`textarea-medium ${validationErrors.reason ? 'error' : ''}`}
                                />
                                {validationErrors.reason && (
                                    <div className="error-message">{validationErrors.reason}</div>
                                )}
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="form-section">
                            <h3 className="section-title">Additional Information</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Emergency Contact</label>
                                    <input
                                        type="text"
                                        value={formData.emergencyContact}
                                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                                        placeholder="Contact person during your leave"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Emergency Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.emergencyPhone}
                                        onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                                        placeholder="Emergency contact phone number"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Work Delegated To</label>
                                <input
                                    type="text"
                                    value={formData.workDelegatedTo}
                                    onChange={(e) => handleInputChange('workDelegatedTo', e.target.value)}
                                    placeholder="Who will handle your responsibilities?"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Delegation Notes</label>
                                <textarea
                                    value={formData.delegationNotes}
                                    onChange={(e) => handleInputChange('delegationNotes', e.target.value)}
                                    placeholder="Additional notes about work handover..."
                                    rows={2}
                                    className="textarea-small"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <FaTimes /> Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <FaSave /> Submit Request
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom styles for this modal */}

        </div>
    );
};

export default LeaveRequestModal;