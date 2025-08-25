import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiTruck, FiPackage } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';

const ValidatedPurchaseOrders = () => {
    const navigate = useNavigate();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Complete dialog states
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [selectedOrderForCompletion, setSelectedOrderForCompletion] = useState(null);
    const [isCompleting, setIsCompleting] = useState(false);

    useEffect(() => {
        fetchValidatedPurchaseOrders();
    }, []);

    const fetchValidatedPurchaseOrders = async () => {
        try {
            setLoading(true);
            const data = await purchaseOrderService.getValidated();
            setPurchaseOrders(data);
        } catch (err) {
            console.error('Error fetching validated purchase orders:', err);
            setNotificationMessage('Failed to load validated purchase orders. Please try again later.');
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/${row.id}`);
    };

    const handleCompleteClick = (row, e) => {
        e.stopPropagation();
        setSelectedOrderForCompletion(row);
        setShowCompleteDialog(true);
    };

    const handlePartialReceiveClick = (row, e) => {
        e.stopPropagation();
        // Navigate to a detailed view where user can mark items as received
        navigate(`/procurement/purchase-orders/${row.id}/receive-items`);
    };

    const handleConfirmCompletion = async () => {
        if (!selectedOrderForCompletion) return;

        setIsCompleting(true);

        try {
            await purchaseOrderService.updateStatus(selectedOrderForCompletion.id, 'COMPLETED');

            setNotificationMessage('Purchase order marked as completed successfully!');
            setNotificationType('success');
            setShowNotification(true);

            // Refresh the list
            await fetchValidatedPurchaseOrders();
        } catch (err) {
            console.error('Error completing purchase order:', err);
            setNotificationMessage(`Error: ${err.message || 'Failed to complete purchase order'}`);
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsCompleting(false);
            setShowCompleteDialog(false);
            setSelectedOrderForCompletion(null);
        }
    };

    const handleCancelCompletion = () => {
        setShowCompleteDialog(false);
        setSelectedOrderForCompletion(null);
        setIsCompleting(false);
    };

    const getStatusClass = (status) => {
        const statusClasses = {
            'VALIDATED': 'status-validated',
            'PARTIALLY_RECEIVED': 'status-partially-received'
        };
        return statusClasses[status] || 'status-default';
    };

    const getDaysUntilDelivery = (expectedDeliveryDate) => {
        if (!expectedDeliveryDate) return null;
        const today = new Date();
        const deliveryDate = new Date(expectedDeliveryDate);
        const diffTime = deliveryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getDeliveryStatus = (expectedDeliveryDate) => {
        const days = getDaysUntilDelivery(expectedDeliveryDate);
        if (days === null) return 'No delivery date';
        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `${days} days remaining`;
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            sortable: true,
            filterable: true,
            minWidth: '150px',
            render: (row) => row.poNumber || '-'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requestOrder.requesterName',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => row.requestOrder?.requesterName || '-'
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            filterable: true,
            minWidth: '250px',
            render: (row) => row.requestOrder?.title || '-'
        },
        {
            id: 'status',
            header: 'STATUS',
            accessor: 'status',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className={`purchase-order-status-badge ${getStatusClass(row.status)}`}>
                    {purchaseOrderService.utils.getStatusDisplay(row.status)}
                </span>
            )
        },
        {
            id: 'totalAmount',
            header: 'TOTAL AMOUNT',
            accessor: 'totalAmount',
            sortable: true,
            minWidth: '150px',
            render: (row) => purchaseOrderService.utils.formatCurrency(row.totalAmount)
        },
        {
            id: 'expectedDeliveryDate',
            header: 'DELIVERY STATUS',
            accessor: 'expectedDeliveryDate',
            sortable: true,
            minWidth: '180px',
            render: (row) => {
                const days = getDaysUntilDelivery(row.expectedDeliveryDate);
                const status = getDeliveryStatus(row.expectedDeliveryDate);
                const isOverdue = days !== null && days < 0;
                const isDueToday = days === 0;

                return (
                    <span className={`delivery-status ${isOverdue ? 'overdue' : isDueToday ? 'due-today' : 'upcoming'}`}>
                        {status}
                    </span>
                );
            }
        },
        {
            id: 'validatedAt',
            header: 'VALIDATED AT',
            accessor: 'validatedAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => purchaseOrderService.utils.formatDate(row.validatedAt || row.updatedAt)
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'Receive Items',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
            ),
            onClick: (row) => handlePartialReceiveClick(row, { stopPropagation: () => {} }),
            className: 'receive-items'
        },
        {
            label: 'Mark Complete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
            ),
            onClick: (row) => handleCompleteClick(row, { stopPropagation: () => {} }),
            className: 'complete'
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
            header: 'Requester',
            accessor: 'requestOrder.requesterName',
            filterType: 'select'
        },
        {
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        }
    ];

    // Calculate statistics
    const stats = purchaseOrderService.utils.getStatistics(purchaseOrders);
    const overdueCount = purchaseOrders.filter(po => {
        const days = getDaysUntilDelivery(po.expectedDeliveryDate);
        return days !== null && days < 0;
    }).length;

    const dueTodayCount = purchaseOrders.filter(po => {
        const days = getDaysUntilDelivery(po.expectedDeliveryDate);
        return days === 0;
    }).length;

    return (
        <div className="validated-purchase-orders-container">


            {/* Validated Purchase Orders Table */}
            <div className="purchase-orders-section">
                <DataTable
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={loading}
                    emptyMessage="No validated purchase orders found"
                    className="validated-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                />
            </div>

            {/* Completion Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showCompleteDialog}
                type="success"
                title="Complete Purchase Order"
                message={`Are you sure you want to mark purchase order "${selectedOrderForCompletion?.poNumber}" as completed? This indicates that all items have been received.`}
                confirmText="Mark Complete"
                cancelText="Cancel"
                onConfirm={handleConfirmCompletion}
                onCancel={handleCancelCompletion}
                isLoading={isCompleting}
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

export default ValidatedPurchaseOrders;