import React from 'react';
import { FiEye, FiRefreshCw, FiCornerDownRight } from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import './ConfirmedIncomingPayments.scss';

const ConfirmedIncomingPayments = ({ payments, loading, onDataChange, onSuccess, onError }) => {

    const getSourceBadge = (source) => {
        const badges = {
            REFUND: { label: 'Refund', icon: <FiRefreshCw />, className: 'source-refund' },
            PO_RETURN: { label: 'PO Return', icon: <FiCornerDownRight />, className: 'source-po-return' }
        };
        const badge = badges[source] || { label: source, className: 'source-other' };
        return (
            <span className={`source-badge ${badge.className}`}>
            {badge.icon && badge.icon}
                {badge.label}
        </span>
        );
    };

    const columns = [
        {
            id: 'sourceType',
            header: 'SOURCE',
            accessor: 'source',  // CHANGED from sourceType
            sortable: true,
            filterable: true,
            minWidth: '150px',
            render: (row) => getSourceBadge(row.source)  // CHANGED
        },
        {
            id: 'sourceReference',
            header: 'REFERENCE',
            accessor: 'sourceReferenceId',  // CHANGED
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => (
                <span className="reference-id">
                {row.sourceReferenceId || 'N/A'}
            </span>
            )
        },
        {
            id: 'purchaseOrderNumber',
            header: 'PO NUMBER',
            accessor: 'purchaseOrderNumber',
            sortable: true,
            filterable: true,
            minWidth: '150px'
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
            id: 'totalRefundAmount',
            header: 'AMOUNT',
            accessor: 'totalAmount',  // CHANGED from totalRefundAmount
            sortable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="amount-cell">
                {row.totalAmount?.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })} EGP
            </span>
            )
        },
        {
            id: 'itemCount',
            header: 'ITEMS',
            accessor: 'items',  // CHANGED from incomingPaymentItems
            sortable: true,
            minWidth: '100px',
            render: (row) => (
                <span className="items-count-badge">
                {row.items?.length || 0}
            </span>
            )
        },
        {
            id: 'createdAt',
            header: 'REQUESTED DATE',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '180px',
            render: (row) => (
                <span className="date-cell">
                {new Date(row.createdAt).toLocaleDateString()}
            </span>
            )
        }
    ];
    const actions = [
        {
            label: 'View Details',
            icon: <FiEye />,
            onClick: (row) => console.log('View details:', row),
            className: 'view'
        }
    ];

    const filterableColumns = [
        {
            header: 'Source Type',
            accessor: 'source',  // CHANGED
            filterType: 'select'
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
        }
    ];

    return (
        <div className="confirmed-incoming-payments-container">
            <DataTable
                data={payments || []}
                columns={columns}
                actions={actions}
                loading={loading}
                emptyMessage="No confirmed incoming payments"
                className="confirmed-incoming-payments-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showExportButton={true}
                exportFileName="confirmed-incoming-payments"
                exportButtonText="Export Confirmed Payments"
            />
        </div>
    );
};

export default ConfirmedIncomingPayments;