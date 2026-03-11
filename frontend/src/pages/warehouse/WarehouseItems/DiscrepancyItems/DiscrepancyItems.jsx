import React, { useState } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import { itemService } from '../../../../services/warehouse/itemService';
import ResolveDiscrepancyModal from "./ResolveModal/ResolveDiscrepancyModal.jsx";
import "./DiscrepancyModal.scss";

const DiscrepancyItems = ({
                              warehouseId,
                              activeTab,
                              filteredData,
                              loading,
                              showSnackbar,
                              refreshItems
                          }) => {
    const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const getMeasuringUnitLabel = (measuringUnit) => {
        if (!measuringUnit) return '';
        if (typeof measuringUnit === 'string') return measuringUnit;
        return measuringUnit.displayName || measuringUnit.abbreviation || measuringUnit.name || '';
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenResolutionModal = (item) => {
        setSelectedItem(item);
        setIsResolutionModalOpen(true);
    };

    const handleCloseResolutionModal = () => {
        setIsResolutionModalOpen(false);
        setSelectedItem(null);
    };

    const handleResolutionSubmit = async (resolutionData) => {
        if (!selectedItem) return;
        try {
            const resolution = {
                itemId: selectedItem.id,
                resolutionType: resolutionData.resolutionType,
                notes: resolutionData.notes,
                transactionId: resolutionData.transactionId,
                resolvedBy: localStorage.getItem('userInfo')
                    ? JSON.parse(localStorage.getItem('userInfo')).username
                    : "system"
            };
            await itemService.resolveDiscrepancy(resolution);
            refreshItems();
            handleCloseResolutionModal();
            showSnackbar("Discrepancy resolved successfully", "success");
        } catch (error) {
            console.error("Failed to resolve item:", error);
            showSnackbar("Failed to resolve discrepancy", "error");
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await itemService.deleteItem(itemId);
            refreshItems();
            showSnackbar("Item deleted successfully", "success");
        } catch (error) {
            console.error('Delete error:', error);
            showSnackbar("Failed to delete item", "error");
        }
    };

    // ─── Table Config ─────────────────────────────────────────────────────────

    const discrepancyItemColumns = [
        {
            accessor: 'itemType.itemCategory.parentCategory.name',
            header: 'PARENT CATEGORY',
            width: '160px',
            render: (row) => (
                <span className="parent-category-tag">
                    {row.itemType?.itemCategory?.parentCategory?.name || "No Parent"}
                </span>
            )
        },
        {
            accessor: 'itemType.itemCategory.name',
            header: 'CHILD CATEGORY',
            width: '160px',
            render: (row) => (
                <span className="category-tag">
                    {row.itemType?.itemCategory?.name || "No Category"}
                </span>
            )
        },
        {
            accessor: 'itemType.name',
            header: 'ITEM',
            width: '180px'
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '150px'
        },
        {
            accessor: 'itemType.measuringUnit.displayName',
            header: 'UNIT',
            width: '120px',
            render: (row) => getMeasuringUnitLabel(row.itemType?.measuringUnit)
        },
        {
            accessor: 'transaction.batchNumber',
            header: 'BATCH #',
            width: '140px',
            render: (row) => (
                <span className="batch-number">
                    {row.transaction?.batchNumber || row.batchNumber || 'N/A'}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: 'Resolve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            ),
            onClick: (row) => handleOpenResolutionModal(row),
            className: 'resolve'
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            ),
            onClick: (row) => handleDeleteItem(row.id),
            className: 'delete'
        }
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Resolution info card */}
            <div className="resolution-info-card">
                <div className="resolution-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <div className="resolution-info-content">
                    <h3>Inventory Discrepancy Resolution</h3>
                    <p>
                        {activeTab === 'missingItems'
                            ? 'Items marked as "Missing" represent inventory shortages identified during transactions. These items were expected to be received but were not found. Review and resolve these discrepancies to maintain accurate inventory records.'
                            : 'Items marked as "Excess" represent inventory surpluses identified during transactions. These are items that were received beyond expected quantities. Review and resolve these discrepancies to determine appropriate action.'}
                    </p>
                </div>
            </div>

            {/* DataTable */}
            <DataTable
                data={filteredData}
                columns={discrepancyItemColumns}
                loading={loading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                    { accessor: 'itemType.itemCategory.parentCategory.name', header: 'Parent Category' },
                    { accessor: 'itemType.itemCategory.name', header: 'Category' },
                    { accessor: 'itemType.name', header: 'Item' },
                    { accessor: 'transaction.batchNumber', header: 'Batch Number' }
                ]}
                actions={actions}
                className="discrepancy-items-table"
            />

            {/* Resolve Modal */}
            <ResolveDiscrepancyModal
                isOpen={isResolutionModalOpen}
                onClose={handleCloseResolutionModal}
                selectedItem={selectedItem}
                onSubmit={handleResolutionSubmit}
            />
        </>
    );
};

export default DiscrepancyItems;