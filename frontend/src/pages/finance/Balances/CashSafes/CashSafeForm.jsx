import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaPiggyBank } from 'react-icons/fa';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import './CashSafeForm.css';

const CashSafeForm = ({ safe, mode, onClose, onSubmit }) => {
    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [formData, setFormData] = useState({
        safeName: '',
        location: '',
        currentBalance: 0,
        isActive: true,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        if (mode === 'edit' && safe) {
            setFormData({
                safeName: safe.safeName || '',
                location: safe.location || '',
                currentBalance: safe.currentBalance || 0,
                isActive: safe.isActive !== undefined ? safe.isActive : true,
                notes: safe.notes || ''
            });
        }
    }, [mode, safe]);

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

        if (!formData.safeName.trim()) {
            newErrors.safeName = 'Safe name is required';
        }

        if (!formData.location.trim()) {
            newErrors.location = 'Location is required';
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
                currentBalance: parseFloat(formData.currentBalance) || 0
            };

            if (mode === 'create') {
                await financeService.balances.cashSafes.create(payload);
                showSuccess('Cash safe created successfully');
            } else {
                await financeService.balances.cashSafes.update(safe.id, payload);
                showSuccess('Cash safe updated successfully');
            }

            onSubmit();
        } catch (err) {
            console.error('Error saving cash safe:', err);
            const errorMessage = err.response?.data?.message || 'Failed to save cash safe';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-container cash-safe-form-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaPiggyBank />
                        <h2>{mode === 'create' ? 'Add New Cash Safe' : 'Edit Cash Safe'}</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-grid">
                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Safe Name <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="safeName"
                                name="safeName"
                                value={formData.safeName}
                                onChange={handleChange}
                                className={`modern-form-input ${errors.safeName ? 'error' : ''}`}
                                placeholder="e.g., Main Office Safe"
                            />
                            {errors.safeName && <span className="error-text">{errors.safeName}</span>}
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Location <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className={`modern-form-input ${errors.location ? 'error' : ''}`}
                                placeholder="e.g., Finance Department, Room 201"
                            />
                            {errors.location && <span className="error-text">{errors.location}</span>}
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
                                className={`modern-form-input ${errors.currentBalance ? 'error' : ''}`}
                                step="0.01"
                                min="0"
                            />
                            {errors.currentBalance && <span className="error-text">{errors.currentBalance}</span>}
                        </div>

                        <div className="modern-form-field checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                />
                                <span>Active Safe</span>
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
                            className="modern-form-textarea"
                            placeholder="Additional notes about this safe..."
                        />
                    </div>

                </form>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} onClick={handleSubmit}>
                        {loading ? (
                            <span>Saving...</span>
                        ) : (
                            <>
                                <FaSave />
                                <span>{mode === 'create' ? 'Create Safe' : 'Update Safe'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashSafeForm;