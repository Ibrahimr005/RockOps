import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaDownload, FaEnvelope, FaFilePdf, FaEye, FaTrash, FaMoneyBillWave, FaFileInvoiceDollar } from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService.js';
import { payrollService } from '../../../services/payroll/payrollService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import IntroCard from '../../../components/common/IntroCard/IntroCard.jsx';
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

    // State for bulk actions and selection
    const [selectedPayslips, setSelectedPayslips] = useState([]);

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

    // Calculate payslip statistics for IntroCard
    const calculateStats = () => {
        const totalPayslips = payslips.length;
        const draftCount = payslips.filter(p => p.status === 'DRAFT').length;
        const sentCount = payslips.filter(p => p.status === 'SENT').length;
        const totalAmount = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

        return [
            { value: totalPayslips.toString(), label: 'Total Payslips' },
            { value: draftCount.toString(), label: 'Draft' },
            { value: sentCount.toString(), label: 'Sent' },
            { value: formatCurrency(totalAmount), label: 'Total Amount' }
        ];
    };

    // Define table columns with selection column
    const columns = [
        {
            id: 'select',
            header: '',
            accessor: 'select',
            width: 50,
            sortable: false,
            filterable: false,
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
            id: 'employee',
            accessor: 'employeeName',
            header: 'Employee',
            sortable: true,
            filterable: true,
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
            id: 'payPeriod',
            accessor: 'payPeriodStart',
            header: 'Pay Period',
            sortable: true,
            filterable: false,
            render: (payslip) => (
                <div className="pay-period">
                    <div>{new Date(payslip.payPeriodStart).toLocaleDateString()}</div>
                    <div>to {new Date(payslip.payPeriodEnd).toLocaleDateString()}</div>
                </div>
            )
        },
        {
            id: 'payDate',
            accessor: 'payDate',
            header: 'Pay Date',
            sortable: true,
            filterable: false,
            render: (payslip) => new Date(payslip.payDate).toLocaleDateString()
        },
        {
            id: 'grossSalary',
            accessor: 'grossSalary',
            header: 'Gross Salary',
            sortable: true,
            filterable: false,
            render: (payslip) => formatCurrency(payslip.grossSalary)
        },
        {
            id: 'totalDeductions',
            accessor: 'totalDeductions',
            header: 'Deductions',
            sortable: true,
            filterable: false,
            render: (payslip) => formatCurrency(payslip.totalDeductions)
        },
        {
            id: 'netPay',
            accessor: 'netPay',
            header: 'Net Pay',
            sortable: true,
            filterable: false,
            render: (payslip) => (
                <span className="net-pay-amount">
                    {formatCurrency(payslip.netPay)}
                </span>
            )
        },
        {
            id: 'status',
            accessor: 'status',
            header: 'Status',
            sortable: true,
            filterable: true,
            render: (payslip) => getStatusBadge(payslip.status)
        }
    ];

    // Define table actions
    const actions = [
        {
            id: 'view',
            label: 'View Details',
            icon: <FaEye />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'view'),
            className: 'action-view'
        },
        {
            id: 'generatePdf',
            label: 'Generate PDF',
            icon: <FaFilePdf />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'generatePdf'),
            className: 'action-generate',
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
        },
        {
            id: 'sendEmail',
            label: 'Send Email',
            icon: <FaEnvelope />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'sendEmail'),
            className: 'action-send',
            isDisabled: (payslip) => payslip.status !== 'GENERATED'
        },
        {
            id: 'download',
            label: 'Download PDF',
            icon: <FaDownload />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'download'),
            className: 'action-download',
            isDisabled: (payslip) => payslip.status !== 'SENT' && payslip.status !== 'ACKNOWLEDGED'
        },
        {
            id: 'delete',
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (payslip) => handlePayslipAction(payslip.id, 'delete'),
            className: 'action-delete',
            isDisabled: (payslip) => payslip.status !== 'DRAFT'
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
            {/* IntroCard with payslip statistics */}
            <IntroCard
                title="Payroll Management"
                label="PAYROLL CENTER"
                icon={<FaFileInvoiceDollar />}
                stats={calculateStats()}
                className="payslip-intro-card"
            />

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

            <DataTable
                // Data props
                data={payslips}
                columns={columns}
                loading={loading}

                // Table configuration
                tableTitle="Employee Payslips"
                emptyStateMessage="No payslips found"
                noResultsMessage="No payslips match your search criteria"
                defaultSortField="payDate"
                defaultSortDirection="desc"
                defaultItemsPerPage={20}
                itemsPerPageOptions={[10, 20, 50, 100]}

                // Search and filters
                showSearch={true}
                showFilters={true}

                // Actions
                actions={actions}

                // Add button configuration
                showAddButton={true}
                addButtonText="Generate Monthly Payroll"
                addButtonIcon={<FaPlus />}
                onAddClick={handleGenerateMonthlyPayroll}
                addButtonDisabled={loading}

                // Export functionality - Enhanced
                showExportButton={true}
                exportButtonText="Export to Excel"
                exportButtonIcon={<FaDownload />}
                exportFileName={`Payslips_${new Date().toISOString().split('T')[0]}`}
                exportAllData={true} // Export all data, not just current page
                excludeColumnsFromExport={['select']} // Don't export the checkbox column
                customExportHeaders={{
                    employeeName: 'Employee Name',
                    payPeriodStart: 'Pay Period Start',
                    payPeriodEnd: 'Pay Period End',
                    payDate: 'Pay Date',
                    grossSalary: 'Gross Salary (USD)',
                    totalDeductions: 'Total Deductions (USD)',
                    netPay: 'Net Pay (USD)',
                    status: 'Payment Status'
                }}
                onExportStart={() => {
                    console.log('Export started');
                    showSuccess('Starting payslips export...');
                }}
                onExportComplete={(data) => {
                    console.log('Export completed:', data);
                    showSuccess(`Successfully exported ${data.rowCount} payslips to Excel`);
                }}
                onExportError={(error) => {
                    console.error('Export failed:', error);
                    showError('Failed to export payslips. Please try again.');
                }}

                // Selection handling
                showSelection={true}
                selectedRows={selectedPayslips}
                onSelectionChange={handleSelectionChange}

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