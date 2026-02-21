import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiDollarSign, FiSave, FiX, FiPlus, FiTrash2, FiCalendar } from 'react-icons/fi';
import { FaUniversity, FaStore } from 'react-icons/fa';
import { financeService } from '../../../services/financeService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './CreateLoanPage.scss';

const CreateLoanPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // Form state
    const [formData, setFormData] = useState({
        lenderType: 'FINANCIAL_INSTITUTION', // NEW: 'FINANCIAL_INSTITUTION' or 'MERCHANT'
        financialInstitutionId: '',
        merchantId: '',                       // NEW
        loanType: '',
        principalAmount: '',
        interestRate: '',
        interestType: 'FIXED',
        variableRateBase: '',
        currency: 'EGP',
        disbursementDate: '',
        startDate: '',
        maturityDate: '',
        termMonths: '',
        disbursedToAccountId: '',
        disbursedToAccountType: 'BANK_ACCOUNT',
        purpose: '',
        collateral: '',
        guarantor: '',
        contractReference: '',
        notes: ''
    });

    // Installments state
    const [installments, setInstallments] = useState([]);

    // Dropdown options
    const [institutions, setInstitutions] = useState([]);
    const [merchants, setMerchants] = useState([]);           // NEW
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashSafes, setCashSafes] = useState([]);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingOptions, setIsFetchingOptions] = useState(true);
    const [errors, setErrors] = useState({});

    // Loan type options
    const loanTypes = [
        { value: 'WORKING_CAPITAL', label: 'Working Capital' },
        { value: 'EQUIPMENT_FINANCE', label: 'Equipment Finance' },
        { value: 'REAL_ESTATE', label: 'Real Estate' },
        { value: 'LINE_OF_CREDIT', label: 'Line of Credit' },
        { value: 'TERM_LOAN', label: 'Term Loan' },
        { value: 'VEHICLE_LOAN', label: 'Vehicle Loan' },
        { value: 'PROJECT_FINANCE', label: 'Project Finance' },
        { value: 'TRADE_FINANCE', label: 'Trade Finance' },
        { value: 'OTHER', label: 'Other' }
    ];

    // Fetch dropdown options
    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        setIsFetchingOptions(true);
        try {
            const [institutionsRes, merchantsRes, bankAccountsRes, cashSafesRes] = await Promise.all([
                financeService.companyLoans.institutions.getActive(),
                financeService.companyLoans.loans.getMerchantsForLoan(),  // NEW
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAll()
            ]);

            setInstitutions(institutionsRes.data || institutionsRes || []);
            setMerchants(merchantsRes.data || merchantsRes || []);       // NEW
            setBankAccounts(bankAccountsRes.data || bankAccountsRes || []);
            setCashSafes(cashSafesRes.data || cashSafesRes || []);
        } catch (error) {
            console.error('Error fetching options:', error);
            showError('Failed to load form options');
        } finally {
            setIsFetchingOptions(false);
        }
    };

    // Handle form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Handle lender type change — reset the selected lender when toggling
    const handleLenderTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            lenderType: type,
            financialInstitutionId: '',
            merchantId: ''
        }));
        // Clear lender-related errors
        setErrors(prev => ({
            ...prev,
            financialInstitutionId: null,
            merchantId: null,
            lenderSource: null
        }));
    };

    // Handle installment change
    const handleInstallmentChange = (index, field, value) => {
        setInstallments(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Add installment
    const addInstallment = () => {
        const nextNumber = installments.length + 1;
        setInstallments(prev => [...prev, {
            installmentNumber: nextNumber,
            dueDate: '',
            principalAmount: '',
            interestAmount: '',
            notes: ''
        }]);
    };

    // Remove installment
    const removeInstallment = (index) => {
        setInstallments(prev => {
            const updated = prev.filter((_, i) => i !== index);
            // Renumber remaining installments
            return updated.map((inst, i) => ({ ...inst, installmentNumber: i + 1 }));
        });
    };

    // Generate installments automatically
    const generateInstallments = () => {
        const { principalAmount, interestRate, termMonths, startDate } = formData;

        if (!principalAmount || !interestRate || !termMonths || !startDate) {
            showError('Please fill in principal, interest rate, term months, and start date first');
            return;
        }

        const principal = parseFloat(principalAmount);
        const rate = parseFloat(interestRate) / 100 / 12; // Monthly rate
        const months = parseInt(termMonths);
        const start = new Date(startDate);

        // Calculate monthly payment (PMT formula)
        const monthlyPayment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);

        const newInstallments = [];
        let remainingPrincipal = principal;

        for (let i = 1; i <= months; i++) {
            const interestPayment = remainingPrincipal * rate;
            const principalPayment = monthlyPayment - interestPayment;
            remainingPrincipal -= principalPayment;

            const dueDate = new Date(start);
            dueDate.setMonth(dueDate.getMonth() + i);

            newInstallments.push({
                installmentNumber: i,
                dueDate: dueDate.toISOString().split('T')[0],
                principalAmount: principalPayment.toFixed(2),
                interestAmount: interestPayment.toFixed(2),
                notes: ''
            });
        }

        setInstallments(newInstallments);
        showSuccess(`Generated ${months} installments`);
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate lender based on type
        if (formData.lenderType === 'FINANCIAL_INSTITUTION') {
            if (!formData.financialInstitutionId) newErrors.financialInstitutionId = 'Institution is required';
        } else if (formData.lenderType === 'MERCHANT') {
            if (!formData.merchantId) newErrors.merchantId = 'Merchant is required';
        }

        if (!formData.loanType) newErrors.loanType = 'Loan type is required';
        if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
            newErrors.principalAmount = 'Valid principal amount is required';
        }
        if (!formData.interestRate || parseFloat(formData.interestRate) < 0) {
            newErrors.interestRate = 'Valid interest rate is required';
        }
        if (!formData.disbursementDate) newErrors.disbursementDate = 'Disbursement date is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.maturityDate) newErrors.maturityDate = 'Maturity date is required';
        if (!formData.termMonths || parseInt(formData.termMonths) <= 0) {
            newErrors.termMonths = 'Valid term months is required';
        }
        if (!formData.disbursedToAccountId) newErrors.disbursedToAccountId = 'Disbursement account is required';

        // Validate installments
        if (installments.length === 0) {
            newErrors.installments = 'At least one installment is required';
        } else {
            // Check installment totals match principal
            const totalPrincipal = installments.reduce((sum, inst) =>
                sum + parseFloat(inst.principalAmount || 0), 0);
            const principal = parseFloat(formData.principalAmount);

            if (Math.abs(totalPrincipal - principal) > 0.01) {
                newErrors.installments = `Installment principal total (${totalPrincipal.toFixed(2)}) must equal loan principal (${principal.toFixed(2)})`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please fix the errors before submitting');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                lenderType: formData.lenderType,
                financialInstitutionId: formData.lenderType === 'FINANCIAL_INSTITUTION' ? formData.financialInstitutionId : null,
                merchantId: formData.lenderType === 'MERCHANT' ? formData.merchantId : null,
                loanType: formData.loanType,
                principalAmount: parseFloat(formData.principalAmount),
                interestRate: parseFloat(formData.interestRate),
                interestType: formData.interestType,
                variableRateBase: formData.variableRateBase,
                currency: formData.currency,
                disbursementDate: formData.disbursementDate,
                startDate: formData.startDate,
                maturityDate: formData.maturityDate,
                termMonths: parseInt(formData.termMonths),
                disbursedToAccountId: formData.disbursedToAccountId,
                disbursedToAccountType: formData.disbursedToAccountType,
                purpose: formData.purpose,
                collateral: formData.collateral,
                guarantor: formData.guarantor,
                contractReference: formData.contractReference,
                notes: formData.notes,
                installments: installments.map(inst => ({
                    ...inst,
                    principalAmount: parseFloat(inst.principalAmount),
                    interestAmount: parseFloat(inst.interestAmount)
                }))
            };

            await financeService.companyLoans.loans.create(payload);
            showSuccess('Loan created successfully');

            setTimeout(() => {
                navigate('/finance/company-loans');
            }, 1500);
        } catch (error) {
            console.error('Error creating loan:', error);
            showError(error.response?.data?.message || 'Failed to create loan');
        } finally {
            setIsLoading(false);
        }
    };

    // Get available accounts based on type
    const getAvailableAccounts = () => {
        if (formData.disbursedToAccountType === 'BANK_ACCOUNT') {
            return bankAccounts.map(acc => ({
                value: acc.id,
                label: `${acc.bankName} - ${acc.accountNumber}`
            }));
        } else if (formData.disbursedToAccountType === 'CASH_SAFE') {
            return cashSafes.filter(s => s.isActive).map(safe => ({
                value: safe.id,
                label: safe.safeName
            }));
        }
        return [];
    };

    // Breadcrumbs
    const breadcrumbs = [
        { label: 'Company Loans', onClick: () => navigate('/finance/company-loans') },
        { label: 'New Loan' }
    ];

    // Calculate totals
    const totalPrincipal = installments.reduce((sum, inst) => sum + parseFloat(inst.principalAmount || 0), 0);
    const totalInterest = installments.reduce((sum, inst) => sum + parseFloat(inst.interestAmount || 0), 0);

    return (
        <div className="create-loan-page">
            <IntroCard
                title="Create New Loan"
                label="FINANCE CENTER"
                icon={<FiDollarSign />}
                breadcrumbs={breadcrumbs}
            />

            <form onSubmit={handleSubmit} className="loan-form">
                {/* Basic Information Section */}
                <div className="form-section">
                    <h3 className="form-section__title">Basic Information</h3>
                    <div className="form-grid">

                        {/* ===== LENDER TYPE TOGGLE ===== */}
                        <div className="form-group form-group--full">
                            <label>Lender Source <span className="required">*</span></label>
                            <div className="lender-type-toggle">
                                <button
                                    type="button"
                                    className={`lender-type-toggle__btn ${formData.lenderType === 'FINANCIAL_INSTITUTION' ? 'lender-type-toggle__btn--active' : ''}`}
                                    onClick={() => handleLenderTypeChange('FINANCIAL_INSTITUTION')}
                                >
                                    <FaUniversity />
                                    <span>Financial Institution</span>
                                </button>
                                <button
                                    type="button"
                                    className={`lender-type-toggle__btn ${formData.lenderType === 'MERCHANT' ? 'lender-type-toggle__btn--active' : ''}`}
                                    onClick={() => handleLenderTypeChange('MERCHANT')}
                                >
                                    <FaStore />
                                    <span>Merchant</span>
                                </button>
                            </div>
                        </div>

                        {/* ===== INSTITUTION SELECT (shown when FINANCIAL_INSTITUTION) ===== */}
                        {formData.lenderType === 'FINANCIAL_INSTITUTION' && (
                            <div className={`form-group ${errors.financialInstitutionId ? 'has-error' : ''}`}>
                                <label>Financial Institution <span className="required">*</span></label>
                                <select
                                    name="financialInstitutionId"
                                    value={formData.financialInstitutionId}
                                    onChange={handleInputChange}
                                    disabled={isFetchingOptions}
                                >
                                    <option value="">Select Institution</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.financialInstitutionId && <span className="error-text">{errors.financialInstitutionId}</span>}
                            </div>
                        )}

                        {/* ===== MERCHANT SELECT (shown when MERCHANT) ===== */}
                        {formData.lenderType === 'MERCHANT' && (
                            <div className={`form-group ${errors.merchantId ? 'has-error' : ''}`}>
                                <label>Merchant <span className="required">*</span></label>
                                <select
                                    name="merchantId"
                                    value={formData.merchantId}
                                    onChange={handleInputChange}
                                    disabled={isFetchingOptions}
                                >
                                    <option value="">Select Merchant</option>
                                    {merchants.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} {m.contactPersonName ? `(${m.contactPersonName})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.merchantId && <span className="error-text">{errors.merchantId}</span>}
                            </div>
                        )}

                        <div className={`form-group ${errors.loanType ? 'has-error' : ''}`}>
                            <label>Loan Type <span className="required">*</span></label>
                            <select
                                name="loanType"
                                value={formData.loanType}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Type</option>
                                {loanTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {errors.loanType && <span className="error-text">{errors.loanType}</span>}
                        </div>

                        <div className={`form-group ${errors.principalAmount ? 'has-error' : ''}`}>
                            <label>Principal Amount <span className="required">*</span></label>
                            <input
                                type="number"
                                name="principalAmount"
                                value={formData.principalAmount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                            {errors.principalAmount && <span className="error-text">{errors.principalAmount}</span>}
                        </div>

                        <div className="form-group">
                            <label>Currency</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleInputChange}
                            >
                                <option value="EGP">EGP</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Interest Section */}
                <div className="form-section">
                    <h3 className="form-section__title">Interest Details</h3>
                    <div className="form-grid">
                        <div className={`form-group ${errors.interestRate ? 'has-error' : ''}`}>
                            <label>Interest Rate (% per annum) <span className="required">*</span></label>
                            <input
                                type="number"
                                name="interestRate"
                                value={formData.interestRate}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                            {errors.interestRate && <span className="error-text">{errors.interestRate}</span>}
                        </div>

                        <div className="form-group">
                            <label>Interest Type <span className="required">*</span></label>
                            <select
                                name="interestType"
                                value={formData.interestType}
                                onChange={handleInputChange}
                            >
                                <option value="FIXED">Fixed</option>
                                <option value="VARIABLE">Variable</option>
                            </select>
                        </div>

                        {formData.interestType === 'VARIABLE' && (
                            <div className="form-group">
                                <label>Variable Rate Base</label>
                                <input
                                    type="text"
                                    name="variableRateBase"
                                    value={formData.variableRateBase}
                                    onChange={handleInputChange}
                                    placeholder="e.g., LIBOR + 2%"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Dates & Term Section */}
                <div className="form-section">
                    <h3 className="form-section__title">Dates & Term</h3>
                    <div className="form-grid">
                        <div className={`form-group ${errors.disbursementDate ? 'has-error' : ''}`}>
                            <label>Disbursement Date <span className="required">*</span></label>
                            <input
                                type="date"
                                name="disbursementDate"
                                value={formData.disbursementDate}
                                onChange={handleInputChange}
                            />
                            {errors.disbursementDate && <span className="error-text">{errors.disbursementDate}</span>}
                        </div>

                        <div className={`form-group ${errors.startDate ? 'has-error' : ''}`}>
                            <label>Start Date <span className="required">*</span></label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleInputChange}
                            />
                            {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                        </div>

                        <div className={`form-group ${errors.maturityDate ? 'has-error' : ''}`}>
                            <label>Maturity Date <span className="required">*</span></label>
                            <input
                                type="date"
                                name="maturityDate"
                                value={formData.maturityDate}
                                onChange={handleInputChange}
                            />
                            {errors.maturityDate && <span className="error-text">{errors.maturityDate}</span>}
                        </div>

                        <div className={`form-group ${errors.termMonths ? 'has-error' : ''}`}>
                            <label>Term (Months) <span className="required">*</span></label>
                            <input
                                type="number"
                                name="termMonths"
                                value={formData.termMonths}
                                onChange={handleInputChange}
                                placeholder="12"
                                min="1"
                            />
                            {errors.termMonths && <span className="error-text">{errors.termMonths}</span>}
                        </div>
                    </div>
                </div>

                {/* Disbursement Account Section */}
                <div className="form-section">
                    <h3 className="form-section__title">Disbursement Account</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Account Type <span className="required">*</span></label>
                            <select
                                name="disbursedToAccountType"
                                value={formData.disbursedToAccountType}
                                onChange={(e) => {
                                    handleInputChange(e);
                                    setFormData(prev => ({ ...prev, disbursedToAccountId: '' }));
                                }}
                            >
                                <option value="BANK_ACCOUNT">Bank Account</option>
                                <option value="CASH_SAFE">Cash Safe</option>
                            </select>
                        </div>

                        <div className={`form-group ${errors.disbursedToAccountId ? 'has-error' : ''}`}>
                            <label>Account <span className="required">*</span></label>
                            <select
                                name="disbursedToAccountId"
                                value={formData.disbursedToAccountId}
                                onChange={handleInputChange}
                                disabled={isFetchingOptions}
                            >
                                <option value="">Select Account</option>
                                {getAvailableAccounts().map(acc => (
                                    <option key={acc.value} value={acc.value}>
                                        {acc.label}
                                    </option>
                                ))}
                            </select>
                            {errors.disbursedToAccountId && <span className="error-text">{errors.disbursedToAccountId}</span>}
                        </div>
                    </div>
                </div>

                {/* Additional Details Section */}
                <div className="form-section">
                    <h3 className="form-section__title">Additional Details</h3>
                    <div className="form-grid">
                        <div className="form-group form-group--full">
                            <label>Purpose</label>
                            <textarea
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleInputChange}
                                placeholder="Purpose of the loan..."
                                rows="2"
                            />
                        </div>

                        <div className="form-group">
                            <label>Collateral</label>
                            <input
                                type="text"
                                name="collateral"
                                value={formData.collateral}
                                onChange={handleInputChange}
                                placeholder="Collateral details"
                            />
                        </div>

                        <div className="form-group">
                            <label>Guarantor</label>
                            <input
                                type="text"
                                name="guarantor"
                                value={formData.guarantor}
                                onChange={handleInputChange}
                                placeholder="Guarantor name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Contract Reference</label>
                            <input
                                type="text"
                                name="contractReference"
                                value={formData.contractReference}
                                onChange={handleInputChange}
                                placeholder="Contract reference number"
                            />
                        </div>

                        <div className="form-group form-group--full">
                            <label>Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Additional notes..."
                                rows="2"
                            />
                        </div>
                    </div>
                </div>

                {/* Installments Section */}
                <div className="form-section">
                    <div className="form-section__header">
                        <h3 className="form-section__title">Payment Schedule</h3>
                        <div className="form-section__actions">
                            <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={generateInstallments}
                            >
                                <FiCalendar /> Auto-Generate
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={addInstallment}
                            >
                                <FiPlus /> Add Installment
                            </button>
                        </div>
                    </div>

                    {errors.installments && (
                        <div className="error-banner">{errors.installments}</div>
                    )}

                    {installments.length > 0 ? (
                        <>
                            <div className="installments-table">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Due Date *</th>
                                        <th>Principal *</th>
                                        <th>Interest *</th>
                                        <th>Total</th>
                                        <th>Notes</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {installments.map((inst, index) => (
                                        <tr key={index}>
                                            <td>{inst.installmentNumber}</td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={inst.dueDate}
                                                    onChange={(e) => handleInstallmentChange(index, 'dueDate', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={inst.principalAmount}
                                                    onChange={(e) => handleInstallmentChange(index, 'principalAmount', e.target.value)}
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={inst.interestAmount}
                                                    onChange={(e) => handleInstallmentChange(index, 'interestAmount', e.target.value)}
                                                    placeholder="0.00"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="total-cell">
                                                {(parseFloat(inst.principalAmount || 0) + parseFloat(inst.interestAmount || 0)).toFixed(2)}
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={inst.notes || ''}
                                                    onChange={(e) => handleInstallmentChange(index, 'notes', e.target.value)}
                                                    placeholder="Optional"
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-icon btn-icon--danger"
                                                    onClick={() => removeInstallment(index)}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                    <tfoot>
                                    <tr>
                                        <td colSpan="2"><strong>Totals</strong></td>
                                        <td><strong>{totalPrincipal.toFixed(2)}</strong></td>
                                        <td><strong>{totalInterest.toFixed(2)}</strong></td>
                                        <td><strong>{(totalPrincipal + totalInterest).toFixed(2)}</strong></td>
                                        <td colSpan="2"></td>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="empty-installments">
                            <p>No installments added yet. Click "Auto-Generate" or "Add Installment" to create the payment schedule.</p>
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => navigate('/finance/company-loans')}
                        disabled={isLoading}
                    >
                        <FiX /> Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span> Creating...
                            </>
                        ) : (
                            <>
                                <FiSave /> Create Loan
                            </>
                        )}
                    </button>
                </div>
            </form>

        </div>
    );
};

export default CreateLoanPage;