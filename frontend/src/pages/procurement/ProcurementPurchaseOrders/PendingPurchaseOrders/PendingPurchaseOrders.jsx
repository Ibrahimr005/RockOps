import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';

const PendingPurchaseOrders = () => {
    const navigate = useNavigate();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Validation dialog states
    const [showValidateDialog, setShowValidateDialog] = useState(false);
    const [selectedOrderForValidation, setSelectedOrderForValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        fetchPendingPurchaseOrders();
    }, []);

    const fetchPendingPurchaseOrders = async () => {
        try {
            setLoading(true);
            const data = await purchaseOrderService.getPending();
            setPurchaseOrders(data);
        } catch (err) {
            console.error('Error fetching pending purchase orders:', err);
            setNotificationMessage('Failed to load pending purchase orders. Please try again later.');
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/${row.id}`);
    };

    const handleValidateClick = (row, e) => {
        e.stopPropagation();
        setSelectedOrderForValidation(row);
        setShowValidateDialog(true);
    };

    const handleConfirmValidation = async () => {
        if (!selectedOrderForValidation) return;

        setIsValidating(true);

        try {
            await purchaseOrderService.updateStatus(selectedOrderForValidation.id, 'VALIDATED');

            setNotificationMessage('Purchase order validated successfully!');
            setNotificationType('success');
            setShowNotification(true);

            // Refresh the list
            await fetchPendingPurchaseOrders();
        } catch (err) {
            console.error('Error validating purchase order:', err);
            setNotificationMessage(`Error: ${err.message || 'Failed to validate purchase order'}`);
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsValidating(false);
            setShowValidateDialog(false);
            setSelectedOrderForValidation(null);
        }
    };

    const handleCancelValidation = () => {
        setShowValidateDialog(false);
        setSelectedOrderForValidation(null);
        setIsValidating(false);
    };

    const getStatusClass = (status) => {
        const statusClasses = {
            'CREATED': 'status-created',
            'PENDING': 'status-pending',
            'PARTIALLY_RECEIVED': 'status-partially-received'
        };
        return statusClasses[status] || 'status-default';
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
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'requestOrder.deadline',
            sortable: true,
            minWidth: '150px',
            render: (row) => purchaseOrderService.utils.formatDate(row.requestOrder?.deadline)
        },
        {
            id: 'expectedDeliveryDate',
            header: 'EXPECTED DELIVERY',
            accessor: 'expectedDeliveryDate',
            sortable: true,
            minWidth: '150px',
            render: (row) => purchaseOrderService.utils.formatDate(row.expectedDeliveryDate)
        },


    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'View',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            ),
            onClick: (row) => handleValidateClick(row, { stopPropagation: () => {} }),
            className: 'View',

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

    return (
        <div className="pending-purchase-orders-container">


            {/* Pending Purchase Orders Table */}
            <div className="purchase-orders-section">
                <DataTable
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={loading}
                    emptyMessage="No pending purchase orders found"
                    className="pending-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                />
            </div>

            {/* Validation Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showValidateDialog}
                type="success"
                title="Validate Purchase Order"
                message={`Are you sure you want to validate purchase order "${selectedOrderForValidation?.poNumber}"? This will mark it as validated and ready for delivery.`}
                confirmText="Validate Order"
                cancelText="Cancel"
                onConfirm={handleConfirmValidation}
                onCancel={handleCancelValidation}
                isLoading={isValidating}
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

export default PendingPurchaseOrders;