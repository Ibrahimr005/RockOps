// ==================== PAYSLIP MANAGEMENT MAIN PAGE ====================
// frontend/src/pages/payroll/PayslipManagement/PayslipManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaPlus,
    FaEye,
    FaEdit,
    FaCheck,
    FaEnvelope,
    FaDownload,
    FaFileInvoice,
    FaCalendarAlt,
    FaUsers,
    FaExclamationTriangle,
    FaFilePdf,
    FaFileExcel,
    FaMoneyBillWave
} from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import DataTable from '../../../components/common/DataTable/DataTable';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import PayslipCreateModal from './components/PayslipCreateModal';
import PayslipBulkActionsModal from './components/PayslipBulkActionsModal';
import './PayslipManagement.scss';

const PayslipManagement = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State for payslips data
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPayslips, setSelectedPayslips] = useState([]);

    // State for modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);

    // State for confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // State for payslip statistics
    const [payslipStats, setPayslipStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        sent: 0
    });

    // Load payslips on component mount
    useEffect(() => {
        loadPayslips();
        loadPayslipStats();
    }, []);

    /**
     * Load all payslips for DataTable to handle internally
     */
    const loadPayslips = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load a reasonable number of payslips for DataTable to handle pagination/filtering internally
            const response = await payslipService.getAllPayslips(1000);
            const data = response.data;

            if (data && data.content) {
                // Paginated response from Spring Boot
                setPayslips(data.content);
            } else if (Array.isArray(data)) {
                // Fallback for direct array response
                setPayslips(data);
            } else {
                // Fallback to empty array
                setPayslips([]);
            }

        } catch (error) {
            console.error('Error loading payslips:', error);
            setError('Failed to load payslips');
            showError('Failed to load payslips. Please try again.');
            setPayslips([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Load payslip statistics for the IntroCard
     */
    const loadPayslipStats = async () => {
        try {
            const stats = await payslipService.getPayslipStatistics();
            setPayslipStats(stats.data);
        } catch (error) {
            console.error('Error loading payslip stats:', error);
            // Don't show error for stats, just use defaults
            setPayslipStats({ total: 0, pending: 0, approved: 0, sent: 0 });
        }
    };

    /**
     * Handle viewing a payslip in detail
     */
    const handleViewPayslip = (payslip) => {
        navigate(`/payroll/payslips/${payslip.id}`);
    };

    /**
     * Handle editing a payslip (only for DRAFT status)
     */
    const handleEditPayslip = (payslip) => {
        if (payslip.status !== 'DRAFT') {
            showError('Only draft payslips can be edited');
            return;
        }
        navigate(`/payroll/payslips/${payslip.id}/edit`);
    };

    /**
     * Handle finalizing a payslip
     */
    const handleFinalizePayslip = async (payslip) => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Finalize Payslip',
            message: `Are you sure you want to finalize the payslip for ${payslip.employeeName}? This action will update loan balances and cannot be undone.`,
            onConfirm: async () => {
                try {
                    await payslipService.finalizePayslip(payslip.id, 'SYSTEM');
                    showSuccess('Payslip finalized successfully');
                    loadPayslips();
                    loadPayslipStats();
                } catch (error) {
                    console.error('Error finalizing payslip:', error);
                    showError('Failed to finalize payslip: ' + (error.response?.data?.message || error.message));
                }
                setConfirmDialog(prev => ({ ...prev, isVisible: false }));
            }
        });
    };

    /**
     * Handle sending a payslip via email
     */
    const handleSendPayslip = async (payslip) => {
        if (payslip.status !== 'APPROVED') {
            showError('Only approved payslips can be sent');
            return;
        }

        try {
            await payslipService.sendPayslip(payslip.id);
            showSuccess('Payslip sent successfully');
            loadPayslips();
            loadPayslipStats();
        } catch (error) {
            console.error('Error sending payslip:', error);
            showError('Failed to send payslip: ' + (error.response?.data?.message || error.message));
        }
    };

    /**
     * Handle downloading a payslip PDF
     */
    const handleDownloadPayslip = async (payslip) => {
        if (!['APPROVED', 'SENT', 'ACKNOWLEDGED'].includes(payslip.status)) {
            showError('Only approved payslips can be downloaded');
            return;
        }

        try {
            const response = await payslipService.downloadPayslip(payslip.id);

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payslip-${payslip.employeeName}-${payslip.payPeriodStart}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSuccess('Payslip downloaded successfully');
        } catch (error) {
            console.error('Error downloading payslip:', error);
            showError('Failed to download payslip: ' + (error.response?.data?.message || error.message));
        }
    };

    /**
     * Handle generating PDF for payslip
     */
    const handleGeneratePdf = async (payslip) => {
        if (payslip.status === 'DRAFT') {
            showError('Cannot generate PDF for draft payslips');
            return;
        }

        try {
            await payslipService.generatePayslipPdf(payslip.id);
            showSuccess('PDF generated successfully');
            loadPayslips();
        } catch (error) {
            console.error('Error generating PDF:', error);
            showError('Failed to generate PDF: ' + (error.response?.data?.message || error.message));
        }
    };

    /**
     * Handle bulk actions
     */
    const handleBulkActions = () => {
        if (selectedPayslips.length === 0) {
            showError('Please select at least one payslip');
            return;
        }
        setShowBulkModal(true);
    };

    /**
     * Handle creating new payslip
     */
    const handleCreatePayslip = () => {
        setShowCreateModal(true);
    };

    /**
     * Utility functions for formatting
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    /**
     * Status badge mapping to match backend enum values
     */
    const getStatusBadge = (status) => {
        const statusConfig = {
            DRAFT: { className: 'status-badge draft', label: 'Draft' },
            APPROVED: { className: 'status-badge status-approved', label: 'Approved' },
            SENT: { className: 'status-badge status-sent', label: 'Sent' },
            ACKNOWLEDGED: { className: 'status-badge status-acknowledged', label: 'Acknowledged' }
        };

        const config = statusConfig[status] || { className: 'status-badge', label: status };

        return (
            <span className={config.className}>
                {config.label}
            </span>
        );
    };

    /**
     * Define action buttons for DataTable with correct status checks
     */
    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            className: 'view',
            onClick: handleViewPayslip
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            className: 'edit',
            onClick: handleEditPayslip,
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
        },
        {
            label: 'Generate PDF',
            icon: <FaFilePdf />,
            className: 'secondary',
            onClick: handleGeneratePdf,
            isDisabled: (payslip) => payslip.status === 'DRAFT'
        },
        {
            label: 'Finalize',
            icon: <FaCheck />,
            className: 'approve',
            onClick: handleFinalizePayslip,
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
        },
        {
            label: 'Send Email',
            icon: <FaEnvelope />,
            className: 'primary',
            onClick: handleSendPayslip,
            isDisabled: (payslip) => payslip.status !== 'APPROVED'
        },
        {
            label: 'Download PDF',
            icon: <FaDownload />,
            className: 'primary',
            onClick: handleDownloadPayslip,
            isDisabled: (payslip) => !['APPROVED', 'SENT', 'ACKNOWLEDGED'].includes(payslip.status)
        }
    ];

    /**
     * Define columns for DataTable - Properly configured for the DataTable component
     */
    const columns = [
        {
            key: 'select',
            header: '',
            accessor: 'select',
            width: '50px',
            sortable: false,
            filterable: false,
            excludeFromSearch: true,
            render: (payslip) => (
                <input
                    type="checkbox"
                    checked={selectedPayslips.includes(payslip.id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedPayslips(prev => [...prev, payslip.id]);
                        } else {
                            setSelectedPayslips(prev => prev.filter(id => id !== payslip.id));
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            )
        },
        {
            key: 'employeeName',
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (payslip) => (
                <div className="employee-info">
                    <div className="employee-name">{payslip.employeeName || 'N/A'}</div>
                    <div className="employee-department">{payslip.departmentName || 'No department'}</div>
                </div>
            ),
            exportFormatter: (value, payslip) => payslip.employeeName || 'N/A'
        },
        {
            key: 'payPeriod',
            header: 'Pay Period',
            accessor: 'payPeriodStart',
            sortable: true,
            render: (payslip) => (
                <div className="pay-period">
                    <div>{formatDate(payslip.payPeriodStart)}</div>
                    <div>to {formatDate(payslip.payPeriodEnd)}</div>
                </div>
            ),
            exportFormatter: (value, payslip) => `${formatDate(payslip.payPeriodStart)} to ${formatDate(payslip.payPeriodEnd)}`
        },
        {
            key: 'grossSalary',
            header: 'Gross Pay',
            accessor: 'grossSalary',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (payslip) => (
                <span className="gross-pay-amount">
                    {formatCurrency(payslip.grossSalary)}
                </span>
            ),
            exportFormatter: (value) => value || 0
        },
        {
            key: 'totalDeductions',
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (payslip) => (
                <span className="deduction-amount">
                    {formatCurrency(payslip.totalDeductions)}
                </span>
            ),
            exportFormatter: (value) => value || 0
        },
        {
            key: 'netPay',
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            filterable: true,
            filterType: 'number',
            render: (payslip) => (
                <span className="net-pay-amount">
                    {formatCurrency(payslip.netPay)}
                </span>
            ),
            exportFormatter: (value) => value || 0
        },
        {
            key: 'status',
            header: 'Status',
            accessor: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (payslip) => getStatusBadge(payslip.status),
            exportFormatter: (value) => value || 'UNKNOWN'
        },
        {
            key: 'payDate',
            header: 'Pay Date',
            accessor: 'payDate',
            sortable: true,
            render: (payslip) => formatDate(payslip.payDate),
            exportFormatter: (value) => formatDate(value)
        }
    ];

    // Define filterable columns for DataTable
    const filterableColumns = columns.filter(col => col.filterable);

    // Define stats for IntroCard
    const introStats = [
        {
            value: payslipStats.total,
            label: 'Total Payslips',
            icon: <FaFileInvoice />
        },
        {
            value: payslipStats.pending,
            label: 'Pending',
            icon: <FaCalendarAlt />
        },
        {
            value: payslipStats.approved,
            label: 'Approved',
            icon: <FaCheck />
        },
        {
            value: payslipStats.sent + payslipStats.acknowledged,
            label: 'Sent',
            icon: <FaEnvelope />
        }
    ];

    // Show error state
    if (error) {
        return (
            <div className="payslip-management">
                <div className="error-state">
                    <FaExclamationTriangle />
                    <h3>Error Loading Payslips</h3>
                    <p>{error}</p>
                    <button onClick={loadPayslips} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="payslip-management">
            {/* IntroCard with proper configuration */}
            <IntroCard
                title="Payslip Management"
                label="PAYROLL CENTER"
                icon={<FaFileInvoice />}
                stats={introStats}
                className="mb-4"
            />

            {/* Data Table configured to handle pagination, sorting, and filtering internally */}
            <DataTable
                // Data configuration - DataTable handles pagination internally
                data={payslips}
                columns={columns}
                loading={loading}
                emptyMessage="No payslips found. Create your first payslip to get started."
                className="payslip-table"

                // Actions configuration
                actions={actions}
                actionsColumnWidth="200px"
                onRowClick={handleViewPayslip}

                // Search and filters
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}

                // Add button
                showAddButton={true}
                addButtonText="Create Payslips"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreatePayslip}

                // Table configuration
                tableTitle="Employee Payslips"
                defaultItemsPerPage={20}
                itemsPerPageOptions={[10, 20, 50, 100]}
                defaultSortField="payDate"
                defaultSortDirection="desc"

                // Export functionality - Uses DataTable's built-in Excel export
                showExportButton={true}
                exportFileName="payslips"
                exportButtonText="Export Excel"
                exportButtonIcon={<FaFileExcel />}
                exportAllData={false} // Export only filtered/sorted data from DataTable
                excludeColumnsFromExport={['select']} // Don't export checkbox column
                customExportHeaders={{
                    'employeeName': 'Employee Name',
                    'payPeriodStart': 'Pay Period Start',
                    'payPeriodEnd': 'Pay Period End',
                    'grossSalary': 'Gross Salary',
                    'totalDeductions': 'Total Deductions',
                    'netPay': 'Net Pay',
                    'status': 'Status',
                    'payDate': 'Pay Date'
                }}
                onExportStart={() => showSuccess('Starting export...')}
                onExportComplete={(result) => showSuccess(`Exported ${result.rowCount} payslips successfully`)}
                onExportError={(error) => showError('Failed to export payslips: ' + error.message)}

                // Empty value handling
                emptyValueText="N/A"
                emptyValuesByColumn={{
                    'employeeName': 'No Name',
                    'departmentName': 'No Department',
                    'grossSalary': '$0.00',
                    'totalDeductions': '$0.00',
                    'netPay': '$0.00'
                }}
            />

            {/* Floating Bulk Actions Button */}
            {selectedPayslips.length > 0 && (
                <div className="bulk-actions-floating">
                    <button
                        className="btn btn-secondary bulk-action-btn"
                        onClick={handleBulkActions}
                    >
                        <FaUsers /> Bulk Actions ({selectedPayslips.length})
                    </button>
                </div>
            )}

            {/* Modals */}
            {showCreateModal && (
                <PayslipCreateModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadPayslips();
                        loadPayslipStats();
                    }}
                />
            )}

            {showBulkModal && (
                <PayslipBulkActionsModal
                    payslipIds={selectedPayslips}
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={() => {
                        setShowBulkModal(false);
                        setSelectedPayslips([]);
                        loadPayslips();
                        loadPayslipStats();
                    }}
                />
            )}

            {/* Confirmation Dialog */}
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

export default PayslipManagement;