import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaPlus, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import BankAccountForm from './BankAccountForm.jsx';
import BankAccountDetails from './BankAccountDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const BankAccountList = ({ onDataChange }) => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const { showSuccess, showError } = useSnackbar();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async () => {
        try {
            setLoading(true);
            const response = await financeService.balances.bankAccounts.getAll();
            setBankAccounts(response.data || []);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
            showError('Failed to load bank accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedAccount(null);
        setFormMode('create');
        setShowForm(true);
    };

    const handleEdit = (account) => {
        setSelectedAccount(account);
        setFormMode('edit');
        setShowForm(true);
    };

    const handleView = (account) => {
        setSelectedAccount(account);
        setShowDetails(true);
    };

    const handleDelete = (account) => {
        setAccountToDelete(account);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!accountToDelete) return;

        try {
            await financeService.balances.bankAccounts.delete(accountToDelete.id);
            showSuccess('Bank account deleted successfully');
            fetchBankAccounts();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error deleting bank account:', err);
            showError('Failed to delete bank account');
        } finally {
            setShowDeleteConfirm(false);
            setAccountToDelete(null);
        }
    };

    const handleToggleStatus = async (account) => {
        try {
            if (account.isActive) {
                await financeService.balances.bankAccounts.deactivate(account.id);
                showSuccess('Bank account deactivated');
            } else {
                await financeService.balances.bankAccounts.activate(account.id);
                showSuccess('Bank account activated');
            }
            fetchBankAccounts();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error toggling account status:', err);
            showError('Failed to update account status');
        }
    };

    const handleFormSubmit = () => {
        setShowForm(false);
        fetchBankAccounts();
        if (onDataChange) onDataChange();
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const columns = [
        {
            header: 'Bank Name',
            accessor: 'bankName',
            sortable: true
        },
        {
            header: 'Account Number',
            accessor: 'accountNumber',
            sortable: true
        },
        {
            header: 'Account Holder',
            accessor: 'accountHolderName',
            sortable: true
        },
        {
            header: 'Current Balance',
            accessor: 'currentBalance',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                    {formatCurrency(row.currentBalance)}
                </span>
            )
        },
        {
            header: 'IBAN',
            accessor: 'iban',
            sortable: false
        },
        {
            header: 'Status',
            accessor: 'isActive',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.isActive ? 'status-active' : 'status-inactive'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    const actions = [
        // {
        //     label: 'View',
        //     icon: <FaEye />,
        //     onClick: handleView,
        //     className: 'action-view'
        // },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEdit,
            className: 'rockops-table__action-button primary'
        },
        // {
        //     label: 'Toggle Status',
        //     icon: <FaToggleOn />,
        //     onClick: handleToggleStatus,
        //     className: 'action-toggle'
        // },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: handleDelete,
            className: 'rockops-table__action-button danger'
        }
    ];

    const filterableColumns = [
        {
            header: 'Bank Name',
            accessor: 'bankName',
            filterType: 'select'
        },
        {
            header: 'Status',
            accessor: 'isActive',
            filterType: 'select',
            filterAllText: 'All Status'
        }
    ];

    return (
        <div className="bank-account-list">
            <DataTable
                data={bankAccounts}
                columns={columns}
                loading={loading}
                // tableTitle="Bank Accounts"
                showAddButton={true}
                addButtonText="Add Bank Account"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreate}
                onRowClick={handleView}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage="No bank accounts found"
                defaultSortField="bankName"
                defaultSortDirection="asc"
            />

            {showForm && (
                <BankAccountForm
                    account={selectedAccount}
                    mode={formMode}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {showDetails && selectedAccount && (
                <BankAccountDetails
                    account={selectedAccount}
                    onClose={() => setShowDetails(false)}
                    onEdit={() => {
                        setShowDetails(false);
                        handleEdit(selectedAccount);
                    }}
                />
            )}

            {showDetails && selectedAccount && (
                <BankAccountDetails
                    account={selectedAccount}
                    onClose={() => setShowDetails(false)}
                    onEdit={() => {
                        setShowDetails(false);
                        handleEdit(selectedAccount);
                    }}
                />
            )}

            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="danger"
                title="Delete Bank Account"
                message={`Are you sure you want to delete bank account "${accountToDelete?.bankName} - ${accountToDelete?.accountNumber}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setAccountToDelete(null);
                }}
                size="medium"
            />

        </div>
    );
};

export default BankAccountList;