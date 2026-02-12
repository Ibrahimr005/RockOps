import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiX, FiClock } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';
import "./DisputedPurchaseOrders.scss";

const DisputedPurchaseOrders = ({ purchaseOrders: propsPurchaseOrders, onDataChange, loading: parentLoading }) => {
    const navigate = useNavigate();
    const purchaseOrders = propsPurchaseOrders || [];
    const [loading, setLoading] = useState(true);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');


    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);

    // Cancel order dialog states
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);



    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.id}`);
    };


    const handleCloseModal = () => {
        setShowViewModal(false);
        setSelectedPurchaseOrder(null);
    };

    const handleResolveClick = (row, e) => {
        // Event might be undefined from DataTable
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        // Navigate to purchase order details page with issues tab
        navigate(`/procurement/purchase-orders/details/${row.id}`, {
            state: { activeTab: 'issues' }
        });
    };



    const handleConfirmCancel = async () => {
        if (!orderToCancel) return;

        setIsCancelling(true);

        try {
            await purchaseOrderService.updateStatus(orderToCancel.id, 'CANCELLED');

            setNotificationMessage(`Purchase order ${orderToCancel.poNumber} cancelled successfully!`);
            setNotificationType('success');
            setShowNotification(true);

            // Just trigger refresh from parent - REMOVE fetchDisputedPurchaseOrders()
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Error cancelling purchase order:', err);
            setNotificationMessage(`Error: ${err.message || 'Failed to cancel purchase order'}`);
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsCancelling(false);
            setShowCancelDialog(false);
            setOrderToCancel(null);
        }
    };

    const handleCancelDialogClose = () => {
        setShowCancelDialog(false);
        setOrderToCancel(null);
        setIsCancelling(false);
    };

    const getStatusClass = (status) => {
        return 'status-disputed';
    };

    const getDaysDisputed = (updatedAt) => {
        if (!updatedAt) return null;
        const today = new Date();
        const disputedDate = new Date(updatedAt);
        const diffTime = today - disputedDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            sortable: true,
            filterable: true,
            minWidth: '130px',
            render: (row) => (
                <span className="po-number-cell">
                    {row.poNumber || '-'}
                </span>
            )
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            filterable: true,
            minWidth: '220px',
            render: (row) => row.requestOrder?.title || '-'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requestOrder.requesterName',
            sortable: true,
            filterable: true,
            minWidth: '160px',
            render: (row) => row.requestOrder?.requesterName || '-'
        },
        {
            id: 'totalAmount',
            header: 'TOTAL AMOUNT',
            accessor: 'totalAmount',
            sortable: true,
            minWidth: '140px',
            render: (row) => `${row.currency || 'EGP'} ${parseFloat(row.totalAmount || 0).toFixed(2)}`
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'requestOrder.deadline',
            sortable: true,
            minWidth: '140px',
            render: (row) => {
                const deadline = row.requestOrder?.deadline;
                const formattedDate = purchaseOrderService.utils.formatDate(deadline);
                const isOverdue = deadline && new Date(deadline) < new Date();

                return (
                    <span style={{
                        color: isOverdue ? '#dc3545' : 'inherit',
                        fontWeight: isOverdue ? '600' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {isOverdue && (
                            <FiClock
                                style={{
                                    fontSize: '16px',
                                    color: '#dc3545'
                                }}
                            />
                        )}
                        {formattedDate}
                    </span>
                );
            }
        },
        {
            id: 'daysDisputed',
            header: 'DAYS DISPUTED',
            accessor: 'updatedAt',
            sortable: true,
            minWidth: '130px',
            render: (row) => {
                const days = getDaysDisputed(row.updatedAt);
                if (days === null) return '-';
                if (days === 0) return 'Today';
                if (days === 1) return '1 day';
                return `${days} days`;
            }
        },
        {
            id: 'updatedAt',
            header: 'DISPUTED AT',
            accessor: 'updatedAt',
            sortable: true,
            minWidth: '130px',
            render: (row) => purchaseOrderService.utils.formatDate(row.updatedAt)
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'Resolve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
            ),
            onClick: (row) => handleResolveClick(row),
            className: 'resolve'
        }
    ];

    // Define filterable columns
    const filterableColumns = [
        {
            header: 'PO Number',
            accessor: 'poNumber',
            filterType: 'text'
        },
        {
            header: 'Title',
            accessor: 'requestOrder.title',
            filterType: 'text'
        },
        {
            header: 'Requester',
            accessor: 'requestOrder.requesterName',
            filterType: 'select'
        },
        {
            header: 'Total Amount',
            accessor: 'totalAmount',
            filterType: 'range'
        },
        {
            header: 'Deadline',
            accessor: 'requestOrder.deadline',
            filterType: 'date'
        }
    ];

    return (
        <div className="disputed-purchase-orders-containers">
            {/* Disputed Purchase Orders Table */}
            <div className="purchase-orders-section">
                <DataTable
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={parentLoading}
                    emptyMessage="No disputed purchase orders found"
                    className="disputed-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    showExportButton={true}
                    exportFileName="disputed-purchase-orders"
                    exportButtonText="Export Disputed Orders"
                />
            </div>



            {/* Cancel Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showCancelDialog}
                type="danger"
                title="Cancel Purchase Order"
                message={`Are you sure you want to cancel purchase order "${orderToCancel?.poNumber}"? This action cannot be undone. The warehouse will be notified.`}
                confirmText="Cancel Order"
                cancelText="Keep Order"
                onConfirm={handleConfirmCancel}
                onCancel={handleCancelDialogClose}
                isLoading={isCancelling}
                size="large"
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default DisputedPurchaseOrders;