// frontend/src/pages/payroll/CreateLoanModal/CreateLoanModal.jsx
import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaCalculator } from 'react-icons/fa';
import EmployeeSelector from '../../../../../components/common/EmployeeSelector/EmployeeSelector.jsx';
import { loanService } from '../../../../../services/payroll/loanService.js';
import { formatCurrency } from '../../../../../utils/formatters.js';
import './CreateLoanModal.scss';

const CreateLoanModal = ({ employees, onClose, onLoanCreated }) => {
    const [formData, setFormData] = useState({
        employeeId: '',
        loanAmount: '',
        interestRate: '0',
        totalInstallments: '12',
        startDate: '',
        endDate: ''
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [validation, setValidation] = useState({});
    const [loading, setLoading] = useState(false);
    const [calculatedValues, setCalculatedValues] = useState({
        monthlyPayment: 0,
        totalAmount: 0
    });

    useEffect(() => {
        if (formData.loanAmount && formData.totalInstallments) {
            calculateLoanDetails();
        }
    }, [formData.loanAmount, formData.interestRate, formData.totalInstallments]);

    useEffect(() => {
        if (formData.startDate && formData.totalInstallments) {
            calculateEndDate();
        }
    }, [formData.startDate, formData.totalInstallments]);

    const calculateLoanDetails = () => {
        const principal = parseFloat(formData.loanAmount) || 0;
        const rate = parseFloat(formData.interestRate) / 100 / 12; // Monthly rate
        const months = parseInt(formData.totalInstallments) || 1;

        if (principal > 0 && months > 0) {
            let monthlyPayment;
            let totalAmount;

            if (rate > 0) {
                // Calculate with interest
                monthlyPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
                totalAmount = monthlyPayment * months;
            } else {
                // No interest
                monthlyPayment = principal / months;
                totalAmount = principal;
            }

            setCalculatedValues({
                monthlyPayment: Math.round(monthlyPayment * 100) / 100,
                totalAmount: Math.round(totalAmount * 100) / 100
            });
        }
    };

    const calculateEndDate = () => {
        if (formData.startDate && formData.totalInstallments) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + parseInt(formData.totalInstallments));

            setFormData(prev => ({
                ...prev,
                endDate: endDate.toISOString().split('T')[0]
            }));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear validation for this field
        if (validation[field]) {
            setValidation(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleEmployeeSelect = async (employee) => {
        setSelectedEmployee(employee);
        setFormData(prev => ({ ...prev, employeeId: employee.id }));

        // Validate loan eligibility
        try {
            const eligibilityResponse = await loanService.validateLoanEligibility(employee.id);
            if (!eligibilityResponse.data.eligible) {
                setValidation(prev => ({
                    ...prev,
                    employeeId: eligibilityResponse.data.reason
                }));
                // Use your existing snackbar here
                // showSnackbar(`Employee not eligible: ${eligibilityResponse.data.reason}`, 'warning');
            } else {
                // Use your existing snackbar here
                // showSnackbar('Employee is eligible for loan', 'success');
            }
        } catch (err) {
            console.error('Error validating eligibility:', err);
            // Use your existing snackbar here
            // showSnackbar('Failed to validate employee eligibility', 'error');
        }
    };

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

        if (!formData.totalInstallments || parseInt(formData.totalInstallments) <= 0) {
            errors.totalInstallments = 'Please enter valid number of installments';
        } else if (parseInt(formData.totalInstallments) > 60) {
            errors.totalInstallments = 'Maximum 60 installments allowed';
        }

        if (!formData.startDate) {
            errors.startDate = 'Please select a start date';
        } else {
            const startDate = new Date(formData.startDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                errors.startDate = 'Start date cannot be in the past';
            }
        }

        if (parseFloat(formData.interestRate) < 0 || parseFloat(formData.interestRate) > 25) {
            errors.interestRate = 'Interest rate must be between 0% and 25%';
        }

        setValidation(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            // Use your existing snackbar here
            // showSnackbar('Please fix the form errors', 'error');
            return;
        }

        // Validate that calculated values exist
        if (!calculatedValues.monthlyPayment || calculatedValues.monthlyPayment <= 0) {
            console.error('Monthly payment not calculated properly:', calculatedValues);
            // showSnackbar('Error calculating loan payments. Please try again.', 'error');
            return;
        }

        try {
            setLoading(true);
            const loanData = {
                employeeId: formData.employeeId,
                loanAmount: parseFloat(formData.loanAmount),
                interestRate: parseFloat(formData.interestRate),
                totalInstallments: parseInt(formData.totalInstallments),
                startDate: formData.startDate,
                endDate: formData.endDate,
                // FIX: Ensure installmentAmount is properly set and not null
                installmentAmount: calculatedValues.monthlyPayment,
                installmentFrequency: 'MONTHLY', // Set the frequency
                description: `Loan for ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}` // Add description
            };

            // Validate the loan data before sending
            console.log('Sending loan data:', loanData);

            // Additional validation to ensure no null values for required fields
            if (!loanData.installmentAmount || loanData.installmentAmount <= 0) {
                throw new Error('Invalid installment amount calculated');
            }

            const response = await loanService.createLoan(loanData);
            onLoanCreated(response.data);
        } catch (err) {
            console.error('Error creating loan:', err);
            // Use your existing snackbar here
            // showSnackbar('Failed to create loan. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="create-loan-modal-overlay" onClick={handleOverlayClick}>
            <div className="create-loan-modal">
                <div className="create-loan-modal-header">
                    <h2>Create New Loan</h2>
                    <button
                        className="create-loan-modal-close-btn"
                        onClick={onClose}
                        type="button"
                        aria-label="Close modal"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="create-loan-modal-content">
                    <form onSubmit={handleSubmit} className="create-loan-form">
                        {/* Employee Selection */}
                        <div className="create-loan-form-section">
                            <h3>Employee Information</h3>
                            <div className="create-loan-form-group">
                                <label>Employee *</label>
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
                                        <p>{selectedEmployee.jobPositionName} - {selectedEmployee.departmentName}</p>
                                        <p>Monthly Salary: {formatCurrency(selectedEmployee.monthlySalary)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loan Details */}
                        <div className="create-loan-form-section">
                            <h3>Loan Details</h3>
                            <div className="create-loan-form-row">
                                <div className="create-loan-form-group">
                                    <label>Loan Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100000"
                                        value={formData.loanAmount}
                                        onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                                        className={`create-loan-form-input ${validation.loanAmount ? 'create-loan-error' : ''}`}
                                        placeholder="Enter loan amount"
                                    />
                                    {validation.loanAmount && (
                                        <span className="create-loan-error-message">{validation.loanAmount}</span>
                                    )}
                                </div>

                                <div className="create-loan-form-group">
                                    <label>Interest Rate (%) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="25"
                                        value={formData.interestRate}
                                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                                        className={`create-loan-form-input ${validation.interestRate ? 'create-loan-error' : ''}`}
                                        placeholder="Enter interest rate"
                                    />
                                    {validation.interestRate && (
                                        <span className="create-loan-error-message">{validation.interestRate}</span>
                                    )}
                                </div>
                            </div>

                            <div className="create-loan-form-row">
                                <div className="create-loan-form-group">
                                    <label>Total Installments *</label>
                                    <select
                                        value={formData.totalInstallments}
                                        onChange={(e) => handleInputChange('totalInstallments', e.target.value)}
                                        className={`create-loan-form-select ${validation.totalInstallments ? 'create-loan-error' : ''}`}
                                    >
                                        <option value="">Select installments</option>
                                        <option value="6">6 months</option>
                                        <option value="12">12 months</option>
                                        <option value="18">18 months</option>
                                        <option value="24">24 months</option>
                                        <option value="36">36 months</option>
                                        <option value="48">48 months</option>
                                        <option value="60">60 months</option>
                                    </select>
                                    {validation.totalInstallments && (
                                        <span className="create-loan-error-message">{validation.totalInstallments}</span>
                                    )}
                                </div>

                                <div className="create-loan-form-group">
                                    <label>Start Date *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                                        className={`create-loan-form-input ${validation.startDate ? 'create-loan-error' : ''}`}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {validation.startDate && (
                                        <span className="create-loan-error-message">{validation.startDate}</span>
                                    )}
                                </div>
                            </div>

                            <div className="create-loan-form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    readOnly
                                    className="create-loan-form-input create-loan-readonly-field"
                                />
                                <small className="create-loan-field-help">
                                    Automatically calculated based on start date and installments
                                </small>
                            </div>
                        </div>

                        {/* Calculation Summary */}
                        {calculatedValues.monthlyPayment > 0 && (
                            <div className="create-loan-form-section">
                                <h3><FaCalculator /> Loan Summary</h3>
                                <div className="create-loan-calculation-summary">
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Principal Amount:</span>
                                        <span className="create-loan-value">{formatCurrency(parseFloat(formData.loanAmount) || 0)}</span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Interest Rate:</span>
                                        <span className="create-loan-value">{formData.interestRate}% per annum</span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Monthly Payment:</span>
                                        <span className="create-loan-value create-loan-monthly-payment">{formatCurrency(calculatedValues.monthlyPayment)}</span>
                                    </div>
                                    <div className="create-loan-summary-row">
                                        <span className="create-loan-label">Total Installments:</span>
                                        <span className="create-loan-value">{formData.totalInstallments} months</span>
                                    </div>
                                    <div className="create-loan-summary-row create-loan-total-row">
                                        <span className="create-loan-label">Total Amount to be Paid:</span>
                                        <span className="create-loan-value create-loan-total-amount">{formatCurrency(calculatedValues.totalAmount)}</span>
                                    </div>
                                    {calculatedValues.totalAmount > parseFloat(formData.loanAmount || 0) && (
                                        <div className="create-loan-summary-row">
                                            <span className="create-loan-label">Total Interest:</span>
                                            <span className="create-loan-value create-loan-interest-amount">
                                                {formatCurrency(calculatedValues.totalAmount - parseFloat(formData.loanAmount || 0))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className="create-loan-form-actions">
                            <button
                                type="button"
                                className="create-loan-cancel-btn"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="create-loan-submit-btn"
                                disabled={loading || !formData.employeeId || !formData.loanAmount || calculatedValues.monthlyPayment <= 0}
                            >
                                <FaSave /> {loading ? 'Creating...' : 'Create Loan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateLoanModal;