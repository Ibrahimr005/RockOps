import React, { useState, useEffect } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import "./InWarehouseItems.scss";
import { itemService } from '../../../../services/warehouse/itemService';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';
import { warehouseService } from '../../../../services/warehouse/warehouseService';

const InWarehouseItems = ({
                              warehouseId,
                              warehouseData,
                              filteredData,
                              loading,
                              isLowStock,
                              showSnackbar,
                              refreshItems,
                              onRestockItems
                          }) => {
    // Modal states
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isTransactionDetailsModalOpen, setIsTransactionDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState([]);
    const [transactionDetailsLoading, setTransactionDetailsLoading] = useState(false);

    // Add item form states
    const [addItemData, setAddItemData] = useState({
        parentCategoryId: "",
        itemCategoryId: "",
        itemTypeId: "",
        initialQuantity: "",
        createdAt: new Date().toISOString().split('T')[0]
    });
    const [addItemLoading, setAddItemLoading] = useState(false);
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategories, setChildCategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);

    // NEW: Filter toggle state
    const [showFilters, setShowFilters] = useState(false);

    // Helper function to aggregate items by type
    const aggregateItemsByType = (items) => {
        const aggregated = {};

        items.forEach(item => {
            const key = item.itemType?.id;
            if (!key) return;

            if (aggregated[key]) {
                aggregated[key].quantity += item.quantity;
                aggregated[key].individualItems.push(item);
            } else {
                aggregated[key] = {
                    ...item,
                    quantity: item.quantity,
                    individualItems: [item],
                    id: `aggregated_${key}`,
                    isAggregated: true
                };
            }
        });

        return Object.values(aggregated);
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(data);
        } catch (error) {
            console.error("Failed to fetch item types:", error);
        }
    };

    // Replace the fetchParentCategories method:
    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(data);
        } catch (error) {
            console.error("Failed to fetch parent categories:", error);
        }
    };

    useEffect(() => {
        if (isAddItemModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isAddItemModalOpen]);


// Replace the fetchChildCategories method:
    const fetchChildCategories = async (parentCategoryId) => {
        if (!parentCategoryId) {
            setChildCategories([]);
            return;
        }

        try {
            const data = await itemCategoryService.getChildren();
            // Filter by parent category since the endpoint returns all children
            const filteredChildren = data.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategories(filteredChildren);
        } catch (error) {
            console.error("Failed to fetch child categories:", error);
            setChildCategories([]);
        }
    };

    const fetchWarehouseName = async (warehouseId) => {
        try {
            const warehouse = await warehouseService.getById(warehouseId);
            return warehouse.name;
        } catch (error) {
            console.error("Error fetching warehouse name:", error);
            return "Unknown Warehouse";
        }
    };

    // Initialize data
    useEffect(() => {
        fetchItemTypes();
        fetchParentCategories();
    }, []);

    // NEW: Toggle filters with animation
    const toggleFilters = () => {
        if (showFilters) {
            // If currently showing, start collapse animation
            const filterElement = document.querySelector('.add-item-collapsible-filters');
            if (filterElement) {
                filterElement.classList.add('collapsing');

                // Wait for animation to finish, then hide
                setTimeout(() => {
                    setShowFilters(false);
                }, 300); // Match the animation duration
            }
        } else {
            // If currently hidden, show immediately (slideDown animation will play)
            setShowFilters(true);
        }
    };

    // Modal handlers
    const handleOpenAddItemModal = () => {
        setAddItemData({
            parentCategoryId: "",
            itemCategoryId: "",
            itemTypeId: "",
            initialQuantity: "",
            createdAt: new Date().toISOString().split('T')[0]
        });
        setChildCategories([]);
        setShowFilters(false); // Reset filter state
        setIsAddItemModalOpen(true);
    };

    const handleRestockButtonClick = () => {
        if (onRestockItems) {
            // Calculate items that need restocking with exact quantities
            const itemsToRestock = lowStockItems.map(item => {
                const currentQuantity = item.quantity || 0;
                const minQuantity = item.itemType?.minQuantity || 0;
                const quantityNeeded = Math.max(0, minQuantity - currentQuantity);

                return {
                    itemTypeId: item.itemType.id,
                    quantity: quantityNeeded,
                    comment: `Restocking for ${item.itemType.name} - Current: ${currentQuantity}, Min: ${minQuantity}`
                };
            });

            onRestockItems(itemsToRestock);
        } else {
            // Fallback to opening add item modal
            handleOpenAddItemModal();
        }
    };

    const handleAddItemInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'parentCategoryId') {
            setAddItemData({
                ...addItemData,
                parentCategoryId: value,
                itemCategoryId: "",
                itemTypeId: ""
            });
            fetchChildCategories(value);
        } else if (name === 'itemCategoryId') {
            setAddItemData({
                ...addItemData,
                itemCategoryId: value,
                itemTypeId: ""
            });
        } else {
            setAddItemData({
                ...addItemData,
                [name]: value,
            });
        }
    };

    const getFilteredItemTypes = () => {
        // If child category is selected, filter by child category (most specific)
        if (addItemData.itemCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.id === addItemData.itemCategoryId
            );
        }

        // If only parent category is selected, show all item types under that parent
        if (addItemData.parentCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === addItemData.parentCategoryId
            );
        }

        // If nothing is selected, show all item types
        return itemTypes;
    };

    const handleAddItemSubmit = async (e) => {
        e.preventDefault();

        if (parseInt(addItemData.initialQuantity) <= 0) {
            showSnackbar("Quantity must be greater than 0", "error");
            return;
        }

        let username = "system";
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo.username) {
                    username = userInfo.username;
                }
            } catch (error) {
                console.error("Error parsing user info:", error);
            }
        }

        setAddItemLoading(true);

        try {
            await itemService.createItem({
                itemTypeId: addItemData.itemTypeId,
                warehouseId: warehouseId,
                initialQuantity: parseInt(addItemData.initialQuantity),
                username: username,
                createdAt: addItemData.createdAt
            });

            refreshItems();
            setIsAddItemModalOpen(false);
            showSnackbar("Item added successfully", "success");
        } catch (error) {
            console.error("Error adding item:", error);
            showSnackbar("Failed to add item", "error");
        } finally {
            setAddItemLoading(false);
        }
    };

    useEffect(() => {
        if (isTransactionDetailsModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isTransactionDetailsModalOpen]);


    const handleOpenTransactionDetailsModal = async (item) => {
        setSelectedItem(item);
        setIsTransactionDetailsModalOpen(true);
        setTransactionDetailsLoading(true);

        try {
            const details = await itemService.getItemTransactionDetails(warehouseId, item.itemType.id);

            const detailsWithWarehouseNames = await Promise.all(
                details.map(async (detail) => {
                    if (detail.transactionItem?.transaction) {
                        const transaction = detail.transactionItem.transaction;
                        let senderName = "Unknown";
                        let receiverName = "Unknown";

                        if (transaction.senderType === 'WAREHOUSE' && transaction.senderId) {
                            senderName = await fetchWarehouseName(transaction.senderId);
                        }
                        if (transaction.receiverType === 'WAREHOUSE' && transaction.receiverId) {
                            receiverName = await fetchWarehouseName(transaction.receiverId);
                        }

                        return {
                            ...detail,
                            senderWarehouseName: senderName,
                            receiverWarehouseName: receiverName
                        };
                    }
                    return detail;
                })
            );

            const sortedDetails = detailsWithWarehouseNames.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateA - dateB;
            });

            setTransactionDetails(sortedDetails);
        } catch (error) {
            console.error("Error fetching transaction details:", error);
            showSnackbar("Error loading transaction details", "error");
        } finally {
            setTransactionDetailsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get aggregated data and low stock items
    const aggregatedData = aggregateItemsByType(filteredData);
    const lowStockItems = aggregatedData.filter(item => isLowStock(item));

    // Table columns
    const itemColumns = [
        {
            accessor: 'itemType.itemCategory.parentCategory.name',
            header: 'PARENT CATEGORY',
            width: '10px',
            render: (row) => (
                <span className="parent-category-tag">
                {row.itemType?.itemCategory?.parentCategory?.name || "No Parent"}
            </span>
            )
        },
        {
            accessor: 'itemType.itemCategory.name',
            header: 'CHILD CATEGORY',
            width: '180px',
            render: (row) => (
                <span className="category-tag">
                {row.itemType?.itemCategory?.name || "No Category"}
            </span>
            )
        },
        {
            accessor: 'itemType.name',
            header: 'ITEM',
            width: '250px'
        },
        {
            accessor: 'quantity',
            header: 'QUANTITY',
            width: '250px',
            render: (row) => {
                if (row.isAggregated) {
                    const lowStock = isLowStock(row);
                    return (
                        <div className="quantity-cell">
                            <div className="quantity-main">
                            <span className={`total-quantity ${lowStock ? 'low-stock' : ''}`}>
                                {row.quantity}
                            </span>
                            </div>
                            {row.individualItems && row.individualItems.length > 1 && (
                                <span className="quantity-breakdown" title={`From ${row.individualItems.length} transactions`}>
                                {` (${row.individualItems.length} entries)`}
                            </span>
                            )}
                        </div>
                    );
                }
                return row.quantity || 0;
            },
            // Custom export formatter for Excel
            exportFormatter: (value, row) => {
                // For Excel, just return the numeric value with additional info
                if (row.isAggregated && row.individualItems?.length > 1) {
                    return `${value} (from ${row.individualItems.length} entries)`;
                }
                return value;
            }
        },
        {
            accessor: 'itemType.measuringUnit',
            header: 'UNIT',
            width: '200px',
            render: (row) => row.itemType?.measuringUnit || "N/A"
        }
    ];

    // Table actions
    const actions = [
        {
            label: 'View Details',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            onClick: (row) => handleOpenTransactionDetailsModal(row),
            className: 'view',
            isDisabled: (row) => !row.isAggregated
        }
    ];

    return (
        <>
            {/* Low Stock Warning Banner */}
            {lowStockItems.length > 0 && (
                <div className="low-stock-warning-banner">
                    <div className="warning-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div className="warning-content">
                        <h3 className="warning-title">Low Stock Alert</h3>
                        <p className="warning-message">
                            {lowStockItems.length} item{lowStockItems.length > 1 ? 's are' : ' is'} below minimum quantity threshold:
                        </p>
                        <div className="low-stock-items-list">
                            {lowStockItems.slice(0, 3).map((item, index) => (
                                <span key={index} className="low-stock-item">
                                    {item.itemType?.name} ({item.quantity}/{item.itemType?.minQuantity})
                                </span>
                            ))}
                            {lowStockItems.length > 3 && (
                                <span className="low-stock-more">
                                    +{lowStockItems.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="warning-actions">
                        <button
                            className="restock-button"
                            onClick={handleRestockButtonClick}
                            title="Create request order for low stock items"
                        >
                            Restock Items
                        </button>
                    </div>
                </div>
            )}

            {/* DataTable */}
            <DataTable
                data={aggregatedData}
                columns={itemColumns}
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
                    { accessor: 'itemType.measuringUnit', header: 'Unit' }
                ]}
                actions={actions}
                className="inventory-items-table"
                showAddButton={true}
                addButtonText="Add Item"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                }
                onAddClick={handleOpenAddItemModal}
                // Excel Export functionality
                showExportButton={true}
                exportButtonText="Export Items"
                exportButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                }
                exportFileName={`${warehouseData?.name || 'warehouse'}_inventory_items`}
                exportAllData={false}
                excludeColumnsFromExport={[]}
                customExportHeaders={{
                    'itemType.itemCategory.parentCategory.name': 'Parent Category',
                    'itemType.itemCategory.name': 'Category',
                    'itemType.name': 'Item Name',
                    'quantity': 'Current Quantity',
                    'itemType.measuringUnit': 'Unit of Measure'
                }}
                onExportStart={() => {
                    console.log('Starting export...');
                }}
                onExportComplete={(info) => {
                    showSnackbar(`Successfully exported ${info.rowCount} items to ${info.filename}`, "success");
                }}
                onExportError={(error) => {
                    showSnackbar("Failed to export items", "error");
                    console.error('Export error:', error);
                }}
            />

            {/* Add Item Modal */}
            {isAddItemModalOpen && (
                <div className="resolution-modal-backdrop">
                    <div className="add-item-modal">
                        <div className="resolution-modal-header">
                            <h2>Add New Item</h2>
                            <button
                                className="btn-close"
                                onClick={() => setIsAddItemModalOpen(false)}
                            >
                            </button>
                        </div>

                        <div className="add-item-modal-body">
                            <form onSubmit={handleAddItemSubmit} className="add-item-form">
                                {/* NEW: Filter Toggle Section */}
                                <div className="add-item-filter-section">
                                    <div className="add-item-filter-header">
                                        <button
                                            type="button"
                                            className={`add-item-filter-toggle ${showFilters ? 'active' : ''}`}
                                            onClick={toggleFilters}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                            </svg>
                                            {showFilters ? 'Hide Category Filters' : 'Filter by Category'}
                                        </button>
                                    </div>

                                    {/* COLLAPSIBLE FILTERS */}
                                    {showFilters && (
                                        <div className="add-item-collapsible-filters">
                                            <div className="add-item-filters-header">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                </svg>
                                                <h4>Category Filters</h4>
                                            </div>

                                            <div className="add-item-filters-content">
                                                <div className="add-item-form-group">
                                                    <label htmlFor="parentCategoryId">Parent Category</label>
                                                    <select
                                                        id="parentCategoryId"
                                                        name="parentCategoryId"
                                                        value={addItemData.parentCategoryId}
                                                        onChange={handleAddItemInputChange}
                                                    >
                                                        <option value="">All Categories</option>
                                                        {parentCategories.map((category) => (
                                                            <option key={category.id} value={category.id}>
                                                                {category.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="form-helper-text">
                                                        Choose a parent category to filter item types
                                                    </span>
                                                </div>

                                                <div className="add-item-form-group">
                                                    <label htmlFor="itemCategoryId">Child Category</label>
                                                    <select
                                                        id="itemCategoryId"
                                                        name="itemCategoryId"
                                                        value={addItemData.itemCategoryId}
                                                        onChange={handleAddItemInputChange}
                                                        disabled={!addItemData.parentCategoryId}
                                                    >
                                                        <option value="">All child categories</option>
                                                        {childCategories.map((category) => (
                                                            <option key={category.id} value={category.id}>
                                                                {category.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="form-helper-text">
                                                        {!addItemData.parentCategoryId ? (
                                                            "Select a parent category first"
                                                        ) : childCategories.length === 0 ? (
                                                            "No child categories found for the selected parent category"
                                                        ) : (
                                                            "Optional - leave empty to show all from parent"
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* MAIN FORM FIELDS */}
                                <div className="add-item-form-group">
                                    <label htmlFor="itemTypeId">Item Type <span style={{ color: 'red' }}>*</span></label>
                                    <select
                                        id="itemTypeId"
                                        name="itemTypeId"
                                        value={addItemData.itemTypeId}
                                        onChange={handleAddItemInputChange}
                                        required
                                    >
                                        <option value="">Select Item Type</option>
                                        {getFilteredItemTypes().map((itemType) => (
                                            <option key={itemType.id} value={itemType.id}>
                                                {itemType.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getFilteredItemTypes().length === 0 && addItemData.parentCategoryId && (
                                        <span className="form-helper-text">
                                            No item types found for the selected category filters
                                        </span>
                                    )}
                                    {!addItemData.parentCategoryId && (
                                        <span className="form-helper-text">
                                            Showing all item types - use filters above to narrow down options
                                        </span>
                                    )}
                                    {addItemData.parentCategoryId && !addItemData.itemCategoryId && (
                                        <span className="form-helper-text">
                                            Showing all item types from "{parentCategories.find(cat => cat.id === addItemData.parentCategoryId)?.name}" category
                                        </span>
                                    )}
                                    {addItemData.itemCategoryId && (
                                        <span className="form-helper-text">
                                            Showing item types from "{childCategories.find(cat => cat.id === addItemData.itemCategoryId)?.name}" subcategory
                                        </span>
                                    )}
                                </div>

                                <div className="add-item-form-group">
                                    <label htmlFor="initialQuantity">Quantity <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="number"
                                        id="initialQuantity"
                                        name="initialQuantity"
                                        value={addItemData.initialQuantity}
                                        onChange={handleAddItemInputChange}
                                        placeholder="Enter quantity"
                                        required
                                    />
                                </div>

                                <div className="add-item-form-group">
                                    <label htmlFor="createdAt">Entry Date <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="date"
                                        id="createdAt"
                                        name="createdAt"
                                        value={addItemData.createdAt}
                                        onChange={handleAddItemInputChange}
                                        required
                                    />
                                </div>

                                <div className="add-item-info">
                                    <div className="info-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                    </div>
                                    <div className="info-text">
                                        <p className="info-title">Adding Items to Inventory</p>
                                        <p className="info-description">
                                            If an item of this type already exists in the warehouse, the quantities will be merged.
                                            Otherwise, a new inventory entry will be created.
                                        </p>
                                    </div>
                                </div>

                                <div className="add-item-modal-footer">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                    >
                                        {addItemLoading ? (
                                            <>
                                                <div className="button-spinner"></div>
                                                Adding...
                                            </>
                                        ) : (
                                            "Add Item"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Details Modal */}
            {isTransactionDetailsModalOpen && selectedItem && (
                <div className="resolution-modal-backdrop">
                    <div className="transaction-details-modal">
                        <div className="transaction-modal-header">
                            <div className="header-content">
                                <div className="item-info">
                                    <h2 className="item-name">{selectedItem.itemType?.name}</h2>
                                    <span className="item-category-top">{selectedItem.itemType?.itemCategory?.name}</span>
                                </div>
                                <div className="summary-stats">

                                    <div className="stat-item-top">
                                        <span className="stat-value">{transactionDetails.length}</span>
                                        <span className="stat-label">Entries</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn-close"
                                onClick={() => setIsTransactionDetailsModalOpen(false)}
                            >
                            </button>
                        </div>

                        <div className="transaction-details-modal-body">
                            {transactionDetailsLoading ? (
                                <div className="transaction-loading">
                                    <div className="loading-spinner"></div>
                                    <p>Loading transaction details...</p>
                                </div>
                            ) : (
                                <div className="transaction-details-list">
                                    {transactionDetails.length > 0 ? (
                                        <div className="transaction-items">
                                            {transactionDetails.map((item, index) => (
                                                <div key={item.id} className="transaction-detail-card">
                                                    {item.transactionItem?.transaction ? (
                                                        <>
                                                            <div className="transaction-card-header">
                                                                <div className="transaction-batch">
                                                                    <span className="batch-label">Batch #</span>
                                                                    <span className="batch-number">
                                                                        {item.batchNumber || item.transactionItem.transaction.batchNumber || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="transaction-date">
                                                                    {item.createdAt ? formatDate(item.createdAt) : 'N/A'}
                                                                </div>
                                                            </div>

                                                            <div className="transaction-card-body">
                                                                <div className="quantity-info">
                                                                    <span className="quantity-value">{item.quantity}</span>
                                                                    <span className="quantity-unit">{item.itemType?.measuringUnit}</span>
                                                                </div>

                                                                <div className="transaction-flow">
                                                                    <div className="flow-info">
                                                                        <span className="flow-label">From:</span>
                                                                        <span className="flow-value">
                                                                            {item.senderWarehouseName || 'Unknown Warehouse'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flow-arrow">→</div>
                                                                    <div className="flow-info">
                                                                        <span className="flow-label">To:</span>
                                                                        <span className="flow-value">
                                                                            {item.receiverWarehouseName || warehouseData.name || 'This Warehouse'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {item.transactionItem.transaction.addedBy && (
                                                                    <div className="transaction-user">
                                                                        <span className="user-label">Added by:</span>
                                                                        <span className="user-value">{item.transactionItem.transaction.addedBy}</span>
                                                                    </div>
                                                                )}

                                                                {item.transactionItem.transaction.acceptanceComment && (
                                                                    <div className="transaction-comment">
                                                                        <span className="comment-label">Note:</span>
                                                                        <span className="comment-value">{item.transactionItem.transaction.acceptanceComment}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="transaction-card-header manual-entry">
                                                                <div className="manual-entry-badge">
                                                                    <span className="manual-label">Manual Entry</span>
                                                                </div>
                                                                <div className="entry-date">
                                                                    {item.createdAt ? formatDate(item.createdAt) : 'Date unknown'}
                                                                </div>
                                                            </div>

                                                            <div className="transaction-card-body">
                                                                <div className="quantity-info">
                                                                    <span className="quantity-value">{item.quantity}</span>
                                                                    <span className="quantity-unit">{item.itemType?.measuringUnit}</span>
                                                                </div>

                                                                <div className="manual-entry-info">
                                                                    <div className="manual-icon">
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="manual-text">
                                                                        <p className="manual-title">This item was manually added</p>
                                                                        <p className="manual-description">
                                                                            No transaction record available - item was directly added to inventory
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {item.addedBy && (
                                                                    <div className="transaction-user">
                                                                        <span className="user-label">Added by:</span>
                                                                        <span className="user-value">{item.createdBy}</span>
                                                                    </div>
                                                                )}

                                                                {item.comment && (
                                                                    <div className="transaction-comment">
                                                                        <span className="comment-label">Note:</span>
                                                                        <span className="comment-value">{item.comment}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="no-transactions">
                                            <div className="empty-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3>No Transaction History</h3>
                                            <p>No transaction details found for this item.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InWarehouseItems;