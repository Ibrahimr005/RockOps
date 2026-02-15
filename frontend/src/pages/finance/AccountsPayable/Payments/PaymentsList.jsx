import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiDollarSign, FiPlus } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import ProcessPaymentModal from './ProcessPaymentModal';
import './Payments.scss';

const PaymentsList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('history'); // 'all', 'today', 'history'
    const { showSuccess, showError } = useSnackbar();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPayments();
    }, [activeFilter]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            let response;

            if (activeFilter === 'today') {
                response = await financeService.accountsPayable.payments.getToday();
            } else {
                // Use getHistory() instead of getAll() since we don't have a getAll endpoint
                response = await financeService.accountsPayable.payments.getHistory();
            }

            setPayments(response.data || []);
        } catch (err) {
            console.error('Error fetching payments:', err);
            showError('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayment = () => {
        navigate('/finance/accounts-payable/process-payment');
    };


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
            'COMPLETED': 'status-completed',
            'PENDING': 'status-pending',
            'FAILED': 'status-failed',
            'REVERSED': 'status-reversed'
        };
        return statusMap[status] || 'status-default';
    };

    const columns = [
        {
            header: 'Payment Number',
            accessor: 'paymentNumber',
            sortable: true
        },
        {
            header: 'Payment Request',
            accessor: 'paymentRequestNumber',
            sortable: true
        },
        {
            header: 'Recipient',
            accessor: 'paidToName',
            sortable: true
        },
        {
            header: 'Amount',
            accessor: 'amount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                    {formatCurrency(row.amount)}
                </span>
            )
        },
        {
            header: 'Payment Method',
            accessor: 'paymentMethod',
            sortable: true,
            render: (row) => row.paymentMethod.replace('_', ' ')
        },
        {
            header: 'Payment Account',
            accessor: 'paymentAccountName',
            sortable: true
        },
        {
            header: 'Payment Date',
            accessor: 'paymentDate',
            sortable: true,
            render: (row) => formatDate(row.paymentDate)
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

    const filterableColumns = [
        {
            header: 'Payment Method',
            accessor: 'paymentMethod',
            filterType: 'select'
        },
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        },
        {
            header: 'Merchant',
            accessor: 'paidToName',
            filterType: 'select'
        }
    ];



    return (
        <div className="payments-list">
            {/* Filter Tabs */}

            <div className="filter-tabs">
                <button
                    className={`filter-tab ${activeFilter === 'today' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('today')}
                >
                    <FiDollarSign />
                    <span>Today's Payments</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('history')}
                >
                    <FiEye />
                    <span>Payment History</span>
                </button>
            </div>

            <DataTable
                data={payments}
                columns={columns}
                loading={loading}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                showAddButton={true}
                addButtonText="Process Payment"
                addButtonIcon={<FiPlus />}
                onAddClick={handleProcessPayment}
                emptyMessage={
                    activeFilter === 'today'
                        ? 'No payments made today'
                        : 'No payments found'
                }
                defaultSortField="paymentDate"
                defaultSortDirection="desc"
            />

        </div>
    );
};

export default PaymentsList;