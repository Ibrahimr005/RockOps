// ==================== PAYSLIP CREATE MODAL ====================
// frontend/src/pages/payroll/PayslipManagement/components/PayslipCreateModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaUsers, FaExclamationTriangle, FaSpinner, FaPlus } from 'react-icons/fa';
import { payrollService } from '../../../../services/payroll/payrollService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import apiClient from '../../../../utils/apiClient';
import './PayslipCreateModal.scss';

const PayslipCreateModal = ({ onClose, onSuccess }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [formData, setFormData] = useState({
        payPeriodStart: '',
        payPeriodEnd: '',
        selectedEmployees: [],
        createForAllEmployees: true
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadEmployees();
        // Set default dates (current month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setFormData(prev => ({
            ...prev,
            payPeriodStart: startOfMonth.toISOString().split('T')[0],
            payPeriodEnd: endOfMonth.toISOString().split('T')[0]
        }));
    }, []);

    /**
     * Load employees from various endpoints
     */
    const loadEmployees = async () => {
        try {
            setLoadingEmployees(true);

            // Try different endpoints based on available services
            let employeeData = [];

            try {
                // Try HR employees first
                const hrResponse = await apiClient.get('/api/v1/hr/employee');
                employeeData = hrResponse.data;
            } catch (hrError) {
                try {
                    // Fall back to general employees endpoint
                    const generalResponse = await apiClient.get('/api/v1/employees');
                    employeeData = generalResponse.data;
                } catch (generalError) {
                    console.warn('Could not load from employees endpoint, trying alternative sources...');
                    employeeData = [];
                }
            }

            // Transform employee data to consistent format
            const transformedEmployees = employeeData.map(emp => ({
                id: emp.id || emp.employeeId,
                fullName: emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                email: emp.email || emp.emailAddress || 'No email',
                departmentName: emp.departmentName || emp.department?.name || 'No department',
                status: emp.status || 'ACTIVE'
            })).filter(emp => emp.fullName && emp.fullName !== ''); // Filter out invalid entries

            setEmployees(transformedEmployees);

            if (transformedEmployees.length === 0) {
                showWarning('No employees found. Please ensure employees are properly configured in the system.');
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            showError('Failed to load employees. You can still create payslips for all employees.');
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    };

    /**
     * Handle form input changes
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-calculate end date when start date changes
        if (field === 'payPeriodStart' && value) {
            const startDate = new Date(value);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            setFormData(prev => ({
                ...prev,
                payPeriodEnd: endDate.toISOString().split('T')[0]
            }));
        }

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    /**
     * Handle employee selection toggle
     */
    const handleEmployeeToggle = (employeeId) => {
        setFormData(prev => ({
            ...prev,
            selectedEmployees: prev.selectedEmployees.includes(employeeId)
                ? prev.selectedEmployees.filter(id => id !== employeeId)
                : [...prev.selectedEmployees, employeeId]
        }));
    };

    /**
     * Handle select all employees
     */
    const handleSelectAllEmployees = () => {
        const allEmployeeIds = employees.map(emp => emp.id);
        setFormData(prev => ({
            ...prev,
            selectedEmployees: prev.selectedEmployees.length === employees.length
                ? []
                : allEmployeeIds
        }));
    };

    /**
     * Validate form data
     */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.payPeriodStart) {
            newErrors.payPeriodStart = 'Pay period start date is required';
        }

        if (!formData.payPeriodEnd) {
            newErrors.payPeriodEnd = 'Pay period end date is required';
        }

        if (formData.payPeriodStart && formData.payPeriodEnd) {
            const startDate = new Date(formData.payPeriodStart);
            const endDate = new Date(formData.payPeriodEnd);

            if (startDate >= endDate) {
                newErrors.payPeriodEnd = 'End date must be after start date';
            }

            // Check if dates are in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (endDate > today) {
                newErrors.payPeriodEnd = 'Cannot create payslips for future periods';
            }

            // Check for reasonable date range (not more than 3 months)
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 93) { // ~3 months
                newErrors.payPeriodEnd = 'Pay period cannot exceed 3 months';
            }
        }

        if (!formData.createForAllEmployees && formData.selectedEmployees.length === 0) {
            newErrors.selectedEmployees = 'Please select at least one employee';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            if (formData.createForAllEmployees) {
                // Extract year and month from start date for the API
                const startDate = new Date(formData.payPeriodStart);
                const year = startDate.getFullYear();
                const month = startDate.getMonth() + 1; // JavaScript months are 0-based

                // Try the monthly generation endpoint
                try {
                    await payrollService.generateMonthlyPayslips(year, month, 'USER');
                    showSuccess(`Payslips created successfully for all employees for ${year}-${month.toString().padStart(2, '0')}`);
                } catch (monthlyError) {
                    // If monthly endpoint fails, try with YearMonth parameter
                    const payPeriod = `${year}-${month.toString().padStart(2, '0')}`;
                    try {
                        await payrollService.generateMonthlyPayslipsWithParam(payPeriod, 'USER');
                        showSuccess(`Payslips created successfully for all employees for ${payPeriod}`);
                    } catch (paramError) {
                        throw new Error('Failed to generate payslips using available methods');
                    }
                }
            } else {
                // Generate for specific employees
                if (formData.selectedEmployees.length === 0) {
                    throw new Error('No employees selected');
                }

                const startDate = new Date(formData.payPeriodStart);
                const payPeriod = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;

                // Use the payroll service method for specific employees
                await payrollService.generatePayslipsForEmployees(
                    formData.selectedEmployees,
                    payPeriod,
                    'USER'
                );

                showSuccess(`Payslips created successfully for ${formData.selectedEmployees.length} selected employee(s)`);
            }

            onSuccess();
        } catch (error) {
            console.error('Error creating payslips:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create payslips';
            showError(`Failed to create payslips: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get period description for display
     */
    const getPeriodDescription = () => {
        if (!formData.payPeriodStart || !formData.payPeriodEnd) return '';

        const startDate = new Date(formData.payPeriodStart);
        const endDate = new Date(formData.payPeriodEnd);

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', options)} to ${endDate.toLocaleDateString('en-US', options)}`;
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-container payslip-create-modal">
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FaCalendarAlt className="modal-icon" />
                        Create Payslips
                    </h3>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Pay Period Selection */}
                    <div className="form-section">
                        <h4 className="section-title">
                            <FaCalendarAlt />
                            Pay Period
                        </h4>
                        <p className="section-description">
                            Select the pay period for which you want to create payslips.
                        </p>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="payPeriodStart" className="form-label">
                                    Start Date <span className="required">*</span>
                                </label>
                                <input
                                    id="payPeriodStart"
                                    type="date"
                                    className={`form-control ${errors.payPeriodStart ? 'error' : ''}`}
                                    value={formData.payPeriodStart}
                                    onChange={(e) => handleInputChange('payPeriodStart', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.payPeriodStart && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.payPeriodStart}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="payPeriodEnd" className="form-label">
                                    End Date <span className="required">*</span>
                                </label>
                                <input
                                    id="payPeriodEnd"
                                    type="date"
                                    className={`form-control ${errors.payPeriodEnd ? 'error' : ''}`}
                                    value={formData.payPeriodEnd}
                                    onChange={(e) => handleInputChange('payPeriodEnd', e.target.value)}
                                    disabled={loading}
                                />
                                {errors.payPeriodEnd && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.payPeriodEnd}
                                    </div>
                                )}
                            </div>
                        </div>

                        {getPeriodDescription() && (
                            <div className="period-preview">
                                <strong>Period:</strong> {getPeriodDescription()}
                            </div>
                        )}
                    </div>

                    {/* Employee Selection */}
                    <div className="form-section">
                        <h4 className="section-title">
                            <FaUsers />
                            Employee Selection
                        </h4>
                        <p className="section-description">
                            Choose whether to create payslips for all employees or select specific employees.
                        </p>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.createForAllEmployees}
                                    onChange={(e) => handleInputChange('createForAllEmployees', e.target.checked)}
                                    disabled={loading}
                                />
                                <span className="checkbox-text">
                                    Create payslips for all active employees
                                </span>
                            </label>
                            <p className="checkbox-help">
                                This will create payslips for all active employees in the system.
                            </p>
                        </div>

                        {!formData.createForAllEmployees && (
                            <div className="employee-selection">
                                <div className="employee-selection-header">
                                    <label className="form-label">
                                        Select Employees <span className="required">*</span>
                                    </label>
                                    {employees.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn-link select-all-btn"
                                            onClick={handleSelectAllEmployees}
                                            disabled={loading || loadingEmployees}
                                        >
                                            {formData.selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>

                                {loadingEmployees ? (
                                    <div className="loading-employees">
                                        <FaSpinner className="spinning" />
                                        Loading employees...
                                    </div>
                                ) : employees.length > 0 ? (
                                    <div className="employee-list">
                                        {employees.map(employee => (
                                            <label key={employee.id} className="employee-item">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selectedEmployees.includes(employee.id)}
                                                    onChange={() => handleEmployeeToggle(employee.id)}
                                                    disabled={loading}
                                                />
                                                <div className="employee-info">
                                                    <div className="employee-name">{employee.fullName}</div>
                                                    <div className="employee-details">
                                                        {employee.email} • {employee.departmentName}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-employees">
                                        <FaUsers />
                                        <p>No employees found. You can still create payslips for all employees using the option above.</p>
                                    </div>
                                )}

                                {errors.selectedEmployees && (
                                    <div className="error-message">
                                        <FaExclamationTriangle />
                                        {errors.selectedEmployees}
                                    </div>
                                )}

                                {formData.selectedEmployees.length > 0 && (
                                    <div className="selection-summary">
                                        {formData.selectedEmployees.length} employee(s) selected
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Warning Message */}
                    <div className="warning-section">
                        <div className="warning-box">
                            <FaExclamationTriangle className="warning-icon" />
                            <div className="warning-content">
                                <strong>Important:</strong> This will create new payslips for the selected period.
                                Ensure that attendance data and any manual adjustments are finalized before proceeding.
                                Existing payslips for the same period may be overwritten.
                            </div>
                        </div>
                    </div>
                </form>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || (!formData.createForAllEmployees && formData.selectedEmployees.length === 0)}
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="spinning" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <FaPlus />
                                Create Payslips
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayslipCreateModal;