import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import ProcessPaymentModal from './ProcessPaymentModal';
import './ProcessPaymentPage.scss';

const ProcessPaymentPage = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    // State
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [stats, setStats] = useState({
        totalRequests: 0,
        totalAmount: 0,
        approvedCount: 0,
        partiallyPaidCount: 0
    });

    // Fetch payment requests ready to pay
    const fetchPaymentRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await financeService.accountsPayable.paymentRequests.getReadyToPay();
            const data = response.data || [];

            setPaymentRequests(data);

            // Calculate stats
            const totalAmount = data.reduce((sum, req) => sum + (parseFloat(req.remainingAmount) || 0), 0);
            const approvedCount = data.filter(req => req.status === 'APPROVED').length;
            const partiallyPaidCount = data.filter(req => req.status === 'PARTIALLY_PAID').length;

            setStats({
                totalRequests: data.length,
                totalAmount,
                approvedCount,
                partiallyPaidCount
            });
        } catch (err) {
            console.error('Error fetching payment requests:', err);
            showError('Failed to load payment requests');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchPaymentRequests();
    }, [fetchPaymentRequests]);

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'APPROVED': 'status-approved',
            'PARTIALLY_PAID': 'status-partial',
            'PENDING': 'status-pending'
        };
        return statusMap[status] || 'status-default';
    };

    // Handle row click - open payment modal
    const handleRowClick = (row) => {
        setSelectedRequest(row);
        setShowPaymentModal(true);
    };

    // Handle payment success
    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedRequest(null);
        fetchPaymentRequests();
        showSuccess('Payment processed successfully!');
    };

    // Handle modal close
    const handleModalClose = () => {
        setShowPaymentModal(false);
        setSelectedRequest(null);
    };

    // Table columns - compact version
    const columns = [
        {
            header: 'Request #',
            accessor: 'requestNumber',
            sortable: true,
            render: (row) => (
                <span className="request-number">{row.requestNumber}</span>
            )
        },
        {
            header: 'Recipient',
            accessor: 'merchantName',
            sortable: true,
            render: (row) => (
                <span className="merchant-name">
                    {row.merchantName || row.institutionName || 'N/A'}
                </span>
            )
        },
        {
            header: 'Remaining',
            accessor: 'remainingAmount',
            sortable: true,
            render: (row) => (
                <span className="amount remaining">{formatCurrency(row.remainingAmount)}</span>
            )
        },
        {
            header: 'Due Date',
            accessor: 'paymentDueDate',
            sortable: true,
            render: (row) => {
                const isOverdue = row.paymentDueDate && new Date(row.paymentDueDate) < new Date();
                return (
                    <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                        {formatDate(row.paymentDueDate)}
                        {isOverdue && <FiAlertCircle className="overdue-icon" />}
                    </span>
                );
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status === 'PARTIALLY_PAID' ? 'Partial' : row.status}
                </span>
            )
        },
        {
            header: 'Action',
            accessor: 'action',
            sortable: false,
            render: (row) => (
                <button
                    className="btn-pay"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(row);
                    }}
                >
                    <FiDollarSign />
                    <span>Pay</span>
                </button>
            )
        }
    ];

    // Filterable columns
    const filterableColumns = [
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        },
        {
            header: 'Merchant',
            accessor: 'merchantName',
            filterType: 'select'
        }
    ];

    // Breadcrumbs for IntroCard
    const breadcrumbs = [
        { label: 'Finance', onClick: () => navigate('/finance/accounts-payable') },
        { label: 'Accounts Payable', onClick: () => navigate('/finance/accounts-payable') },
        { label: 'Process Payments' }
    ];

    // Stats for IntroCard - only 2 stats for compact view
    const introStats = [
        {
            value: stats.totalRequests,
            label: 'Ready to Pay'
        },
        {
            value: formatCurrency(stats.totalAmount),
            label: 'Total Amount'
        }
    ];

    return (
        <div className="process-payment-page">
            {/* IntroCard Header - Compact */}
            <IntroCard
                title="Process Payments"
                label="ACCOUNTS PAYABLE"
                breadcrumbs={breadcrumbs}
                icon={<FiDollarSign />}
                stats={introStats}
            />

            {/* Payment Requests Table - Same structure as PaymentsList */}
            <DataTable
                data={paymentRequests}
                columns={columns}
                loading={loading}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                onRowClick={handleRowClick}
                emptyMessage="No payment requests ready to pay"
                defaultSortField="paymentDueDate"
                defaultSortDirection="asc"
                defaultItemsPerPage={15}
            />

            {/* Payment Modal */}
            {showPaymentModal && selectedRequest && (
                <ProcessPaymentModal
                    paymentRequest={selectedRequest}
                    onClose={handleModalClose}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

export default ProcessPaymentPage;