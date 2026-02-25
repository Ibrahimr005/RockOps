// ========================================
// FILE: LoanResolutionModal.jsx
// Modal for submitting an early loan resolution request
// ========================================

import React, { useState, useEffect } from 'react';
import { FaTimes, FaGavel, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { loanResolutionService } from '../../../../services/payroll/loanResolutionService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const LoanResolutionModal = ({ loan, onClose, onRequestCreated }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // ESC key handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !loading) handleCloseAttempt();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [loading, isFormDirty]);

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) handleCloseAttempt();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD', minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            showWarning('Please provide a reason for the early resolution');
            return;
        }

        if (reason.trim().length < 10) {
            showWarning('Please provide a more detailed reason (at least 10 characters)');
            return;
        }

        try {
            setLoading(true);
            const response = await loanResolutionService.createRequest(loan.id, reason.trim());
            showSuccess('Resolution request submitted successfully. Pending HR approval.');
            if (onRequestCreated) onRequestCreated(response.data);
            onClose();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to submit resolution request';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="create-loan-modal-overlay" onClick={handleOverlayClick}>
            <div className="create-loan-modal" style={{ maxWidth: '550px' }}>
                <div className="create-loan-modal-header">
                    <h2><FaGavel style={{ marginRight: '8px' }} /> Request Early Resolution</h2>
                    <button
                        className="create-loan-modal-close-btn"
                        onClick={handleCloseAttempt}
                        type="button"
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="create-loan-modal-content">
                    <div className="create-loan-form-section">
                        <div className="create-loan-calculation-summary" style={{ marginBottom: '16px' }}>
                            <div className="create-loan-summary-row">
                                <span className="create-loan-label">Loan Number:</span>
                                <span className="create-loan-value">{loan.loanNumber}</span>
                            </div>
                            <div className="create-loan-summary-row">
                                <span className="create-loan-label">Employee:</span>
                                <span className="create-loan-value">{loan.employeeName}</span>
                            </div>
                            <div className="create-loan-summary-row">
                                <span className="create-loan-label">Original Amount:</span>
                                <span className="create-loan-value">{formatCurrency(loan.loanAmount)}</span>
                            </div>
                            <div className="create-loan-summary-row create-loan-total-row">
                                <span className="create-loan-label">Remaining Balance:</span>
                                <span className="create-loan-value create-loan-highlight">
                                    {formatCurrency(loan.remainingBalance)}
                                </span>
                            </div>
                        </div>

                        <div className="create-loan-workflow-note" style={{ marginBottom: '16px' }}>
                            <FaExclamationTriangle style={{ marginRight: '6px', color: 'var(--color-warning)' }} />
                            <strong>Note:</strong> This request will go through HR and Finance approval.
                            If approved, the loan will be closed and remaining deductions will stop.
                            The outstanding balance of {formatCurrency(loan.remainingBalance)} will be recorded for audit.
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="create-loan-form-group">
                                <label>Reason for Early Resolution *</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => { setReason(e.target.value); setIsFormDirty(true); }}
                                    className="create-loan-form-input create-loan-textarea"
                                    placeholder="Explain why this loan should be resolved early..."
                                    rows={4}
                                    maxLength={1000}
                                    disabled={loading}
                                />
                                <small className="create-loan-field-help">
                                    {reason.length}/1000 characters
                                </small>
                            </div>

                            <div className="create-loan-form-actions">
                                <button
                                    type="button"
                                    className="create-loan-cancel-btn"
                                    onClick={handleCloseAttempt}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="create-loan-submit-btn"
                                    disabled={loading || !reason.trim()}
                                >
                                    {loading ? (
                                        <><FaSpinner className="create-loan-spinner" /> Submitting...</>
                                    ) : (
                                        <><FaGavel /> Submit Request</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form?"
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        </>
    );
};

export default LoanResolutionModal;
