import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaPlus, FaToggleOn } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import CashSafeForm from './CashSafeForm.jsx';
import CashSafeDetails from './CashSafeDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const CashSafeList = ({ onDataChange }) => {
    const [cashSafes, setCashSafes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedSafe, setSelectedSafe] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const { showSuccess, showError } = useSnackbar();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [safeToDelete, setSafeToDelete] = useState(null);

    useEffect(() => {
        fetchCashSafes();
    }, []);

    const fetchCashSafes = async () => {
        try {
            setLoading(true);
            const response = await financeService.balances.cashSafes.getAll();
            setCashSafes(response.data || []);
        } catch (err) {
            console.error('Error fetching cash safes:', err);
            showError('Failed to load cash safes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedSafe(null);
        setFormMode('create');
        setShowForm(true);
    };

    const handleEdit = (safe) => {
        setSelectedSafe(safe);
        setFormMode('edit');
        setShowForm(true);
    };

    const handleView = (safe) => {
        setSelectedSafe(safe);
        setShowDetails(true);
    };

    const handleDelete = (safe) => {
        setSafeToDelete(safe);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!safeToDelete) return;

        try {
            await financeService.balances.cashSafes.delete(safeToDelete.id);
            showSuccess('Safe deleted successfully');
            fetchCashSafes();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error deleting safe:', err);
            showError('Failed to delete safe');
        } finally {
            setShowDeleteConfirm(false);
            setSafeToDelete(null);
        }
    };

    const handleToggleStatus = async (safe) => {
        try {
            if (safe.isActive) {
                await financeService.balances.cashSafes.deactivate(safe.id);
                showSuccess('Cash safe deactivated');
            } else {
                await financeService.balances.cashSafes.activate(safe.id);
                showSuccess('Cash safe activated');
            }
            fetchCashSafes();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error toggling safe status:', err);
            showError('Failed to update safe status');
        }
    };

    const handleFormSubmit = () => {
        setShowForm(false);
        fetchCashSafes();
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
            header: 'Safe Name',
            accessor: 'safeName',
            sortable: true
        },
        {
            header: 'Location',
            accessor: 'location',
            sortable: true
        },
        {
            header: 'Current Balance',
            accessor: 'currentBalance',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {formatCurrency(row.currentBalance)}
                </span>
            )
        },
        // {
        //     header: 'Status',
        //     accessor: 'isActive',
        //     sortable: true,
        //     render: (row) => (
        //         <span className={`status-badge ${row.isActive ? 'status-active' : 'status-inactive'}`}>
        //             {row.isActive ? 'Active' : 'Inactive'}
        //         </span>
        //     )
        // },
        {
            header: 'Created By',
            accessor: 'createdBy',
            sortable: true
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
            header: 'Location',
            accessor: 'location',
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
        <div className="cash-safe-list">
            <DataTable
                data={cashSafes}
                columns={columns}
                loading={loading}
                // tableTitle="Cash Safes"
                showAddButton={true}
                addButtonText="Add Cash Safe"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreate}
                onRowClick={handleView}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage="No cash safes found"
                defaultSortField="safeName"
                defaultSortDirection="asc"
            />

            {showForm && (
                <CashSafeForm
                    safe={selectedSafe}
                    mode={formMode}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {showForm && (
                <CashSafeForm
                    safe={selectedSafe}
                    mode={formMode}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {showDetails && selectedSafe && (
                <CashSafeDetails
                    safe={selectedSafe}
                    onClose={() => setShowDetails(false)}
                    onEdit={() => {
                        setShowDetails(false);
                        handleEdit(selectedSafe);
                    }}
                />
            )}


            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="danger"
                title="Delete Safe"
                message={`Are you sure you want to delete safe "${safeToDelete?.safeName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setSafeToDelete(null);
                }}
                size="medium"
            />
        </div>
    );
};

export default CashSafeList;