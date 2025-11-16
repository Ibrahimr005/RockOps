import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';
import ProcessDeliveryModal from '../ProcessDeliveryModal/ProcessDeliveryModal';

const PartialPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [partialOrders, setPartialOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Process Delivery Modal states
    const [showProcessDeliveryModal, setShowProcessDeliveryModal] = useState(false);
    const [purchaseOrderToProcess, setPurchaseOrderToProcess] = useState(null);

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
                order.status === 'PARTIAL' && order.requestOrder?.requesterId === warehouseId
            );

            console.log("filtered partial orders for warehouse:", filteredOrders);

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

    /**
     * Opens the delivery modal for continuing to receive items
     */
    const handleOpenProcessDeliveryModal = (purchaseOrder) => {
        setPurchaseOrderToProcess(purchaseOrder);
        setShowProcessDeliveryModal(true);
    };

    /**
     * Handles the delivery submission from the modal
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
            const updatedPO = await purchaseOrderService.processDelivery(purchaseOrder.id, deliveryData);

            // Refresh the list
            fetchPartialPurchaseOrders();

            // Show appropriate message based on new status
            let message = '';
            if (updatedPO.status === 'COMPLETED') {
                message = `All items received! PO ${purchaseOrder.poNumber} is now complete.`;
            } else if (updatedPO.status === 'PARTIAL') {
                message = `Additional items received for PO ${purchaseOrder.poNumber}.`;
            } else {
                message = `Delivery for PO ${purchaseOrder.poNumber} processed successfully!`;
            }

            if (onShowSnackbar) {
                onShowSnackbar(message, 'success');
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

    // Actions configuration - Continue receiving remaining items
    const actions = [
        {
            label: 'Continue Receiving',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5"/>
                    <path d="M8 3H3v5"/>
                    <path d="M12 22v-8"/>
                    <path d="M16 18l-4 4-4-4"/>
                    <path d="M3 8l9-5 9 5"/>
                </svg>
            ),
            onClick: (row) => handleOpenProcessDeliveryModal(row),
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
                actionsColumnWidth="180px"
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />

            {/* Process Delivery Modal - for continuing to receive remaining items */}
            <ProcessDeliveryModal
                purchaseOrder={purchaseOrderToProcess}
                isOpen={showProcessDeliveryModal}
                onClose={handleProcessDeliveryModalClose}
                onSubmit={handleDeliverySubmit}
            />
        </div>
    );
};

export default PartialPurchaseOrders;