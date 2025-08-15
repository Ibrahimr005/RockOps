import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaCheck, FaTimes, FaCalendarAlt, FaMoneyBillWave, FaUser, FaFileAlt, FaDownload } from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './LoanDetails.scss';

const LoanDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError, showConfirmation } = useSnackbar();

    const [loan, setLoan] = useState(null);
    const [repaymentSchedule, setRepaymentSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            loadLoanDetails();
            loadRepaymentSchedule();
        }
    }, [id]);

    const loadLoanDetails = async () => {
        try {
            setLoading(true);
            const response = await loanService.getLoanById(id);
            setLoan(response.data);
        } catch (error) {
            console.error('Error loading loan details:', error);
            const errorMessage = error.response?.data?.message || 'Failed to load loan details';
            setError(errorMessage);
            showError('Failed to load loan details');
        } finally {
            setLoading(false);
        }
    };

    const loadRepaymentSchedule = async () => {
        try {
            const response = await loanService.getRepaymentSchedule(id);
            setRepaymentSchedule(response.data || []);
        } catch (error) {
            console.error('Error loading repayment schedule:', error);
            showError('Failed to load repayment schedule');
        }
    };

    const handleProcessRepayment = (scheduleId, amount) => {
        showConfirmation(
            `Are you sure you want to process repayment of ${formatCurrency(amount)}?`,
            async () => {
                try {
                    await loanService.processRepayment(scheduleId, amount);
                    showSuccess('Repayment processed successfully');
                    loadLoanDetails();
                    loadRepaymentSchedule();
                } catch (error) {
                    console.error('Error processing repayment:', error);
                    showError('Failed to process repayment');
                }
            }
        );
    };

    const handleApproveLoan = () => {
        showConfirmation(
            'Are you sure you want to approve this loan? This action cannot be undone.',
            async () => {
                try {
                    await loanService.approveLoan(id);
                    showSuccess('Loan approved successfully');
                    loadLoanDetails();
                } catch (error) {
                    console.error('Error approving loan:', error);
                    showError('Failed to approve loan');
                }
            }
        );
    };

    const handleRejectLoan = () => {
        showConfirmation(
            'Are you sure you want to reject this loan? This action cannot be undone.',
            async () => {
                try {
                    const reason = prompt('Please provide a reason for rejection:');
                    if (reason !== null) {
                        await loanService.rejectLoan(id, 'SYSTEM', reason);
                        showSuccess('Loan rejected successfully');
                        loadLoanDetails();
                    }
                } catch (error) {
                    console.error('Error rejecting loan:', error);
                    showError('Failed to reject loan');
                }
            }
        );
    };

    const handleExportSchedule = async () => {
        try {
            const blob = await loanService.exportLoanReport(loan.startDate, loan.endDate, 'excel');
            const url = window.URL.createObjectURL(blob.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `loan-${id}-schedule.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showSuccess('Schedule exported successfully');
        } catch (error) {
            console.error('Error exporting schedule:', error);
            showError('Failed to export schedule');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    const getLoanStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'status-warning', text: 'Pending' },
            APPROVED: { class: 'status-info', text: 'Approved' },
            ACTIVE: { class: 'status-success', text: 'Active' },
            COMPLETED: { class: 'status-default', text: 'Completed' },
            REJECTED: { class: 'status-danger', text: 'Rejected' },
            CANCELLED: { class: 'status-secondary', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { class: 'status-default', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
        );
    };

    const getRepaymentStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'status-warning', text: 'Pending' },
            PAID: { class: 'status-success', text: 'Paid' },
            OVERDUE: { class: 'status-danger', text: 'Overdue' },
            CANCELLED: { class: 'status-secondary', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { class: 'status-default', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
        );
    };

    // Define repayment schedule table columns
    const scheduleColumns = [
        {
            key: 'installmentNumber',
            title: 'Installment #',
            width: 120,
            sortable: true,
            render: (schedule) => `#${schedule.installmentNumber}`
        },
        {
            key: 'dueDate',
            title: 'Due Date',
            width: 120,
            sortable: true,
            render: (schedule) => formatDate(schedule.dueDate)
        },
        {
            key: 'scheduledAmount',
            title: 'Scheduled Amount',
            width: 140,
            sortable: true,
            render: (schedule) => formatCurrency(schedule.scheduledAmount)
        },
        {
            key: 'paidAmount',
            title: 'Paid Amount',
            width: 120,
            sortable: true,
            render: (schedule) => schedule.paidAmount ? formatCurrency(schedule.paidAmount) : '-'
        },
        {
            key: 'paymentDate',
            title: 'Payment Date',
            width: 120,
            sortable: true,
            render: (schedule) => schedule.paymentDate ? formatDate(schedule.paymentDate) : '-'
        },
        {
            key: 'status',
            title: 'Status',
            width: 100,
            sortable: true,
            render: (schedule) => getRepaymentStatusBadge(schedule.status)
        },
        {
            key: 'actions',
            title: 'Actions',
            width: 120,
            render: (schedule) => (
                schedule.status === 'PENDING' && (
                    <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleProcessRepayment(schedule.id, schedule.scheduledAmount)}
                    >
                        <FaCheck /> Pay
                    </button>
                )
            )
        }
    ];

    if (loading) {
        return (
            <div className="loan-details">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading loan details...</span>
                </div>
            </div>
        );
    }

    if (error || !loan) {
        return (
            <div className="loan-details">
                <div className="error-state">
                    <div className="error-content">
                        <h3>Error Loading Loan</h3>
                        <p>{error || 'Loan not found'}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/payroll/loans')}
                        >
                            Back to Loans
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="loan-details">
            {/* Header */}
            <div className="loan-details__header">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            className="btn btn-secondary back-button"
                            onClick={() => navigate('/payroll/loans')}
                        >
                            <FaArrowLeft /> Back to Loans
                        </button>
                        <div className="loan-title">
                            <h1>Loan Details</h1>
                            <span className="loan-id">Loan ID: {loan.id}</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        {loan.status === 'PENDING' && (
                            <>
                                <button
                                    className="btn btn-success"
                                    onClick={handleApproveLoan}
                                >
                                    <FaCheck /> Approve
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleRejectLoan}
                                >
                                    <FaTimes /> Reject
                                </button>
                            </>
                        )}
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportSchedule}
                        >
                            <FaDownload /> Export Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Loan Overview Cards */}
            <div className="loan-details__overview">
                <div className="overview-cards">
                    <LoanOverviewCard
                        title="Loan Amount"
                        value={loan.loanAmount}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="card--primary"
                    />
                    <LoanOverviewCard
                        title="Remaining Balance"
                        value={loan.remainingBalance}
                        format="currency"
                        icon={<FaMoneyBillWave />}
                        className="card--warning"
                    />
                    <LoanOverviewCard
                        title="Monthly Payment"
                        value={loan.installmentAmount}
                        format="currency"
                        icon={<FaCalendarAlt />}
                        className="card--info"
                    />
                    <LoanOverviewCard
                        title="Progress"
                        value={`${loan.paidInstallments || 0}/${loan.totalInstallments}`}
                        format="text"
                        icon={<FaFileAlt />}
                        className="card--success"
                    />
                </div>
            </div>

            {/* Loan Information */}
            <div className="loan-details__content">
                <div className="content-grid">
                    {/* Basic Information */}
                    <div className="info-card">
                        <div className="card-header">
                            <h3><FaUser /> Employee Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Employee Name:</label>
                                    <span>{loan.employeeName}</span>
                                </div>
                                <div className="info-item">
                                    <label>Employee ID:</label>
                                    <span>{loan.employeeId}</span>
                                </div>
                                <div className="info-item">
                                    <label>Department:</label>
                                    <span>{loan.departmentName || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Position:</label>
                                    <span>{loan.jobPositionName || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loan Details */}
                    <div className="info-card">
                        <div className="card-header">
                            <h3><FaMoneyBillWave /> Loan Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Status:</label>
                                    <span>{getLoanStatusBadge(loan.status)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Start Date:</label>
                                    <span>{formatDate(loan.startDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label>End Date:</label>
                                    <span>{formatDate(loan.endDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Interest Rate:</label>
                                    <span>{loan.interestRate}%</span>
                                </div>
                                <div className="info-item">
                                    <label>Frequency:</label>
                                    <span>{loan.installmentFrequency}</span>
                                </div>
                                <div className="info-item">
                                    <label>Description:</label>
                                    <span>{loan.description || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Information */}
                    <div className="info-card full-width">
                        <div className="card-header">
                            <h3><FaFileAlt /> Loan Progress</h3>
                        </div>
                        <div className="card-content">
                            <LoanProgressBar
                                paid={loan.paidInstallments || 0}
                                total={loan.totalInstallments}
                                amount={loan.loanAmount}
                                remaining={loan.remainingBalance}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Repayment Schedule */}
            <div className="loan-details__schedule">
                <div className="schedule-card">
                    <div className="card-header">
                        <h3><FaCalendarAlt /> Repayment Schedule</h3>
                        <span className="schedule-count">
              {repaymentSchedule.length} installments
            </span>
                    </div>
                    <div className="card-content">
                        <DataTable
                            columns={scheduleColumns}
                            data={repaymentSchedule}
                            emptyMessage="No repayment schedule available"
                            pagination={{
                                pageSize: 10
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Loan Overview Card Component
const LoanOverviewCard = ({ title, value, format, icon, className = '' }) => {
    const formatValue = (val) => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(val);
            case 'percentage':
                return `${(val || 0).toFixed(1)}%`;
            case 'text':
            default:
                return val;
        }
    };

    return (
        <div className={`overview-card ${className}`}>
            <div className="overview-card__icon">
                {icon}
            </div>
            <div className="overview-card__content">
                <h4 className="overview-card__title">{title}</h4>
                <div className="overview-card__value">{formatValue(value)}</div>
            </div>
        </div>
    );
};

// Loan Progress Bar Component
const LoanProgressBar = ({ paid, total, amount, remaining }) => {
    const percentage = total > 0 ? (paid / total) * 100 : 0;
    const paidAmount = amount - remaining;

    return (
        <div className="loan-progress-bar">
            <div className="progress-info">
                <div className="progress-stats">
                    <div className="stat">
                        <label>Paid Amount:</label>
                        <span className="amount-paid">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paidAmount)}</span>
                    </div>
                    <div className="stat">
                        <label>Remaining:</label>
                        <span className="amount-remaining">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remaining)}</span>
                    </div>
                    <div className="stat">
                        <label>Progress:</label>
                        <span>{paid}/{total} ({Math.round(percentage)}%)</span>
                    </div>
                </div>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
};

export default LoanDetails;