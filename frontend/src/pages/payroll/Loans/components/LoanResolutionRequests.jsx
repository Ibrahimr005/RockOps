// ========================================
// FILE: LoanResolutionRequests.jsx
// Table view for loan resolution requests (HR / Finance)
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import { FaCheck, FaTimes, FaSpinner, FaEye, FaGavel } from 'react-icons/fa';
import { Button } from '../../../../components/common/Button';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { loanResolutionService, RESOLUTION_STATUS_CONFIG } from '../../../../services/payroll/loanResolutionService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';

const LoanResolutionRequests = ({ filterStatus, role = 'HR', onUpdate }) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isVisible: false });
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            const params = filterStatus ? { status: filterStatus } : {};
            const response = await loanResolutionService.getRequests(params);
            setRequests(response.data || []);
        } catch (error) {
            showError('Failed to load resolution requests');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, showError]);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD', minimumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderStatusBadge = (status) => {
        const config = RESOLUTION_STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
        return (
            <span
                className="loan-status-badge"
                style={{ backgroundColor: config.bgColor, color: config.color, border: `1px solid ${config.color}20` }}
            >
                {config.label}
            </span>
        );
    };

    const handleApprove = (request) => {
        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: `${role} Approve Resolution`,
            message: `Approve early resolution for loan ${request.loanNumber}? Remaining balance: ${formatCurrency(request.remainingBalance)}`,
            onConfirm: async () => {
                try {
                    setProcessingId(request.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    if (role === 'HR') {
                        await loanResolutionService.hrDecision(request.id, true);
                    } else {
                        await loanResolutionService.financeDecision(request.id, true);
                    }

                    showSuccess(`Resolution request ${role === 'FINANCE' ? 'approved — loan resolved' : 'approved — forwarded to Finance'}`);
                    loadRequests();
                    if (onUpdate) onUpdate();
                } catch (error) {
                    showError(error.response?.data?.message || 'Failed to approve request');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleReject = (request) => {
        setSelectedRequestId(request.id);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!rejectReason.trim()) {
            showWarning('Please provide a rejection reason');
            return;
        }

        try {
            setProcessingId(selectedRequestId);
            setShowRejectModal(false);

            if (role === 'HR') {
                await loanResolutionService.hrDecision(selectedRequestId, false, rejectReason);
            } else {
                await loanResolutionService.financeDecision(selectedRequestId, false, rejectReason);
            }

            showSuccess('Resolution request rejected');
            loadRequests();
            if (onUpdate) onUpdate();
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to reject request');
        } finally {
            setProcessingId(null);
            setSelectedRequestId(null);
            setRejectReason('');
        }
    };

    const columns = [
        {
            accessor: 'loanNumber',
            header: 'Loan #',
            sortable: true,
            filterable: true,
            filterType: 'text'
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
            filterType: 'text'
        },
        {
            accessor: 'loanAmount',
            header: 'Loan Amount',
            sortable: true,
            render: (row) => formatCurrency(row.loanAmount)
        },
        {
            accessor: 'remainingBalance',
            header: 'Remaining',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: '600', color: 'var(--color-danger)' }}>
                    {formatCurrency(row.remainingBalance)}
                </span>
            )
        },
        {
            accessor: 'reason',
            header: 'Reason',
            render: (row) => (
                <span title={row.reason}>
                    {row.reason?.length > 60 ? row.reason.substring(0, 60) + '...' : row.reason}
                </span>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            render: (row) => renderStatusBadge(row.status)
        },
        {
            accessor: 'createdAt',
            header: 'Requested',
            sortable: true,
            render: (row) => formatDateTime(row.createdAt)
        }
    ];

    const canAct = (request) => {
        if (role === 'HR') return request.status === 'PENDING_HR';
        if (role === 'FINANCE') return request.status === 'PENDING_FINANCE';
        return false;
    };

    const actions = [
        {
            label: 'Approve',
            icon: processingId ? <FaSpinner className="spin" /> : <FaCheck />,
            onClick: handleApprove,
            isVisible: canAct,
            isDisabled: (row) => processingId === row.id,
            className: 'action-approve'
        },
        {
            label: 'Reject',
            icon: <FaTimes />,
            onClick: handleReject,
            isVisible: canAct,
            isDisabled: (row) => processingId === row.id,
            className: 'action-reject'
        }
    ];

    return (
        <div className="loan-resolution-requests">
            <DataTable
                data={requests}
                columns={columns}
                loading={loading}
                emptyMessage="No resolution requests found"
                actions={actions}
                actionsColumnWidth="140px"
                showSearch={true}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                defaultItemsPerPage={10}
            />

            {/* Rejection reason modal */}
            {showRejectModal && (
                <div className="modal-overlay">
                    <div className="rejection-modal">
                        <h3>Reject Resolution Request</h3>
                        <p>Please provide a reason for rejection:</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                        />
                        <div className="modal-actions">
                            <Button variant="ghost" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmReject} disabled={!rejectReason.trim() || processingId} loading={!!processingId} loadingText="Reject">
                                Reject
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default LoanResolutionRequests;
