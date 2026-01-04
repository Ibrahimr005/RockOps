import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable';

const PendingPurchaseOrders = ({ orders, isLoading, onShowSnackbar }) => {
    const navigate = useNavigate();

    const handleRowClick = (purchaseOrder) => {
        // You need to pass warehouseId and warehouseData as props from parent
        navigate(`/procurement/purchase-orders/details/${purchaseOrder.id}`, {
            state: {
                from: 'warehouse',
                warehouseId: purchaseOrder.requestOrder?.requesterId, // Get from PO data
                warehouseName: purchaseOrder.requestOrder?.requesterName || 'Warehouse'
            }
        });
    };

    const handleReceive = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.id}`, {
            state: { activeTab: 'receiving' }
        });
    };

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

    const actions = [
        {
            label: 'Receive',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5"/>
                    <path d="M8 3H3v5"/>
                    <path d="M12 22v-8"/>
                    <path d="M16 18l-4 4-4-4"/>
                    <path d="M3 8l9-5 9 5"/>
                </svg>
            ),
            onClick: handleReceive,
            className: 'approve'
        }
    ];

    return (
        <div className="pending-purchase-orders-container">
            <DataTable
                data={orders}
                columns={pendingOrderColumns}
                loading={isLoading}
                emptyMessage="No purchase orders awaiting delivery."
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
        </div>
    );
};

export default PendingPurchaseOrders;