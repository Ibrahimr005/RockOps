import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import CreatePOReturnModal from '../CreatePOReturnModal/CreatePOReturnModal.jsx';
import './PendingReturns.scss';

const PendingReturns = ({ returns, loading, onDataChange, onSuccess, onError }) => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleRowClick = (row) => {
        navigate(`/procurement/purchase-orders/details/${row.purchaseOrderId}`);
    };

    const handleViewItems = (row, e) => {
        e.stopPropagation();
        console.log('View items for return:', row);
    };

    const handleAddReturn = () => {
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
    };

    const handleCreateSuccess = (message) => {
        if (onSuccess) onSuccess(message);
        if (onDataChange) onDataChange();
        setShowCreateModal(false);
    };

    const columns = [
        {
            id: 'returnNumber',
            header: 'RETURN NUMBER',
            accessor: 'returnNumber',
            sortable: true,
            filterable: true,
            minWidth: '200px'
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
                <span className="amount-cell">
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
            minWidth: '180px',
            render: (row) => (
                <span className="date-cell">
                    {new Date(row.requestedAt).toLocaleDateString()}
                </span>
            )
        }
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
        <>
            <div className="pending-returns-container">
                <DataTable
                    data={returns || []}
                    columns={columns}
                    actions={actions}
                    onRowClick={handleRowClick}
                    loading={loading}
                    emptyMessage="No pending returns found"
                    className="pending-returns-table"
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    defaultItemsPerPage={10}
                    itemsPerPageOptions={[5, 10, 15, 20]}
                    showAddButton={true}
                    addButtonText="Create Return"
                    addButtonIcon={<FiPlus />}
                    onAddClick={handleAddReturn}
                    showExportButton={true}
                    exportFileName="pending-po-returns"
                    exportButtonText="Export Pending Returns"
                />
            </div>

            {/* Create PO Return Modal */}
            <CreatePOReturnModal
                isOpen={showCreateModal}
                onClose={handleCloseModal}
                onSuccess={handleCreateSuccess}
                onError={onError}
            />
        </>
    );
};

export default PendingReturns;