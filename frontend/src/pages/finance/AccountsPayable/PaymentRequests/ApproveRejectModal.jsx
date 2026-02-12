import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave} from 'react-icons/fa';
import { FiCheckCircle, FiFileText, FiXCircle } from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const ApproveRejectModal = ({ request, onClose, onSubmit }) => {
    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [showReviewForm, setShowReviewForm] = useState(false);
    const [formData, setFormData] = useState({
        paymentRequestId: request.id,
        action: 'APPROVE',
        notes: '',
        rejectionReason: ''
    });
    const [errors, setErrors] = useState({});
    const { showError, showSuccess } = useSnackbar(); // Add showSuccess
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const handleChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = (action) => {
        const newErrors = {};

        if (action === 'REJECT') {
            if (!formData.rejectionReason.trim()) {
                newErrors.rejectionReason = 'Rejection reason is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleApprove = async () => {
        if (!validateForm('APPROVE')) {
            showError('Please complete the form');
            return;
        }

        setLoading(true);

        try {
            await financeService.accountsPayable.paymentRequests.approveReject({
                ...formData,
                action: 'APPROVE'
            });
            showSuccess('Payment request approved successfully');
            onApproveReject();
        } catch (err) {
            console.error('Error approving request:', err);
            const errorMessage = err.response?.data?.message || 'Failed to approve request';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!validateForm('REJECT')) {
            showError('Please provide rejection reason');
            return;
        }

        setLoading(true);

        try {
            await financeService.accountsPayable.paymentRequests.approveReject({
                ...formData,
                action: 'REJECT'
            });
            showSuccess('Payment request rejected successfully');
            onApproveReject();
        } catch (err) {
            console.error('Error rejecting request:', err);
            const errorMessage = err.response?.data?.message || 'Failed to reject request';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showError('Please fix the validation errors');
            return;
        }

        setLoading(true);

        try {
            await financeService.accountsPayable.paymentRequests.approveReject(formData);
            showSuccess(`Payment request ${formData.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
            onSubmit();
        } catch (err) {
            console.error('Error processing payment request:', err);
            const errorMessage = err.response?.data?.message || 'Failed to process payment request';
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

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    return (
        <>
        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        <div className="modal-overlay">
            <div className="modal-container approve-reject-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <FiCheckCircle />
                        <h2>Review Payment Request</h2>
                    </div>
                    <button className="modern-modal-close" onClick={handleCloseAttempt}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Request Summary */}
                    <div className="request-summary">
                        <h3>Request Summary</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <label>Request Number:</label>
                                <span>{request.requestNumber}</span>
                            </div>
                            <div className="summary-item">
                                <label>PO Number:</label>
                                <span>{request.purchaseOrderNumber}</span>
                            </div>
                            <div className="summary-item">
                                <label>Merchant:</label>
                                <span>{request.merchantName}</span>
                            </div>
                            <div className="summary-item">
                                <label>Requested Amount:</label>
                                <span className="amount">{formatCurrency(request.requestedAmount)}</span>
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
                            <div className="modern-form-field">
                                <label className="modern-form-label">
                                    Approval Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Optional notes about this approval..."
                                />
                            </div>
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
                            {request.status === 'PENDING' && !showReviewForm && (
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowReviewForm(true)}
                                >
                                    <FiCheckCircle />
                                    <span>Review Request</span>
                                </button>
                            )}

                            {request.status === 'PENDING' && showReviewForm && (
                                <>
                                    <button
                                        className="btn-danger"
                                        onClick={handleReject}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : (
                                            <>
                                                <FiXCircle />
                                                <span>Reject Request</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        className="btn-success"
                                        onClick={handleApprove}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : (
                                            <>
                                                <FiCheckCircle />
                                                <span>Approve Request</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            <button className="btn-secondary" onClick={handleCloseAttempt}>
                                Close
                            </button>
                        </div>
                    </form>
                </div>

                {/* Review Form - Only show for PENDING requests */}
                {request.status === 'PENDING' && showReviewForm && (
                    <div className="details-section review-form-section">
                        <h3>Review Details</h3>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Approval Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Optional notes about this approval..."
                            />
                        </div>

                        <div className="modern-form-field">
                            <label className="modern-form-label">
                                Rejection Reason (if rejecting)
                            </label>
                            <textarea
                                name="rejectionReason"
                                value={formData.rejectionReason}
                                onChange={handleChange}
                                className={errors.rejectionReason ? 'error' : ''}
                                rows="3"
                                placeholder="Provide reason if you plan to reject this request..."
                            />
                            {errors.rejectionReason && <span className="error-text">{errors.rejectionReason}</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};

export default ApproveRejectModal;