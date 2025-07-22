import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaDownload, FaEnvelope, FaFilePdf, FaEye, FaTrash } from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService.js';
import { payrollService } from '../../../services/payroll/payrollService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './PayslipList.scss';

const PayslipList = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State for payslips data
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null,
        isLoading: false
    });

    // State for filters (integrated with DataTable)
    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        loadPayslips();
    }, []);

    const loadPayslips = async () => {
        try {
            setLoading(true);
            setError(null);

            let response;
            if (filters.startDate && filters.endDate) {
                response = await payslipService.getPayslipsByPeriod(
                    filters.startDate,
                    filters.endDate,
                    0, // page
                    100 // size - get more records for better table experience
                );
            } else if (filters.status) {
                response = await payslipService.getPayslipsByStatus(
                    filters.status,
                    0, // page
                    100 // size
                );
            } else {
                response = await payslipService.getPayslips(0, 100);
            }

            setPayslips(response.data.content || []);
        } catch (error) {
            console.error('Error loading payslips:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load payslips';
            setError(errorMessage);
            showError('Failed to load payslips. Please try again.');
            setPayslips([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateMonthlyPayroll = () => {
        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Generate Monthly Payroll',
            message: 'Are you sure you want to generate monthly payroll for all employees? This action cannot be undone.',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));

                try {
                    const currentDate = new Date();
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth() + 1;

                    await payrollService.generateMonthlyPayslips(year, month);
                    showSuccess('Monthly payroll generated successfully!');
                    loadPayslips(); // Refresh the list
                } catch (error) {
                    console.error('Error generating payroll:', error);
                    showError('Failed to generate monthly payroll. Please try again.');
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
                }
            }
        });
    };

    const handlePayslipAction = async (payslipId, action) => {
        switch (action) {
            case 'generatePdf':
                setConfirmDialog({
                    isVisible: true,
                    type: 'info',
                    title: 'Generate PDF',
                    message: 'Generate PDF for this payslip?',
                    onConfirm: async () => {
                        try {
                            await payslipService.generatePayslipPdf(payslipId);
                            showSuccess('PDF generated successfully');
                            loadPayslips();
                        } catch (error) {
                            console.error('Error generating PDF:', error);
                            showError('Failed to generate PDF');
                        } finally {
                            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                        }
                    }
                });
                break;

            case 'sendEmail':
                setConfirmDialog({
                    isVisible: true,
                    type: 'send',
                    title: 'Send Email',
                    message: 'Send this payslip via email to the employee?',
                    onConfirm: async () => {
                        try {
                            await payslipService.sendPayslipEmail(payslipId);
                            showSuccess('Email sent successfully');
                            loadPayslips();
                        } catch (error) {
                            console.error('Error sending email:', error);
                            showError('Failed to send email');
                        } finally {
                            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                        }
                    }
                });
                break;

            case 'download':
                try {
                    const blob = await payslipService.downloadPayslipPdf(payslipId);
                    const url = window.URL.createObjectURL(blob.data);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `payslip-${payslipId}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                } catch (error) {
                    console.error('Error downloading PDF:', error);
                    showError('Failed to download PDF');
                }
                break;

            case 'view':
                navigate(`/payroll/payslips/${payslipId}`);
                break;

            case 'delete':
                setConfirmDialog({
                    isVisible: true,
                    type: 'danger',
                    title: 'Delete Payslip',
                    message: 'Are you sure you want to delete this payslip? This action cannot be undone.',
                    confirmText: 'Delete',
                    onConfirm: async () => {
                        try {
                            await payslipService.cancelPayslip(payslipId);
                            showSuccess('Payslip deleted successfully');
                            loadPayslips();
                        } catch (error) {
                            console.error('Error deleting payslip:', error);
                            showError('Failed to delete payslip');
                        } finally {
                            setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                        }
                    }
                });
                break;

            default:
                break;
        }
    };

    // State for bulk actions and selection
    const [selectedPayslips, setSelectedPayslips] = useState([]);

    // Handle bulk actions
    const handleBulkAction = (action) => {
        if (selectedPayslips.length === 0) {
            showError('Please select payslips first');
            return;
        }

        const actionText = action === 'generatePdf' ? 'generate PDFs for' : 'send emails for';

        setConfirmDialog({
            isVisible: true,
            type: action === 'generatePdf' ? 'info' : 'send',
            title: `Bulk ${action === 'generatePdf' ? 'Generate PDFs' : 'Send Emails'}`,
            message: `Are you sure you want to ${actionText} ${selectedPayslips.length} selected payslip(s)?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isLoading: true }));

                try {
                    const selectedIds = selectedPayslips.map(p => p.id);

                    if (action === 'generatePdf') {
                        await payslipService.bulkGeneratePdfs(selectedIds);
                        showSuccess('PDFs generated successfully');
                    } else {
                        await payslipService.bulkSendEmails(selectedIds);
                        showSuccess('Emails sent successfully');
                    }

                    setSelectedPayslips([]);
                    loadPayslips();
                } catch (error) {
                    console.error(`Error performing bulk ${action}:`, error);
                    showError(`Failed to perform bulk ${action}`);
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
                }
            }
        });
    };

    // Handle selection change
    const handleSelectionChange = (selectedRows) => {
        setSelectedPayslips(selectedRows);
    };

    // Define table columns with selection column
    const columns = [
        {
            key: 'select',
            header: '',
            width: 50,
            render: (payslip) => (
                <input
                    type="checkbox"
                    checked={selectedPayslips.some(p => p.id === payslip.id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedPayslips(prev => [...prev, payslip]);
                        } else {
                            setSelectedPayslips(prev => prev.filter(p => p.id !== payslip.id));
                        }
                    }}
                />
            )
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            render: (payslip) => (
                <div className="employee-info">
                    <div className="employee-name">{payslip.employeeName}</div>
                    <div className="employee-email">{payslip.employeeEmail}</div>
                    {payslip.departmentName && (
                        <div className="employee-department">{payslip.departmentName}</div>
                    )}
                </div>
            )
        },
        {
            accessor: 'payPeriodStart',
            header: 'Pay Period',
            sortable: true,
            render: (payslip) => (
                <div className="pay-period">
                    <div>{new Date(payslip.payPeriodStart).toLocaleDateString()}</div>
                    <div>to {new Date(payslip.payPeriodEnd).toLocaleDateString()}</div>
                </div>
            )
        },
        {
            accessor: 'payDate',
            header: 'Pay Date',
            sortable: true,
            render: (payslip) => new Date(payslip.payDate).toLocaleDateString()
        },
        {
            accessor: 'grossSalary',
            header: 'Gross Salary',
            sortable: true,
            render: (payslip) => formatCurrency(payslip.grossSalary)
        },
        {
            accessor: 'totalDeductions',
            header: 'Deductions',
            sortable: true,
            render: (payslip) => formatCurrency(payslip.totalDeductions)
        },
        {
            accessor: 'netPay',
            header: 'Net Pay',
            sortable: true,
            render: (payslip) => (
                <span className="net-pay-amount">
                    {formatCurrency(payslip.netPay)}
                </span>
            )
        },
        {
            accessor: 'status',
            header: 'Status',
            sortable: true,
            render: (payslip) => getStatusBadge(payslip.status)
        }
    ];

    // Define table actions - DataTable expects a single actions array, not per-row
    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'view'),
            className: 'action-view'
        },
        {
            label: 'Generate PDF',
            icon: <FaFilePdf />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'generatePdf'),
            className: 'action-generate',
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
        },
        {
            label: 'Send Email',
            icon: <FaEnvelope />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'sendEmail'),
            className: 'action-send',
            isDisabled: (payslip) => payslip.status !== 'GENERATED'
        },
        {
            label: 'Download PDF',
            icon: <FaDownload />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'download'),
            className: 'action-download',
            isDisabled: (payslip) => payslip.status !== 'SENT' && payslip.status !== 'ACKNOWLEDGED'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'delete'),
            className: 'action-delete',
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
        }
    ];

    // Define filterable columns
    const filterableColumns = [
        {
            accessor: 'status',
            header: 'Status',
            filterType: 'select'
        },
        {
            accessor: 'employeeName',
            header: 'Employee',
            filterType: 'text'
        },
        {
            accessor: 'departmentName',
            header: 'Department',
            filterType: 'select'
        }
    ];

    // Custom filters for date range
    const customFilters = [
        {
            label: 'Start Date',
            component: (
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
            )
        },
        {
            label: 'End Date',
            component: (
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
            )
        }
    ];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            DRAFT: { class: 'pending', text: 'Draft' },
            GENERATED: { class: 'status-generated', text: 'Generated' },
            SENT: { class: 'status-sent', text: 'Sent' },
            ACKNOWLEDGED: { class: 'status-acknowledged', text: 'Acknowledged' },
            PROCESSING: { class: 'status-processing', text: 'Processing' },
            PENDING: { class: 'status-pending', text: 'Pending' },
            READY: { class: 'status-ready', text: 'Ready' },
            ERROR: { class: 'status-error', text: 'Error' },
            DELETED: { class: 'status-deleted', text: 'Deleted' },
            REGENERATING: { class: 'status-regenerating', text: 'Regenerating' }
        };

        const config = statusConfig[status] || { class: 'draft', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
            {config.text}
        </span>
        );
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false, isLoading: false }));
    };

    if (error) {
        return (
            <div className="payslip-list">
                <div className="error-state">
                    <div className="error-content">
                        <h3>Error Loading Payslips</h3>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={loadPayslips}>
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payslip-list">
            {/* Header with bulk actions */}
            <div className="payslip-list__header">
                <div className="header-content">
                    <h1 className="page-title">Payslips</h1>
                    <div className="header-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateMonthlyPayroll}
                        >
                            <FaPlus /> Generate Monthly Payroll
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedPayslips.length > 0 && (
                <div className="payslip-list__bulk-actions">
                    <div className="bulk-actions-card">
                        <span className="selection-count">
                            {selectedPayslips.length} payslip(s) selected
                        </span>
                        <div className="bulk-action-buttons">
                            <button
                                className="btn btn-sm btn-info"
                                onClick={() => handleBulkAction('generatePdf')}
                            >
                                <FaFilePdf /> Generate PDFs
                            </button>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleBulkAction('sendEmail')}
                            >
                                <FaEnvelope /> Send Emails
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Summary */}
            <div className="payslip-list__summary">
                <p>Showing {payslips.length} payslips</p>
            </div>

            <DataTable
                // Data props
                data={payslips}
                columns={columns}
                loading={loading}

                // Table configuration
                tableTitle="" // We have our own header above
                emptyMessage="No payslips found"
                defaultSortField="payDate"
                defaultSortDirection="desc"
                defaultItemsPerPage={20}
                itemsPerPageOptions={[10, 20, 50, 100]}

                // Search and filters
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                customFilters={customFilters}

                // Actions
                actions={actions}

                // Add button - disabled since we have our own header
                showAddButton={false}

                // Export functionality
                showExportButton={true}
                exportButtonText="Export Payslips"
                exportFileName="payslips"
                onExportStart={() => console.log('Export started')}
                onExportComplete={(data) => showSuccess(`Exported ${data.rowCount} payslips`)}
                onExportError={(error) => showError('Export failed')}

                // Selection handling
                selectAll={{
                    checked: selectedPayslips.length === payslips.length && payslips.length > 0,
                    indeterminate: selectedPayslips.length > 0 && selectedPayslips.length < payslips.length,
                    onChange: (checked) => {
                        if (checked) {
                            setSelectedPayslips(payslips);
                        } else {
                            setSelectedPayslips([]);
                        }
                    }
                }}

                // Row selection
                onSelectionChange={handleSelectionChange}
                selectedRows={selectedPayslips}

                // Styling
                className="payslip-data-table"
            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText || 'Confirm'}
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleCloseConfirmDialog}
                isLoading={confirmDialog.isLoading}
            />
        </div>
    );
};

export default PayslipList;