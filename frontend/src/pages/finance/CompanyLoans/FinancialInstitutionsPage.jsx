import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiPlus, FiEye, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { financeService } from '../../../services/financeService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './FinancialInstitutionsPage.scss';

const FinancialInstitutionsPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [institutions, setInstitutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Confirmation Dialog
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'warning'
    });

    // Fetch data
    useEffect(() => {
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        setIsLoading(true);
        try {
            const response = await financeService.companyLoans.institutions.getAll();
            setInstitutions(response.data || response || []);
        } catch (error) {
            console.error('Error fetching institutions:', error);
            showError('Failed to load institutions');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle deactivate
    const handleDeactivate = (institution) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Deactivate Institution',
            message: `Are you sure you want to deactivate "${institution.name}"? This institution will no longer be available for new loans.`,
            type: 'warning',
            onConfirm: async () => {
                try {
                    await financeService.companyLoans.institutions.deactivate(institution.id);
                    showSuccess('Institution deactivated successfully');
                    fetchInstitutions();
                } catch (error) {
                    showError(error.response?.data?.message || 'Failed to deactivate institution');
                }
                setConfirmDialog({ ...confirmDialog, isOpen: false });
            }
        });
    };

    // Handle delete
    const handleDelete = (institution) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Institution',
            message: `Are you sure you want to delete "${institution.name}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await financeService.companyLoans.institutions.delete(institution.id);
                    showSuccess('Institution deleted successfully');
                    fetchInstitutions();
                } catch (error) {
                    showError(error.response?.data?.message || 'Failed to delete institution');
                }
                setConfirmDialog({ ...confirmDialog, isOpen: false });
            }
        });
    };

    // Table columns
    const columns = [
        {
            header: 'Number',
            accessor: 'institutionNumber',
            sortable: true,
            width: '100px'
        },
        {
            header: 'Name',
            accessor: 'name',
            sortable: true
        },
        {
            header: 'Type',
            accessor: 'institutionType',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className="institution-type-badge">
                    {row.institutionType?.replace(/_/g, ' ')}
                </span>
            )
        },
        {
            header: 'Contact Person',
            accessor: 'contactPersonName',
            sortable: true
        },
        {
            header: 'Phone',
            accessor: 'phoneNumber',
            sortable: false
        },
        {
            header: 'Email',
            accessor: 'email',
            sortable: false
        },
        {
            header: 'Active Loans',
            accessor: 'activeLoans',
            sortable: true,
            render: (row) => (
                <span className="loan-count-badge">
                    {row.activeLoans || 0}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'isActive',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className={`status-badge ${row.isActive ? 'status-badge--active' : 'status-badge--inactive'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    // Table actions
    const actions = [
        {
            label: 'View',
            icon: <FiEye />,
            onClick: (row) => navigate(`/finance/company-loans/institutions/${row.id}`)
        },
        {
            label: 'Edit',
            icon: <FiEdit2 />,
            onClick: (row) => navigate(`/finance/company-loans/institutions/${row.id}/edit`)
        },
        {
            label: 'Deactivate',
            icon: <FiToggleLeft />,
            onClick: handleDeactivate,
            condition: (row) => row.isActive && row.activeLoans === 0
        },
        {
            label: 'Delete',
            icon: <FiTrash2 />,
            onClick: handleDelete,
            condition: (row) => row.totalLoans === 0,
            className: 'danger'
        }
    ];

    // Stats
    const activeCount = institutions.filter(i => i.isActive).length;
    const stats = [
        { value: institutions.length, label: 'Total Institutions' },
        { value: activeCount, label: 'Active' }
    ];

    // Breadcrumbs
    const breadcrumbs = [
        { label: 'Company Loans', onClick: () => navigate('/finance/company-loans') },
        { label: 'Financial Institutions' }
    ];

    return (
        <div className="financial-institutions-page">
            <IntroCard
                title="Financial Institutions"
                label="FINANCE CENTER"
                icon={<FiHome />}
                stats={stats}
                breadcrumbs={breadcrumbs}
                // actionButtons={[
                //     {
                //         text: 'Add Institution',
                //         icon: <FiPlus />,
                //         onClick: () => navigate('/finance/company-loans/institutions/new'),
                //         className: 'primary'
                //     }
                // ]}
            />

            <DataTable
                data={institutions}
                columns={columns}
                actions={actions}
                isLoading={isLoading}
                emptyMessage="No financial institutions found"
                searchPlaceholder="Search institutions..."
                defaultSortField="name"
                defaultSortDirection="asc"
                onRowClick={(row) => navigate(`/finance/company-loans/institutions/${row.id}`)}
                exportFileName="financial_institutions"
                showAddButton={true}
                addButtonText='Add Institution'
                addButtonIcon={<FiPlus />}
                onAddClick={()=> navigate('/finance/company-loans/institutions/new')}

            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />
        </div>
    );
};

export default FinancialInstitutionsPage;