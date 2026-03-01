import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCheck, FaBan, FaArrowDown } from 'react-icons/fa';
import { Button, CloseButton } from '../../../../components/common/Button';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const ReviewDemotionModal = ({ request, role, onClose, onSubmit }) => {
    const [comments, setComments] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState(null);
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
            return;
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

    const roleLabel = role === 'DEPT_HEAD' ? 'Department Head' : 'HR';

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
                        <div className="demotion-review-summary">
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Employee:</span>
                                <span className="demotion-review-value">{request.employeeName} ({request.employeeNumber})</span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Current Position:</span>
                                <span className="demotion-review-value">{request.currentPositionName}</span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">New Position:</span>
                                <span className="demotion-review-value demotion-review-highlight-danger">
                                    <FaArrowDown style={{ fontSize: '10px', marginRight: '4px' }} />
                                    {request.newPositionName}
                                </span>
                            </div>
                            {(request.currentGrade || request.newGrade) && (
                                <div className="demotion-review-row">
                                    <span className="demotion-review-label">Grade Change:</span>
                                    <span className="demotion-review-value">
                                        {request.currentGrade || '-'} → {request.newGrade || '-'}
                                    </span>
                                </div>
                            )}
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Current Salary:</span>
                                <span className="demotion-review-value">{formatCurrency(request.currentSalary)}</span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">New Salary:</span>
                                <span className="demotion-review-value demotion-review-highlight-danger">
                                    {formatCurrency(request.newSalary)}
                                </span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Reduction:</span>
                                <span className="demotion-review-value demotion-review-highlight-danger">
                                    -{formatCurrency(request.salaryReductionAmount)} (-{(request.salaryReductionPercentage || 0).toFixed(2)}%)
                                </span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Effective Date:</span>
                                <span className="demotion-review-value">{formatDate(request.effectiveDate)}</span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Reason:</span>
                                <span className="demotion-review-value">{request.reason}</span>
                            </div>
                            <div className="demotion-review-row">
                                <span className="demotion-review-label">Requested By:</span>
                                <span className="demotion-review-value">{request.requestedBy} — {formatDate(request.requestedAt)}</span>
                            </div>

                            {/* Show Dept Head decision for HR reviewers */}
                            {role === 'HR' && request.deptHeadApprovedBy && (
                                <div className="demotion-review-row">
                                    <span className="demotion-review-label">Dept Head Approved:</span>
                                    <span className="demotion-review-value">{request.deptHeadApprovedBy} — {formatDate(request.deptHeadDecisionDate)}</span>
                                </div>
                            )}
                            {role === 'HR' && request.deptHeadComments && (
                                <div className="demotion-review-row">
                                    <span className="demotion-review-label">Dept Head Comments:</span>
                                    <span className="demotion-review-value">{request.deptHeadComments}</span>
                                </div>
                            )}
                        </div>

                        {/* Comments */}
                        <div className="demotion-form-group">
                            <label className="demotion-form-label">Comments (optional)</label>
                            <textarea
                                className="demotion-form-textarea"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments..."
                                rows={3}
                                maxLength={1000}
                                disabled={loading}
                            />
                        </div>

                        {/* Rejection Reason */}
                        <div className="demotion-form-group">
                            <label className="demotion-form-label">Rejection Reason (required for rejection)</label>
                            <textarea
                                className="demotion-form-textarea"
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
                    ? `Approve demotion for ${request.employeeName}? ${role === 'HR' ? 'The position and salary will be updated immediately.' : 'The request will be forwarded to HR for final approval.'}`
                    : `Reject demotion request for ${request.employeeName}?`
                }
                onConfirm={confirmAction}
                onCancel={() => setShowConfirmDialog(false)}
            />
        </>
    );
};

export default ReviewDemotionModal;
