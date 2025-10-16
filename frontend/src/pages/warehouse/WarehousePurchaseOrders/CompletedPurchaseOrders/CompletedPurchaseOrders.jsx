import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import PurchaseOrderViewModal from '../../../../components/procurement/PurchaseOrderViewModal/PurchaseOrderViewModal';

const CompletedPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [completedOrders, setCompletedOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchCompletedPurchaseOrders();
        }
    }, [warehouseId]);

    // Function to fetch completed purchase orders
    const fetchCompletedPurchaseOrders = async () => {
        setIsLoading(true);
        try {
            const allOrders = await purchaseOrderService.getAll();

            // Filter orders to show only COMPLETED orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'COMPLETED' && order.requestOrder.requesterId === warehouseId
            );

            setCompletedOrders(filteredOrders);
        } catch (error) {
            console.error('Error fetching completed purchase orders:', error);
            setCompletedOrders([]);
            if (onShowSnackbar) {
                onShowSnackbar('Failed to fetch completed purchase orders.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
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

    // Column configuration for completed purchase orders
    const completedOrderColumns = [
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

    return (
        <div className="completed-purchase-orders-container">
            <DataTable
                data={completedOrders}
                columns={completedOrderColumns}
                loading={isLoading}
                emptyMessage="No completed purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                defaultSortField="createdAt"
                defaultSortDirection="desc"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                onRowClick={handleRowClick}
            />

            {/* Purchase Order Details Modal */}
            <PurchaseOrderViewModal
                purchaseOrder={selectedPurchaseOrder}
                isOpen={showModal}
                onClose={handleCloseModal}
            />
        </div>
    );
};

export default CompletedPurchaseOrders;