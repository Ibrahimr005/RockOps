import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import PaymentRequestDetails from './PaymentRequestDetails';
import ApproveRejectModal from './ApproveRejectModal';
import './PaymentRequests.scss';

const PaymentRequestsList = () => {
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [showApproveReject, setShowApproveReject] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeFilter, setActiveFilter] = useState('pending'); // 'pending', 'ready-to-pay', 'all'
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        fetchPaymentRequests();
    }, [activeFilter]);

    const fetchPaymentRequests = async () => {
        try {
            setLoading(true);
            let response;

            if (activeFilter === 'pending') {
                response = await financeService.accountsPayable.paymentRequests.getPending();
            } else if (activeFilter === 'ready-to-pay') {
                response = await financeService.accountsPayable.paymentRequests.getReadyToPay();
            } else {
                response = await financeService.accountsPayable.paymentRequests.getAll();
            }

            setPaymentRequests(response.data || []);
        } catch (err) {
            console.error('Error fetching payment requests:', err);
            showError('Failed to load payment requests');
        } finally {
            setLoading(false);
        }
    };

    const handleView = (request) => {
        setSelectedRequest(request);
        setShowDetails(true);
    };

    const handleApproveReject = (request) => {
        setShowDetails(false); // Close the details modal
        setSelectedRequest(null); // Clear selected request
        fetchPaymentRequests(); // Refresh the list
    };

    const handleApproveRejectSubmit = () => {
        setShowApproveReject(false);
        setSelectedRequest(null);
        fetchPaymentRequests();
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

    const columns = [
        {
            header: 'Request Number',
            accessor: 'requestNumber',
            sortable: true
        },
        {
            header: 'PO Number',
            accessor: 'purchaseOrderNumber',
            sortable: true
        },
        {
            header: 'Merchant',
            accessor: 'merchantName',
            sortable: true
        },
        {
            header: 'Requested Amount',
            accessor: 'requestedAmount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                    {formatCurrency(row.requestedAmount)}
                </span>
            )
        },
        {
            header: 'Paid Amount',
            accessor: 'totalPaidAmount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                    {formatCurrency(row.totalPaidAmount)}
                </span>
            )
        },
        {
            header: 'Remaining',
            accessor: 'remainingAmount',
            sortable: true,
            render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--warning-color)' }}>
                    {formatCurrency(row.remainingAmount)}
                </span>
            )
        },
        {
            header: 'Due Date',
            accessor: 'paymentDueDate',
            sortable: true,
            render: (row) => formatDate(row.paymentDueDate)
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status.replace('_', ' ')}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FiEye />,
            onClick: handleView,
            className: 'rockops-table__action-button primary'
        },
        // {
        //     label: 'Approve/Reject',
        //     icon: <FiCheckCircle />,
        //     onClick: handleApproveReject,
        //     className: 'rockops-table__action-button success',
        //     show: (row) => row.status === 'PENDING'
        // }
    ];

    const filterableColumns = [
        {
            header: 'Merchant',
            accessor: 'merchantName',
            filterType: 'select'
        },
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        }
    ];

    return (
        <div className="payment-requests-list">
            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('pending')}
                >
                    <FiClock />
                    <span>Pending Review</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'ready-to-pay' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('ready-to-pay')}
                >
                    <FiCheckCircle />
                    <span>Ready to Pay</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    <FiEye />
                    <span>All Requests</span>
                </button>
            </div>

            <DataTable
                data={paymentRequests}
                columns={columns}
                loading={loading}
                actions={actions}
                onRowClick={handleView}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyMessage={
                    activeFilter === 'pending'
                        ? 'No pending payment requests'
                        : activeFilter === 'ready-to-pay'
                            ? 'No payment requests ready to pay'
                            : 'No payment requests found'
                }
                defaultSortField="requestedAt"
                defaultSortDirection="desc"
            />

            {showDetails && selectedRequest && (
                <PaymentRequestDetails
                    request={selectedRequest}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedRequest(null);
                    }}
                    onApproveReject={() => {
                        setShowDetails(false);
                        handleApproveReject(selectedRequest);
                    }}
                />
            )}

            {showApproveReject && selectedRequest && (
                <ApproveRejectModal
                    request={selectedRequest}
                    onClose={() => {
                        setShowApproveReject(false);
                        setSelectedRequest(null);
                    }}
                    onSubmit={handleApproveRejectSubmit}
                />
            )}
        </div>
    );
};

export default PaymentRequestsList;