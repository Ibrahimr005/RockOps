import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaMoneyBillWave, FaCalendarAlt, FaPercent, FaFileAlt, FaCreditCard, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { loanService } from '../../../../services/payroll/loanService';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import DataTable from '../../../../components/common/DataTable/DataTable';
import './LoanModal.scss';

const LoanDetailsModal = ({ loan, onClose, onProcessRepayment }) => {
    const { showSuccess, showError } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [repaymentSchedule, setRepaymentSchedule] = useState([]);
    const [showRepaymentModal, setShowRepaymentModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [repaymentAmount, setRepaymentAmount] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
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
            setRepaymentSchedule(response.data || []);
        } catch (error) {
            console.error('Error loading repayment schedule:', error);
            showError('Failed to load repayment schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRepayment = (schedule) => {
        setSelectedSchedule(schedule);
        setRepaymentAmount(schedule.scheduledAmount.toString());
        setShowRepaymentModal(true);
    };

    const confirmProcessRepayment = () => {
        const amount = parseFloat(repaymentAmount);
        if (!amount || amount <= 0) {
            showError('Please enter a valid repayment amount');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'warning',
            title: 'Process Repayment',
            message: `Are you sure you want to process a repayment of $${amount.toFixed(2)} for installment #${selectedSchedule.installmentNumber}?`,
            onConfirm: async () => {
                try {
                    await onProcessRepayment(selectedSchedule.id, amount);
                    setShowRepaymentModal(false);
                    setSelectedSchedule(null);
                    setRepaymentAmount('');
                    loadRepaymentSchedule(); // Refresh the schedule
                    showSuccess('Repayment processed successfully');
                } catch (error) {
                    console.error('Error processing repayment:', error);
                    showError('Failed to process repayment');
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'pending', text: 'Pending' },
            PAID: { class: 'active', text: 'Paid' },
            OVERDUE: { class: 'status-overdue', text: 'Overdue' },
            PARTIAL: { class: 'status-partial', text: 'Partial' }
        };

        const config = statusConfig[status] || { class: 'status-pending', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
                {config.text}
            </span>
        );
    };

    const getLoanStatusBadge = (status) => {
        const statusConfig = {
            PENDING: { class: 'pending', text: 'Pending' },
            APPROVED: { class: 'approved', text: 'Approved' },
            ACTIVE: { class: 'active', text: 'Active' },
            COMPLETED: { class: 'completed', text: 'Completed' },
            REJECTED: { class: 'rejected', text: 'Rejected' },
            CANCELLED: { class: 'cancelled', text: 'Cancelled' }
        };

        const config = statusConfig[status] || { class: 'pending', text: status };

        return (
            <span className={`status-badge ${config.class}`}>
                {config.text}
            </span>
        );
    };

    const calculateProgress = () => {
        const paidInstallments = loan.paidInstallments || 0;
        const totalInstallments = loan.totalInstallments || 0;
        return totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
    };

    const getOverdueCount = () => {
        const today = new Date();
        return repaymentSchedule.filter(schedule =>
            schedule.status === 'PENDING' && new Date(schedule.dueDate) < today
        ).length;
    };

    // DataTable columns configuration
    const scheduleColumns = [
        {
            header: 'Installment',
            accessor: 'installmentNumber',
            width: '100px',
            render: (row) => `#${row.installmentNumber}`
        },
        {
            header: 'Due Date',
            accessor: 'dueDate',
            render: (row) => formatDate(row.dueDate)
        },
        {
            header: 'Scheduled Amount',
            accessor: 'scheduledAmount',
            render: (row) => formatCurrency(row.scheduledAmount)
        },
        {
            header: 'Paid Amount',
            accessor: 'paidAmount',
            render: (row) => row.paidAmount ? formatCurrency(row.paidAmount) : '-'
        },
        {
            header: 'Payment Date',
            accessor: 'paymentDate',
            render: (row) => row.paymentDate ? formatDate(row.paymentDate) : '-'
        },
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => getStatusBadge(row.status)
        }
    ];

    // DataTable actions configuration
    const scheduleActions = [
        {
            label: 'Process Payment',
            icon: <FaCheck />,
            onClick: (row) => handleProcessRepayment(row),
            isDisabled: (row) => row.status !== 'PENDING',
            className: 'btn-primary'
        }
    ];

    if (!loan) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="loan-details-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Loan Details</h2>
                        <button className="close-button" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="modal-body">
                        {/* Loan Information */}
                        <div className="loan-info-section">
                            <h3>Loan Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label><FaUser /> Employee:</label>
                                    <span>{loan.employeeName}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaMoneyBillWave /> Loan Amount:</label>
                                    <span>{formatCurrency(loan.loanAmount)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaMoneyBillWave /> Remaining Balance:</label>
                                    <span className="remaining-balance">{formatCurrency(loan.remainingBalance)}</span>
                                </div>
                                <div className="info-item">
                                    <label><FaPercent /> Interest Rate:</label>
                                    <span>{loan.interestRate}%</span>
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
                                    <label><FaCreditCard /> Installment Amount:</label>
                                    <span>{formatCurrency(loan.installmentAmount)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Frequency:</label>
                                    <span>{loan.installmentFrequency}</span>
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
                        <div className="progress-section">
                            <h3>Progress</h3>
                            <div className="progress-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Paid Installments:</span>
                                    <span className="stat-value">{loan.paidInstallments || 0} / {loan.totalInstallments}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Progress:</span>
                                    <span className="stat-value">{Math.round(calculateProgress())}%</span>
                                </div>
                                {getOverdueCount() > 0 && (
                                    <div className="stat-item overdue">
                                        <span className="stat-label">
                                            <FaExclamationTriangle /> Overdue:
                                        </span>
                                        <span className="stat-value">{getOverdueCount()} installments</span>
                                    </div>
                                )}
                            </div>
                            <div className="loan-progress-bar">
                                <div
                                    className="loan-progress-fill"
                                    style={{ width: `${Math.min(calculateProgress(), 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Repayment Schedule with DataTable */}
                        <div className="schedule-section">
                            <h3>Repayment Schedule</h3>
                            <DataTable
                                data={repaymentSchedule}
                                columns={scheduleColumns}
                                actions={scheduleActions}
                                loading={loading}
                                tableTitle=""
                                showSearch={true}
                                showFilters={true}
                                filterableColumns={[
                                    { header: 'Status', accessor: 'status' },
                                    { header: 'Due Date', accessor: 'dueDate' }
                                ]}
                                defaultItemsPerPage={10}
                                itemsPerPageOptions={[5, 10, 15, 20]}
                                showAddButton={false}
                                emptyMessage="No repayment schedule available"
                                className="loan-schedule-table"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn-cancel" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Repayment Modal */}
            {showRepaymentModal && selectedSchedule && (
                <div className="modal-overlay">
                    <div className="repayment-modal">
                        <div className="modal-header">
                            <h3>Process Repayment</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowRepaymentModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="repayment-info">
                                <p><strong>Installment:</strong> #{selectedSchedule.installmentNumber}</p>
                                <p><strong>Due Date:</strong> {formatDate(selectedSchedule.dueDate)}</p>
                                <p><strong>Scheduled Amount:</strong> {formatCurrency(selectedSchedule.scheduledAmount)}</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="repaymentAmount">Repayment Amount:</label>
                                <input
                                    type="number"
                                    id="repaymentAmount"
                                    step="0.01"
                                    min="0"
                                    value={repaymentAmount}
                                    onChange={(e) => setRepaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowRepaymentModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={confirmProcessRepayment}
                            >
                                Process Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirmDialog}
            />
        </>
    );
};

export default LoanDetailsModal;