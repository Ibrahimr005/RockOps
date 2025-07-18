import React, { useState } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";

const DiscrepancyItems= ({
                                 warehouseId,
                                 activeTab,
                                 filteredData,
                                 loading,
                                 showSnackbar,
                                 refreshItems
                             }) => {
    // Modal states
    const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [resolutionData, setResolutionData] = useState({
        resolutionType: "",
        notes: "",
        transactionId: ""
    });

    // Modal handlers
    const handleOpenResolutionModal = (item) => {
        setSelectedItem(item);
        setResolutionData({
            resolutionType: "",
            notes: "",
            transactionId: item.relatedTransactionId || ""
        });
        setIsResolutionModalOpen(true);
    };

    const handleDeleteItem = async (itemId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                refreshItems();
                showSnackbar("Item deleted successfully", "success");
            } else {
                const errorText = await response.text();
                console.error("Failed to delete item:", response.status, errorText);
                showSnackbar("Failed to delete item", "error");
            }
        } catch (error) {
            console.error('Delete error:', error);
            showSnackbar("Error deleting item", "error");
        }
    };

    const handleResolutionSubmit = async (e) => {
        e.preventDefault();

        if (!selectedItem) return;

        try {
            const token = localStorage.getItem("token");

            const resolution = {
                itemId: selectedItem.id,
                resolutionType: resolutionData.resolutionType,
                notes: resolutionData.notes,
                transactionId: resolutionData.transactionId,
                resolvedBy: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).username : "system"
            };

            const response = await fetch(`http://localhost:8080/api/v1/items/resolve-discrepancy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(resolution),
            });

            if (response.ok) {
                refreshItems();
                setIsResolutionModalOpen(false);
                showSnackbar("Discrepancy resolved successfully", "success");
            } else {
                const errorText = await response.text();
                console.error("Failed to resolve item:", response.status, errorText);
                showSnackbar("Failed to resolve discrepancy", "error");
            }
        } catch (error) {
            console.error("Failed to resolve item:", error);
            showSnackbar("Error resolving discrepancy", "error");
        }
    };

    const handleResolutionInputChange = (e) => {
        const { name, value } = e.target;
        setResolutionData({
            ...resolutionData,
            [name]: value,
        });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'IN_WAREHOUSE':
                return 'In Warehouse';
            case 'DELIVERING':
                return 'Delivering';
            case 'PENDING':
                return 'Pending';
            case 'MISSING':
                return 'Missing Items';
            case 'OVERRECEIVED':
                return 'Excess Items';
            default:
                return status;
        }
    };

    // Table columns for discrepancy items
    const discrepancyItemColumns = [
        {
            accessor: 'itemType.itemCategory.name',
            header: 'CATEGORY',
            width: '200px',
            render: (row) => (
                <span className="category-tag">
          {row.itemType?.itemCategory?.name || "No Category"}
        </span>
            )
        },
        {
            accessor: 'itemType.name',
            header: 'ITEM',
            width: '210px'
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '210px'
        },
        {
            accessor: 'itemType.measuringUnit',
            header: 'UNIT',
            width: '210px',
            render: (row) => row.itemType?.measuringUnit || "N/A"
        },
        {
            accessor: 'transaction.batchNumber',
            header: 'BATCH #',
            width: '200px',
            render: (row) => (
                <span className="batch-number">
          {row.transaction?.batchNumber || row.batchNumber || 'N/A'}
        </span>
            )
        }
    ];

    // Table actions
    const actions = [
        {
            label: 'Resolve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            onClick: (row) => handleOpenResolutionModal(row),
            className: 'resolve'
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            ),
            onClick: (row) => handleDeleteItem(row.id),
            className: 'delete'
        }
    ];

    return (
        <>
            {/* Resolution info card */}
            <div className="resolution-info-card">
                <div className="resolution-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
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
                    { accessor: 'itemType.name', header: 'Item' },
                    { accessor: 'itemType.itemCategory.name', header: 'Category' },
                    { accessor: 'transaction.batchNumber', header: 'Batch Number' }
                ]}
                actions={actions}
                className="discrepancy-items-table"
            />

            {/* Resolution Modal */}
            {isResolutionModalOpen && selectedItem && (
                <div className="resolution-modal-backdrop">
                    <div className="resolution-modal">
                        <div className="resolution-modal-header">
                            <h2>Resolve Inventory Discrepancy</h2>
                            <button
                                className="btn-close"
                                onClick={() => setIsResolutionModalOpen(false)}
                            >
                            </button>
                        </div>

                        <div className="resolution-modal-body">
                            <div className="resolution-item-details">
                                <div className="resolution-detail">
                                    <span className="resolution-label">Item:</span>
                                    <span className="resolution-value">{selectedItem.itemType?.name}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Quantity:</span>
                                    <span className="resolution-value">{selectedItem.quantity} {selectedItem.itemType?.measuringUnit || ''}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Status:</span>
                                    <span className="resolution-value">{getStatusLabel(selectedItem.itemStatus)}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Batch Number:</span>
                                    <span className="resolution-value">{selectedItem.transaction?.batchNumber || selectedItem.batchNumber || 'N/A'}</span>
                                </div>
                            </div>

                            <form onSubmit={handleResolutionSubmit} className="resolution-form">
                                <div className="resolution-form-group">
                                    <label htmlFor="resolutionType">Resolution Type</label>
                                    <select
                                        id="resolutionType"
                                        name="resolutionType"
                                        value={resolutionData.resolutionType}
                                        onChange={handleResolutionInputChange}
                                        required
                                    >
                                        <option value="">Select Resolution Type</option>
                                        {selectedItem.itemStatus === 'MISSING' ? (
                                            <>
                                                <option value="ACKNOWLEDGE_LOSS">Acknowledge Loss</option>
                                                <option value="FOUND_ITEMS">Items Found</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="ACCEPT_SURPLUS">Accept Surplus</option>
                                                <option value="COUNTING_ERROR">Counting Error</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div className="resolution-form-group">
                                    <label htmlFor="notes">Resolution Notes</label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        value={resolutionData.notes}
                                        onChange={handleResolutionInputChange}
                                        placeholder="Provide details about this resolution"
                                        rows={4}
                                    />
                                </div>

                                <div className="resolution-confirmation">
                                    <p className="resolution-confirmation-text">
                                        {resolutionData.resolutionType === 'ACKNOWLEDGE_LOSS' &&
                                            "You are confirming that these items are lost and will be not be added to the inventory."}

                                        {resolutionData.resolutionType === 'FOUND_ITEMS' &&
                                            "You are confirming items were found and will be returned to regular inventory."}
                                        {resolutionData.resolutionType === 'ACCEPT_SURPLUS' &&
                                            "You are accepting the surplus items that are already in your regular inventory."}
                                        {resolutionData.resolutionType === 'COUNTING_ERROR' &&
                                            "You are confirming this was a counting error. The excess quantity will be deducted from the original transaction inventory."}
                                    </p>
                                </div>

                                <div className="resolution-modal-footer">
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={() => setIsResolutionModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="resolve-submit-button2"
                                        disabled={!resolutionData.resolutionType}
                                    >
                                        Resolve Discrepancy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DiscrepancyItems;