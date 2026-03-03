import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCheck, FaBan } from 'react-icons/fa';
import { Button, CloseButton } from '../../../../components/common/Button';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const ReviewSalaryIncreaseModal = ({ request, role, onClose, onSubmit }) => {
    const [comments, setComments] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState(null); // 'approve' or 'reject'
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [loading, onClose]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) onClose();
    };

    const handleAction = (actionType) => {
        if (actionType === 'reject' && !rejectionReason.trim()) {
            return; // Don't proceed without reason
        }
        setAction(actionType);
        setShowConfirmDialog(true);
    };

    const confirmAction = async () => {
        setShowConfirmDialog(false);
        setLoading(true);
        try {
            await onSubmit(
                request.id,
                action === 'approve',
                comments,
                rejectionReason
            );
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount == null) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'EGP', minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const roleLabel = role === 'HR' ? 'HR' : 'Finance';

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-lg">
                    <div className="modal-header">
                        <h2 className="modal-title">{roleLabel} Review — {request.requestNumber}</h2>
                        <CloseButton onClick={onClose} disabled={loading} />
                    </div>

                    <div className="modal-body">
                        {/* Request Summary */}
                        <div className="salary-increase-review-summary">
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Employee:</span>
                                <span className="salary-increase-review-value">{request.employeeName} ({request.employeeNumber})</span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Type:</span>
                                <span className="salary-increase-review-value">{request.requestType === 'EMPLOYEE_LEVEL' ? 'Employee Level' : 'Position Level'}</span>
                            </div>
                            {request.positionName && (
                                <div className="salary-increase-review-row">
                                    <span className="salary-increase-review-label">Position:</span>
                                    <span className="salary-increase-review-value">{request.positionName}</span>
                                </div>
                            )}
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Current Salary:</span>
                                <span className="salary-increase-review-value">{formatCurrency(request.currentSalary)}</span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Requested Salary:</span>
                                <span className="salary-increase-review-value salary-increase-review-highlight">
                                    {formatCurrency(request.requestedSalary)}
                                </span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Increase:</span>
                                <span className="salary-increase-review-value salary-increase-review-highlight">
                                    +{formatCurrency(request.increaseAmount)} (+{(request.increasePercentage || 0).toFixed(2)}%)
                                </span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Effective Date:</span>
                                <span className="salary-increase-review-value">{formatDate(request.effectiveDate)}</span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Reason:</span>
                                <span className="salary-increase-review-value">{request.reason}</span>
                            </div>
                            <div className="salary-increase-review-row">
                                <span className="salary-increase-review-label">Requested By:</span>
                                <span className="salary-increase-review-value">{request.createdBy} — {formatDate(request.createdAt)}</span>
                            </div>

                            {/* Show HR decision info for Finance reviewers */}
                            {role === 'FINANCE' && request.hrApprovedBy && (
                                <div className="salary-increase-review-row">
                                    <span className="salary-increase-review-label">HR Approved By:</span>
                                    <span className="salary-increase-review-value">{request.hrApprovedBy} — {formatDate(request.hrDecisionDate)}</span>
                                </div>
                            )}
                            {role === 'FINANCE' && request.hrComments && (
                                <div className="salary-increase-review-row">
                                    <span className="salary-increase-review-label">HR Comments:</span>
                                    <span className="salary-increase-review-value">{request.hrComments}</span>
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="salary-increase-form-group">
                            <label className="salary-increase-form-label">Comments (optional)</label>
                            <textarea
                                className="salary-increase-form-textarea"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments..."
                                rows={3}
                                maxLength={1000}
                                disabled={loading}
                            />
                        </div>

                        {/* Rejection Reason */}
                        <div className="salary-increase-form-group">
                            <label className="salary-increase-form-label">Rejection Reason (required for rejection)</label>
                            <textarea
                                className="salary-increase-form-textarea"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason if rejecting..."
                                rows={3}
                                maxLength={1000}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="modal-footer modal-footer-between">
                        <Button variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                variant="danger"
                                onClick={() => handleAction('reject')}
                                disabled={!rejectionReason.trim()}
                                loading={loading && action === 'reject'}
                                loadingText="Rejecting..."
                                title={!rejectionReason.trim() ? 'Please provide a rejection reason' : ''}
                            >
                                <FaBan /> Reject
                            </Button>
                            <Button
                                variant="success"
                                onClick={() => handleAction('approve')}
                                loading={loading && action === 'approve'}
                                loadingText="Approving..."
                            >
                                <FaCheck /> {roleLabel} Approve
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type={action === 'approve' ? 'success' : 'danger'}
                title={action === 'approve' ? `${roleLabel} Approve Request` : `${roleLabel} Reject Request`}
                message={action === 'approve'
                    ? `Approve salary increase for ${request.employeeName}? ${role === 'FINANCE' ? 'The salary will be updated immediately.' : 'The request will be forwarded to Finance for final approval.'}`
                    : `Reject salary increase request for ${request.employeeName}?`
                }
                onConfirm={confirmAction}
                onCancel={() => setShowConfirmDialog(false)}
            />
        </>
    );
};

export default ReviewSalaryIncreaseModal;
