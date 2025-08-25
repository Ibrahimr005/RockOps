// ==================== LOAN DETAILS MODAL COMPONENT ====================
// frontend/src/pages/payroll/Loans/components/LoanDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import {
    FaTimes, FaUser, FaMoneyBillWave, FaCalendarAlt, FaPercent,
    FaFileAlt, FaCreditCard, FaCheck, FaExclamationTriangle,
    FaChartLine, FaClock, FaDollarSign
} from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import DataTable from '../../../../components/common/DataTable/DataTable';
import './LoanModal.scss';

const LoanDetailsModal = ({ loan, onClose, onProcessRepayment }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [repaymentSchedule, setRepaymentSchedule] = useState([]);
    const [scheduleStats, setScheduleStats] = useState({
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        nextPaymentDate: null,
        nextPaymentAmount: 0
    });

    useEffect(() => {
        if (loan?.id) {
            loadRepaymentSchedule();
        }
    }, [loan?.id]);

    const loadRepaymentSchedule = async () => {
        try {
            setLoading(true);
            const response = await loanService.getRepaymentSchedule(loan.id);
            const schedules = response.data || [];
            setRepaymentSchedule(schedules);
            calculateScheduleStats(schedules);
        } catch (error) {
            console.error('Error loading repayment schedule:', error);
            showError('Failed to load repayment schedule');
        } finally {
            setLoading(false);
        }
    };

    const calculateScheduleStats = (schedules) => {
        let totalPaid = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        let nextPayment = null;

        const today = new Date();

        schedules.forEach(schedule => {
            if (schedule.status === 'PAID') {
                totalPaid += parseFloat(schedule.actualAmount || schedule.scheduledAmount);
            } else if (schedule.status === 'PENDING') {
                const dueDate = new Date(schedule.dueDate);
                if (dueDate < today) {
                    totalOverdue += parseFloat(schedule.scheduledAmount);
                } else {
                    totalPending += parseFloat(schedule.scheduledAmount);
                    if (!nextPayment || dueDate < new Date(nextPayment.dueDate)) {
                        nextPayment = schedule;
                    }
                }
            }
        });

        setScheduleStats({
            totalPaid,
            totalPending,
            totalOverdue,
            nextPaymentDate: nextPayment?.dueDate || null,
            nextPaymentAmount: nextPayment?.scheduledAmount || 0
        });
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

    const getStatusBadge = (status) => {
        const statusClasses = {
            PENDING: 'status-badge status-pending',
            PAID: 'status-badge status-paid',
            OVERDUE: 'status-badge status-overdue',
            PARTIAL: 'status-badge status-partial'
        };

        return (
            <span className={statusClasses[status] || 'status-badge'}>
                {status}
            </span>
        );
    };

    const getLoanStatusBadge = (status) => {
        const statusClasses = {
            PENDING: 'status-badge status-pending',
            ACTIVE: 'status-badge status-active',
            COMPLETED: 'status-badge status-completed',
            CANCELLED: 'status-badge status-cancelled',
            REJECTED: 'status-badge status-rejected'
        };

        return (
            <span className={statusClasses[status] || 'status-badge'}>
                {status}
            </span>
        );
    };

    const calculateProgress = () => {
        const paid = loan.loanAmount - loan.remainingBalance;
        const percentage = loan.loanAmount > 0 ? (paid / loan.loanAmount) * 100 : 0;
        return {
            paid,
            percentage: Math.min(percentage, 100)
        };
    };

    const isOverdue = (dueDate, status) => {
        return status === 'PENDING' && new Date(dueDate) < new Date();
    };

    // Define repayment schedule table columns
    const scheduleColumns = [
        {
            id: 'installmentNumber',
            accessor: 'installmentNumber',
            header: '#',
            sortable: true,
            render: (schedule) => (
                <div className="installment-number">
                    {schedule.installmentNumber}
                </div>
            )
        },
        {
            id: 'dueDate',
            accessor: 'dueDate',
            header: 'Due Date',
            sortable: true,
            render: (schedule) => (
                <div className="due-date">
                    {formatDate(schedule.dueDate)}
                    {isOverdue(schedule.dueDate, schedule.status) && (
                        <FaExclamationTriangle className="overdue-icon" title="Overdue" />
                    )}
                </div>
            )
        },
        {
            id: 'scheduledAmount',
            accessor: 'scheduledAmount',
            header: 'Scheduled Amount',
            sortable: true,
            render: (schedule) => (
                <div className="scheduled-amount">
                    {formatCurrency(schedule.scheduledAmount)}
                </div>
            )
        },
        {
            id: 'principalAmount',
            accessor: 'principalAmount',
            header: 'Principal',
            sortable: true,
            render: (schedule) => (
                <div className="principal-amount">
                    {formatCurrency(schedule.principalAmount)}
                </div>
            )
        },
        {
            id: 'interestAmount',
            accessor: 'interestAmount',
            header: 'Interest',
            sortable: true,
            render: (schedule) => (
                <div className="interest-amount">
                    {formatCurrency(schedule.interestAmount)}
                </div>
            )
        },
        {
            id: 'actualAmount',
            accessor: 'actualAmount',
            header: 'Paid Amount',
            render: (schedule) => (
                <div className="actual-amount">
                    {schedule.actualAmount ? formatCurrency(schedule.actualAmount) : '-'}
                    {schedule.paidDate && (
                        <div className="paid-date">on {formatDate(schedule.paidDate)}</div>
                    )}
                </div>
            )
        },
        {
            id: 'status',
            accessor: 'status',
            header: 'Status',
            sortable: true,
            render: (schedule) => {
                let status = schedule.status;
                if (status === 'PENDING' && isOverdue(schedule.dueDate, status)) {
                    status = 'OVERDUE';
                }
                return getStatusBadge(status);
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            render: (schedule) => (
                <div className="schedule-actions">
                    {schedule.status === 'PENDING' && (
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => onProcessRepayment(schedule)}
                            title="Process Payment"
                        >
                            <FaDollarSign />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const progress = calculateProgress();

    return (
        <div className="modal-overlay">
            <div className="modal-container loan-details-modal">
                <div className="modal-header">
                    <h3>
                        <FaMoneyBillWave className="modal-icon" />
                        Loan Details - {loan.employeeName}
                    </h3>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="loan-details-content">
                        {/* Loan Information Section */}
                        <div className="details-section">
                            <h4>Loan Information</h4>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label><FaUser /> Employee:</label>
                                    <span>{loan.employeeName}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaMoneyBillWave /> Loan Amount:</label>
                                    <span className="amount">{formatCurrency(loan.loanAmount)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaMoneyBillWave /> Remaining Balance:</label>
                                    <span className="amount balance">{formatCurrency(loan.remainingBalance)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaPercent /> Interest Rate:</label>
                                    <span>{loan.interestRate}% annually</span>
                                </div>
                                <div className="info-item">
                                    <label><FaCalendarAlt /> Start Date:</label>
                                    <span>{formatDate(loan.startDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaCalendarAlt /> End Date:</label>
                                    <span>{formatDate(loan.endDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaCreditCard /> Total Installments:</label>
                                    <span>{loan.totalInstallments} months</span>
                                </div>
                                <div className="info-item">
                                    <label>Status:</label>
                                    <span>{getLoanStatusBadge(loan.status)}</span>
                                </div>
                            </div>

                            {loan.description && (
                                <div className="info-item full-width">
                                    <label><FaFileAlt /> Description:</label>
                                    <p>{loan.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Progress Section */}
                        <div className="details-section">
                            <h4><FaChartLine /> Loan Progress</h4>
                            <div className="progress-container">
                                <div className="progress-stats">
                                    <div className="stat">
                                        <label>Paid Amount:</label>
                                        <span className="amount-paid">{formatCurrency(progress.paid)}</span>
                                    </div>
                                    <div className="stat">
                                        <label>Remaining:</label>
                                        <span className="amount-remaining">{formatCurrency(loan.remainingBalance)}</span>
                                    </div>
                                    <div className="stat">
                                        <label>Progress:</label>
                                        <span>{Math.round(progress.percentage)}%</span>
                                    </div>
                                </div>
                                <div className="loan-progress-bar">
                                    <div
                                        className="loan-progress-fill"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Statistics */}
                        <div className="details-section">
                            <h4><FaDollarSign /> Payment Summary</h4>
                            <div className="payment-stats">
                                <div className="stat-card paid">
                                    <div className="stat-icon">
                                        <FaCheck />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCurrency(scheduleStats.totalPaid)}</div>
                                        <div className="stat-label">Total Paid</div>
                                    </div>
                                </div>
                                <div className="stat-card pending">
                                    <div className="stat-icon">
                                        <FaClock />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCurrency(scheduleStats.totalPending)}</div>
                                        <div className="stat-label">Pending</div>
                                    </div>
                                </div>
                                <div className="stat-card overdue">
                                    <div className="stat-icon">
                                        <FaExclamationTriangle />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{formatCurrency(scheduleStats.totalOverdue)}</div>
                                        <div className="stat-label">Overdue</div>
                                    </div>
                                </div>
                            </div>

                            {scheduleStats.nextPaymentDate && (
                                <div className="next-payment">
                                    <strong>Next Payment: </strong>
                                    {formatCurrency(scheduleStats.nextPaymentAmount)} due on {formatDate(scheduleStats.nextPaymentDate)}
                                </div>
                            )}
                        </div>

                        {/* Repayment Schedule */}
                        <div className="details-section">
                            <h4>Repayment Schedule</h4>
                            <DataTable
                                data={repaymentSchedule}
                                columns={scheduleColumns}
                                loading={loading}
                                pagination={false}
                                emptyState={{
                                    message: 'No repayment schedule found',
                                    description: 'Repayment schedule will be generated after loan approval'
                                }}
                                className="repayment-schedule-table"
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanDetailsModal;