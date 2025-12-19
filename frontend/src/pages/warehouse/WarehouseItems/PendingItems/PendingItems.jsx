import React, { useState, useEffect } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import "./PendingItems.scss";
import { itemService } from '../../../../services/warehouse/itemService';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';

const PendingItems = ({
                          warehouseId,
                          warehouseData,
                          filteredData,
                          loading,
                          showSnackbar,
                          refreshItems
                      }) => {

    // Modal states
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [addItemLoading, setAddItemLoading] = useState(false);

    // Add item form states
    const [addItemData, setAddItemData] = useState({
        parentCategoryId: "",
        itemCategoryId: "",
        itemTypeId: "",
        initialQuantity: "",
        createdAt: new Date().toISOString().split('T')[0]
    });

    const [parentCategories, setParentCategories] = useState([]);
    const [childCategories, setChildCategories] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchItemTypes();
        fetchParentCategories();
    }, []);

    useEffect(() => {
        if (isAddItemModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => document.body.classList.remove("modal-open");
    }, [isAddItemModalOpen]);

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(data);
        } catch (error) {
            console.error("Failed to fetch item types:", error);
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(data);
        } catch (error) {
            console.error("Failed to fetch parent categories:", error);
        }
    };

    const fetchChildCategories = async (parentCategoryId) => {
        if (!parentCategoryId) {
            setChildCategories([]);
            return;
        }
        try {
            const data = await itemCategoryService.getChildren();
            const filteredChildren = data.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategories(filteredChildren);
        } catch (error) {
            console.error("Failed to fetch child categories:", error);
            setChildCategories([]);
        }
    };

    const handleOpenAddItemModal = () => {
        setAddItemData({
            parentCategoryId: "",
            itemCategoryId: "",
            itemTypeId: "",
            initialQuantity: "",
            createdAt: new Date().toISOString().split('T')[0]
        });
        setChildCategories([]);
        setShowFilters(false);
        setIsAddItemModalOpen(true);
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
        if (addItemData.itemCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.id === addItemData.itemCategoryId
            );
        }
        if (addItemData.parentCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === addItemData.parentCategoryId
            );
        }
        return itemTypes;
    };

    const toggleFilters = () => {
        if (showFilters) {
            const filterElement = document.querySelector('.add-item-collapsible-filters');
            if (filterElement) {
                filterElement.classList.add('collapsing');
                setTimeout(() => setShowFilters(false), 300);
            }
        } else {
            setShowFilters(true);
        }
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
            showSnackbar("Item added successfully - awaiting finance approval", "success");
        } catch (error) {
            console.error("Error adding item:", error);
            showSnackbar("Failed to add item", "error");
        } finally {
            setAddItemLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            setIsAddItemModalOpen(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const pendingColumns = [
        {
            accessor: 'itemType.itemCategory.parentCategory.name',
            header: 'PARENT CATEGORY',
            width: '180px',
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
            width: '120px',
            render: (row) => (
                <span className="quantity-value">
          {row.quantity} {row.itemType?.measuringUnit}
        </span>
            )
        },

        {
            accessor: 'createdAt',
            header: 'ADDED ON',
            width: '180px',
            render: (row) => (
                <span className="date-value">{formatDate(row.createdAt)}</span>
            )
        },
        {
            accessor: 'createdBy',
            header: 'ADDED BY',
            width: '150px',
            render: (row) => (
                <span className="user-value">{row.createdBy || 'N/A'}</span>
            )
        }
    ];

    return (
        <>


            {/* DataTable */}
            <DataTable
                data={filteredData}
                columns={pendingColumns}
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
                    { accessor: 'createdBy', header: 'Added By' }
                ]}
                className="pending-items-table"
                emptyMessage="No items pending approval"
                showAddButton={true}
                addButtonText="Add Item"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                }
                onAddClick={handleOpenAddItemModal}
                showExportButton={true}
                exportButtonText="Export Pending Items"
                exportFileName={`${warehouseData?.name || 'warehouse'}_pending_items`}
                customExportHeaders={{
                    'itemType.itemCategory.parentCategory.name': 'Parent Category',
                    'itemType.itemCategory.name': 'Category',
                    'itemType.name': 'Item Name',
                    'quantity': 'Quantity',
                    'itemType.basePrice': 'Suggested Price',
                    'createdAt': 'Added On',
                    'createdBy': 'Added By'
                }}
            />

            {/* Add Item Modal */}
            {isAddItemModalOpen && (
                <div className="resolution-modal-backdrop" onClick={handleOverlayClick}>
                    <div className="add-item-modal">
                        <div className="modal-header">
                            <h2>Add New Item</h2>
                            <button className="btn-close" onClick={() => setIsAddItemModalOpen(false)}></button>
                        </div>
                        <div className="add-item-modal-body modal-body">
                            <form onSubmit={handleAddItemSubmit} className="add-item-form modal-body">
                                <div className="add-item-filter-section">
                                    <div className="add-item-filter-header">
                                        <button type="button" className={`add-item-filter-toggle ${showFilters ? 'active' : ''}`} onClick={toggleFilters}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                            </svg>
                                            {showFilters ? 'Hide Category Filters' : 'Filter by Category'}
                                        </button>
                                    </div>
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
                                                    <select id="parentCategoryId" name="parentCategoryId" value={addItemData.parentCategoryId} onChange={handleAddItemInputChange}>
                                                        <option value="">All Categories</option>
                                                        {parentCategories.map((category) => (
                                                            <option key={category.id} value={category.id}>{category.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="form-helper-text">Choose a parent category to filter item types</span>
                                                </div>
                                                <div className="add-item-form-group">
                                                    <label htmlFor="itemCategoryId">Child Category</label>
                                                    <select id="itemCategoryId" name="itemCategoryId" value={addItemData.itemCategoryId} onChange={handleAddItemInputChange} disabled={!addItemData.parentCategoryId}>
                                                        <option value="">All child categories</option>
                                                        {childCategories.map((category) => (
                                                            <option key={category.id} value={category.id}>{category.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="form-helper-text">
                            {!addItemData.parentCategoryId ? "Select a parent category first" :
                                childCategories.length === 0 ? "No child categories found" :
                                    "Optional - leave empty to show all from parent"}
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="add-item-form-group">
                                    <label htmlFor="itemTypeId">Item Type <span style={{ color: 'red' }}>*</span></label>
                                    <select id="itemTypeId" name="itemTypeId" value={addItemData.itemTypeId} onChange={handleAddItemInputChange} required>
                                        <option value="">Select Item Type</option>
                                        {getFilteredItemTypes().map((itemType) => (
                                            <option key={itemType.id} value={itemType.id}>{itemType.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="add-item-form-group">
                                    <label htmlFor="initialQuantity">Quantity <span style={{ color: 'red' }}>*</span></label>
                                    <input type="number" id="initialQuantity" name="initialQuantity" value={addItemData.initialQuantity} onChange={handleAddItemInputChange} placeholder="Enter quantity" required />
                                </div>
                                <div className="add-item-form-group">
                                    <label htmlFor="createdAt">Entry Date <span style={{ color: 'red' }}>*</span></label>
                                    <input type="date" id="createdAt" name="createdAt" value={addItemData.createdAt} onChange={handleAddItemInputChange} required />
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
                                        <p className="info-title">Awaiting Finance Approval</p>
                                        <p className="info-description">This item will be pending until the finance team approves and sets its price.</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="submit" className="btn-primary" onClick={handleAddItemSubmit}>
                                {addItemLoading ? (<><div className="button-spinner"></div>Adding...</>) : "Add Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PendingItems;