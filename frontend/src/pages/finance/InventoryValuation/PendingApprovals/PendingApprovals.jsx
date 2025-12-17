import React, { useState, useEffect } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './PendingApprovals.scss';
import { inventoryValuationService } from '../../../../services/finance/inventoryValuationService.js';
import PriceApprovalModal from '../PriceApprovalModal/PriceApprovalModal.jsx';

const PendingApprovals = ({ showSnackbar, onPendingCountUpdate }) => {
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    useEffect(() => {
        if (onPendingCountUpdate) {
            onPendingCountUpdate(pendingItems.length);
        }
    }, [pendingItems, onPendingCountUpdate]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const data = await inventoryValuationService.getAllPendingApprovals();
            setPendingItems(data);
        } catch (error) {
            console.error('Failed to fetch pending approvals:', error);
            showSnackbar('Failed to load pending approvals', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (row) => {
        setSelectedItems([row]);
        setIsBulkMode(false);
        setIsModalOpen(true);
    };

    const handleBulkApproveClick = () => {
        if (pendingItems.length === 0) {
            showSnackbar('No items to approve', 'error');
            return;
        }
        setSelectedItems(pendingItems);
        setIsBulkMode(true);
        setIsModalOpen(true);
    };

    const handleApprovalComplete = () => {
        fetchPendingApprovals();
        setIsModalOpen(false);
        showSnackbar(
            isBulkMode
                ? 'Items approved successfully!'
                : 'Item approved successfully!',
            'success'
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const columns = [
        {
            accessor: 'warehouseName',
            header: 'WAREHOUSE',
            width: '180px',
            render: (row) => (
                <div className="warehouse-info">
                    <span className="warehouse-name">{row.warehouseName}</span>

                </div>
            )
        },
        {
            accessor: 'itemTypeCategory',
            header: 'CATEGORY',
            width: '150px',
            render: (row) => (
                <span className="category-tag">{row.itemTypeCategory}</span>
            )
        },
        {
            accessor: 'itemTypeName',
            header: 'ITEM',
            width: '200px'
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '120px',
            render: (row) => (
                <span className="quantity-value">
                    {row.quantity} {row.measuringUnit}
                </span>
            )
        },
        {
            accessor: 'suggestedPrice',
            header: 'SUGGESTED PRICE',
            width: '150px',
            render: (row) => (
                <span className="suggested-price">
                    {row.suggestedPrice ? `${row.suggestedPrice.toFixed(2)} EGP` : '—'}
                </span>
            )
        },
        {
            accessor: 'createdAt',
            header: 'REQUESTED',
            width: '180px',
            render: (row) => (
                <span className="date-value">{formatDate(row.createdAt)}</span>
            )
        },
        {
            accessor: 'createdBy',
            header: 'REQUESTED BY',
            width: '150px',
            render: (row) => (
                <span className="user-value">{row.createdBy || 'N/A'}</span>
            )
        }
    ];

    const actions = [
        {
            label: 'Approve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ),
            className: 'approve',
            onClick: handleApproveClick
        }
    ];

    return (
        <>


            {/* DataTable */}
            <DataTable
                data={pendingItems}
                columns={columns}
                loading={loading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20, 50]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                    { accessor: 'warehouseName', header: 'Warehouse' },
                    { accessor: 'siteName', header: 'Site' },
                    { accessor: 'itemTypeCategory', header: 'Category' },
                    { accessor: 'itemTypeName', header: 'Item' },
                    { accessor: 'createdBy', header: 'Requested By' }
                ]}
                actions={actions}
                className="pending-approvals-table"
                emptyMessage="No items pending approval"
                showAddButton={pendingItems.length > 0}
                addButtonText="Approve All"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                }
                onAddClick={handleBulkApproveClick}
                showExportButton={true}
                exportButtonText="Export Pending Items"
                exportFileName="pending_approvals"
                customExportHeaders={{
                    'warehouseName': 'Warehouse',
                    'siteName': 'Site',
                    'itemTypeCategory': 'Category',
                    'itemTypeName': 'Item Name',
                    'quantity': 'Quantity',
                    'measuringUnit': 'Unit',
                    'suggestedPrice': 'Suggested Price',
                    'createdAt': 'Requested On',
                    'createdBy': 'Requested By'
                }}
            />

            {/* Price Approval Modal */}
            <PriceApprovalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedItems={selectedItems}
                isBulkMode={isBulkMode}
                onApprovalComplete={handleApprovalComplete}
                showSnackbar={showSnackbar}
            />
        </>
    );
};

export default PendingApprovals;