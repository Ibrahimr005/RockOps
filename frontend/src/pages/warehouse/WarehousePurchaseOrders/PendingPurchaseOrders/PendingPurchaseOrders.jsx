import React, { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import PurchaseOrderApprovalModal from '../PurchaseOrderApproveModal/PurchaseOrderApprovalModal';

const PendingPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [purchaseOrderToApprove, setPurchaseOrderToApprove] = useState(null);

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPendingPurchaseOrders();
        }
    }, [warehouseId]);

    // Function to fetch pending purchase orders
    const fetchPendingPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await purchaseOrderService.getAll();

            console.log("all orders:", JSON.stringify(allOrders, null, 2));

            // Filter orders to show only PENDING orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'PENDING' && order.requestOrder.requesterId === warehouseId
            );

            console.log("filtered orders:", JSON.stringify(filteredOrders, null, 2));

            setPendingOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching pending purchase orders:', error);
            setPendingOrders([]);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch pending purchase orders.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle approve purchase order - now opens approval modal
    const handleApprovePurchaseOrder = (purchaseOrder) => {
        setPurchaseOrderToApprove(purchaseOrder);
        setShowApprovalModal(true);
    };

    // Handle approval from modal
    const handleApprovalConfirm = async (approvalData) => {
        try {
            setIsLoading(true);

            // Call the service to approve the purchase order with item details
            await purchaseOrderService.approveWithItems(approvalData);

            // Show success message
            if (onShowSnackbar) {
                onShowSnackbar(`Purchase order ${purchaseOrderToApprove.poNumber} approved successfully!`, 'success');
            }

            // Refresh the data to remove the approved order from the pending list
            await fetchPendingPurchaseOrders();

        } catch (error) {
            console.error('Error approving purchase order:', error);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to approve purchase order. Please try again.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle closing approval modal
    const handleApprovalModalClose = () => {
        setShowApprovalModal(false);
        setPurchaseOrderToApprove(null);
    };

    // Handle row click to show purchase order details
    const handleRowClick = (purchaseOrder) => {
        setSelectedPurchaseOrder(purchaseOrder);
        setShowModal(true);
    };

    // Handle closing modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPurchaseOrder(null);
    };

    // Column configuration for pending purchase orders (removed requester column)
    const pendingOrderColumns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            sortable: true,
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            sortable: true,
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'totalAmount',
            header: 'TOTAL',
            accessor: 'totalAmount',
            sortable: true,
            render: (row, value) => value ? `$${value.toFixed(2)}` : 'N/A'
        }
    ];

    // Filterable columns configuration
    const filterableColumns = [
        {
            accessor: 'poNumber',
            header: 'PO Number',
            filterType: 'text'
        },
        {
            accessor: 'requestOrder.title',
            header: 'Title',
            filterType: 'text'
        },
        {
            accessor: 'totalAmount',
            header: 'Total Amount',
            filterType: 'number'
        }
    ];

    // Actions configuration
    const actions = [
        {
            label: 'Approve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleApprovePurchaseOrder(row),
            className: 'approve'
        }
    ];

    return (
        <div className="pending-purchase-orders-container">
            <DataTable
                data={pendingOrders}
                columns={pendingOrderColumns}
                loading={isLoading}
                emptyMessage="No pending purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                actions={actions}
                actionsColumnWidth="100px"
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />

            {/* Purchase Order Approval Modal */}
            <PurchaseOrderApprovalModal
                purchaseOrder={purchaseOrderToApprove}
                isOpen={showApprovalModal}
                onClose={handleApprovalModalClose}
                onApprove={handleApprovalConfirm}
            />
        </div>
    );
};

export default PendingPurchaseOrders;