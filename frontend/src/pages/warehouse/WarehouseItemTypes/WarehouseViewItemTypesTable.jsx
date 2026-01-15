import React, { useState, useEffect } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import PageHeader from "../../../components/common/PageHeader/PageHeader.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import ItemTypeModal from "../WarehouseItemTypes/ItemTypeModal/ItemTypeModal.jsx"
import "./WarehouseViewItemTypesTable.scss";
import { itemTypeService } from '../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../services/warehouse/itemCategoryService';
import { FaPlus } from 'react-icons/fa';

const WarehouseViewItemTypesTable = ({ warehouseId, onAddButtonClick }) => {
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [categories, setCategories] = useState([]);

    // Snackbar notification states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [userRole, setUserRole] = useState("");

    const openItemModal = (item = null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    // Register the add function with parent component
    useEffect(() => {
        if (onAddButtonClick) {
            onAddButtonClick(openItemModal);
        }
    }, [onAddButtonClick]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await itemTypeService.getAll();
                setTableData(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await itemCategoryService.getChildren();
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };

        fetchCategories();
    }, []);

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleDeleteRequest = (id) => {
        const item = tableData.find(item => item.id === id);
        setItemToDelete({ id, name: item?.name || 'Unknown Item Type' });
        setShowConfirmDialog(true);
    };

    const confirmDeleteItemType = async () => {
        if (!itemToDelete) return;

        try {
            setDeleteLoading(true);
            await itemTypeService.delete(itemToDelete.id);
            setTableData(prevData => prevData.filter(item => item.id !== itemToDelete.id));
            showSnackbar(`Item type "${itemToDelete.name}" successfully deleted!`, "success");
        } catch (error) {
            console.error("Error deleting item type:", error);
            let errorMessage = error.message;

            if (errorMessage.includes("ITEMS_EXIST")) {
                errorMessage = "This item type is currently in use in warehouse inventory.";
            } else if (errorMessage.includes("TRANSACTION_ITEMS_EXIST")) {
                errorMessage = "This item type has transaction history and cannot be deleted.";
            }

            showSnackbar(errorMessage, "error");
        } finally {
            setDeleteLoading(false);
            setShowConfirmDialog(false);
            setItemToDelete(null);
        }
    };

    const cancelDeleteItemType = () => {
        setShowConfirmDialog(false);
        setItemToDelete(null);
        setDeleteLoading(false);
    };

    const handleModalSubmit = async (payload, selectedItem) => {
        try {
            let result;
            if (selectedItem) {
                result = await itemTypeService.update(selectedItem.id, payload);
                setTableData((prevData) =>
                    prevData.map((item) =>
                        item.id === selectedItem.id ? { ...item, ...result } : item
                    )
                );
                showSnackbar("Item type successfully updated!", "success");
            } else {
                result = await itemTypeService.create(payload);
                setTableData((prevData) => [...prevData, result]);
                showSnackbar("Item type successfully added!", "success");
            }

            setIsModalOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error(`Error ${selectedItem ? 'updating' : 'adding'} item type:`, error);
            showSnackbar(error.message, "error");
        }
    };

    const columns = [
        {
            header: 'PARENT CATEGORY',
            accessor: 'itemCategory.parentCategory.name',
            sortable: true,
            width: '200px',
            render: (row) => (
                <span className="parent-category-tag">
                    {row.itemCategory?.parentCategory?.name || "No Parent"}
                </span>
            )
        },
        {
            header: 'CHILD CATEGORY',
            accessor: 'itemCategory.name',
            sortable: true,
            width: '200px',
            render: (row) => (
                <span className="category-tag">
                    {row.itemCategory ? row.itemCategory.name : "No Category"}
                </span>
            )
        },
        {
            header: 'ITEM TYPE',
            accessor: 'name',
            sortable: true,
            width: '220px'
        },
        {
            header: 'BASE PRICE',
            accessor: 'basePrice',
            sortable: true,
            width: '150px',
            render: (row) => (
                <span>
                    {row.basePrice ? `${row.basePrice.toFixed(2)} EGP` : '—'}
                </span>
            )
        },
        {
            header: 'MIN QUANTITY',
            accessor: 'minQuantity',
            sortable: true,
            width: '150px'
        },
        {
            header: 'UNIT',
            accessor: 'measuringUnit',
            sortable: true,
            width: '120px'
        },
        {
            header: 'SERIAL NUMBER',
            accessor: 'serialNumber',
            sortable: true,
            width: '180px'
        }
    ];

    const filterableColumns = [
        { header: 'PARENT CATEGORY', accessor: 'itemCategory.parent.name', filterType: 'select' },
        { header: 'CHILD CATEGORY', accessor: 'itemCategory.name', filterType: 'select' },
        { header: 'ITEM TYPE', accessor: 'name', filterType: 'text' },
        { header: 'BASE PRICE', accessor: 'basePrice', filterType: 'number' },
        { header: 'MIN QUANTITY', accessor: 'minQuantity', filterType: 'number' },
        { header: 'UNIT', accessor: 'measuringUnit', filterType: 'select' },
        { header: 'SERIAL NUMBER', accessor: 'serialNumber', filterType: 'text' }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            className: 'edit',
            onClick: (row) => openItemModal(row)
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
            className: 'delete',
            onClick: (row) => handleDeleteRequest(row.id)
        }
    ];

    return (
        <>
            <PageHeader
                title="Item Types"
                subtitle="Define and categorize different types of items in your inventory"
            />

            <DataTable
                data={tableData}
                columns={columns}
                loading={loading}
                emptyMessage="No item types found. Try adjusting your search or add a new item type"
                actions={actions}
                showAddButton={userRole === "WAREHOUSE_MANAGER" || userRole === "ADMIN" || userRole === "PROCUREMENT"}
                addButtonText="Add Item Type"
                addButtonIcon={<FaPlus />}
                onAddClick={() => openItemModal()}
                showExportButton={true}
                exportFileName="item-types"
                className="item-types-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
            />

            <ItemTypeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedItem(null);
                }}
                selectedItem={selectedItem}
                categories={categories}
                onSubmit={handleModalSubmit}
            />

            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="delete"
                title="Delete Item Type"
                message={
                    itemToDelete
                        ? `Are you sure you want to delete the item type "${itemToDelete.name}"?`
                        : "Are you sure you want to delete this item type?"
                }
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteItemType}
                onCancel={cancelDeleteItemType}
                isLoading={deleteLoading}
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </>
    );
};

export default WarehouseViewItemTypesTable;