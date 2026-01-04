import React, { useState } from 'react';
import { FaTimes, FaSave}from 'react-icons/fa';
import {FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';

const OfferReviewForm = ({ offer, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        offerId: offer.offerId,
        action: 'APPROVE', // 'APPROVE' or 'REJECT'
        budgetCategory: '',
        approvalNotes: '',
        rejectionReason: '',
        expectedPaymentDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const { showSuccess, showError } = useSnackbar();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.action === 'APPROVE') {
            if (!formData.budgetCategory.trim()) {
                newErrors.budgetCategory = 'Budget category is required for approval';
            }
        } else {
            if (!formData.rejectionReason.trim()) {
                newErrors.rejectionReason = 'Rejection reason is required';
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
            await financeService.accountsPayable.offerReviews.review(formData);
            showSuccess(`Offer ${formData.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
            onSubmit();
        } catch (err) {
            console.error('Error reviewing offer:', err);
            const errorMessage = err.response?.data?.message || 'Failed to review offer';
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

    return (
        <div className="modal-overlay">
            <div className="modal-container offer-review-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiCheckCircle />
                        <h2>Review Offer</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Offer Details */}
                    <div className="offer-details-section">
                        <h3>Offer Details</h3>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Offer Number:</label>
                                <span>{offer.offerNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>Total Amount:</label>
                                <span className="amount">{formatCurrency(offer.totalAmount)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Currency:</label>
                                <span>{offer.currency}</span>
                            </div>
                            <div className="detail-item">
                                <label>Department:</label>
                                <span>{offer.department || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Action Selection */}
                        <div className="action-selection">
                            <label className="modern-form-label">Decision <span className="required">*</span></label>
                            <div className="action-buttons">
                                <button
                                    type="button"
                                    className={`action-btn approve-btn ${formData.action === 'APPROVE' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, action: 'APPROVE' }))}
                                >
                                    <FiCheckCircle />
                                    <span>Approve</span>
                                </button>
                                <button
                                    type="button"
                                    className={`action-btn reject-btn ${formData.action === 'REJECT' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, action: 'REJECT' }))}
                                >
                                    <FiXCircle />
                                    <span>Reject</span>
                                </button>
                            </div>
                        </div>

                        {/* Conditional Fields Based on Action */}
                        {formData.action === 'APPROVE' ? (
                            <>
                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        Budget Category <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="budgetCategory"
                                        value={formData.budgetCategory}
                                        onChange={handleChange}
                                        className={errors.budgetCategory ? 'error' : ''}
                                        placeholder="e.g., Operations, Marketing, IT"
                                    />
                                    {errors.budgetCategory && <span className="error-text">{errors.budgetCategory}</span>}
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        Expected Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        name="expectedPaymentDate"
                                        value={formData.expectedPaymentDate}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="modern-form-field">
                                    <label className="modern-form-label">
                                        Approval Notes
                                    </label>
                                    <textarea
                                        name="approvalNotes"
                                        value={formData.approvalNotes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Optional notes about this approval..."
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Rejection Reason <span className="required">*</span>
                                </label>
                                <textarea
                                    name="rejectionReason"
                                    value={formData.rejectionReason}
                                    onChange={handleChange}
                                    className={errors.rejectionReason ? 'error' : ''}
                                    rows="4"
                                    placeholder="Please provide a detailed reason for rejection..."
                                />
                                {errors.rejectionReason && <span className="error-text">{errors.rejectionReason}</span>}
                            </div>
                        )}

                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary ${formData.action === 'REJECT' ? 'btn-danger' : ''}`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span>Processing...</span>
                                ) : (
                                    <>
                                        <FaSave />
                                        <span>{formData.action === 'APPROVE' ? 'Approve Offer' : 'Reject Offer'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OfferReviewForm;