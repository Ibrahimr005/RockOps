import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal.jsx';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService.js';

const CompletedPurchaseOrders = ({ purchaseOrders: propsPurchaseOrders, onDataChange, loading: parentLoading }) => {
    const navigate = useNavigate();
    const purchaseOrders = propsPurchaseOrders || [];
    const [loading, setLoading] = useState(true);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);


    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.id}`, {
            state: { from: 'procurement' }
        });
    };

    const handleCloseModal = () => {
        setShowViewModal(false);
        setSelectedPurchaseOrder(null);
    };

    const getStatusClass = (status) => {
        const statusClasses = {
            'COMPLETED': 'status-completed',
            'CANCELLED': 'status-cancelled'
        };
        return statusClasses[status] || 'status-default';
    };

    const getCompletionDate = (order) => {
        // Try to get the most recent relevant date
        if (order.completedAt) return order.completedAt;
        if (order.updatedAt) return order.updatedAt;
        return order.createdAt;
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
            id: 'completedAt',
            header: 'COMPLETED AT',
            accessor: 'completedAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => purchaseOrderService.utils.formatDate(getCompletionDate(row))
        }
    ];

    // No actions for completed orders - read-only
    const actions = [];

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
            header: 'Status',
            accessor: 'status',
            filterType: 'select'
        },
        {
            header: 'Total Amount',
            accessor: 'totalAmount',
            filterType: 'range'
        }
    ];

    const completedCount = purchaseOrders.filter(po => po.status === 'COMPLETED').length;
    const cancelledCount = purchaseOrders.filter(po => po.status === 'CANCELLED').length;

    return (
        <div className="completed-purchase-orders-container">


            {/* Completed Purchase Orders Table */}
            <div className="purchase-orders-section">
                <DataTable
                    data={purchaseOrders}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={parentLoading}
                    emptyMessage="No completed purchase orders found"
                    className="completed-purchase-orders-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={15}
                    itemsPerPageOptions={[10, 15, 25, 50]}
                    showExportButton={true}
                    exportFileName="completed-purchase-orders"
                    exportButtonText="Export Completed Orders"
                />
            </div>

            {/* Purchase Order View Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showViewModal}
                onClose={handleCloseModal}
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

export default CompletedPurchaseOrders;