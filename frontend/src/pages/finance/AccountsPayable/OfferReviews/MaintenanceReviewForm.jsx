import React, { useState, useEffect } from 'react';
import {
    FaCheckCircle, FaTimesCircle, FaTimes, FaTools, FaExclamationTriangle, FaUser
} from 'react-icons/fa';
import maintenanceService from '../../../../services/maintenanceService';
import { financeService } from '../../../../services/financeService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import LoadingSpinner from '../../../../components/common/LoadingSpinner/LoadingSpinner';
import './OfferReviewForm.scss';

const MaintenanceReviewForm = ({ offerId, onClose, onSuccess }) => {
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        budgetCategory: '',
        approvalNotes: '',
        rejectionReason: '',
        expectedPaymentDate: ''
    });

    const { showSuccess, showError } = useSnackbar();

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                setLoading(true);
                const response = await maintenanceService.getRecordById(offerId);
                setRecord(response.data);
            } catch (error) {
                console.error('Error fetching maintenance record:', error);
                showError('Failed to load maintenance record details');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        if (offerId) {
            fetchRecord();
        }
    }, [offerId, showError, onClose]);

    const getBudgetCategoryOptions = () => {
        return [
            "Maintenance & Repairs",
            "Spare Parts",
            "Equipment Upgrades",
            "Emergency Repairs",
            "Operational Expenses",
            "Capital Expenditure (CAPEX)"
        ];
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = (action) => {
        if (action === 'APPROVE') {
            if (!formData.budgetCategory) {
                showError('Please select a budget category for approval');
                return false;
            }
        } else if (action === 'REJECT') {
            if (!formData.rejectionReason) {
                showError('Please provide a reason for rejection');
                return false;
            }
        }
        return true;
    };

    const handleAction = async (action) => {
        if (!validateForm(action)) return;

        try {
            setSubmitting(true);

            const reviewData = {
                offerId: offerId,
                action: action,
                budgetCategory: action === 'APPROVE' ? formData.budgetCategory : null,
                approvalNotes: action === 'APPROVE' ? formData.approvalNotes : null,
                rejectionReason: action === 'REJECT' ? formData.rejectionReason : null,
                expectedPaymentDate: formData.expectedPaymentDate || null
            };

            await financeService.accountsPayable.offerReviews.review(reviewData);

            showSuccess(`Maintenance record ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            console.error('Error submitting review:', error);
            showError(error.response?.data?.message || 'Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="modal-backdrop">
                <div className="modal-container offer-review-modal">
                    <div className="loading-container">
                        <LoadingSpinner />
                        <p style={{ marginTop: '15px' }}>Loading maintenance record details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!record) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container offer-review-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaTools style={{ color: 'var(--primary-color)' }} />
                        <h2>Review Maintenance Record - MR-{record.id.substring(0, 8)}</h2>
                    </div>
                    <button className="modern-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Maintenance Details Section */}
                    <div className="offer-details-section">
                        <h3><FaTools /> Maintenance Details</h3>

                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Equipment</label>
                                <span>{record.equipmentName}</span>
                                <span className="sub-value" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.equipmentModel}</span>
                            </div>

                            <div className="detail-item">
                                <label>Budget Request</label>
                                <span className="amount">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(record.expectedCost || record.estimatedCost || record.totalCost || 0)}
                                </span>
                            </div>

                            <div className="detail-item">
                                <label>Location / Site</label>
                                <span>{record.site || 'N/A'}</span>
                            </div>

                            <div className="detail-item">
                                <label>Request Date</label>
                                <span>{new Date(record.creationDate).toLocaleDateString()}</span>
                            </div>

                            <div className="detail-item full-width" style={{ gridColumn: '1 / -1' }}>
                                <label><FaExclamationTriangle /> Issue Description</label>
                                <div className="value description-box" style={{
                                    background: 'var(--main-background-color)',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    marginTop: '6px',
                                    color: 'var(--text-color)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                }}>
                                    {record.initialIssueDescription}
                                </div>
                            </div>

                            <div className="detail-item">
                                <label><FaUser /> Responsible Person</label>
                                <span>{record.currentResponsiblePerson}</span>
                            </div>
                        </div>
                    </div>

                    {/* Review Form Fields */}
                    <div className="review-form-section" style={{ marginTop: '20px' }}>
                        <h3>Review Details</h3>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Budget Category <span className="required">* (For Approval)</span>
                            </label>
                            <select
                                name="budgetCategory"
                                value={formData.budgetCategory}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    background: 'var(--main-background-color)',
                                    color: 'var(--text-color)'
                                }}
                            >
                                <option value="">Select Category</option>
                                {getBudgetCategoryOptions().map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">Expected Payment Date (Optional)</label>
                            <input
                                type="date"
                                name="expectedPaymentDate"
                                value={formData.expectedPaymentDate}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">Approval Notes (Optional)</label>
                            <textarea
                                name="approvalNotes"
                                value={formData.approvalNotes}
                                onChange={handleInputChange}
                                placeholder="Add any notes for the finance record..."
                                rows={3}
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Reason for Rejection <span className="required">* (If Rejecting)</span>
                            </label>
                            <textarea
                                name="rejectionReason"
                                value={formData.rejectionReason}
                                onChange={handleInputChange}
                                placeholder="Please explain why this request is being rejected..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleAction('REJECT')}
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : (
                            <>
                                <FaTimesCircle />
                                <span>Reject Record</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-success"
                        onClick={() => handleAction('APPROVE')}
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : (
                            <>
                                <FaCheckCircle />
                                <span>Approve Record</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceReviewForm;
