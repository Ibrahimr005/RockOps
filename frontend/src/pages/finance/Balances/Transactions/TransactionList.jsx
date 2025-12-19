import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { useAuth } from '../../../../contexts/AuthContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import TransactionForm from './TransactionForm.jsx';

const TransactionList = ({ onDataChange }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { showSuccess, showError } = useSnackbar();
    const { currentUser } = useAuth();

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await financeService.balances.transactions.getAll();
            setTransactions(response.data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            showError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setShowForm(true);
    };

    const handleFormSubmit = () => {
        setShowForm(false);
        fetchTransactions();
        if (onDataChange) onDataChange();
    };

    // Check if user can approve/reject a transaction
    const canApproveReject = (transaction) => {
        // Must be ADMIN or FINANCE_MANAGER
        if (!currentUser || !['ADMIN', 'FINANCE_MANAGER'].includes(currentUser.role)) {
            return false;
        }

        // Cannot approve/reject own transactions
        if (transaction.createdBy === currentUser.username) {
            return false;
        }

        // Transaction must be PENDING
        if (transaction.status !== 'PENDING') {
            return false;
        }

        return true;
    };

    const handleApproveClick = (transaction) => {
        setSelectedTransaction(transaction);
        setShowApproveDialog(true);
    };

    const handleApprove = async () => {
        if (!selectedTransaction) return;

        try {
            setIsProcessing(true);
            await financeService.balances.transactions.approve(selectedTransaction.id);
            showSuccess('Transaction approved successfully');
            setShowApproveDialog(false);
            fetchTransactions();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error approving transaction:', err);
            showError(err.response?.data?.message || 'Failed to approve transaction');
        } finally {
            setIsProcessing(false);
            setSelectedTransaction(null);
        }
    };

    const handleRejectClick = (transaction) => {
        setSelectedTransaction(transaction);
        setRejectionReason('');
        setShowRejectDialog(true);
    };

    const handleReject = async (reason) => {
        if (!selectedTransaction) return;

        try {
            setIsProcessing(true);
            await financeService.balances.transactions.reject(selectedTransaction.id, reason);
            showSuccess('Transaction rejected');
            setShowRejectDialog(false);
            fetchTransactions();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error rejecting transaction:', err);
            showError(err.response?.data?.message || 'Failed to reject transaction');
        } finally {
            setIsProcessing(false);
            setSelectedTransaction(null);
            setRejectionReason('');
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

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionTypeStyle = (type) => {
        switch (type) {
            case 'DEPOSIT':
                return { color: 'var(--color-success)', fontWeight: 600 };
            case 'WITHDRAWAL':
                return { color: 'var(--color-danger)', fontWeight: 600 };
            case 'TRANSFER':
                return { color: 'var(--color-info)', fontWeight: 600 };
            default:
                return {};
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'APPROVED':
                return 'status-approved';
            case 'PENDING':
                return 'status-pending';
            case 'REJECTED':
                return 'status-rejected';
            default:
                return '';
        }
    };

    const columns = [
        {
            header: 'Date',
            accessor: 'transactionDate',
            sortable: true,
            render: (row) => formatDateTime(row.transactionDate)
        },
        {
            header: 'Type',
            accessor: 'transactionType',
            sortable: true,
            render: (row) => (
                <span style={getTransactionTypeStyle(row.transactionType)}>
                {row.transactionType}
            </span>
            )
        },
        {
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600 }}>
                {formatCurrency(row.amount)}
            </span>
            )
        },
        {
            header: 'From Account',
            accessor: 'accountName',
            sortable: true,
            render: (row) => {
                // DEPOSIT: no "from" account (money comes from external source)
                if (row.transactionType === 'DEPOSIT') {
                    return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>;
                }
                // WITHDRAWAL and TRANSFER: show the source account
                return (
                    <div>
                        <div style={{ fontWeight: 500 }}>{row.accountName || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {row.accountType?.replace('_', ' ')}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'To Account',
            accessor: 'toAccountName',
            sortable: false,
            render: (row) => {
                // DEPOSIT: show the destination account (where money is deposited)
                if (row.transactionType === 'DEPOSIT') {
                    return (
                        <div>
                            <div style={{ fontWeight: 500 }}>{row.accountName || 'N/A'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                {row.accountType?.replace('_', ' ')}
                            </div>
                        </div>
                    );
                }
                // WITHDRAWAL: no "to" account (money goes to external destination)
                if (row.transactionType === 'WITHDRAWAL') {
                    return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>;
                }
                // TRANSFER: show the destination account
                return (
                    <div>
                        <div style={{ fontWeight: 500 }}>{row.toAccountName || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {row.toAccountType?.replace('_', ' ')}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                {row.status}
            </span>
            )
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            sortable: true
        },
        {
            header: 'Reference',
            accessor: 'referenceNumber',
            sortable: false
        }
    ];

    const actions = [
        {
            label: 'Approve',
            icon: <FaCheck />,
            onClick: handleApproveClick,
            className: 'rockops-table__action-button approve',
            show: (row) => canApproveReject(row)
        },
        {
            label: 'Reject',
            icon: <FaTimes />,
            onClick: handleRejectClick,
            className: 'rockops-table__action-button danger',
            show: (row) => canApproveReject(row)
        }
    ];

    const filterableColumns = [
        {
            header: 'Type',
            accessor: 'transactionType',
            filterType: 'select',
            filterAllText: 'All Types'
        },
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select',
            filterAllText: 'All Status'
        }
    ];

    return (
        <div className="transaction-list">
            <DataTable
                data={transactions}
                columns={columns}
                loading={loading}
                showAddButton={true}
                addButtonText="New Transaction"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreate}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage="No transactions found"
                defaultSortField="transactionDate"
                defaultSortDirection="desc"
            />

            {showForm && (
                <TransactionForm
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {/* Approve Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showApproveDialog}
                type="success"
                title="Approve Transaction"
                message={`Are you sure you want to approve this ${selectedTransaction?.transactionType} transaction for ${formatCurrency(selectedTransaction?.amount)}?`}
                confirmText="Approve"
                cancelText="Cancel"
                onConfirm={handleApprove}
                onCancel={() => {
                    setShowApproveDialog(false);
                    setSelectedTransaction(null);
                }}
                isLoading={isProcessing}
                size="medium"
            />

            {/* Reject Confirmation Dialog with Input */}
            <ConfirmationDialog
                isVisible={showRejectDialog}
                type="danger"
                title="Reject Transaction"
                message={`You are rejecting a ${selectedTransaction?.transactionType} transaction for ${formatCurrency(selectedTransaction?.amount)}.`}
                confirmText="Reject Transaction"
                cancelText="Cancel"
                onConfirm={handleReject}
                onCancel={() => {
                    setShowRejectDialog(false);
                    setSelectedTransaction(null);
                    setRejectionReason('');
                }}
                isLoading={isProcessing}
                showInput={true}
                inputLabel="Rejection Reason"
                inputPlaceholder="Please provide a reason for rejecting this transaction..."
                inputRequired={true}
                inputValue={rejectionReason}
                onInputChange={setRejectionReason}
                size="medium"
            />
        </div>
    );
};

export default TransactionList;