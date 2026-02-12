// ========================================
// FILE: CreateLoanModal.jsx
// Create Loan Modal - Fixed Backend Integration
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaSave, FaCalculator, FaSpinner, FaUserTie } from 'react-icons/fa';
import EmployeeSelector from '../../../../../components/common/EmployeeSelector/EmployeeSelector.jsx';
import { loanService } from '../../../../../services/payroll/loanService.js';
import { useSnackbar } from '../../../../../contexts/SnackbarContext.jsx';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './CreateLoanModal.scss';

const CreateLoanModal = ({ employees, onClose, onLoanCreated }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // ========================================
    // STATE
    // ========================================
    const [formData, setFormData] = useState({
        employeeId: '',
        loanAmount: '',
        interestRate: '0',
        installmentMonths: '12',
        loanDate: new Date().toISOString().split('T')[0],
        purpose: '',
        notes: ''
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [validation, setValidation] = useState({});
    const [loading, setLoading] = useState(false);
    const [calculatedValues, setCalculatedValues] = useState({
        monthlyPayment: 0,
        totalAmount: 0,
        totalInterest: 0,
        endDate: ''
    });
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // ========================================
    // CALCULATIONS
    // ========================================
    const calculateLoanDetails = useCallback(() => {
        const principal = parseFloat(formData.loanAmount) || 0;
        const annualRate = parseFloat(formData.interestRate) || 0;
        const months = parseInt(formData.installmentMonths) || 1;

        if (principal > 0 && months > 0) {
            let monthlyPayment;
            let totalAmount;
            let totalInterest;

            if (annualRate > 0) {
                // Calculate with interest (monthly rate)
                const monthlyRate = annualRate / 100 / 12;
                monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
                totalAmount = monthlyPayment * months;
                totalInterest = totalAmount - principal;
            } else {
                // No interest - simple division
                monthlyPayment = principal / months;
                totalAmount = principal;
                totalInterest = 0;
            }

            // Calculate end date
            let endDate = '';
            if (formData.loanDate) {
                const startDate = new Date(formData.loanDate);
                const calculatedEndDate = new Date(startDate);
                calculatedEndDate.setMonth(calculatedEndDate.getMonth() + months);
                endDate = calculatedEndDate.toISOString().split('T')[0];
            }

            setCalculatedValues({
                monthlyPayment: Math.round(monthlyPayment * 100) / 100,
                totalAmount: Math.round(totalAmount * 100) / 100,
                totalInterest: Math.round(totalInterest * 100) / 100,
                endDate
            });
        } else {
            setCalculatedValues({
                monthlyPayment: 0,
                totalAmount: 0,
                totalInterest: 0,
                endDate: ''
            });
        }
    }, [formData.loanAmount, formData.interestRate, formData.installmentMonths, formData.loanDate]);

    useEffect(() => {
        calculateLoanDetails();
    }, [calculateLoanDetails]);

    // ========================================
    // HANDLERS
    // ========================================
    const handleInputChange = (field, value) => {
        setIsFormDirty(true);
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear validation for this field
        if (validation[field]) {
            setValidation(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleEmployeeSelect = (employee) => {
        setIsFormDirty(true);
        setSelectedEmployee(employee);
        setFormData(prev => ({ ...prev, employeeId: employee?.id || '' }));

        // Clear employee validation error
        if (validation.employeeId) {
            setValidation(prev => ({ ...prev, employeeId: null }));
        }

        if (employee) {
            showSuccess(`Selected: ${employee.firstName} ${employee.lastName}`);
        }
    };

    // ========================================
    // VALIDATION
    // ========================================
    const validateForm = () => {
        const errors = {};

        if (!formData.employeeId) {
            errors.employeeId = 'Please select an employee';
        }

        if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
            errors.loanAmount = 'Please enter a valid loan amount';
        } else if (parseFloat(formData.loanAmount) > 100000) {
            errors.loanAmount = 'Loan amount cannot exceed $100,000';
        }

        if (!formData.installmentMonths || parseInt(formData.installmentMonths) <= 0) {
            errors.installmentMonths = 'Please select number of installments';
        } else if (parseInt(formData.installmentMonths) > 60) {
            errors.installmentMonths = 'Maximum 60 installments allowed';
        }

        if (!formData.loanDate) {
            errors.loanDate = 'Please select a loan date';
        }

        const interestRate = parseFloat(formData.interestRate);
        if (isNaN(interestRate) || interestRate < 0 || interestRate > 25) {
            errors.interestRate = 'Interest rate must be between 0% and 25%';
        }

        setValidation(errors);
        return Object.keys(errors).length === 0;
    };

    // ========================================
    // SUBMIT
    // ========================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showWarning('Please fix the form errors before submitting');
            return;
        }

        try {
            setLoading(true);

            // Build loan data matching backend LoanDTO expectations
            const loanData = {
                employeeId: formData.employeeId,
                loanAmount: parseFloat(formData.loanAmount),
                installmentMonths: parseInt(formData.installmentMonths),
                interestRate: parseFloat(formData.interestRate) || 0,
                loanDate: formData.loanDate,
                purpose: formData.purpose || `Loan for ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`,
                notes: formData.notes || ''
            };

            console.log('Creating loan with data:', loanData);

            const response = await loanService.createLoan(loanData);

            showSuccess(`Loan ${response.data?.loanNumber || ''} created successfully! Pending HR approval.`);
            onLoanCreated(response.data);
        } catch (err) {
            console.error('Error creating loan:', err);
            const errorMessage = err.response?.data?.message
                || err.response?.data?.error
                || 'Failed to create loan. Please try again.';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ========================================
    // MODAL HANDLERS
    // ========================================
    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            handleCloseAttempt();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) {
                handleCloseAttempt();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, loading, isFormDirty]);

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="create-loan-modal-overlay" onClick={handleOverlayClick}>
            <div className="create-loan-modal">
                {/* Header */}
                <div className="create-loan-modal-header">
                    <h2>Create New Loan</h2>
                    <button
                        className="create-loan-modal-close-btn"
                        onClick={handleCloseAttempt}
                        type="button"
                        aria-label="Close modal"
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="create-loan-modal-content">
                    <form onSubmit={handleSubmit} className="create-loan-form">
                        {/* Employee Selection Section */}
                        <div className="create-loan-form-section">
                            <h3><FaUserTie /> Employee Information</h3>
                            <div className="create-loan-form-group">
                                <label>Select Employee *</label>
                                <EmployeeSelector
                                    employees={employees}
                                    selectedEmployee={selectedEmployee}
                                    onSelect={handleEmployeeSelect}
                                    placeholder="Search and select employee..."
                                    error={validation.employeeId}
                                />
                                {validation.employeeId && (
                                    <span className="create-loan-error-message">{validation.employeeId}</span>
                                )}
                            </div>

                            {selectedEmployee && (
                                <div className="create-loan-employee-preview">
                                    <div className="create-loan-employee-details">
                                        <h4>{selectedEmployee.firstName} {selectedEmployee.lastName}</h4>
                                        <p>
                                            {selectedEmployee.jobPositionName || 'N/A'}
                                            {selectedEmployee.departmentName && ` - ${selectedEmployee.departmentName}`}
                                        </p>
                                        {selectedEmployee.monthlySalary && (
                                            <p>Monthly Salary: {formatCurrency(selectedEmployee.monthlySalary)}</p>
                                        )}
                                        {selectedEmployee.employeeNumber && (
                                            <p className="create-loan-employee-number">
                                                Employee #: {selectedEmployee.employeeNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loan Details Section */}
                        <div className="create-loan-form-section">
                            <h3>Loan Details</h3>
                            <div className="create-loan-form-row">
                                <div className="create-loan-form-group">
                                    <label>Loan Amount ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100000"
                                        value={formData.loanAmount}
                                        onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                                        className={`create-loan-form-input ${validation.loanAmount ? 'create-loan-error' : ''}`}
                                        placeholder="Enter loan amount"
                                        disabled={loading}
                                    />
                                    {validation.loanAmount && (
                                        <span className="create-loan-error-message">{validation.loanAmount}</span>
                                    )}
                                </div>

                                <div className="create-loan-form-group">
                                    <label>Interest Rate (% per annum)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="25"
                                        value={formData.interestRate}
                                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                        className={`create-loan-form-input ${validation.interestRate ? 'create-loan-error' : ''}`}
                                        placeholder="0 for interest-free"
                                        disabled={loading}
                                    />
                                    {validation.interestRate && (
                                        <span className="create-loan-error-message">{validation.interestRate}</span>
                                    )}
                                    <small className="create-loan-field-help">
                                        Enter 0 for interest-free loans
                                    </small>
                                </div>
                            </div>

                            <div className="create-loan-form-row">
                                <div className="create-loan-form-group">
                                    <label>Number of Installments *</label>
                                    <select
                                        value={formData.installmentMonths}
                                        onChange={(e) => handleInputChange('installmentMonths', e.target.value)}
                                        className={`create-loan-form-select ${validation.installmentMonths ? 'create-loan-error' : ''}`}
                                        disabled={loading}
                                    >
                                        <option value="">Select installments</option>
                                        <option value="3">3 months</option>
                                        <option value="6">6 months</option>
                                        <option value="9">9 months</option>
                                        <option value="12">12 months</option>
                                        <option value="18">18 months</option>
                                        <option value="24">24 months</option>
                                        <option value="36">36 months</option>
                                        <option value="48">48 months</option>
                                        <option value="60">60 months</option>
                                    </select>
                                    {validation.installmentMonths && (
                                        <span className="create-loan-error-message">{validation.installmentMonths}</span>
                                    )}
                                </div>

                                <div className="create-loan-form-group">
                                    <label>Loan Date *</label>
                                    <input
                                        type="date"
                                        value={formData.loanDate}
                                        onChange={(e) => handleInputChange('loanDate', e.target.value)}
                                        className={`create-loan-form-input ${validation.loanDate ? 'create-loan-error' : ''}`}
                                        disabled={loading}
                                    />
                                    {validation.loanDate && (
                                        <span className="create-loan-error-message">{validation.loanDate}</span>
                                    )}
                                </div>
                            </div>

                            <div className="create-loan-form-group">
                                <label>Purpose</label>
                                <input
                                    type="text"
                                    value={formData.purpose}
                                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                                    className="create-loan-form-input"
                                    placeholder="e.g., Home renovation, Medical expenses, Education"
                                    maxLength={500}
                                    disabled={loading}
                                />
                                <small className="create-loan-field-help">
                                    Optional - describe the purpose of the loan
                                </small>
                            </div>

                            <div className="create-loan-form-group">
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    className="create-loan-form-input create-loan-textarea"
                                    placeholder="Additional notes or comments..."
                                    rows={3}
                                    maxLength={1000}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Calculation Summary Section */}
                        {calculatedValues.monthlyPayment > 0 && (
                            <div className="create-loan-form-section">
                                <h3><FaCalculator /> Loan Summary</h3>
                                <div className="create-loan-calculation-summary">
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Principal Amount:</span>
                                        <span className="create-loan-value">
                                            {formatCurrency(parseFloat(formData.loanAmount) || 0)}
                                        </span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Interest Rate:</span>
                                        <span className="create-loan-value">
                                            {formData.interestRate || 0}% per annum
                                        </span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Duration:</span>
                                        <span className="create-loan-value">
                                            {formData.installmentMonths} months
                                        </span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Monthly Payment:</span>
                                        <span className="create-loan-value create-loan-monthly-payment">
                                            {formatCurrency(calculatedValues.monthlyPayment)}
                                        </span>
                                    </div>
                                    {calculatedValues.totalInterest > 0 && (
                                        <div className="create-loan-summary-row">
                                            <span className="create-loan-label">Total Interest:</span>
                                            <span className="create-loan-value create-loan-interest-amount">
                                                {formatCurrency(calculatedValues.totalInterest)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="create-loan-summary-row create-loan-total-row">
                                        <span className="create-loan-label">Total Repayment:</span>
                                        <span className="create-loan-value create-loan-total-amount">
                                            {formatCurrency(calculatedValues.totalAmount)}
                                        </span>
                                    </div>
                                    {calculatedValues.endDate && (
                                        <div className="create-loan-summary-row">
                                            <span className="create-loan-label">Expected Completion:</span>
                                            <span className="create-loan-value">
                                                {formatDate(calculatedValues.endDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="create-loan-workflow-note">
                                    <strong>Note:</strong> After creation, this loan will require HR approval.
                                    Once HR approves, a finance payment request will be automatically generated
                                    for disbursement.
                                </div>
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className="create-loan-form-actions">
                            <button
                                type="button"
                                className="create-loan-cancel-btn"
                                onClick={handleCloseAttempt}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="create-loan-submit-btn"
                                disabled={loading || !formData.employeeId || !formData.loanAmount}
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="create-loan-spinner" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        Create Loan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
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
        </div>
    );
};

export default CreateLoanModal;
