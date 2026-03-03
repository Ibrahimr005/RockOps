import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiX, FiRefreshCw, FiCornerDownRight, FiAlertCircle, FiCalendar } from 'react-icons/fi';
import { incomingPaymentService } from '../../../../../services/finance/incomingPaymentService';
import { financeService } from '../../../../../services/financeService';
import './ConfirmIncomingPaymentModal.scss';

const ConfirmIncomingPaymentModal = ({ payment, onClose, onConfirm, onError }) => {
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
    const [confirming, setConfirming] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const [bankAccountsResponse, cashSafesResponse, cashWithPersonsResponse] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive()
            ]);

            const bankAccountsData = bankAccountsResponse?.data || bankAccountsResponse || [];
            const cashSafesData = cashSafesResponse?.data || cashSafesResponse || [];
            const cashWithPersonsData = cashWithPersonsResponse?.data || cashWithPersonsResponse || [];

            setAccounts({
                bankAccounts: Array.isArray(bankAccountsData) ? bankAccountsData : [],
                cashSafes: Array.isArray(cashSafesData) ? cashSafesData : [],
                cashWithPersons: Array.isArray(cashWithPersonsData) ? cashWithPersonsData : []
            });
        } catch (err) {
            console.error('Error fetching accounts:', err);
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
            balanceAccountId: ''
        });
        setErrors({ ...errors, balanceType: '', balanceAccountId: '' });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.balanceType) newErrors.balanceType = 'Please select a balance type';
        if (!formData.balanceAccountId) newErrors.balanceAccountId = 'Please select an account';
        if (!formData.dateReceived) newErrors.dateReceived = 'Please select a date';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = async () => {
        if (!validate()) return;

        try {
            setConfirming(true);
            await incomingPaymentService.confirm(payment.id, formData);
            if (onConfirm) onConfirm();
        } catch (err) {
            console.error('Error confirming payment:', err);
            if (onError) onError('Failed to confirm payment: ' + err.message);
        } finally {
            setConfirming(false);
        }
    };

    const getSourceIcon = () => {
        if (payment.source === 'REFUND') return <FiRefreshCw />;
        if (payment.source === 'PO_RETURN') return <FiCornerDownRight />;
        return <FiAlertCircle />;
    };

    const getSourceLabel = () => {
        if (payment.source === 'REFUND') return 'Quality Issue Refund';
        if (payment.source === 'PO_RETURN') return 'Purchase Order Return';
        return payment.source;
    };

    const getAccountsByType = () => {
        switch (formData.balanceType) {
            case 'BANK_ACCOUNT': return accounts.bankAccounts;
            case 'CASH_SAFE': return accounts.cashSafes;
            case 'CASH_WITH_PERSON': return accounts.cashWithPersons;
            default: return [];
        }
    };

    const getAccountDisplayName = (account) => {
        const formatCurrency = (amount) => {
            return (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        if (formData.balanceType === 'BANK_ACCOUNT') {
            return `${account.bankName} - ${account.accountNumber} (${formatCurrency(account.currentBalance)} EGP)`;
        } else if (formData.balanceType === 'CASH_SAFE') {
            return `${account.safeName} - ${account.location} (${formatCurrency(account.currentBalance)} EGP)`;
        } else if (formData.balanceType === 'CASH_WITH_PERSON') {
            return `${account.personName} (${formatCurrency(account.currentBalance)} EGP)`;
        }
        return '';
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg incoming-pay-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FiCheckCircle />
                        Confirm Incoming Payment
                    </h2>
                    <button className="btn-close" onClick={onClose} disabled={confirming}>
                        <FiX />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Warning Banner */}
                    <div className="modal-warning">
                        <FiAlertCircle />
                        <div>
                            <strong>Review carefully before confirming.</strong>
                            <div>This will update the merchant's balance and mark the payment as confirmed.</div>
                        </div>
                    </div>

                    {/* Payment Summary Section */}
                    <div className="incoming-pay-modal-section">
                        <h3 className="incoming-pay-modal-section-title">Payment Details</h3>

                        <div className="incoming-pay-modal-details-grid">
                            <div className="incoming-pay-modal-detail-item">
                                <label className="incoming-pay-modal-detail-label">Source Type</label>
                                <div className="incoming-pay-modal-detail-value">
                                    <span className={`incoming-pay-modal-source-badge source-${payment.source?.toLowerCase()}`}>
                                        {getSourceIcon()}
                                        {getSourceLabel()}
                                    </span>
                                </div>
                            </div>

                            <div className="incoming-pay-modal-detail-item">
                                <label className="incoming-pay-modal-detail-label">Reference ID</label>
                                <div className="incoming-pay-modal-detail-value incoming-pay-modal-reference-id">
                                    {payment.source === 'REFUND' ? payment.issueId : payment.purchaseOrderReturnId || 'N/A'}
                                </div>
                            </div>

                            <div className="incoming-pay-modal-detail-item">
                                <label className="incoming-pay-modal-detail-label">Purchase Order</label>
                                <div className="incoming-pay-modal-detail-value incoming-pay-modal-po-number">
                                    {payment.purchaseOrderNumber}
                                </div>
                            </div>

                            <div className="incoming-pay-modal-detail-item">
                                <label className="incoming-pay-modal-detail-label">Merchant</label>
                                <div className="incoming-pay-modal-detail-value incoming-pay-modal-merchant-name">
                                    {payment.merchantName}
                                </div>
                            </div>

                            <div className="incoming-pay-modal-detail-item incoming-pay-modal-detail-item-full">
                                <label className="incoming-pay-modal-detail-label">Total Payment Amount</label>
                                <div className="incoming-pay-modal-detail-value incoming-pay-modal-total-amount">
                                    {payment.totalAmount?.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} EGP
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="incoming-pay-modal-items-section">
                            <h4 className="incoming-pay-modal-items-title">Payment Items ({payment.items?.length || 0})</h4>
                            <div className="incoming-pay-modal-items-table-container">
                                <table className="incoming-pay-modal-items-table">
                                    <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Quantity</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {payment.items?.map((item, index) => (
                                        <tr key={index}>
                                            <td className="incoming-pay-modal-item-name">{item.itemName}</td>
                                            <td className="incoming-pay-modal-item-quantity">{item.affectedQuantity}</td>
                                            <td className="incoming-pay-modal-item-price">
                                                {item.unitPrice?.toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} EGP
                                            </td>
                                            <td className="incoming-pay-modal-item-total">
                                                {item.totalAmount?.toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} EGP
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Confirmation Details Section */}
                    <div className="incoming-pay-modal-section">
                        <h3 className="incoming-pay-modal-section-title">Confirmation Details</h3>

                        {/* Balance Type */}
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
                                        onChange={(e) => setFormData({ ...formData, balanceAccountId: e.target.value })}
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

                                Date Received <span className="required">*</span>
                            </label>
                            <input
                                type="date"
                                className={`form-input ${errors.dateReceived ? 'error' : ''}`}
                                value={formData.dateReceived}
                                onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            {errors.dateReceived && <span className="error-text">{errors.dateReceived}</span>}
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Add any notes about this payment (optional)"
                                value={formData.financeNotes}
                                onChange={(e) => setFormData({ ...formData, financeNotes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        className="modal-btn-secondary"
                        onClick={onClose}
                        disabled={confirming}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-success"
                        onClick={handleConfirm}
                        disabled={confirming}
                    >
                        {confirming ? (
                            <>
                                <span className="spinner-small"></span>
                                Confirming...
                            </>
                        ) : (
                            <>
                                <FiCheckCircle />
                                Confirm Payment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmIncomingPaymentModal;