import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaEye, FaPlus, FaToggleOn } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { financeService } from '../../../../services/financeService.js';
import CashWithPersonForm from './CashWithPersonForm.jsx';
import CashWithPersonDetails from './CashWithPersonDetails.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';

const CashWithPersonList = ({ onDataChange }) => {
    const [cashWithPersons, setCashWithPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [formMode, setFormMode] = useState('create');
    const { showSuccess, showError } = useSnackbar();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [personToDelete, setPersonToDelete] = useState(null);


    useEffect(() => {
        fetchCashWithPersons();
    }, []);

    const fetchCashWithPersons = async () => {
        try {
            setLoading(true);
            const response = await financeService.balances.cashWithPersons.getAll();
            setCashWithPersons(response.data || []);
        } catch (err) {
            console.error('Error fetching cash with persons:', err);
            showError('Failed to load cash with persons');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedPerson(null);
        setFormMode('create');
        setShowForm(true);
    };

    const handleEdit = (person) => {
        setSelectedPerson(person);
        setFormMode('edit');
        setShowForm(true);
    };

    const handleView = (person) => {
        setSelectedPerson(person);
        setShowDetails(true);
    };

    const handleDelete = (person) => {
        setPersonToDelete(person);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!personToDelete) return;

        try {
            await financeService.balances.cashWithPersons.delete(personToDelete.id);
            showSuccess('Person deleted successfully');
            fetchCashWithPersons();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error deleting person:', err);
            showError('Failed to delete person');
        } finally {
            setShowDeleteConfirm(false);
            setPersonToDelete(null);
        }
    };


    const handleToggleStatus = async (person) => {
        try {
            if (person.isActive) {
                await financeService.balances.cashWithPersons.deactivate(person.id);
                showSuccess('Cash holder deactivated');
            } else {
                await financeService.balances.cashWithPersons.activate(person.id);
                showSuccess('Cash holder activated');
            }
            fetchCashWithPersons();
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error toggling status:', err);
            showError('Failed to update status');
        }
    };

    const handleFormSubmit = () => {
        setShowForm(false);
        fetchCashWithPersons();
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
            header: 'Person Name',
            accessor: 'personName',
            sortable: true
        },
        {
            header: 'Phone Number',
            accessor: 'phoneNumber',
            sortable: true
        },
        {
            header: 'Email',
            accessor: 'email',
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
        {
            header: 'Personal Bank',
            accessor: 'personalBankName',
            sortable: true
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
        // }
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
            header: 'Person Name',
            accessor: 'personName',
            filterType: 'text'
        },
        {
            header: 'Status',
            accessor: 'isActive',
            filterType: 'select',
            filterAllText: 'All Status'
        }
    ];

    return (
        <div className="cash-with-person-list">
            <DataTable
                data={cashWithPersons}
                columns={columns}
                loading={loading}
                // tableTitle="Cash With Persons"
                showAddButton={true}
                addButtonText="Add Person"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreate}
                onRowClick={handleView}
                actions={actions}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage="No cash holders found"
                defaultSortField="personName"
                defaultSortDirection="asc"
            />

            {showForm && (
                <CashWithPersonForm
                    person={selectedPerson}
                    mode={formMode}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleFormSubmit}
                />
            )}

            {showDetails && selectedPerson && (
                <CashWithPersonDetails
                    person={selectedPerson}
                    onClose={() => setShowDetails(false)}
                    onEdit={() => {
                        setShowDetails(false);
                        handleEdit(selectedPerson);
                    }}
                />
            )}

            <ConfirmationDialog
                isVisible={showDeleteConfirm}
                type="danger"
                title="Delete Person"
                message={`Are you sure you want to delete "${personToDelete?.personName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setPersonToDelete(null);
                }}
                size="medium"
            />
        </div>
    );
};

export default CashWithPersonList;