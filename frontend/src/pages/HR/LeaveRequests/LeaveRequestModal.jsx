// LeaveRequestModal.jsx
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUser, FaSave, FaTimes } from 'react-icons/fa';
import EmployeeSelector from '../../../components/common/EmployeeSelector/EmployeeSelector';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { leaveRequestService } from '../../../services/hr/leaveRequestService';
import { vacationBalanceService } from '../../../services/hr/vacationBalanceService';
import {employeeService} from "../../../services/hr/employeeService.js";
import './LeaveRequestModal.scss';

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
        { value: 'PERSONAL', label: 'Personal Leave', requiresBalance: false },
        { value: 'EMERGENCY', label: 'Emergency Leave', requiresBalance: false },
        { value: 'UNPAID', label: 'Unpaid Leave', requiresBalance: false }
    ];

    const selectedLeaveType = leaveTypes.find(type => type.value === formData.leaveType);

    // Current date for date picker min value
    const today = new Date().toISOString().split('T')[0];

    // Fetch employees when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
        }
    }, [isOpen]);

    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getMinimal();
            const employeesArray = response.data?.data || response.data || [];
            setEmployees(Array.isArray(employeesArray) ? employeesArray : []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            showSnackbar('Failed to load employees', 'error');
        }
    };

    // Calculate working days (excluding weekends)
    const calculateWorkingDays = (startDate, endDate) => {
        if (!startDate || !endDate) return 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
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

        // FIX #104: Immediately validate balance when days are calculated
        if (days > 0 && vacationBalance && formData.leaveType) {
            const isVacationLeave = formData.leaveType === 'VACATION';
            if (isVacationLeave && days > vacationBalance.remainingDays) {
                setValidationErrors(prev => ({
                    ...prev,
                    balance: `You cannot request more leave days than your available annual balance. Available: ${vacationBalance.remainingDays} days, Requested: ${days} days.`
                }));
            } else {
                // Clear balance error if days are within limit
                setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.balance;
                    return newErrors;
                });
            }
        } else if (calculatedDays === 0) {
            // Clear error when no days selected
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.balance;
                return newErrors;
            });
        }
    }, [formData.startDate, formData.endDate, vacationBalance, formData.leaveType, calculatedDays]);

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
        // FIX #105: Phone number validation - only allow numbers, spaces, dashes, parentheses, and + sign
        if (field === 'emergencyPhone') {
            // Remove any characters that are not digits, spaces, dashes, parentheses, or +
            const sanitized = value.replace(/[^\d\s\-\(\)\+]/g, '');
            value = sanitized;
        }

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

        // FIX #105: Validate phone number format if provided
        if (formData.emergencyPhone) {
            const digitsOnly = formData.emergencyPhone.replace(/\D/g, '');
            if (digitsOnly.length < 7) {
                errors.emergencyPhone = 'Phone number must contain at least 7 digits';
            } else if (digitsOnly.length > 15) {
                errors.emergencyPhone = 'Phone number is too long (maximum 15 digits)';
            }
        }

        // FIX #104: Improved error message for insufficient vacation balance
        // This validation should run FIRST before other date validations
        const selectedLeaveType = leaveTypes.find(type => type.value === formData.leaveType);
        if (selectedLeaveType?.requiresBalance && vacationBalance && calculatedDays > 0) {
            if (calculatedDays > vacationBalance.remainingDays) {
                errors.balance = `You cannot request more leave days than your available annual balance. Available: ${vacationBalance.remainingDays} days, Requested: ${calculatedDays} days.`;
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();



        try {
            setLoading(true);
            const response = await leaveRequestService.submitLeaveRequest(formData);

            if (response.data?.success !== false) {
                showSnackbar('Leave request submitted successfully!', 'success');
                onSuccess?.();
                handleClose();
            } else {
                const errorMsg = response.data?.message || 'Failed to submit leave request';
                showSnackbar(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error submitting leave request:', error);

            // FIX #104: Display backend error message in the modal
            const backendError = error.response?.data?.error || error.response?.data?.message || error.message;

            // Check if it's a balance error from backend
            if (error.response?.data?.errorType === 'INSUFFICIENT_BALANCE' ||
                backendError?.includes('available annual balance')) {
                // Set the balance error to display in the modal
                setValidationErrors(prev => ({
                    ...prev,
                    balance: backendError
                }));
                showSnackbar('Insufficient vacation balance', 'error');
            } else {
                // For other errors, just show in snackbar
                showSnackbar(backendError || 'Failed to submit leave request', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle modal close
    const handleClose = () => {
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
        setSelectedEmployee(null);
        setVacationBalance(null);
        setCalculatedDays(0);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="leave-request-modal" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <h2>
                        <FaCalendarAlt className="header-icon" />
                        Submit Leave Request
                    </h2>
                    <button className="close-btn" onClick={handleClose}>
                        <FaTimes />
                    </button>
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
                                {/* FIX #99: Red asterisk for required field */}
                                <label className="form-label">
                                    Select Employee <span className="required-asterisk">*</span>
                                </label>
                                <EmployeeSelector
                                    employees={employees}
                                    selectedEmployee={selectedEmployee}
                                    onSelect={handleEmployeeSelect}
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
                                    {/* FIX #99: Red asterisk for required field */}
                                    <label className="form-label">
                                        Leave Type <span className="required-asterisk">*</span>
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
                                    {/* FIX #99: Red asterisk for required field */}
                                    <label className="form-label">
                                        Start Date <span className="required-asterisk">*</span>
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
                                    {/* FIX #99: Red asterisk for required field */}
                                    <label className="form-label">
                                        End Date <span className="required-asterisk">*</span>
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

                            {/* FIX #104: Balance validation error with clearer message */}
                            {validationErrors.balance && (
                                <div className="error-message balance-error">{validationErrors.balance}</div>
                            )}

                            <div className="form-group">
                                {/* FIX #99: Red asterisk for required field */}
                                <label className="form-label">
                                    Reason for Leave <span className="required-asterisk">*</span>
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
                                    {/* FIX #105: Phone validation with proper input handling */}
                                    <label className="form-label">Emergency Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.emergencyPhone}
                                        onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                                        placeholder="Emergency contact phone number"
                                        className={validationErrors.emergencyPhone ? 'error' : ''}
                                    />
                                    {validationErrors.emergencyPhone && (
                                        <div className="error-message">{validationErrors.emergencyPhone}</div>
                                    )}
                                    <small className="field-hint">Enter numbers only (7-15 digits, + allowed for country code)</small>
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
        </div>
    );
};

export default LeaveRequestModal;