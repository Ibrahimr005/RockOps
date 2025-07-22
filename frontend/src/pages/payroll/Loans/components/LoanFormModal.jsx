import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaMoneyBillWave, FaCalendarAlt, FaPercent, FaFileAlt, FaExclamationTriangle } from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService';
import { employeeService } from '../../../../services/hr/employeeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './LoanModal.scss';

const LoanFormModal = ({ loan, onClose, onSave }) => {
    const { showError, showWarning } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [existingOutstanding, setExistingOutstanding] = useState(0);
    const [formData, setFormData] = useState({
        employeeId: '',
        loanAmount: '',
        interestRate: '0.00',
        startDate: '',
        endDate: '',
        installmentAmount: '',
        installmentFrequency: 'MONTHLY',
        totalInstallments: '',
        description: ''
    });
    const [errors, setErrors] = useState({});
    const [warnings, setWarnings] = useState({});

    // Loan restrictions/limits
    const LOAN_LIMITS = {
        MIN_AMOUNT: 100,
        MAX_AMOUNT: 50000,
        MAX_INTEREST_RATE: 30,
        MIN_INSTALLMENTS: 1,
        MAX_INSTALLMENTS: 60,
        MAX_OUTSTANDING_PER_EMPLOYEE: 100000
    };

    useEffect(() => {
        loadEmployees();
        if (loan) {
            setFormData({
                employeeId: loan.employeeId || '',
                loanAmount: loan.loanAmount || '',
                interestRate: loan.interestRate || '0.00',
                startDate: loan.startDate ? loan.startDate.split('T')[0] : '',
                endDate: loan.endDate ? loan.endDate.split('T')[0] : '',
                installmentAmount: loan.installmentAmount || '',
                installmentFrequency: loan.installmentFrequency || 'MONTHLY',
                totalInstallments: loan.totalInstallments || '',
                description: loan.description || ''
            });
        } else {
            // Set default start date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormData(prev => ({
                ...prev,
                startDate: tomorrow.toISOString().split('T')[0]
            }));
        }
    }, [loan]);

    useEffect(() => {
        if (formData.employeeId) {
            loadExistingOutstanding(formData.employeeId);
        }
    }, [formData.employeeId]);

    const loadEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            showError('Failed to load employees');
        }
    };

    const loadExistingOutstanding = async (employeeId) => {
        try {
            const response = await loanService.getOutstandingBalance(employeeId);
            setExistingOutstanding(response.data || 0);
        } catch (error) {
            console.error('Error loading outstanding balance:', error);
            setExistingOutstanding(0);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }

        // Clear warnings
        if (warnings[field]) {
            setWarnings(prev => ({
                ...prev,
                [field]: ''
            }));
        }

        // Auto-calculate fields and validate
        if (field === 'loanAmount' || field === 'totalInstallments') {
            setTimeout(() => calculateInstallmentAmount(), 100);
        }
        if (field === 'startDate' || field === 'installmentFrequency' || field === 'totalInstallments') {
            setTimeout(() => calculateEndDate(), 100);
        }

        // Real-time validation
        setTimeout(() => validateField(field, value), 100);
    };

    const validateField = (field, value) => {
        const newWarnings = { ...warnings };

        switch (field) {
            case 'loanAmount':
                const amount = parseFloat(value);
                if (amount && amount > LOAN_LIMITS.MAX_AMOUNT) {
                    newWarnings.loanAmount = `Amount exceeds maximum limit of $${LOAN_LIMITS.MAX_AMOUNT.toLocaleString()}`;
                } else if (amount && existingOutstanding + amount > LOAN_LIMITS.MAX_OUTSTANDING_PER_EMPLOYEE) {
                    newWarnings.loanAmount = `Total outstanding would exceed limit of $${LOAN_LIMITS.MAX_OUTSTANDING_PER_EMPLOYEE.toLocaleString()}`;
                }
                break;

            case 'interestRate':
                const rate = parseFloat(value);
                if (rate && rate > LOAN_LIMITS.MAX_INTEREST_RATE) {
                    newWarnings.interestRate = `Interest rate exceeds maximum of ${LOAN_LIMITS.MAX_INTEREST_RATE}%`;
                }
                break;

            case 'totalInstallments':
                const installments = parseInt(value);
                if (installments && installments > LOAN_LIMITS.MAX_INSTALLMENTS) {
                    newWarnings.totalInstallments = `Installments exceed maximum of ${LOAN_LIMITS.MAX_INSTALLMENTS}`;
                }
                break;
        }

        setWarnings(newWarnings);
    };

    const calculateInstallmentAmount = () => {
        const { loanAmount, totalInstallments, interestRate } = formData;
        if (loanAmount && totalInstallments && totalInstallments > 0) {
            const principal = parseFloat(loanAmount);
            const rate = parseFloat(interestRate) / 100 / 12; // Monthly interest rate
            const n = parseInt(totalInstallments);

            let monthlyPayment;
            if (rate > 0) {
                // Calculate with interest using PMT formula
                monthlyPayment = principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
            } else {
                // No interest - simple division
                monthlyPayment = principal / n;
            }

            setFormData(prev => ({
                ...prev,
                installmentAmount: monthlyPayment.toFixed(2)
            }));
        }
    };

    const calculateEndDate = () => {
        const { startDate, installmentFrequency, totalInstallments } = formData;
        if (startDate && totalInstallments) {
            const start = new Date(startDate);
            const installments = parseInt(totalInstallments);
            let endDate = new Date(start);

            if (installmentFrequency === 'MONTHLY') {
                endDate.setMonth(start.getMonth() + installments);
            } else if (installmentFrequency === 'WEEKLY') {
                endDate.setDate(start.getDate() + (installments * 7));
            }

            setFormData(prev => ({
                ...prev,
                endDate: endDate.toISOString().split('T')[0]
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required field validation
        if (!formData.employeeId) {
            newErrors.employeeId = 'Employee is required';
        }

        // Loan amount validation
        const loanAmount = parseFloat(formData.loanAmount);
        if (!formData.loanAmount || isNaN(loanAmount) || loanAmount <= 0) {
            newErrors.loanAmount = 'Valid loan amount is required';
        } else if (loanAmount < LOAN_LIMITS.MIN_AMOUNT) {
            newErrors.loanAmount = `Minimum loan amount is $${LOAN_LIMITS.MIN_AMOUNT}`;
        } else if (loanAmount > LOAN_LIMITS.MAX_AMOUNT) {
            newErrors.loanAmount = `Maximum loan amount is $${LOAN_LIMITS.MAX_AMOUNT.toLocaleString()}`;
        } else if (existingOutstanding + loanAmount > LOAN_LIMITS.MAX_OUTSTANDING_PER_EMPLOYEE) {
            newErrors.loanAmount = `Total outstanding cannot exceed $${LOAN_LIMITS.MAX_OUTSTANDING_PER_EMPLOYEE.toLocaleString()}`;
        }

        // Interest rate validation
        const interestRate = parseFloat(formData.interestRate);
        if (!formData.interestRate || isNaN(interestRate) || interestRate < 0) {
            newErrors.interestRate = 'Valid interest rate is required (0 or higher)';
        } else if (interestRate > LOAN_LIMITS.MAX_INTEREST_RATE) {
            newErrors.interestRate = `Maximum interest rate is ${LOAN_LIMITS.MAX_INTEREST_RATE}%`;
        }

        // Date validation
        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        } else {
            const startDate = new Date(formData.startDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                newErrors.startDate = 'Start date cannot be in the past';
            }
        }

        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        }

        // Cross-date validation
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (start >= end) {
                newErrors.endDate = 'End date must be after start date';
            }
        }

        // Installment validation
        const installmentAmount = parseFloat(formData.installmentAmount);
        if (!formData.installmentAmount || isNaN(installmentAmount) || installmentAmount <= 0) {
            newErrors.installmentAmount = 'Valid installment amount is required';
        }

        const totalInstallments = parseInt(formData.totalInstallments);
        if (!formData.totalInstallments || isNaN(totalInstallments) || totalInstallments <= 0) {
            newErrors.totalInstallments = 'Valid number of installments is required';
        } else if (totalInstallments < LOAN_LIMITS.MIN_INSTALLMENTS) {
            newErrors.totalInstallments = `Minimum ${LOAN_LIMITS.MIN_INSTALLMENTS} installment required`;
        } else if (totalInstallments > LOAN_LIMITS.MAX_INSTALLMENTS) {
            newErrors.totalInstallments = `Maximum ${LOAN_LIMITS.MAX_INSTALLMENTS} installments allowed`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please fix all validation errors before submitting');
            return;
        }

        setLoading(true);
        try {
            const loanData = {
                employeeId: formData.employeeId,
                loanAmount: parseFloat(formData.loanAmount),
                interestRate: parseFloat(formData.interestRate),
                startDate: formData.startDate,
                endDate: formData.endDate,
                installmentAmount: parseFloat(formData.installmentAmount),
                installmentFrequency: formData.installmentFrequency,
                totalInstallments: parseInt(formData.totalInstallments),
                description: formData.description || ''
            };

            console.log('Submitting loan data:', loanData);

            if (loan) {
                await loanService.updateLoan(loan.id, loanData);
            } else {
                await loanService.createLoan(loanData);
            }

            onSave();
        } catch (error) {
            console.error('Error saving loan:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save loan';
            showError(`Failed to save loan: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    const totalLoanValue = formData.loanAmount ?
        parseFloat(formData.loanAmount) + (parseFloat(formData.loanAmount) * parseFloat(formData.interestRate || 0) / 100) : 0;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="loan-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        {loan ? 'Edit Loan' : 'Create New Loan'}
                    </h2>
                    <button
                        className="close-button"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="loan-form">
                    <div className="modal-body">
                        {/* Employee Selection */}
                        <div className="form-group">
                            <label htmlFor="employeeId">
                                <FaUser /> Employee *
                            </label>
                            <select
                                id="employeeId"
                                value={formData.employeeId}
                                onChange={(e) => handleInputChange('employeeId', e.target.value)}
                                className={errors.employeeId ? 'error' : ''}
                                disabled={loading || !!loan}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(employee => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.firstName} {employee.lastName} - {employee.email}
                                    </option>
                                ))}
                            </select>
                            {errors.employeeId && <span className="error-message">{errors.employeeId}</span>}

                            {/* Show existing outstanding balance */}
                            {formData.employeeId && existingOutstanding > 0 && (
                                <div className="info-message">
                                    <FaExclamationTriangle />
                                    Current outstanding balance: ${existingOutstanding.toLocaleString()}
                                </div>
                            )}
                        </div>

                        {/* Loan Amount and Interest Rate */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="loanAmount">
                                    <FaMoneyBillWave /> Loan Amount *
                                </label>
                                <input
                                    type="number"
                                    id="loanAmount"
                                    step="0.01"
                                    min={LOAN_LIMITS.MIN_AMOUNT}
                                    max={LOAN_LIMITS.MAX_AMOUNT}
                                    value={formData.loanAmount}
                                    onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                                    className={errors.loanAmount ? 'error' : warnings.loanAmount ? 'warning' : ''}
                                    disabled={loading}
                                    placeholder={`${LOAN_LIMITS.MIN_AMOUNT} - ${LOAN_LIMITS.MAX_AMOUNT.toLocaleString()}`}
                                />
                                {errors.loanAmount && <span className="error-message">{errors.loanAmount}</span>}
                                {warnings.loanAmount && <span className="warning-message">{warnings.loanAmount}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="interestRate">
                                    <FaPercent /> Interest Rate (%) *
                                </label>
                                <input
                                    type="number"
                                    id="interestRate"
                                    step="0.01"
                                    min="0"
                                    max={LOAN_LIMITS.MAX_INTEREST_RATE}
                                    value={formData.interestRate}
                                    onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                    className={errors.interestRate ? 'error' : warnings.interestRate ? 'warning' : ''}
                                    disabled={loading}
                                    placeholder={`0 - ${LOAN_LIMITS.MAX_INTEREST_RATE}`}
                                />
                                {errors.interestRate && <span className="error-message">{errors.interestRate}</span>}
                                {warnings.interestRate && <span className="warning-message">{warnings.interestRate}</span>}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startDate">
                                    <FaCalendarAlt /> Start Date *
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={formData.startDate}
                                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                                    className={errors.startDate ? 'error' : ''}
                                    disabled={loading}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="endDate">
                                    <FaCalendarAlt /> End Date *
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={formData.endDate}
                                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                                    className={errors.endDate ? 'error' : ''}
                                    disabled={loading}
                                    readOnly
                                />
                                {errors.endDate && <span className="error-message">{errors.endDate}</span>}
                                <small className="field-help">Calculated automatically based on frequency and installments</small>
                            </div>
                        </div>

                        {/* Installment Details */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="installmentFrequency">
                                    Installment Frequency *
                                </label>
                                <select
                                    id="installmentFrequency"
                                    value={formData.installmentFrequency}
                                    onChange={(e) => handleInputChange('installmentFrequency', e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="WEEKLY">Weekly</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="totalInstallments">
                                    Total Installments *
                                </label>
                                <input
                                    type="number"
                                    id="totalInstallments"
                                    min={LOAN_LIMITS.MIN_INSTALLMENTS}
                                    max={LOAN_LIMITS.MAX_INSTALLMENTS}
                                    value={formData.totalInstallments}
                                    onChange={(e) => handleInputChange('totalInstallments', e.target.value)}
                                    className={errors.totalInstallments ? 'error' : warnings.totalInstallments ? 'warning' : ''}
                                    disabled={loading}
                                    placeholder={`${LOAN_LIMITS.MIN_INSTALLMENTS} - ${LOAN_LIMITS.MAX_INSTALLMENTS}`}
                                />
                                {errors.totalInstallments && <span className="error-message">{errors.totalInstallments}</span>}
                                {warnings.totalInstallments && <span className="warning-message">{warnings.totalInstallments}</span>}
                            </div>
                        </div>

                        {/* Calculated Installment Amount */}
                        <div className="form-group">
                            <label htmlFor="installmentAmount">
                                <FaMoneyBillWave /> Installment Amount *
                            </label>
                            <input
                                type="number"
                                id="installmentAmount"
                                step="0.01"
                                min="0"
                                value={formData.installmentAmount}
                                onChange={(e) => handleInputChange('installmentAmount', e.target.value)}
                                className={errors.installmentAmount ? 'error' : ''}
                                disabled={loading}
                                readOnly
                                placeholder="Calculated automatically"
                            />
                            {errors.installmentAmount && <span className="error-message">{errors.installmentAmount}</span>}
                            <small className="field-help">
                                {parseFloat(formData.interestRate) > 0 ?
                                    'Calculated using compound interest formula' :
                                    'Simple division (no interest)'}
                            </small>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label htmlFor="description">
                                <FaFileAlt /> Description
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                disabled={loading}
                                placeholder="Enter loan description or purpose..."
                                rows={3}
                                maxLength={500}
                            />
                            <small className="field-help">{formData.description?.length || 0}/500 characters</small>
                        </div>

                        {/* Loan Summary */}
                        {formData.loanAmount && formData.totalInstallments && (
                            <div className="loan-summary">
                                <h4>Loan Summary</h4>
                                <div className="summary-grid">
                                    <div className="summary-item">
                                        <span>Principal Amount:</span>
                                        <span>${parseFloat(formData.loanAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Interest Rate:</span>
                                        <span>{formData.interestRate}% annually</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Total Interest:</span>
                                        <span>${((totalLoanValue - parseFloat(formData.loanAmount || 0)) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Total Repayment:</span>
                                        <span>${totalLoanValue.toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Number of Installments:</span>
                                        <span>{formData.totalInstallments}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Payment Frequency:</span>
                                        <span>{formData.installmentFrequency}</span>
                                    </div>
                                    <div className="summary-item highlight">
                                        <span>Monthly Payment:</span>
                                        <span>${parseFloat(formData.installmentAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Loan Duration:</span>
                                        <span>
                                            {formData.installmentFrequency === 'MONTHLY' ?
                                                `${formData.totalInstallments} months` :
                                                `${formData.totalInstallments} weeks`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || Object.keys(errors).length > 0}
                        >
                            {loading ? 'Saving...' : (loan ? 'Update Loan' : 'Create Loan')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoanFormModal;