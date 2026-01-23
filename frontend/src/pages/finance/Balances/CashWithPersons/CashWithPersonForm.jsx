import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaUserTie } from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import './CashWithPersonForm.css';

const CashWithPersonForm = ({ person, mode, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        personName: '',
        phoneNumber: '',
        email: '',
        address: '',
        personalBankAccountNumber: '',
        personalBankName: '',
        currentBalance: 0,
        isActive: true,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        if (mode === 'edit' && person) {
            setFormData({
                personName: person.personName || '',
                phoneNumber: person.phoneNumber || '',
                email: person.email || '',
                address: person.address || '',
                personalBankAccountNumber: person.personalBankAccountNumber || '',
                personalBankName: person.personalBankName || '',
                currentBalance: person.currentBalance || 0,
                isActive: person.isActive !== undefined ? person.isActive : true,
                notes: person.notes || ''
            });
        }
    }, [mode, person]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.personName.trim()) {
            newErrors.personName = 'Person name is required';
        }

        if (formData.currentBalance === '' || formData.currentBalance === null) {
            newErrors.currentBalance = 'Current balance is required';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
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
                currentBalance: parseFloat(formData.currentBalance) || 0
            };

            if (mode === 'create') {
                await financeService.balances.cashWithPersons.create(payload);
                showSuccess('Cash holder created successfully');
            } else {
                await financeService.balances.cashWithPersons.update(person.id, payload);
                showSuccess('Cash holder updated successfully');
            }

            onSubmit();
        } catch (err) {
            console.error('Error saving cash holder:', err);
            const errorMessage = err.response?.data?.message || 'Failed to save cash holder';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container cash-with-person-form-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUserTie />
                        <h2>{mode === 'create' ? 'Add Cash Holder' : 'Edit Cash Holder'}</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Person Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="personName"
                                name="personName"
                                value={formData.personName}
                                onChange={handleChange}
                                className={errors.personName ? 'error' : ''}
                                placeholder="e.g., Ahmed Mohamed"
                            />
                            {errors.personName && <span className="error-text">{errors.personName}</span>}
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
                                Phone Number
                            </label>
                            <input
                                type="text"
                                id="phoneNumber"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="e.g., +20 100 123 4567"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? 'error' : ''}
                                placeholder="e.g., ahmed@example.com"
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Personal Bank Name
                            </label>
                            <input
                                type="text"
                                id="personalBankName"
                                name="personalBankName"
                                value={formData.personalBankName}
                                onChange={handleChange}
                                placeholder="e.g., CIB Egypt"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Personal Bank Account
                            </label>
                            <input
                                type="text"
                                id="personalBankAccountNumber"
                                name="personalBankAccountNumber"
                                value={formData.personalBankAccountNumber}
                                onChange={handleChange}
                                placeholder="e.g., 1234567890"
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Address
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                rows="2"
                                placeholder="Full address..."
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
                                <span>Active</span>
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
                            placeholder="Additional notes..."
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
                                <span>{mode === 'create' ? 'Create' : 'Update'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashWithPersonForm;