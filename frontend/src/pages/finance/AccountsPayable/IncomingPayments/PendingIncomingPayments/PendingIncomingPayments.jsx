import React, { useState } from 'react';
import { FiEye, FiRefreshCw, FiCornerDownRight } from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import ConfirmIncomingPaymentModal from '../ConfirmIncomingPaymentModal/ConfirmIncomingPaymentModal';
import './PendingIncomingPayments.scss';

const PendingIncomingPayments = ({ payments, loading, onDataChange, onSuccess, onError }) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const handleConfirmClick = (payment) => {
        setSelectedPayment(payment);
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        if (onSuccess) onSuccess('Incoming payment confirmed successfully!');
        if (onDataChange) onDataChange();
        setShowConfirmModal(false);
        setSelectedPayment(null);
    };

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
            label: 'Review & Confirm',
            icon: <FiEye />,
            onClick: handleConfirmClick,
            className: 'primary'
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
        <>
            <div className="pending-incoming-payments-container">
                <DataTable
                    data={payments || []}
                    columns={columns}
                    actions={actions}
                    loading={loading}
                    emptyMessage="No pending incoming payments"
                    className="pending-incoming-payments-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 15, 20]}
                    showExportButton={true}
                    exportFileName="pending-incoming-payments"
                    exportButtonText="Export Pending Payments"
                />
            </div>

            {showConfirmModal && selectedPayment && (
                <ConfirmIncomingPaymentModal
                    payment={selectedPayment}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setSelectedPayment(null);
                    }}
                    onConfirm={handleConfirmSubmit}
                    onError={onError}
                />
            )}
        </>
    );
};

export default PendingIncomingPayments;