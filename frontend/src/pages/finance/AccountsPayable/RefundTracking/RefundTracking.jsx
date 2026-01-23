import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable';
import ConfirmRefundModal from './ConfirmRefundModal';
import ViewRefundDetailsModal from './ViewRefundDetailsModal';
import { financeService } from '../../../../services/financeService';
import './RefundTracking.scss';
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";

const RefundTracking = () => {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('pending'); // pending, confirmed, all
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchRefunds();
    }, [activeFilter]);

    const fetchRefunds = async () => {
        setLoading(true);
        setError(null);
        try {
            let response;
            if (activeFilter === 'all') {
                response = await financeService.refunds.getAllRefunds();
            } else {
                const status = activeFilter.toUpperCase();
                response = await financeService.refunds.getRefundsByStatus(status);
            }
            setRefunds(response || []);
        } catch (err) {
            console.error('Error fetching refunds:', err);
            setError('Failed to load refunds');
            showError('Failed to load refunds: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewClick = (refund) => {
        setSelectedRefund(refund);
        if (refund.status === 'PENDING') {
            setShowConfirmModal(true);
        } else {
            setShowDetailsModal(true);
        }
    };

    const handleConfirmSubmit = async (confirmData) => {
        try {
            await financeService.refunds.confirmRefund(selectedRefund.id, confirmData);
            showSuccess('Refund confirmed successfully!');
            setShowConfirmModal(false);
            setSelectedRefund(null);
            fetchRefunds(); // Refresh the list
        } catch (err) {
            console.error('Error confirming refund:', err);
            showError('Failed to confirm refund: ' + err.message);
        }
    };

    const showSuccess = (message) => {
        setNotificationMessage(message);
        setNotificationType('success');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
    };

    const showError = (message) => {
        setNotificationMessage(message);
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
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

    const columns = [
        {
            header: 'PO Number',
            accessor: 'purchaseOrderNumber',
            sortable: true,
            render: (row) => (
                <span className="refund-po-number">{row.purchaseOrderNumber || 'N/A'}</span>
            )
        },
        {
            header: 'Merchant',
            accessor: 'merchantName',
            sortable: true,
            render: (row) => (
                <div className="refund-merchant">
                    <div className="merchant-name">{row.merchantName}</div>
                    {row.merchantContactPhone && (
                        <div className="merchant-contact">{row.merchantContactPhone}</div>
                    )}
                </div>
            )
        },
        {
            header: 'Refund Amount',
            accessor: 'totalRefundAmount',
            sortable: true,
            render: (row) => (
                <span className="refund-amount">{formatCurrency(row.totalRefundAmount)}</span>
            )
        },
        // {
        //     header: 'Items',
        //     accessor: 'refundItems',
        //     render: (row) => (
        //         <span className="refund-items-count">
        //             {row.refundItems?.length || 0} item{row.refundItems?.length !== 1 ? 's' : ''}
        //         </span>
        //     )
        // },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => {
                const status = row.status?.toLowerCase();
                return (
                    <span className={`status-badge status-${status}`}>
                        {status === 'pending' && <FiClock />}
                        {status === 'confirmed' && <FiCheckCircle />}
                        <span>{row.status}</span>
                    </span>
                );
            }
        },
        {
            header: 'Requested Date',
            accessor: 'createdAt',
            sortable: true,
            render: (row) => formatDate(row.createdAt)
        },
        {
            header: 'Confirmed Date',
            accessor: 'confirmedAt',
            sortable: true,
            render: (row) => row.confirmedAt ? formatDate(row.confirmedAt) : '-'
        }
    ];

    const actions = [
        {
            label: activeFilter === 'pending' ? 'Review' : 'View Details',
            icon: <FiEye />,
            onClick: handleViewClick,
            className: 'rockops-table__action-button primary'
        }
    ];

    const pendingCount = refunds.filter(r => r.status === 'PENDING').length;
    const confirmedCount = refunds.filter(r => r.status === 'CONFIRMED').length;

    return (
        <div className="refund-tracking-container">
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
                    className={`filter-tab ${activeFilter === 'confirmed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('confirmed')}
                >
                    <FiCheckCircle />
                    <span>Confirmed</span>
                </button>
                <button
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                >
                    <FiDollarSign />
                    <span>All Refunds</span>
                </button>
            </div>

            {/* Data Table */}
            <div className="refund-table-container">
                {error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={fetchRefunds} className="btn-retry">Retry</button>
                    </div>
                ) : (
                    <DataTable
                        data={refunds}
                        columns={columns}
                        actions={actions}
                        loading={loading}
                        emptyMessage={
                            activeFilter === 'pending'
                                ? 'No pending refunds'
                                : activeFilter === 'confirmed'
                                    ? 'No confirmed refunds'
                                    : 'No refunds found'
                        }
                        searchable={true}
                        searchPlaceholder="Search by PO number, merchant..."
                    />
                )}
            </div>

            {/* Confirm Refund Modal (for pending) */}
            {showConfirmModal && selectedRefund && (
                <ConfirmRefundModal
                    refund={selectedRefund}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setSelectedRefund(null);
                    }}
                    onConfirm={handleConfirmSubmit}
                />
            )}

            {/* Confirm Refund Modal (for pending) */}
            {showConfirmModal && selectedRefund && (
                <ConfirmRefundModal
                    refund={selectedRefund}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setSelectedRefund(null);
                    }}
                    onConfirm={handleConfirmSubmit}
                />
            )}

            {/* View Details Modal (for confirmed) */}
            {showDetailsModal && selectedRefund && (
                <ViewRefundDetailsModal
                    refund={selectedRefund}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedRefund(null);
                    }}
                />
            )}

            {/* Snackbar Notification - REPLACE THE OLD NOTIFICATION */}
            <Snackbar
                show={showNotification}
                type={notificationType}
                message={notificationMessage}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </div>
    );
};

export default RefundTracking;