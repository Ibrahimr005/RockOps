import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';


const PendingPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

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

    // Column configuration for pending purchase orders
    const pendingOrderColumns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
            // Render the value directly without a Link
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'requestOrder.title',
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requestOrder.requesterName',
            render: (row, value) => value || 'N/A'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            id: 'totalAmount',
            header: 'TOTAL',
            accessor: 'totalAmount',
            render: (row, value) => value ? `$${value.toFixed(2)}` : 'N/A'
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
                showSearch={true}
            />
        </div>
    );
};

export default PendingPurchaseOrders;