import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal.jsx';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';

const PendingPurchaseOrders = ({ purchaseOrders: propsPurchaseOrders, onDataChange, loading: parentLoading }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Validation dialog states
    const [showValidateDialog, setShowValidateDialog] = useState(false);
    const [selectedOrderForValidation, setSelectedOrderForValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);

    const purchaseOrders = propsPurchaseOrders || [];


    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.id}`);
    };


    const handleCloseModal = () => {
        setShowViewModal(false);
        setSelectedPurchaseOrder(null);
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
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            filterable: true,
            minWidth: '250px',
            render: (row) => row.requestOrder?.title || '-'
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
            id: 'totalAmount',
            header: 'TOTAL AMOUNT',
            accessor: 'totalAmount',
            sortable: true,
            minWidth: '150px',
            render: (row) => `${row.currency || 'EGP'} ${parseFloat(row.totalAmount || 0).toFixed(2)}`
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

    // Define actions for DataTable - keeping validate action
    const actions = [

    ];

    // Define filterable columns
// Define filterable columns
    const filterableColumns = [
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
            filterType: 'range' // or 'number' depending on your DataTable implementation
        },
        {
            header: 'Deadline',
            accessor: 'requestOrder.deadline',
            filterType: 'date'
        },
        {
            header: 'Expected Delivery',
            accessor: 'expectedDeliveryDate',
            filterType: 'date'
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
                    loading={parentLoading}
                    emptyMessage="No pending purchase orders found"
                    className="pending-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    showExportButton={true}
                    exportFileName="pending-purchase-orders"
                    exportButtonText="Export Purchase Orders"
                />
            </div>

            {/* Purchase Order View Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showViewModal}
                onClose={handleCloseModal}
            />

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