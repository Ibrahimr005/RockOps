import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { Link } from 'react-router-dom';

const CompletedPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [completedOrders, setCompletedOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

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

    // Column configuration for completed purchase orders
    const completedOrderColumns = [
        {
            id: 'poNumber',
            header: 'PO NUMBER',
            accessor: 'poNumber',
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
        <div className="completed-purchase-orders-container">
            <DataTable
                data={completedOrders}
                columns={completedOrderColumns}
                loading={isLoading}
                emptyMessage="No completed purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                showSearch={true}
            />
        </div>
    );
};

export default CompletedPurchaseOrders;