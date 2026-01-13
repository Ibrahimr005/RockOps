import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { financeService } from '../../../../services/financeService';
import './ConfirmRefundModal.scss';

const ConfirmRefundModal = ({ refund, onClose, onConfirm }) => {
    const [formData, setFormData] = useState({
        balanceType: '',
        balanceAccountId: '',
        dateReceived: new Date().toISOString().split('T')[0],
        financeNotes: ''
    });

    const [accounts, setAccounts] = useState({
        bankAccounts: [],
        cashSafes: [],
        cashWithPersons: []
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            // Fetch all account types
            const [bankAccountsResponse, cashSafesResponse, cashWithPersonsResponse] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            // Extract data from responses
            const bankAccountsData = bankAccountsResponse?.data || bankAccountsResponse || [];
            const cashSafesData = cashSafesResponse?.data || cashSafesResponse || [];
            const cashWithPersonsData = cashWithPersonsResponse?.data || cashWithPersonsResponse || [];

            console.log('Fetched accounts:', {
                bankAccounts: bankAccountsData,
                cashSafes: cashSafesData,
                cashWithPersons: cashWithPersonsData
            });

            setAccounts({
                bankAccounts: Array.isArray(bankAccountsData) ? bankAccountsData : [],
                cashSafes: Array.isArray(cashSafesData) ? cashSafesData : [],
                cashWithPersons: Array.isArray(cashWithPersonsData) ? cashWithPersonsData : []
            });
        } catch (err) {
            console.error('Error fetching accounts:', err);
            // Set empty arrays on error
            setAccounts({
                bankAccounts: [],
                cashSafes: [],
                cashWithPersons: []
            });
        } finally {
            setLoading(false);
        }
    };
    const handleBalanceTypeChange = (type) => {
        setFormData({
            ...formData,
            balanceType: type,
            balanceAccountId: '' // Reset account selection when type changes
        });
        setErrors({ ...errors, balanceType: '', balanceAccountId: '' });
    };

    const handleAccountChange = (accountId) => {
        setFormData({
            ...formData,
            balanceAccountId: accountId
        });
        setErrors({ ...errors, balanceAccountId: '' });
    };

    const handleDateChange = (date) => {
        setFormData({
            ...formData,
            dateReceived: date
        });
        setErrors({ ...errors, dateReceived: '' });
    };

    const handleNotesChange = (notes) => {
        setFormData({
            ...formData,
            financeNotes: notes
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.balanceType) {
            newErrors.balanceType = 'Please select a balance type';
        }

        if (!formData.balanceAccountId) {
            newErrors.balanceAccountId = 'Please select an account';
        }

        if (!formData.dateReceived) {
            newErrors.dateReceived = 'Please select a date';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setSubmitting(true);
        try {
            await onConfirm(formData);
        } catch (err) {
            console.error('Error confirming refund:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const getAccountsByType = () => {
        switch (formData.balanceType) {
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
        if (formData.balanceType === 'BANK_ACCOUNT') {
            return `${account.bankName} - ${account.accountNumber} (${formatCurrency(account.currentBalance)})`;
        } else if (formData.balanceType === 'CASH_SAFE') {
            return `${account.safeName} - ${account.location} (${formatCurrency(account.currentBalance)})`;
        } else if (formData.balanceType === 'CASH_WITH_PERSON') {
            return `${account.personName} (${formatCurrency(account.currentBalance)})`;
        }
        return '';
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirm-refund-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <FiCheckCircle />
                        <h2>Confirm Refund Receipt</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Refund Summary */}
                    <div className="refund-summary">
                        <h3>Refund Details</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="label">PO Number:</span>
                                <span className="value">{refund.purchaseOrderNumber}</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">Merchant:</span>
                                <span className="value">{refund.merchantName}</span>
                            </div>
                            <div className="summary-item highlight">
                                <span className="label">Refund Amount:</span>
                                <span className="value amount">{formatCurrency(refund.totalRefundAmount)}</span>
                            </div>
                            <div className="summary-item">
                                <span className="label">Items:</span>
                                <span className="value">{refund.refundItems?.length || 0} item(s)</span>
                            </div>
                        </div>

                        {/* Items List */}
                        {refund.refundItems && refund.refundItems.length > 0 && (
                            <div className="items-list">
                                <h4>Refunded Items:</h4>
                                {refund.refundItems.map((item, index) => (
                                    <div key={index} className="refund-item">
                                        <span className="item-name">{item.itemName}</span>
                                        <span className="item-qty">Qty: {item.affectedQuantity}</span>
                                        <span className="item-amount">{formatCurrency(item.totalRefundAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Form Section */}
                    <div className="form-section">
                        <h3>Confirmation Details</h3>

                        {/* Balance Type Selection - NOW AS DROPDOWN */}
                        <div className="form-group">
                            <label className="form-label">
                                Balance Type <span className="required">*</span>
                            </label>
                            <select
                                className={`form-select ${errors.balanceType ? 'error' : ''}`}
                                value={formData.balanceType}
                                onChange={(e) => handleBalanceTypeChange(e.target.value)}
                            >
                                <option value="">Select balance type...</option>
                                <option value="BANK_ACCOUNT">Bank Account</option>
                                <option value="CASH_SAFE">Cash Safe</option>
                                <option value="CASH_WITH_PERSON">Cash With Person</option>
                            </select>
                            {errors.balanceType && <span className="error-text">{errors.balanceType}</span>}
                        </div>

                        {/* Account Selection */}
                        {formData.balanceType && (
                            <div className="form-group">
                                <label className="form-label">
                                    Select Account <span className="required">*</span>
                                </label>
                                {loading ? (
                                    <div className="loading-accounts">Loading accounts...</div>
                                ) : (
                                    <select
                                        className={`form-select ${errors.balanceAccountId ? 'error' : ''}`}
                                        value={formData.balanceAccountId}
                                        onChange={(e) => handleAccountChange(e.target.value)}
                                    >
                                        <option value="">Select an account...</option>
                                        {getAccountsByType().map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {getAccountDisplayName(account)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.balanceAccountId && <span className="error-text">{errors.balanceAccountId}</span>}
                            </div>
                        )}

                        {/* Date Received */}
                        <div className="form-group">
                            <label className="form-label">
                                <FiCalendar />
                                Date Received <span className="required">*</span>
                            </label>
                            <input
                                type="date"
                                className={`form-input ${errors.dateReceived ? 'error' : ''}`}
                                value={formData.dateReceived}
                                onChange={(e) => handleDateChange(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            {errors.dateReceived && <span className="error-text">{errors.dateReceived}</span>}
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Add any notes about this refund (optional)"
                                value={formData.financeNotes}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-confirm"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Confirming...' : 'Confirm Refund'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRefundModal;