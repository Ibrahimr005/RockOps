import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './ConfirmedReturns.scss';

const ConfirmedReturns = ({ returns, loading, onDataChange, onSuccess, onError }) => {
    const navigate = useNavigate();

    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-order-returns/${row.id}`);
    };

    const handleViewItems = (row, e) => {
        e.stopPropagation();
        console.log('View items for return:', row);
    };

    const columns = [
        {
            id: 'returnId',
            header: 'RETURN ID',
            accessor: 'returnId',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => (
                <span className="return-id-badge">
                {row.returnId}
            </span>
            )
        },
        {
            id: 'purchaseOrderNumber',
            header: 'PO NUMBER',
            accessor: 'purchaseOrderNumber',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => (
                <span className="po-number-link">
                    {row.purchaseOrderNumber}
                </span>
            )
        },
        {
            id: 'merchantName',
            header: 'MERCHANT',
            accessor: 'merchantName',
            sortable: true,
            filterable: true,
            minWidth: '200px'
        },
        {
            id: 'totalReturnAmount',
            header: 'RETURN AMOUNT',
            accessor: 'totalReturnAmount',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="amount-cell confirmed">
                    {row.totalReturnAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} EGP
                </span>
            )
        },
        {
            id: 'itemCount',
            header: 'ITEMS',
            accessor: 'returnItems',
            sortable: true,
            minWidth: '100px',
            render: (row) => (
                <span className="items-count-badge">
                    {row.returnItems?.length || 0}
                </span>
            )
        },
        {
            id: 'requestedBy',
            header: 'REQUESTED BY',
            accessor: 'requestedBy',
            sortable: true,
            filterable: true,
            minWidth: '180px'
        },
        {
            id: 'requestedAt',
            header: 'REQUESTED DATE',
            accessor: 'requestedAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="date-cell">
                    {new Date(row.requestedAt).toLocaleDateString()}
                </span>
            )
        },
        {
            id: 'updatedAt',
            header: 'CONFIRMED DATE',
            accessor: 'updatedAt',
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="date-cell confirmed">
                    {new Date(row.updatedAt).toLocaleDateString()}
                </span>
            )
        },

    ];

    const actions = [
        {
            label: 'View Items',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            onClick: (row) => handleViewItems(row, { stopPropagation: () => {} }),
            className: 'view'
        }
    ];

    const filterableColumns = [
        {
            header: 'Return Number',
            accessor: 'returnNumber',
            filterType: 'text'
        },
        {
            header: 'PO Number',
            accessor: 'purchaseOrderNumber',
            filterType: 'text'
        },
        {
            header: 'Merchant',
            accessor: 'merchantName',
            filterType: 'select'
        },
        {
            header: 'Requested By',
            accessor: 'requestedBy',
            filterType: 'select'
        }
    ];

    return (
        <div className="confirmed-returns-container">
            <DataTable
                data={returns || []}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No confirmed returns found"
                className="confirmed-returns-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showExportButton={true}
                exportFileName="confirmed-po-returns"
                exportButtonText="Export Confirmed Returns"
            />
        </div>
    );
};

export default ConfirmedReturns;