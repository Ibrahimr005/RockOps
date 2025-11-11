import React, { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import ProcessDeliveryModal from '../ProcessDeliveryModal/ProcessDeliveryModal';

const PendingPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Process Delivery Modal states
    const [showProcessDeliveryModal, setShowProcessDeliveryModal] = useState(false);
    const [purchaseOrderToProcess, setPurchaseOrderToProcess] = useState(null);

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

            // Filter orders to show only PENDING orders for the specific warehouse
            // NOTE: Assuming requestOrder.requesterId is the correct field for the warehouse ID
            const filteredOrders = allOrders.filter(order =>
                order.status === 'PENDING' && order.requestOrder?.requesterId === warehouseId
            );

            console.log("filtered pending orders for warehouse:", filteredOrders);

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

    /**
     * Handled by the DataTable action button.
     * Sets the PO to process and opens the delivery modal.
     */
    const handleOpenProcessDeliveryModal = (purchaseOrder) => {
        setPurchaseOrderToProcess(purchaseOrder);
        setShowProcessDeliveryModal(true);
    };

    /**
     * Handled by the ProcessDeliveryModal's onSubmit prop.
     * Executes the API call to finalize the delivery process.
     */
    const handleDeliverySubmit = async (deliveryData) => {
        const purchaseOrder = purchaseOrderToProcess;

        // Immediately close the modal for a better user experience
        handleProcessDeliveryModalClose();

        if (!purchaseOrder) {
            if (onShowSnackbar) {
                onShowSnackbar('Error: No purchase order selected for delivery.', 'error');
            }
            return;
        }

        try {
            await purchaseOrderService.processDelivery(purchaseOrder.id, deliveryData);

            // Refresh the list to remove the processed order
            fetchPendingPurchaseOrders();

            if (onShowSnackbar) {
                onShowSnackbar(`Delivery for PO ${purchaseOrder.poNumber} processed successfully!`, 'success');
            }
        } catch (error) {
            console.error('Error processing delivery:', error);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to process delivery. Please try again.', 'error');
            }
        }
    };

    // Handle closing process delivery modal
    const handleProcessDeliveryModalClose = () => {
        setShowProcessDeliveryModal(false);
        setPurchaseOrderToProcess(null);
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

    // Column configuration for pending purchase orders
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
            // Use optional chaining for safe access
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

    // Actions configuration - now just one action to process delivery
    const actions = [
        {
            label: 'Process Delivery',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5"/>
                    <path d="M8 3H3v5"/>
                    <path d="M12 22v-8"/>
                    <path d="M16 18l-4 4-4-4"/>
                    <path d="M3 8l9-5 9 5"/>
                </svg>
            ),
            // THIS IS THE FIX: Call the function that opens the modal
            onClick: (row) => handleOpenProcessDeliveryModal(row),
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
                actionsColumnWidth="150px"
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />

            {/* Process Delivery Modal - Unified modal for receiving and reporting issues */}
            <ProcessDeliveryModal
                purchaseOrder={purchaseOrderToProcess}
                isOpen={showProcessDeliveryModal}
                onClose={handleProcessDeliveryModalClose}
                // THIS IS THE FIX: Pass the dedicated submission handler
                onSubmit={handleDeliverySubmit}
            />
        </div>
    );
};

export default PendingPurchaseOrders;