import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave} from 'react-icons/fa';
import {FiDollarSign} from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';

const ProcessPaymentModal = ({ onClose, onSubmit }) => {
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [accounts, setAccounts] = useState({
        bankAccounts: [],
        cashSafes: [],
        cashWithPersons: []
    });
    const [formData, setFormData] = useState({
        paymentRequestId: '',
        amount: '',
        paymentMethod: 'BANK_ACCOUNT',
        paymentAccountType: 'BANK_ACCOUNT',
        paymentAccountId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionReference: '',
        notes: '',
        receiptFilePath: ''
    });
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [errors, setErrors] = useState({});
    const [selectedRequest, setSelectedRequest] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (formData.paymentRequestId) {
            const request = paymentRequests.find(pr => pr.id === formData.paymentRequestId);
            setSelectedRequest(request);
            if (request) {
                setFormData(prev => ({
                    ...prev,
                    amount: request.remainingAmount
                }));
            }
        }
    }, [formData.paymentRequestId, paymentRequests]);

    const fetchInitialData = async () => {
        try {
            setLoadingData(true);
            const [requestsRes, bankAccountsRes, cashSafesRes, cashWithPersonsRes] = await Promise.all([
                financeService.accountsPayable.paymentRequests.getReadyToPay(),
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            setPaymentRequests(requestsRes.data || []);
            setAccounts({
                bankAccounts: bankAccountsRes.data || [],
                cashSafes: cashSafesRes.data || [],
                cashWithPersons: cashWithPersonsRes.data || []
            });
        } catch (err) {
            console.error('Error fetching initial data:', err);
            showError('Failed to load payment data');
        } finally {
            setLoadingData(false);
        }
    };

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

    const validateForm = () => {
        const newErrors = {};

        if (!formData.paymentRequestId) {
            newErrors.paymentRequestId = 'Please select a payment request';
        }

        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (selectedRequest && parseFloat(formData.amount) > parseFloat(selectedRequest.remainingAmount)) {
            newErrors.amount = `Amount cannot exceed remaining amount: ${formatCurrency(selectedRequest.remainingAmount)}`;
        }

        if (!formData.paymentAccountId) {
            newErrors.paymentAccountId = 'Please select a payment account';
        }

        if (!formData.paymentDate) {
            newErrors.paymentDate = 'Payment date is required';
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
                ...formData,
                amount: parseFloat(formData.amount)
            };

            console.log('Payload being sent:', payload);

            await financeService.accountsPayable.payments.process(payload);
            showSuccess('Payment processed successfully');
            onSubmit();
        } catch (err) {
            console.error('Error processing payment:', err);
            const errorMessage = err.response?.data?.message || err.response?.data || 'Failed to process payment';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

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

    const getAccountDisplayName = (account) => {
        switch (formData.paymentMethod) {
            case 'BANK_ACCOUNT':
                return `${account.bankName} - ${account.accountNumber} (${formatCurrency(account.currentBalance)})`;
            case 'CASH_SAFE':
                return `${account.safeName} - ${account.location} (${formatCurrency(account.currentBalance)})`;
            case 'CASH_WITH_PERSON':
                return `${account.personName} (${formatCurrency(account.currentBalance)})`;
            default:
                return '';
        }
    };

    if (loadingData) {
        return (
            <div className="modal-overlay">
                <div className="modal-container process-payment-modal">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading payment data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container process-payment-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiDollarSign />
                        <h2>Process Payment</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Payment Request Selection */}
                    <div className="modern-form-field">
                        <label className="modern-form-label">
                            Payment Request <span className="required">*</span>
                        </label>
                        <select
                            name="paymentRequestId"
                            value={formData.paymentRequestId}
                            onChange={handleChange}
                            className={errors.paymentRequestId ? 'error' : ''}
                        >
                            <option value="">Select payment request...</option>
                            {paymentRequests.map(request => (
                                <option key={request.id} value={request.id}>
                                    {request.requestNumber} - {request.merchantName} - {formatCurrency(request.remainingAmount)}
                                </option>
                            ))}
                        </select>
                        {errors.paymentRequestId && <span className="error-text">{errors.paymentRequestId}</span>}
                    </div>

                    {/* Selected Request Details */}
                    {selectedRequest && (
                        <div className="request-details">
                            <h3>Payment Request Details</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>PO Number:</label>
                                    <span>{selectedRequest.purchaseOrderNumber}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Merchant:</label>
                                    <span>{selectedRequest.merchantName}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Requested Amount:</label>
                                    <span className="amount">{formatCurrency(selectedRequest.requestedAmount)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Already Paid:</label>
                                    <span className="amount">{formatCurrency(selectedRequest.totalPaidAmount)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Remaining Amount:</label>
                                    <span className="amount highlight">{formatCurrency(selectedRequest.remainingAmount)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Currency:</label>
                                    <span>{selectedRequest.currency}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Details */}
                    <div className="form-grid">
                        <div className="modern-form-field">
                            <label className="modern-form-label">
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
                                placeholder="Enter amount"
                            />
                            {errors.amount && <span className="error-text">{errors.amount}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
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

                        <div className="modern-form-field">
                            <label className="modern-form-label">
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

                        <div className="modern-form-field">
                            <label className="modern-form-label">
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
                    </div>

                    <div className="modern-form-field">
                        <label className="modern-form-label">
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

                    <div className="modern-form-field">
                        <label className="modern-form-label">
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


                </form>
                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <span>Processing...</span>
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
    );
};

export default ProcessPaymentModal;