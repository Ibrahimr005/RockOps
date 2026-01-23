import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaUniversity } from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import './BankAccountForm.css';

const BankAccountForm = ({ account, mode, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        iban: '',
        branchName: '',
        branchCode: '',
        swiftCode: '',
        accountHolderName: '',
        currentBalance: 0,
        openingDate: '',
        isActive: true,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        if (mode === 'edit' && account) {
            setFormData({
                bankName: account.bankName || '',
                accountNumber: account.accountNumber || '',
                iban: account.iban || '',
                branchName: account.branchName || '',
                branchCode: account.branchCode || '',
                swiftCode: account.swiftCode || '',
                accountHolderName: account.accountHolderName || '',
                currentBalance: account.currentBalance || 0,
                openingDate: account.openingDate || '',
                isActive: account.isActive !== undefined ? account.isActive : true,
                notes: account.notes || ''
            });
        }
    }, [mode, account]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.bankName.trim()) {
            newErrors.bankName = 'Bank name is required';
        }

        if (!formData.accountNumber.trim()) {
            newErrors.accountNumber = 'Account number is required';
        }

        if (!formData.accountHolderName.trim()) {
            newErrors.accountHolderName = 'Account holder name is required';
        }

        if (formData.currentBalance === '' || formData.currentBalance === null) {
            newErrors.currentBalance = 'Current balance is required';
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
                currentBalance: parseFloat(formData.currentBalance) || 0,
                openingDate: formData.openingDate === "" ? null : formData.openingDate
            };

            if (mode === 'create') {
                await financeService.balances.bankAccounts.create(payload);
                showSuccess('Bank account created successfully');
            } else {
                await financeService.balances.bankAccounts.update(account.id, payload);
                showSuccess('Bank account updated successfully');
            }

            onSubmit();
        } catch (err) {
            console.error('Error saving bank account:', err);
            const errorMessage = err.response?.data?.message || 'Failed to save bank account';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container bank-account-form-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUniversity />
                        <h2>{mode === 'create' ? 'Add New Bank Account' : 'Edit Bank Account'}</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Bank Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="bankName"
                                name="bankName"
                                value={formData.bankName}
                                onChange={handleChange}
                                className={errors.bankName ? 'error' : ''}
                                placeholder="e.g., National Bank of Egypt"
                            />
                            {errors.bankName && <span className="error-text">{errors.bankName}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Account Number <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="accountNumber"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                className={errors.accountNumber ? 'error' : ''}
                                placeholder="e.g., 1234567890"
                            />
                            {errors.accountNumber && <span className="error-text">{errors.accountNumber}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Account Holder Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="accountHolderName"
                                name="accountHolderName"
                                value={formData.accountHolderName}
                                onChange={handleChange}
                                className={errors.accountHolderName ? 'error' : ''}
                                placeholder="e.g., Company Name LLC"
                            />
                            {errors.accountHolderName && <span className="error-text">{errors.accountHolderName}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Current Balance <span className="required">*</span>
                            </label>
                            <input
                                type="number"
                                id="currentBalance"
                                name="currentBalance"
                                value={formData.currentBalance}
                                onChange={handleChange}
                                className={errors.currentBalance ? 'error' : ''}
                                step="0.01"
                                min="0"
                            />
                            {errors.currentBalance && <span className="error-text">{errors.currentBalance}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                IBAN
                            </label>
                            <input
                                type="text"
                                id="iban"
                                name="iban"
                                value={formData.iban}
                                onChange={handleChange}
                                placeholder="e.g., EG380019000500000000263180002"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                SWIFT Code
                            </label>
                            <input
                                type="text"
                                id="swiftCode"
                                name="swiftCode"
                                value={formData.swiftCode}
                                onChange={handleChange}
                                placeholder="e.g., NBEGEGCX"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Branch Name
                            </label>
                            <input
                                type="text"
                                id="branchName"
                                name="branchName"
                                value={formData.branchName}
                                onChange={handleChange}
                                placeholder="e.g., Cairo Main Branch"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Branch Code
                            </label>
                            <input
                                type="text"
                                id="branchCode"
                                name="branchCode"
                                value={formData.branchCode}
                                onChange={handleChange}
                                placeholder="e.g., 001"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Opening Date
                            </label>
                            <input
                                type="date"
                                id="openingDate"
                                name="openingDate"
                                value={formData.openingDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                />
                                <span>Active Account</span>
                            </label>
                        </div>
                    </div>

                    <div className="modern-form-field">
                        <label className="modern-form-label">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Additional notes about this account..."
                        />
                    </div>

                </form>

                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} onClick={handleSubmit}>
                        {loading ? (
                            <span>Saving...</span>
                        ) : (
                            <>
                                <FaSave />
                                <span>{mode === 'create' ? 'Create Account' : 'Update Account'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankAccountForm;