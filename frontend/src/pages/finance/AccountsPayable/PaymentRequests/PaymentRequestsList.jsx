import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import { useNavigate } from 'react-router-dom';

import './PaymentRequests.scss';

const PaymentRequestsList = () => {
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('pending'); // 'pending', 'ready-to-pay', 'all'
    const { showSuccess, showError } = useSnackbar();
    const navigate = useNavigate();

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
        navigate(`/finance/accounts-payable/payment-requests/${request.id}`);
    };

    const handleApproveReject = () => {
        fetchPaymentRequests(); // Just refresh the list
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
            header: 'Source',
            accessor: 'sourceNumber',
            sortable: true,
            render: (row) => {
                // Use polymorphic sourceType field, with legacy field fallbacks
                const sourceType = row.sourceType;
                const sourceNumber = row.sourceNumber || row.purchaseOrderNumber || row.batchNumber || row.companyLoanNumber;

                if (sourceType === 'PURCHASE_ORDER' || (!sourceType && row.purchaseOrderNumber)) {
                    return (
                        <span className="source-badge source-procurement">
                            {sourceNumber || 'PO'}
                        </span>
                    );
                } else if (sourceType === 'MAINTENANCE' || (!sourceType && row.maintenanceStepId)) {
                    return (
                        <span className="source-badge source-maintenance">
                            {sourceNumber || row.maintenanceStepId?.substring(0, 8) || 'Maintenance'}
                        </span>
                    );
                } else if (sourceType === 'PAYROLL_BATCH' || (!sourceType && row.payrollBatchId)) {
                    return (
                        <span className="source-badge source-payroll">
                            {sourceNumber || row.batchNumber || 'Payroll'}
                        </span>
                    );
                } else if (sourceType === 'LOAN' || (!sourceType && row.companyLoanNumber)) {
                    return (
                        <span className="source-badge source-loan">
                            {sourceNumber || row.companyLoanNumber || 'Loan'}
                        </span>
                    );
                } else if (sourceType === 'BONUS') {
                    return (
                        <span className="source-badge source-bonus">
                            {sourceNumber || 'Bonus'}
                        </span>
                    );
                } else if (sourceType === 'LOGISTICS' || (!sourceType && row.logisticsId)) {
                    return (
                        <span className="source-badge source-logistics">
                            {sourceNumber || 'Logistics'}
                        </span>
                    );
                }
                return <span className="source-badge source-unknown">{sourceNumber || 'N/A'}</span>;
            }
        },
        {
            header: 'Recipient',
            accessor: 'targetName',
            sortable: true,
            render: (row) => {
                // Use polymorphic targetType/targetName, with legacy field fallbacks
                const targetType = row.targetType;
                const targetName = row.targetName || row.institutionName || row.merchantName;

                if (targetType === 'EMPLOYEE_GROUP') {
                    return (
                        <span className="recipient-badge recipient-employees">
                            {targetName || `${row.batchEmployeeCount || 0} Employees`}
                        </span>
                    );
                } else if (targetType === 'EMPLOYEE') {
                    return (
                        <span className="recipient-badge recipient-employee">
                            {targetName || 'Employee'}
                        </span>
                    );
                } else if (targetType === 'FINANCIAL_INSTITUTION' || (!targetType && row.institutionName)) {
                    return (
                        <span className="recipient-badge recipient-institution">
                            {targetName || row.institutionName || 'Institution'}
                        </span>
                    );
                }
                // Default to merchant
                return <span className="recipient-badge recipient-merchant">{targetName || 'N/A'}</span>;
            }
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
        // {
        //     label: 'View Details',
        //     icon: <FiEye />,
        //     onClick: handleView,
        //     className: 'rockops-table__action-button primary'
        // },
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

        </div>
    );
};

export default PaymentRequestsList;