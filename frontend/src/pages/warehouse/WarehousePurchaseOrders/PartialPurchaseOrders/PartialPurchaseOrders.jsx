import React, { useState, useEffect } from 'react';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { Link } from 'react-router-dom';

const PartialPurchaseOrders = ({ warehouseId, onShowSnackbar }) => {
    const [partialOrders, setPartialOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

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

            // Filter orders to show only PARTIALLY_RECEIVED orders for the specific warehouse
            const filteredOrders = allOrders.filter(order =>
                order.status === 'PARTIALLY_RECEIVED' && order.requestOrder.requesterId === warehouseId
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

    // Column configuration for partial purchase orders
    const partialOrderColumns = [
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
        <div className="partial-purchase-orders-container">
            <DataTable
                data={partialOrders}
                columns={partialOrderColumns}
                loading={isLoading}
                emptyMessage="No partial purchase orders found."
                className="purchase-orders-table"
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                showSearch={true}
            />
        </div>
    );
};

export default PartialPurchaseOrders;