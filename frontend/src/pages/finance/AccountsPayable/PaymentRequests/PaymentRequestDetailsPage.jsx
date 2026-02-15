import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiFileText,
    FiCheckCircle,
    FiXCircle,
    FiUser,
    FiDollarSign,
    FiCalendar,
    FiPhone,
    FiMail,
    FiClock,
    FiPackage,
    FiUsers,
    FiCreditCard,
    FiBriefcase
} from 'react-icons/fi';
import { FaBuilding, FaMoneyBillWave, FaUsersCog } from 'react-icons/fa';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ContentLoader from '../../../../components/common/ContentLoader/ContentLoader';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import './PaymentRequestDetailsPage.scss';

const PaymentRequestDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [request, setRequest] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form state for approve/reject
    const [formData, setFormData] = useState({
        paymentRequestId: id,
        notes: '',
        rejectionReason: ''
    });
    const [errors, setErrors] = useState({});

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'info',
        title: '',
        message: '',
        action: null
    });

    useEffect(() => {
        fetchPaymentRequest();
    }, [id]);

    useEffect(() => {
        if (request?.id) {
            fetchPayments();
        }
    }, [request?.id]);

    const fetchPaymentRequest = async () => {
        try {
            setLoading(true);
            const response = await financeService.accountsPayable.paymentRequests.getById(id);
            setRequest(response.data || response);
            setFormData(prev => ({ ...prev, paymentRequestId: id }));
        } catch (err) {
            console.error('Error fetching payment request:', err);
            showError('Failed to load payment request details');
            navigate('/finance/accounts-payable');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const response = await financeService.accountsPayable.payments.getByPaymentRequest(request.id);
            setPayments(response.data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
        }
    };

    // Format helpers
    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'PENDING': 'status-pending',
            'APPROVED': 'status-approved',
            'REJECTED': 'status-rejected',
            'PARTIALLY_PAID': 'status-partial',
            'PAID': 'status-paid'
        };
        return statusMap[status] || 'status-default';
    };

    // Form handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = (action) => {
        const newErrors = {};

        if (action === 'REJECT' && !formData.rejectionReason.trim()) {
            newErrors.rejectionReason = 'Rejection reason is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Action handlers
    const handleApproveClick = () => {
        if (!validateForm('APPROVE')) return;

        setConfirmDialog({
            isVisible: true,
            type: 'success',
            title: 'Approve Payment Request',
            message: `Are you sure you want to approve this payment request for ${formatCurrency(request.requestedAmount)}?`,
            action: 'APPROVE'
        });
    };

    const handleRejectClick = () => {
        if (!validateForm('REJECT')) {
            showError('Please provide a rejection reason');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Reject Payment Request',
            message: `Are you sure you want to reject this payment request? This action cannot be undone.`,
            action: 'REJECT'
        });
    };

    const handleConfirmAction = async () => {
        setActionLoading(true);
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));

        try {
            await financeService.accountsPayable.paymentRequests.approveReject({
                ...formData,
                action: confirmDialog.action
            });

            showSuccess(`Payment request ${confirmDialog.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
            fetchPaymentRequest(); // Refresh the data
        } catch (err) {
            console.error('Error processing request:', err);
            showError(err.response?.data?.message || `Failed to ${confirmDialog.action.toLowerCase()} request`);
        } finally {
            setActionLoading(false);
        }
    };

    // Items table columns
    const itemsColumns = [
        {
            header: 'Item Name',
            accessor: 'itemName',
            sortable: true
        },
        {
            header: 'Quantity',
            accessor: 'quantity',
            sortable: true,
            render: (row) => `${row.quantity} ${row.unit || ''}`
        },
        {
            header: 'Unit Price',
            accessor: 'unitPrice',
            sortable: true,
            render: (row) => formatCurrency(row.unitPrice)
        },
        {
            header: 'Total Price',
            accessor: 'totalPrice',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {formatCurrency(row.totalPrice)}
                </span>
            )
        },
        {
            header: 'Paid Amount',
            accessor: 'paidAmount',
            sortable: true,
            render: (row) => (
                <span style={{ color: 'var(--color-success)' }}>
                    {formatCurrency(row.paidAmount)}
                </span>
            )
        },
        {
            header: 'Remaining',
            accessor: 'remainingAmount',
            sortable: true,
            render: (row) => (
                <span style={{ color: 'var(--color-warning)' }}>
                    {formatCurrency(row.remainingAmount)}
                </span>
            )
        }
    ];

    // Payments table columns
    const paymentsColumns = [
        {
            header: 'Payment Number',
            accessor: 'paymentNumber',
            sortable: true
        },
        {
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {formatCurrency(row.amount)}
                </span>
            )
        },
        {
            header: 'Payment Date',
            accessor: 'paymentDate',
            sortable: true,
            render: (row) => formatDate(row.paymentDate)
        },
        {
            header: 'Method',
            accessor: 'paymentMethod',
            sortable: true,
            render: (row) => row.paymentMethod?.replace('_', ' ') || 'N/A'
        },
        {
            header: 'Processed By',
            accessor: 'processedByUserName',
            sortable: true
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
        }
    ];

    if (loading) {
        return <ContentLoader message="Loading payment request details..." />;
    }

    if (!request) {
        return (
            <div className="payment-request-details-page">
                <div className="error-state">
                    <FiFileText size={48} />
                    <h3>Payment Request Not Found</h3>
                    <p>The payment request you're looking for doesn't exist or has been deleted.</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/finance/accounts-payable')}
                    >
                        Back to Accounts Payable
                    </button>
                </div>
            </div>
        );
    }

    // Determine source type from polymorphic field or legacy fields
    const getSourceTypeInfo = () => {
        if (request.sourceType === 'PAYROLL_BATCH' || (!request.sourceType && request.payrollBatchId)) {
            return { type: 'Payroll', label: 'Payroll Batch', icon: <FaUsersCog /> };
        }
        if (request.sourceType === 'PURCHASE_ORDER' || (!request.sourceType && request.purchaseOrderNumber)) {
            return { type: 'Procurement', label: 'Purchase Order', icon: <FiPackage /> };
        }
        if (request.sourceType === 'MAINTENANCE' || (!request.sourceType && request.maintenanceStepId)) {
            return { type: 'Maintenance', label: 'Maintenance', icon: <FiBriefcase /> };
        }
        if (request.sourceType === 'LOAN' || (!request.sourceType && request.loanInstallmentId)) {
            return { type: 'Loan', label: 'Company Loan', icon: <FiCreditCard /> };
        }
        if (request.sourceType === 'BONUS') {
            return { type: 'Bonus', label: 'Employee Bonus', icon: <FiDollarSign /> };
        }
        return { type: 'Unknown', label: 'Unknown', icon: <FiFileText /> };
    };

    const sourceTypeInfo = getSourceTypeInfo();
    const isPayrollBatch = request.sourceType === 'PAYROLL_BATCH' || request.payrollBatchId;
    const isLoanPayment = request.sourceType === 'LOAN' || request.loanInstallmentId != null;

    // Batch employees table columns
    const batchEmployeesColumns = [
        {
            header: 'Emp #',
            accessor: 'employeeNumber',
            sortable: true,
            render: (row) => (
                <span className="employee-number">{row.employeeNumber || 'N/A'}</span>
            )
        },
        {
            header: 'Name',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => (
                <span className="employee-name">{row.employeeName || 'Unknown'}</span>
            )
        },
        {
            header: 'Job Title',
            accessor: 'jobTitle',
            sortable: true
        },
        {
            header: 'Department',
            accessor: 'department',
            sortable: true
        },
        {
            header: 'Basic Salary',
            accessor: 'basicSalary',
            sortable: true,
            render: (row) => formatCurrency(row.basicSalary)
        },
        {
            header: 'Allowances',
            accessor: 'totalAllowances',
            sortable: true,
            render: (row) => (
                <span style={{ color: 'var(--color-success)' }}>
                    +{formatCurrency(row.totalAllowances)}
                </span>
            )
        },
        {
            header: 'Deductions',
            accessor: 'totalDeductions',
            sortable: true,
            render: (row) => (
                <span style={{ color: 'var(--color-danger)' }}>
                    -{formatCurrency(row.totalDeductions)}
                </span>
            )
        },
        {
            header: 'Net Pay',
            accessor: 'netPay',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(row.netPay)}
                </span>
            )
        },
        {
            header: 'Payment Method',
            accessor: 'paymentTypeName',
            sortable: true,
            render: (row) => (
                <span className="payment-method-badge">
                    {row.paymentTypeName || 'N/A'}
                </span>
            )
        },
        {
            header: 'Bank Account',
            accessor: 'bankAccountNumber',
            sortable: false,
            render: (row) => (
                <span className="bank-info">
                    {row.bankName && row.bankAccountNumber ? (
                        <>{row.bankName} - {row.bankAccountNumber}</>
                    ) : row.walletNumber ? (
                        <>Wallet: {row.walletNumber}</>
                    ) : 'N/A'}
                </span>
            )
        }
    ];

    return (
        <div className="payment-request-details-page">
            {/* IntroCard with breadcrumbs */}
            <IntroCard
                label="FINANCE CENTER"
                title={`${request.requestNumber}`}
                icon={<FiFileText />}
                breadcrumbs={[
                    { label: 'Finance', onClick: () => navigate('/finance/accounts-payable') },
                    { label: 'Accounts Payable', onClick: () => navigate('/finance/accounts-payable') },
                    { label: 'Payment Requests', onClick: () => navigate('/finance/accounts-payable') },
                    { label: request.requestNumber }
                ]}
                stats={[
                    { value: formatCurrency(request.requestedAmount), label: 'Requested' },
                    { value: formatCurrency(request.totalPaidAmount || 0), label: 'Paid' },
                    { value: formatCurrency(request.remainingAmount || request.requestedAmount), label: 'Remaining' }
                ]}
                actionButtons={request.status === 'PENDING' ? [
                    // {
                    //     text: 'Approve',
                    //     icon: <FiCheckCircle />,
                    //     onClick: handleApproveClick,
                    //     className: 'success',
                    //     disabled: actionLoading
                    // },
                    // {
                    //     text: 'Reject',
                    //     icon: <FiXCircle />,
                    //     onClick: handleRejectClick,
                    //     className: 'danger',
                    //     disabled: actionLoading
                    // }
                ] : []}
            />

            <div className="details-content">
                {/* Request Information Section */}
                <div className="details-section">
                    <div className="section-header">
                        <FiFileText className="section-icon" />
                        <h3>Request Information</h3>
                        <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                            {request.status?.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="details-grid">
                        <div className="detail-item">
                            <label>Request Number</label>
                            <span>{request.requestNumber}</span>
                        </div>
                        <div className="detail-item">
                            <label>Source Type</label>
                            <span className={`source-badge source-${sourceTypeInfo.type.toLowerCase()}`}>
                                {sourceTypeInfo.icon} {sourceTypeInfo.label}
                            </span>
                        </div>
                        {request.purchaseOrderNumber && (
                            <div className="detail-item">
                                <label>PO Number</label>
                                <span
                                    className="link-text"
                                    onClick={() => navigate(`/procurement/purchase-orders/details/${request.purchaseOrderId}`)}
                                >
                                    {request.purchaseOrderNumber}
                                </span>
                            </div>
                        )}
                        {request.requestOrderTitle && (
                            <div className="detail-item">
                                <label>Request Order Title</label>
                                <span>{request.requestOrderTitle}</span>
                            </div>
                        )}
                        {request.maintenanceStepDescription && (
                            <div className="detail-item full-width">
                                <label>Maintenance Step</label>
                                <span>{request.maintenanceStepDescription}</span>
                            </div>
                        )}
                        <div className="detail-item">
                            <label>Requested By</label>
                            <span><FiUser className="inline-icon" /> {request.requestedByUserName || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <label>Department</label>
                            <span>{request.requestedByDepartment || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <label>Requested At</label>
                            <span><FiCalendar className="inline-icon" /> {formatDateTime(request.requestedAt)}</span>
                        </div>
                        <div className="detail-item">
                            <label>Description</label>
                            <span>{request.description || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Payroll Batch Information Section - Only shown for PAYROLL_BATCH source type */}
                {isPayrollBatch && (
                    <div className="details-section payroll-batch-section">
                        <div className="section-header">
                            <FaUsersCog className="section-icon" />
                            <h3>Payroll Batch Details</h3>
                            <span className="batch-badge">
                                {request.paymentTypeName || 'Unknown Payment Type'}
                            </span>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Batch Number</label>
                                <span className="batch-number">{request.batchNumber || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Payroll Number</label>
                                <span
                                    className="link-text"
                                    onClick={() => navigate(`/payroll/${request.payrollId}`)}
                                >
                                    {request.payrollNumber || 'N/A'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Payroll Period</label>
                                <span>{request.payrollPeriod || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Payment Method</label>
                                <span className="payment-type-display">
                                    <FiCreditCard className="inline-icon" />
                                    {request.paymentTypeName || 'N/A'}
                                    {request.paymentTypeCode && (
                                        <span className="payment-code">({request.paymentTypeCode})</span>
                                    )}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Employees in Batch</label>
                                <span className="employee-count">
                                    <FiUsers className="inline-icon" />
                                    {request.batchEmployeeCount || 0} employees
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Total Amount</label>
                                <span className="batch-total">
                                    {formatCurrency(request.requestedAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Merchant / Financial Institution Information Section - Not shown for payroll batches */}
                {!isPayrollBatch && (
                    <div className="details-section">
                        <div className="section-header">
                            <FaBuilding className="section-icon" />
                            <h3>{isLoanPayment ? 'Financial Institution' : 'Merchant Information'}</h3>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>{isLoanPayment ? 'Institution Name' : 'Merchant Name'}</label>
                                <span>
                                    {isLoanPayment ? (
                                        request.financialInstitutionId ? (
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/finance/loans/institutions/${request.financialInstitutionId}`)}
                                            >
                                                {request.institutionName || 'N/A'}
                                            </span>
                                        ) : (
                                            request.institutionName || 'N/A'
                                        )
                                    ) : (
                                        request.merchantId ? (
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/merchants/${request.merchantId}`)}
                                            >
                                                {request.merchantName || 'N/A'}
                                            </span>
                                        ) : (
                                            request.merchantName || 'N/A'
                                        )
                                    )}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Person</label>
                                <span>{isLoanPayment
                                    ? (request.institutionContactPerson || 'N/A')
                                    : (request.merchantContactPerson || 'N/A')
                                }</span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Phone</label>
                                <span>
                                    {(isLoanPayment ? request.institutionContactPhone : request.merchantContactPhone) ? (
                                        <><FiPhone className="inline-icon" /> {isLoanPayment ? request.institutionContactPhone : request.merchantContactPhone}</>
                                    ) : 'N/A'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Contact Email</label>
                                <span>
                                    {(isLoanPayment ? request.institutionContactEmail : request.merchantContactEmail) ? (
                                        <><FiMail className="inline-icon" /> {isLoanPayment ? request.institutionContactEmail : request.merchantContactEmail}</>
                                    ) : 'N/A'}
                                </span>
                            </div>
                            {(isLoanPayment ? request.institutionBankName : request.merchantBankName) && (
                                <div className="detail-item">
                                    <label>Bank Name</label>
                                    <span>{isLoanPayment ? request.institutionBankName : request.merchantBankName}</span>
                                </div>
                            )}
                            {(isLoanPayment ? request.institutionAccountNumber : request.merchantAccountNumber) && (
                                <div className="detail-item">
                                    <label>Account Number</label>
                                    <span>{isLoanPayment ? request.institutionAccountNumber : request.merchantAccountNumber}</span>
                                </div>
                            )}
                            {/* Loan-specific info */}
                            {isLoanPayment && (
                                <>
                                    {request.companyLoanNumber && (
                                        <div className="detail-item">
                                            <label>Loan Number</label>
                                            <span
                                                className="link-text"
                                                onClick={() => navigate(`/finance/loans/company-loans/${request.companyLoanId}`)}
                                            >
                                                {request.companyLoanNumber}
                                            </span>
                                        </div>
                                    )}
                                    {request.loanInstallmentNumber && (
                                        <div className="detail-item">
                                            <label>Installment Number</label>
                                            <span>#{request.loanInstallmentNumber}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Batch Employees Section - Only shown for payroll batches with employees */}
                {isPayrollBatch && request.batchEmployees && request.batchEmployees.length > 0 && (
                    <div className="details-section batch-employees-section">
                        <div className="section-header">
                            <FiUsers className="section-icon" />
                            <h3>Employees in Batch ({request.batchEmployees.length})</h3>
                        </div>
                        <DataTable
                            data={request.batchEmployees}
                            columns={batchEmployeesColumns}
                            showSearch={true}
                            showFilters={false}
                            emptyMessage="No employees in this batch"
                            defaultSortField="employeeName"
                            defaultSortDirection="asc"
                            searchPlaceholder="Search employees..."
                        />
                        <div className="batch-summary">
                            <div className="summary-item">
                                <span className="summary-label">Total Basic Salary:</span>
                                <span className="summary-value">
                                    {formatCurrency(
                                        request.batchEmployees.reduce((sum, emp) => sum + (emp.basicSalary || 0), 0)
                                    )}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Total Allowances:</span>
                                <span className="summary-value success">
                                    +{formatCurrency(
                                    request.batchEmployees.reduce((sum, emp) => sum + (emp.totalAllowances || 0), 0)
                                )}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Total Deductions:</span>
                                <span className="summary-value danger">
                                    -{formatCurrency(
                                    request.batchEmployees.reduce((sum, emp) => sum + (emp.totalDeductions || 0), 0)
                                )}
                                </span>
                            </div>
                            <div className="summary-item total">
                                <span className="summary-label">Total Net Pay:</span>
                                <span className="summary-value primary">
                                    {formatCurrency(
                                        request.batchEmployees.reduce((sum, emp) => sum + (emp.netPay || 0), 0)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Financial Information Section */}
                <div className="details-section">
                    <div className="section-header">
                        <FaMoneyBillWave className="section-icon" />
                        <h3>Financial Information</h3>
                    </div>
                    <div className="financial-cards">
                        <div className="financial-card primary">
                            <div className="financial-icon">
                                <FiDollarSign />
                            </div>
                            <div className="financial-info">
                                <span className="financial-label">Requested Amount</span>
                                <span className="financial-value">{formatCurrency(request.requestedAmount)}</span>
                            </div>
                        </div>
                        <div className="financial-card success">
                            <div className="financial-icon">
                                <FiCheckCircle />
                            </div>
                            <div className="financial-info">
                                <span className="financial-label">Total Paid</span>
                                <span className="financial-value">{formatCurrency(request.totalPaidAmount || 0)}</span>
                            </div>
                        </div>
                        <div className="financial-card warning">
                            <div className="financial-icon">
                                <FiClock />
                            </div>
                            <div className="financial-info">
                                <span className="financial-label">Remaining</span>
                                <span className="financial-value">{formatCurrency(request.remainingAmount || request.requestedAmount)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="details-grid">
                        <div className="detail-item">
                            <label>Currency</label>
                            <span>{request.currency || 'EGP'}</span>
                        </div>
                        <div className="detail-item">
                            <label>Budget Category</label>
                            <span>{request.budgetCategory || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <label>Payment Due Date</label>
                            <span><FiCalendar className="inline-icon" /> {formatDate(request.paymentDueDate)}</span>
                        </div>
                        {request.paymentScheduledDate && (
                            <div className="detail-item">
                                <label>Scheduled Payment Date</label>
                                <span><FiCalendar className="inline-icon" /> {formatDate(request.paymentScheduledDate)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Section */}
                {request.items && request.items.length > 0 && (
                    <div className="details-section">
                        <div className="section-header">
                            <FiPackage className="section-icon" />
                            <h3>Items ({request.items.length})</h3>
                        </div>
                        <DataTable
                            data={request.items}
                            columns={itemsColumns}
                            showSearch={false}
                            showFilters={false}
                            emptyMessage="No items found"
                            defaultSortField="itemName"
                            defaultSortDirection="asc"
                        />
                    </div>
                )}

                {/* Payment History Section */}
                {payments.length > 0 && (
                    <div className="details-section">
                        <div className="section-header">
                            <FaMoneyBillWave className="section-icon" />
                            <h3>Payment History ({payments.length})</h3>
                        </div>
                        <DataTable
                            data={payments}
                            columns={paymentsColumns}
                            showSearch={false}
                            showFilters={false}
                            emptyMessage="No payments recorded"
                            defaultSortField="paymentDate"
                            defaultSortDirection="desc"
                        />
                    </div>
                )}

                {/* Review Information Section */}
                {request.reviewedByUserName && (
                    <div className="details-section">
                        <div className="section-header">
                            <FiCheckCircle className="section-icon" />
                            <h3>Review Information</h3>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item">
                                <label>Reviewed By</label>
                                <span><FiUser className="inline-icon" /> {request.reviewedByUserName}</span>
                            </div>
                            <div className="detail-item">
                                <label>Reviewed At</label>
                                <span><FiCalendar className="inline-icon" /> {formatDateTime(request.reviewedAt)}</span>
                            </div>
                            {request.approvedByUserName && (
                                <>
                                    <div className="detail-item">
                                        <label>Approved By</label>
                                        <span><FiUser className="inline-icon" /> {request.approvedByUserName}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Approved At</label>
                                        <span><FiCalendar className="inline-icon" /> {formatDateTime(request.approvedAt)}</span>
                                    </div>
                                </>
                            )}
                            {request.rejectedByUserName && (
                                <>
                                    <div className="detail-item">
                                        <label>Rejected By</label>
                                        <span><FiUser className="inline-icon" /> {request.rejectedByUserName}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Rejected At</label>
                                        <span><FiCalendar className="inline-icon" /> {formatDateTime(request.rejectedAt)}</span>
                                    </div>
                                </>
                            )}
                            {request.approvalNotes && (
                                <div className="detail-item full-width">
                                    <label>Approval Notes</label>
                                    <span className="notes-text">{request.approvalNotes}</span>
                                </div>
                            )}
                            {request.rejectionReason && (
                                <div className="detail-item full-width">
                                    <label>Rejection Reason</label>
                                    <span className="rejection-text">{request.rejectionReason}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Review Action Section - Only for PENDING requests */}
                {request.status === 'PENDING' && (
                    <div className="details-section review-section">
                        <div className="section-header">
                            <FiCheckCircle className="section-icon" />
                            <h3>Review Action</h3>
                        </div>
                        <div className="review-form">
                            <div className="form-group">
                                <label className="form-label">Approval Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Enter any notes for this approval..."
                                    className="form-textarea"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Rejection Reason {' '}
                                    <span className="required-hint">(Required if rejecting)</span>
                                </label>
                                <textarea
                                    name="rejectionReason"
                                    value={formData.rejectionReason}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Provide a detailed reason if you plan to reject this request..."
                                    className={`form-textarea ${errors.rejectionReason ? 'error' : ''}`}
                                />
                                {errors.rejectionReason && (
                                    <span className="error-text">{errors.rejectionReason}</span>
                                )}
                            </div>
                            <div className="review-actions">
                                <button
                                    className="btn-danger"
                                    onClick={handleRejectClick}
                                    disabled={actionLoading}
                                >
                                    <FiXCircle />
                                    <span>{actionLoading ? 'Processing...' : 'Reject Request'}</span>
                                </button>
                                <button
                                    className="btn-success"
                                    onClick={handleApproveClick}
                                    disabled={actionLoading}
                                >
                                    <FiCheckCircle />
                                    <span>{actionLoading ? 'Processing...' : 'Approve Request'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
                confirmText={confirmDialog.action === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject'}
                cancelText="Cancel"
            />
        </div>
    );
};

export default PaymentRequestDetailsPage;