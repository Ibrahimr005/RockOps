import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaExchangeAlt } from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import './TransactionForm.css';

const TransactionForm = ({ onClose, onSubmit }) => {
    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [formData, setFormData] = useState({
        transactionType: 'DEPOSIT',
        amount: '',
        transactionDate: new Date().toISOString().slice(0, 16),
        description: '',
        referenceNumber: '',
        accountType: 'BANK_ACCOUNT',
        accountId: '',
        toAccountType: 'BANK_ACCOUNT',
        toAccountId: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [accounts, setAccounts] = useState({
        bankAccounts: [],
        cashSafes: [],
        cashWithPersons: []
    });
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const [bankRes, safeRes, personRes] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            setAccounts({
                bankAccounts: bankRes.data || [],
                cashSafes: safeRes.data || [],
                cashWithPersons: personRes.data || []
            });
        } catch (err) {
            console.error('Error fetching accounts:', err);
            showError('Failed to load accounts');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const getAccountOptions = (accountType) => {
        switch (accountType) {
            case 'BANK_ACCOUNT':
                return accounts.bankAccounts.map(acc => ({
                    id: acc.id,
                    label: `${acc.bankName} - ${acc.accountNumber} (${formatCurrency(acc.currentBalance)})`
                }));
            case 'CASH_SAFE':
                return accounts.cashSafes.map(safe => ({
                    id: safe.id,
                    label: `${safe.safeName} - ${safe.location} (${formatCurrency(safe.currentBalance)})`
                }));
            case 'CASH_WITH_PERSON':
                return accounts.cashWithPersons.map(person => ({
                    id: person.id,
                    label: `${person.personName} (${formatCurrency(person.currentBalance)})`
                }));
            default:
                return [];
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (!formData.accountId) {
            newErrors.accountId = 'Please select an account';
        }

        if (formData.transactionType === 'TRANSFER') {
            if (!formData.toAccountId) {
                newErrors.toAccountId = 'Please select destination account';
            }
            if (formData.accountType === formData.toAccountType &&
                formData.accountId === formData.toAccountId) {
                newErrors.toAccountId = 'Cannot transfer to the same account';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please fix the validation errors');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                transactionType: formData.transactionType,
                amount: parseFloat(formData.amount),
                transactionDate: formData.transactionDate,
                description: formData.description,
                referenceNumber: formData.referenceNumber,
                accountType: formData.accountType,
                accountId: formData.accountId
            };

            if (formData.transactionType === 'TRANSFER') {
                payload.toAccountType = formData.toAccountType;
                payload.toAccountId = formData.toAccountId;
            }

            await financeService.balances.transactions.create(payload);
            showSuccess('Transaction created successfully');
            onSubmit();
        } catch (err) {
            console.error('Error creating transaction:', err);
            const errorMessage = err.response?.data?.message || 'Failed to create transaction';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-container transaction-form-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaExchangeAlt />
                        <h2>New Transaction</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Transaction Type <span className="required">*</span>
                            </label>
                            <select
                                id="transactionType"
                                name="transactionType"
                                value={formData.transactionType}
                                onChange={handleChange}
                                className={`modern-form-select ${errors.transactionType ? 'error' : ''}`}
                            >
                                <option value="DEPOSIT">Deposit</option>
                                <option value="WITHDRAWAL">Withdrawal</option>
                                <option value="TRANSFER">Transfer</option>
                            </select>
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Amount (EGP) <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className={`modern-form-input ${errors.amount ? 'error' : ''}`}
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                            />
                            {errors.amount && <span className="error-text">{errors.amount}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Transaction Date <span className="required">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                id="transactionDate"
                                name="transactionDate"
                                value={formData.transactionDate}
                                className={`modern-form-input ${errors.transactionDate ? 'error' : ''}`}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Reference Number
                            </label>
                            <input
                                type="text"
                                id="referenceNumber"
                                name="referenceNumber"
                                value={formData.referenceNumber}
                                onChange={handleChange}
                                className={`modern-form-input ${errors.referenceNumber ? 'error' : ''}`}
                                placeholder="Optional reference..."
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>
                            {formData.transactionType === 'TRANSFER' ? 'From Account' : 'Account'}
                        </h3>
                        <div className="form-grid">
                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Account Type <span className="required">*</span>
                                </label>
                                <select
                                    id="accountType"
                                    name="accountType"
                                    value={formData.accountType}
                                    onChange={(e) => {
                                        handleChange(e);
                                        setFormData(prev => ({ ...prev, accountId: '' }));
                                    }}
                                    className={`modern-form-input ${errors.accountType ? 'error' : ''}`}
                                >
                                    <option value="BANK_ACCOUNT">Bank Account</option>
                                    <option value="CASH_SAFE">Cash Safe</option>
                                    <option value="CASH_WITH_PERSON">Cash With Person</option>
                                </select>
                            </div>

                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Select Account <span className="required">*</span>
                                </label>
                                <select
                                    id="accountId"
                                    name="accountId"
                                    value={formData.accountId}
                                    onChange={handleChange}
                                    className={`modern-form-input ${errors.accountId ? 'error' : ''}`}
                                >
                                    <option value="">-- Select Account --</option>
                                    {getAccountOptions(formData.accountType).map(option => (
                                        <option key={option.id} value={option.id}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.accountId && <span className="error-text">{errors.accountId}</span>}
                            </div>
                        </div>
                    </div>

                    {formData.transactionType === 'TRANSFER' && (
                        <div className="form-section">
                            <h3>To Account</h3>
                            <div className="form-grid">
                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        Account Type <span className="required">*</span>
                                    </label>
                                    <select
                                        id="toAccountType"
                                        name="toAccountType"
                                        value={formData.toAccountType}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setFormData(prev => ({ ...prev, toAccountId: '' }));
                                        }}
                                        className={`modern-form-input ${errors.toAccountType ? 'error' : ''}`}
                                    >
                                        <option value="BANK_ACCOUNT">Bank Account</option>
                                        <option value="CASH_SAFE">Cash Safe</option>
                                        <option value="CASH_WITH_PERSON">Cash With Person</option>
                                    </select>
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        Select Account <span className="required">*</span>
                                    </label>
                                    <select
                                        id="toAccountId"
                                        name="toAccountId"
                                        value={formData.toAccountId}
                                        onChange={handleChange}
                                        className={`modern-form-input ${errors.toAccountId ? 'error' : ''}`}
                                    >
                                        <option value="">-- Select Account --</option>
                                        {getAccountOptions(formData.toAccountType).map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.toAccountId && <span className="error-text">{errors.toAccountId}</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modern-form-field">
                        <label className="modern-form-label">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="modern-form-textarea"
                            rows="3"
                            placeholder="Transaction description..."
                        />
                    </div>

                </form>


                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} onClick={handleSubmit}>
                        {loading ? (
                            <span>Creating...</span>
                        ) : (
                            <>
                                <FaSave />
                                <span>Create Transaction</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionForm;