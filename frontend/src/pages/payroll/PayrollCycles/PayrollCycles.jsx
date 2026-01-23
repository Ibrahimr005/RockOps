import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaPlus, FaTrash, FaCalendarAlt, FaCheck, FaClock,
    FaMoneyBillWave, FaUsers, FaLock, FaUnlock, FaCheckCircle
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import CreatePayrollModal from './modals/CreatePayrollModal';
import { payrollService } from '../../../services/payroll/payrollService'; // Import the service
import './PayrollCycles.scss';

const PayrollCycles = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, payrollId: null });

    useEffect(() => {
        fetchPayrolls();
    }, []);

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            // Use service instead of fetch
            const data = await payrollService.getAllPayrolls();
            setPayrolls(data);
        } catch (error) {
            showError(error.message || 'Failed to load payroll cycles');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePayroll = async (formData) => {
        try {
            // Use service instead of fetch
            // The service handles adding 'createdBy' from localStorage internally
            await payrollService.createPayroll(formData);

            showSuccess('Payroll cycle created successfully');
            setShowCreateModal(false);
            fetchPayrolls();
        } catch (error) {
            showError(error.message);
        }
    };

    const handleDeletePayroll = async () => {
        try {
            // Use service instead of fetch
            await payrollService.deletePayroll(deleteDialog.payrollId);

            showSuccess('Payroll cycle deleted successfully');
            setDeleteDialog({ open: false, payrollId: null });
            fetchPayrolls();
        } catch (error) {
            showError(error.message);
        }
    };

    // Handler for row clicks to navigate to details
    const handleRowClick = (row) => {
        navigate(`/payroll/cycles/${row.id}`);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            PUBLIC_HOLIDAYS_REVIEW: { icon: <FaCalendarAlt />, class: 'info', label: 'Holiday Review' },
            ATTENDANCE_IMPORT: { icon: <FaClock />, class: 'warning', label: 'Attendance Import' },
            LEAVE_REVIEW: { icon: <FaUsers />, class: 'warning', label: 'Leave Review' },
            OVERTIME_REVIEW: { icon: <FaClock />, class: 'warning', label: 'Overtime Review' },
            CONFIRMED_AND_LOCKED: { icon: <FaLock />, class: 'success', label: 'Confirmed & Locked' },
            PAID: { icon: <FaCheckCircle />, class: 'paid', label: 'Paid' },
        };

        const config = statusConfig[status] || { icon: <FaClock />, class: 'secondary', label: status };

        return (
            <span className={`status-badge ${config.class}`}>
                {config.icon}
                <span>{config.label}</span>
            </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const columns = [
        {
            id: 'period',
            header: 'Period',
            accessor: 'period',
            sortable: true,
            render: (row) => (
                <div className="period-cell">
                    <div className="period-dates">
                        {formatDate(row.startDate)} - {formatDate(row.endDate)}
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            render: (row) => getStatusBadge(row.status),
        },
        {
            id: 'employees',
            header: 'Employees',
            accessor: 'employeeCount',
            sortable: true,
            render: (row) => (
                <div className="employees-cell">
                    <FaUsers className="icon" />
                    <span>{row.employeeCount || 0}</span>
                </div>
            ),
        },
        {
            id: 'gross',
            header: 'Total Gross',
            accessor: 'totalGrossAmount',
            sortable: true,
            render: (row) => formatCurrency(row.totalGrossAmount),
        },
        {
            id: 'deductions',
            header: 'Total Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            render: (row) => (
                <span className="deduction-amount">
                    -{formatCurrency(row.totalDeductions)}
                </span>
            ),
        },
        {
            id: 'net',
            header: 'Total Net',
            accessor: 'totalNetAmount',
            sortable: true,
            render: (row) => (
                <span className="net-amount">
                    {formatCurrency(row.totalNetAmount)}
                </span>
            ),
        },
    ];

    const actions = [
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => {
                // Prevent row click propagation if necessary by checking logic in DataTable
                if (row.lockedAt) {
                    showError('Cannot delete a locked payroll');
                    return;
                }
                setDeleteDialog({ open: true, payrollId: row.id });


            },
            variant: 'danger',
            condition: (row) => !row.lockedAt,
        },
    ];

    return (
        <div className="payroll-cycles-page">
            <PageHeader
                title="Payroll Cycles"
                subtitle="Manage monthly payroll processing cycles"
            />

            <div className="payroll-content">
                <DataTable
                    data={payrolls}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={loading}
                    emptyMessage="No payroll cycles found. Create your first payroll cycle to get started."
                    showSearch={true}
                    showFilters={false}
                    showExportButton={true}
                    exportButtonText="Export Excel"
                    exportFileName="payroll-cycles"
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 15, 20]}
                    showAddButton={true}
                    addButtonText="Create Payroll"
                    addButtonIcon={<FaPlus />}
                    onAddClick={() => setShowCreateModal(true)}
                    className="clickable-rows"
                />
            </div>

            {showCreateModal && (
                <CreatePayrollModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreatePayroll}
                />
            )}

            <ConfirmationDialog
                isOpen={deleteDialog.open}
                title="Delete Payroll Cycle"
                message="Are you sure you want to delete this payroll cycle? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDeletePayroll}
                onCancel={() => setDeleteDialog({ open: false, payrollId: null })}
                variant="danger"
            />
        </div>
    );
};

export default PayrollCycles;