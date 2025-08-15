import React, { useState, useEffect } from 'react';
import { FaUniversity, FaPlus, FaEdit, FaTrash, FaEye, FaFileExcel } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const BankAccountManagement = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const { showSuccess, showError } = useSnackbar();

    // Form data for add/edit
    const [formData, setFormData] = useState({
        accountName: '',
        accountNumber: '',
        bankName: '',
        // accountType: 'CHECKING',
        currentBalance: '',
        description: ''
    });

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async () => {
        try {
            setLoading(true);
            const response = await financeService.bankReconciliation.bankAccounts.getAll();
            const data = response.data || response;
            setAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
            showError('Failed to load bank accounts: ' + error.message);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async () => {
        try {
            const accountData = {
                ...formData,
                currentBalance: parseFloat(formData.currentBalance) || 0
            };

            await financeService.bankReconciliation.bankAccounts.create(accountData);
            showSuccess('Bank account created successfully');
            setShowAddModal(false);
            resetForm();
            fetchBankAccounts();
        } catch (error) {
            console.error('Error creating bank account:', error);
            showError('Failed to create bank account: ' + error.message);
        }
    };

    const handleEditAccount = async () => {
        try {
            const accountData = {
                ...formData,
                currentBalance: parseFloat(formData.currentBalance) || 0
            };

            await financeService.bankReconciliation.bankAccounts.update(selectedAccount.id, accountData);
            showSuccess('Bank account updated successfully');
            setShowEditModal(false);
            setSelectedAccount(null);
            resetForm();
            fetchBankAccounts();
        } catch (error) {
            console.error('Error updating bank account:', error);
            showError('Failed to update bank account: ' + error.message);
        }
    };

    const handleDeleteAccount = async (account) => {
        if (window.confirm(`Are you sure you want to deactivate the account "${account.accountName}"?`)) {
            try {
                await financeService.bankReconciliation.bankAccounts.delete(account.id);
                showSuccess('Bank account deactivated successfully');
                fetchBankAccounts();
            } catch (error) {
                console.error('Error deactivating bank account:', error);
                showError('Failed to deactivate bank account: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            accountName: '',
            accountNumber: '',
            bankName: '',
            // accountType: 'CHECKING',
            currentBalance: '',
            description: ''
        });
    };

    const openEditModal = (account) => {
        setSelectedAccount(account);
        setFormData({
            accountName: account.accountName || '',
            accountNumber: account.accountNumber || '',
            bankName: account.bankName || '',
            // accountType: account.accountType || 'CHECKING',
            currentBalance: account.currentBalance?.toString() || '',
            description: account.description || ''
        });
        setShowEditModal(true);
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getStatusBadge = (isActive) => {
        return (
            <span className={`bank-reconciliation-status-badge ${isActive ? 'bank-reconciliation-status-active' : 'bank-reconciliation-status-inactive'}`}>
                {isActive ? 'Active' : 'Inactive'}
            </span>
        );
    };

    const columns = [
        {
            header: 'Account Name',
            accessor: 'accountName',
            sortable: true,
            filterable: true
        },
        {
            header: 'Account Number',
            accessor: 'accountNumber',
            sortable: true,
            filterable: true
        },
        {
            header: 'Bank Name',
            accessor: 'bankName',
            sortable: true,
            filterable: true
        },
        // {
        //     header: 'Account Type',
        //     accessor: 'accountType',
        //     sortable: true,
        //     filterable: true,
        //     filterType: 'select'
        // },
        {
            header: 'Current Balance',
            accessor: 'currentBalance',
            sortable: true,
            align: 'right',
            render: (row, value) => formatCurrency(value)
        },
        {
            header: 'Status',
            accessor: 'active',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row, value) => getStatusBadge(value)
        },
        {
            header: 'Last Updated',
            accessor: 'lastModifiedDate',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: (account) => {
                // TODO: Implement view details modal
                showSuccess(`Viewing details for ${account.accountName}`);
            }
        },
        {
            label: 'Edit Account',
            icon: <FaEdit />,
            onClick: (account) => openEditModal(account),
            className: 'bank-reconciliation-btn-secondary'
        },
        {
            label: 'Deactivate',
            icon: <FaTrash />,
            onClick: (account) => handleDeleteAccount(account),
            className: 'bank-reconciliation-btn-danger',
            isDisabled: (account) => !account.active
        }
    ];

    const filterableColumns = [
        { header: 'Account Name', accessor: 'accountName', filterType: 'text' },
        { header: 'Bank Name', accessor: 'bankName', filterType: 'text' },
        // { header: 'Account Type', accessor: 'accountType', filterType: 'select' },
        { header: 'Status', accessor: 'active', filterType: 'select' }
    ];

    return (
        <div className="bank-reconciliation-card">
            <div className="bank-reconciliation-card-header">
                <h3 className="bank-reconciliation-card-title">
                    <FaUniversity />
                    Bank Account Management
                </h3>
            </div>

            <DataTable
                data={accounts}
                columns={columns}
                loading={loading}
                actions={actions}
                showAddButton={true}
                addButtonText="Add Bank Account"
                addButtonIcon={<FaPlus />}
                onAddClick={() => setShowAddModal(true)}
                showExportButton={true}
                exportButtonText="Export Accounts"
                exportButtonIcon={<FaFileExcel />}
                exportFileName="bank_accounts"
                tableTitle="Bank Accounts"
                emptyMessage="No bank accounts found"
                className="bank-reconciliation-table"
                filterableColumns={filterableColumns}
                defaultSortField="accountName"
                defaultSortDirection="asc"
            />

            {/* Add Account Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Bank Account</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form className="bank-reconciliation-form">
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Account Name *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.accountName}
                                            onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                                            placeholder="Enter account name"
                                            required
                                        />
                                    </div>
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Account Number *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                                            placeholder="Enter account number"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Bank Name *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                                            placeholder="Enter bank name"
                                            required
                                        />
                                    </div>
                                    {/*<div className="bank-reconciliation-form-group">*/}
                                    {/*    <label className="bank-reconciliation-form-label">Account Type</label>*/}
                                    {/*    <select*/}
                                    {/*        className="bank-reconciliation-form-select"*/}
                                    {/*        value={formData.accountType}*/}
                                    {/*        onChange={(e) => setFormData({...formData, accountType: e.target.value})}*/}
                                    {/*    >*/}
                                    {/*        <option value="CHECKING">Checking</option>*/}
                                    {/*        <option value="SAVINGS">Savings</option>*/}
                                    {/*        <option value="MONEY_MARKET">Money Market</option>*/}
                                    {/*        <option value="CREDIT_LINE">Credit Line</option>*/}
                                    {/*    </select>*/}
                                    {/*</div>*/}
                                </div>
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Current Balance</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="bank-reconciliation-form-input"
                                            value={formData.currentBalance}
                                            onChange={(e) => setFormData({...formData, currentBalance: e.target.value})}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Description</label>
                                    <textarea
                                        className="bank-reconciliation-form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="Enter account description (optional)"
                                        rows="3"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-primary"
                                onClick={handleAddAccount}
                                disabled={!formData.accountName || !formData.accountNumber || !formData.bankName}
                            >
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Bank Account</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form className="bank-reconciliation-form">
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Account Name *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.accountName}
                                            onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                                            placeholder="Enter account name"
                                            required
                                        />
                                    </div>
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Account Number *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                                            placeholder="Enter account number"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Bank Name *</label>
                                        <input
                                            type="text"
                                            className="bank-reconciliation-form-input"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                                            placeholder="Enter bank name"
                                            required
                                        />
                                    </div>
                                    {/*<div className="bank-reconciliation-form-group">*/}
                                    {/*    <label className="bank-reconciliation-form-label">Account Type</label>*/}
                                    {/*    <select*/}
                                    {/*        className="bank-reconciliation-form-select"*/}
                                    {/*        value={formData.accountType}*/}
                                    {/*        onChange={(e) => setFormData({...formData, accountType: e.target.value})}*/}
                                    {/*    >*/}
                                    {/*        <option value="CHECKING">Checking</option>*/}
                                    {/*        <option value="SAVINGS">Savings</option>*/}
                                    {/*        <option value="MONEY_MARKET">Money Market</option>*/}
                                    {/*        <option value="CREDIT_LINE">Credit Line</option>*/}
                                    {/*    </select>*/}
                                    {/*</div>*/}
                                </div>
                                <div className="bank-reconciliation-form-row">
                                    <div className="bank-reconciliation-form-group">
                                        <label className="bank-reconciliation-form-label">Current Balance</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="bank-reconciliation-form-input"
                                            value={formData.currentBalance}
                                            onChange={(e) => setFormData({...formData, currentBalance: e.target.value})}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="bank-reconciliation-form-group">
                                    <label className="bank-reconciliation-form-label">Description</label>
                                    <textarea
                                        className="bank-reconciliation-form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        placeholder="Enter account description (optional)"
                                        rows="3"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bank-reconciliation-btn bank-reconciliation-btn-primary"
                                onClick={handleEditAccount}
                                disabled={!formData.accountName || !formData.accountNumber || !formData.bankName}
                            >
                                Update Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankAccountManagement;