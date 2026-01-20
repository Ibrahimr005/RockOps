import React, { useState } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import "./PendingItems.scss";
import { itemService } from '../../../../services/warehouse/itemService';
import AddItemModal from './AddItemModal/AddItemModal.jsx';

const PendingItems = ({
                          warehouseId,
                          warehouseData,
                          filteredData,
                          loading,
                          showSnackbar,
                          refreshItems
                      }) => {

    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [addItemLoading, setAddItemLoading] = useState(false);

    const handleOpenAddItemModal = () => {
        setIsAddItemModalOpen(true);
    };

    const handleAddItemSubmit = async (formData) => {
        if (parseInt(formData.initialQuantity) <= 0) {
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
                itemTypeId: formData.itemTypeId,
                warehouseId: warehouseId,
                initialQuantity: parseInt(formData.initialQuantity),
                username: username,
                createdAt: formData.createdAt
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

            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onSubmit={handleAddItemSubmit}
                loading={addItemLoading}
            />
        </>
    );
};

export default PendingItems;