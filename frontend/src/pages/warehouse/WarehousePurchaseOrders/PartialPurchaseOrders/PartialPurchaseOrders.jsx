import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import PurchaseOrderApprovalModal from '../PurchaseOrderApproveModal/PurchaseOrderApprovalModal';

const PartialPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [partialOrders, setPartialOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [purchaseOrderToApprove, setPurchaseOrderToApprove] = useState(null);

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPartialPurchaseOrders();
        }
    }, [warehouseId]);

    // Function to fetch partial purchase orders
    const fetchPartialPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await purchaseOrderService.getAll();

            // Filter orders to show only PARTIAL orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'PARTIAL' && order.requestOrder.requesterId === warehouseId
            );

            setPartialOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching partial purchase orders:', error);
            setPartialOrders([]);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch partial purchase orders.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle approve purchase order - opens approval modal
    const handleContinueReceiving = (purchaseOrder) => {
        setPurchaseOrderToApprove(purchaseOrder);
        setShowApprovalModal(true);
    };

    // Handle approval from modal
    const handleApprovalConfirm = async (updatedPurchaseOrder) => {
        try {
            // Show success message
            if (onShowSnackbar) {
                const status = updatedPurchaseOrder.status;
                let message = '';

                if (status === 'COMPLETED') {
                    message = `All items received! Purchase order ${updatedPurchaseOrder.poNumber} is now complete.`;
                } else if (status === 'PARTIAL') {
                    message = `Items received! Purchase order ${updatedPurchaseOrder.poNumber} updated.`;
                } else {
                    message = `Purchase order ${updatedPurchaseOrder.poNumber} updated successfully!`;
                }

                onShowSnackbar(message, 'success');
            }

            // Refresh the data to update the list
            await fetchPartialPurchaseOrders();

        } catch (error) {
            console.error('Error after receiving items:', error);
            if (onShowSnackbar) {
                onShowSnackbar('An error occurred after receiving items.', 'error');
            }
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

    // Column configuration for partial purchase orders
    const partialOrderColumns = [
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
            label: 'Continue',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleContinueReceiving(row),
            className: 'approve'
        }
    ];

    return (
        <div className="partial-purchase-orders-container">
            <DataTable
                data={partialOrders}
                columns={partialOrderColumns}
                loading={isLoading}
                emptyMessage="No partial purchase orders found."
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

export default PartialPurchaseOrders;