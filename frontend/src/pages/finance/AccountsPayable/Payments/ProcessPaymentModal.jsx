import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import { FiDollarSign, FiUser, FiCalendar, FiFileText, FiCreditCard } from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './ProcessPaymentModal.scss';

const ProcessPaymentModal = ({ paymentRequest, onClose, onSuccess }) => {
    const { showSuccess, showError } = useSnackbar();

    // Accounts state
    const [accounts, setAccounts] = useState({
        bankAccounts: [],
        cashSafes: [],
        cashWithPersons: []
    });

    // Form state
    const [formData, setFormData] = useState({
        paymentRequestId: paymentRequest?.id || '',
        amount: paymentRequest?.remainingAmount || '',
        paymentMethod: 'BANK_ACCOUNT',
        paymentAccountType: 'BANK_ACCOUNT',
        paymentAccountId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionReference: '',
        notes: ''
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [errors, setErrors] = useState({});
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Fetch accounts on mount
    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoadingAccounts(true);
            const [bankAccountsRes, cashSafesRes, cashWithPersonsRes] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            setAccounts({
                bankAccounts: bankAccountsRes.data || [],
                cashSafes: cashSafesRes.data || [],
                cashWithPersons: cashWithPersonsRes.data || []
            });
        } catch (err) {
            console.error('Error fetching accounts:', err);
            showError('Failed to load payment accounts');
        } finally {
            setLoadingAccounts(false);
        }
    };

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Update payment account type when payment method changes
        if (name === 'paymentMethod') {
            setFormData(prev => ({
                ...prev,
                paymentAccountType: value,
                paymentAccountId: '' // Reset account selection
            }));
        }

        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (parseFloat(formData.amount) > parseFloat(paymentRequest.remainingAmount)) {
            newErrors.amount = `Amount cannot exceed remaining amount: ${formatCurrency(paymentRequest.remainingAmount)}`;
        }

        if (!formData.paymentAccountId) {
            newErrors.paymentAccountId = 'Please select a payment account';
        }

        if (!formData.paymentDate) {
            newErrors.paymentDate = 'Payment date is required';
        }

        // Check account balance
        const selectedAccount = getSelectedAccount();
        if (selectedAccount && parseFloat(formData.amount) > parseFloat(selectedAccount.currentBalance || selectedAccount.availableBalance || 0)) {
            newErrors.paymentAccountId = `Insufficient balance. Available: ${formatCurrency(selectedAccount.currentBalance || selectedAccount.availableBalance)}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!validateForm()) {
            showError('Please fix the validation errors');
            return;
        }

        setShowConfirmation(true);
    };

    // Confirm and process payment
    const handleConfirmPayment = async () => {
        setShowConfirmation(false);
        setLoading(true);

        try {
            const payload = {
                paymentRequestId: paymentRequest.id,
                amount: parseFloat(formData.amount),
                paymentMethod: formData.paymentMethod,
                paymentAccountType: formData.paymentAccountType,
                paymentAccountId: formData.paymentAccountId,
                paymentDate: formData.paymentDate,
                transactionReference: formData.transactionReference,
                notes: formData.notes
            };

            await financeService.accountsPayable.payments.process(payload);
            onSuccess();
        } catch (err) {
            console.error('Error processing payment:', err);
            const errorMessage = err.response?.data?.message || err.response?.data || 'Failed to process payment';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Get available accounts based on selected payment method
    const getAvailableAccounts = () => {
        switch (formData.paymentMethod) {
            case 'BANK_ACCOUNT':
                return accounts.bankAccounts;
            case 'CASH_SAFE':
                return accounts.cashSafes;
            case 'CASH_WITH_PERSON':
                return accounts.cashWithPersons;
            default:
                return [];
        }
    };

    // Get selected account details
    const getSelectedAccount = () => {
        const availableAccounts = getAvailableAccounts();
        return availableAccounts.find(acc => acc.id === formData.paymentAccountId);
    };

    // Get account display name
    const getAccountDisplayName = (account) => {
        const balance = account.currentBalance || account.availableBalance || 0;
        switch (formData.paymentMethod) {
            case 'BANK_ACCOUNT':
                return `${account.bankName} - ${account.accountNumber} (${formatCurrency(balance)})`;
            case 'CASH_SAFE':
                return `${account.safeName} - ${account.location} (${formatCurrency(balance)})`;
            case 'CASH_WITH_PERSON':
                return `${account.personName} (${formatCurrency(balance)})`;
            default:
                return '';
        }
    };

    // Get payment method icon
    const getPaymentMethodIcon = () => {
        switch (formData.paymentMethod) {
            case 'BANK_ACCOUNT':
                return <FiCreditCard />;
            case 'CASH_SAFE':
                return <FiDollarSign />;
            case 'CASH_WITH_PERSON':
                return <FiUser />;
            default:
                return <FiDollarSign />;
        }
    };

    // Loading state
    if (loadingAccounts) {
        return (
            <div className="modal-overlay">
                <div className="modal-container process-payment-modal">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading payment accounts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-container process-payment-modal" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="modal-header">
                        <div className="modal-title">
                            <FiDollarSign className="modal-icon" />
                            <div>
                                <h2>Process Payment</h2>
                                <span className="modal-subtitle">{paymentRequest.requestNumber}</span>
                            </div>
                        </div>
                        <button className="modal-close" onClick={onClose} disabled={loading}>
                            <FaTimes />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="modal-body">
                        {/* Payment Request Summary */}
                        <div className="request-summary">
                            <h3>Payment Request Details</h3>
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <label>Request Number</label>
                                    <span className="value highlight">{paymentRequest.requestNumber}</span>
                                </div>
                                {paymentRequest.purchaseOrderNumber && (
                                    <div className="summary-item">
                                        <label>PO Number</label>
                                        <span className="value">{paymentRequest.purchaseOrderNumber}</span>
                                    </div>
                                )}
                                <div className="summary-item">
                                    <label>Merchant</label>
                                    <span className="value">{paymentRequest.merchantName || paymentRequest.institutionName || 'N/A'}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Description</label>
                                    <span className="value">{paymentRequest.description || 'N/A'}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Requested Amount</label>
                                    <span className="value amount">{formatCurrency(paymentRequest.requestedAmount)}</span>
                                </div>
                                <div className="summary-item">
                                    <label>Already Paid</label>
                                    <span className="value amount paid">{formatCurrency(paymentRequest.totalPaidAmount)}</span>
                                </div>
                                <div className="summary-item full-width">
                                    <label>Remaining Amount</label>
                                    <span className="value amount remaining">{formatCurrency(paymentRequest.remainingAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Form */}
                        <form onSubmit={handleSubmit} className="payment-form">
                            <h3>Payment Details</h3>

                            <div className="form-grid">
                                {/* Payment Amount */}
                                <div className="form-field">
                                    <label>
                                        <FiDollarSign />
                                        Payment Amount <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className={errors.amount ? 'error' : ''}
                                        step="0.01"
                                        min="0"
                                        max={paymentRequest.remainingAmount}
                                        placeholder="Enter amount to pay"
                                    />
                                    {errors.amount && <span className="error-text">{errors.amount}</span>}
                                    <span className="hint">Max: {formatCurrency(paymentRequest.remainingAmount)}</span>
                                </div>

                                {/* Payment Date */}
                                <div className="form-field">
                                    <label>
                                        <FiCalendar />
                                        Payment Date <span className="required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="paymentDate"
                                        value={formData.paymentDate}
                                        onChange={handleChange}
                                        className={errors.paymentDate ? 'error' : ''}
                                    />
                                    {errors.paymentDate && <span className="error-text">{errors.paymentDate}</span>}
                                </div>

                                {/* Payment Method */}
                                <div className="form-field">
                                    <label>
                                        {getPaymentMethodIcon()}
                                        Payment Method <span className="required">*</span>
                                    </label>
                                    <select
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleChange}
                                    >
                                        <option value="BANK_ACCOUNT">Bank Account</option>
                                        <option value="CASH_SAFE">Cash Safe</option>
                                        <option value="CASH_WITH_PERSON">Cash With Person</option>
                                    </select>
                                </div>

                                {/* Payment Account */}
                                <div className="form-field">
                                    <label>
                                        <FiCreditCard />
                                        Payment Account <span className="required">*</span>
                                    </label>
                                    <select
                                        name="paymentAccountId"
                                        value={formData.paymentAccountId}
                                        onChange={handleChange}
                                        className={errors.paymentAccountId ? 'error' : ''}
                                    >
                                        <option value="">Select account...</option>
                                        {getAvailableAccounts().map(account => (
                                            <option key={account.id} value={account.id}>
                                                {getAccountDisplayName(account)}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.paymentAccountId && <span className="error-text">{errors.paymentAccountId}</span>}
                                </div>

                                {/* Transaction Reference */}
                                <div className="form-field full-width">
                                    <label>
                                        <FiFileText />
                                        Transaction Reference
                                    </label>
                                    <input
                                        type="text"
                                        name="transactionReference"
                                        value={formData.transactionReference}
                                        onChange={handleChange}
                                        placeholder="e.g., Check number, wire transfer ID"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="form-field full-width">
                                    <label>
                                        <FiFileText />
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Optional payment notes..."
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Modal Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    <span>Process Payment</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showConfirmation}
                type="info"
                title="Confirm Payment"
                message={`Are you sure you want to process a payment of ${formatCurrency(formData.amount)} to ${paymentRequest.merchantName || paymentRequest.institutionName || 'N/A'}?\n\nThis action cannot be undone.`}
                confirmText="Confirm Payment"
                cancelText="Cancel"
                onConfirm={handleConfirmPayment}
                onCancel={() => setShowConfirmation(false)}
                isLoading={loading}
            />
        </>
    );
};

export default ProcessPaymentModal;