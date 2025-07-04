import React, { useState, useEffect, useRef } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import ProcurementIntroCard from "../../../components/common/IntroCard/ProcurementIntroCard.jsx";
import "./WarehouseViewItemTypesTable.scss";

// Import your item types images (you'll need to add these to your assets)
import itemTypesImg from "../../../assets/imgs/itemType.png"; // Add this image
import itemTypesDarkImg from "../../../assets/imgs/itemTypeDarkk.png"; // Add this image

const WarehouseViewItemTypesTable = ({ warehouseId, onAddButtonClick }) => {
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const modalRef = useRef(null);
    const [newItemType, setNewItemType] = useState({
        name: "",
        itemCategory: "",
        minQuantity: '',
        measuringUnit: "",
        serialNumber: "",
        status: "AVAILABLE",
        comment: ""
    });
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
        if (item) {
            setSelectedItem(item);
            setNewItemType({
                name: item.name,
                itemCategory: item.itemCategory ? item.itemCategory.id : "",
                minQuantity: item.minQuantity,
                measuringUnit: item.measuringUnit,
                serialNumber: item.serialNumber,
                status: item.status,
                comment: item.comment
            });
        } else {
            setSelectedItem(null);
            setNewItemType({
                name: "",
                itemCategory: "",
                minQuantity: '',
                measuringUnit: "",
                serialNumber: "",
                status: "AVAILABLE",
                comment: ""
            });
        }
        setIsModalOpen(true);
    };

    // Register the add function with parent component
    useEffect(() => {
        if (onAddButtonClick) {
            onAddButtonClick(openItemModal);
        }
    }, [onAddButtonClick]);

    // Fetch item types - updated to use global endpoint
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            console.log("Fetching item types...");

            try {
                const token = localStorage.getItem("token");
                const response = await fetch("http://localhost:8080/api/v1/itemTypes", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                console.log("Response Status:", response.status);

                if (!response.ok)
                    throw new Error("Failed to fetch data");

                const data = await response.json();
                console.log("Data fetched:", data);
                setTableData(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    // Add this useEffect to get the user role when component mounts
    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                console.log("userrrrifnooo" + userInfo);
                setUserRole(userInfo.role);
                console.log("roleee" + userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }
    }, []);

    // Fetch categories for dropdown - updated to use global endpoint
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch("http://localhost:8080/api/v1/itemCategories/children", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch categories");
                const data = await response.json();
                console.log("Categories fetched:", data);
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };

        fetchCategories();
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
            }
        };

        if (isModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isModalOpen]);

    // Helper function to show notifications
    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Calculate stats for the intro card
    const getItemTypeStats = () => {
        const totalTypes = tableData.length;
        const categoriesCount = new Set(tableData.map(item => item.itemCategory?.id).filter(Boolean)).size;
        const lowStockItems = tableData.filter(item => item.minQuantity > 0).length;

        return [
            { value: totalTypes.toString(), label: "Total Item Types" },
        ];
    };

    // Function to initiate delete confirmation
    const handleDeleteRequest = (id) => {
        // Find the item to get its name for the confirmation dialog
        const item = tableData.find(item => item.id === id);
        setItemToDelete({ id, name: item?.name || 'Unknown Item Type' });
        setShowConfirmDialog(true);
    };

    // Function to confirm deletion
    const confirmDeleteItemType = async () => {
        if (!itemToDelete) return;

        try {
            setDeleteLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/itemTypes/${itemToDelete.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Delete error response:", errorText);

                // Check for specific dependency errors from backend
                if (errorText.includes("ITEMS_EXIST")) {
                    throw new Error("This item type is currently in use in warehouse inventory. Please remove all inventory items of this type before deleting.");
                }
                else if (errorText.includes("TRANSACTION_ITEMS_EXIST")) {
                    throw new Error("This item type has transaction history and cannot be deleted. Please contact your administrator if deletion is necessary.");
                }
                else if (errorText.includes("REQUEST_ORDER_ITEMS_EXIST")) {
                    throw new Error("This item type is being used in active procurement requests. Please complete or cancel all related requests first.");
                }
                else if (errorText.includes("OFFER_ITEMS_EXIST")) {
                    throw new Error("This item type is referenced in supplier offers. Please remove it from all offers before deleting.");
                }
                else if (errorText.includes("ITEM_TYPE_NOT_FOUND")) {
                    throw new Error("This item type no longer exists. It may have been deleted by another user.");
                }
                else if (response.status === 500) {
                    throw new Error("This item type cannot be deleted because it's being used elsewhere in the system. Please check for any dependencies first.");
                }
                else {
                    throw new Error("Unable to delete this item type. Please try again or contact support if the problem persists.");
                }
            }

            // Success - update UI
            setTableData(prevData => prevData.filter(item => item.id !== itemToDelete.id));
            showSnackbar(`Item type "${itemToDelete.name}" successfully deleted!`, "success");

        } catch (error) {
            console.error("Error deleting item type:", error);
            showSnackbar(error.message, "error");
        } finally {
            setDeleteLoading(false);
            setShowConfirmDialog(false);
            setItemToDelete(null);
        }
    };

    // Function to cancel deletion
    const cancelDeleteItemType = () => {
        setShowConfirmDialog(false);
        setItemToDelete(null);
        setDeleteLoading(false);
    };

    // Define table columns for DataTable
    const columns = [
        {
            header: 'ITEM CATEGORY',
            accessor: 'itemCategory.name',
            sortable: true,
            width: '250px',
            minWidth: '150px',
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
            width: '220px',
            minWidth: '150px'
        },
        {
            header: 'MIN QUANTITY',
            accessor: 'minQuantity',
            sortable: true,
            width: '220px',
            minWidth: '120px',
            align: 'left'
        },
        {
            header: 'UNIT',
            accessor: 'measuringUnit',
            sortable: true,
            width: '210px',
            minWidth: '100px',
            align: 'left'
        },
        {
            header: 'SERIAL NUMBER',
            accessor: 'serialNumber',
            sortable: true,
            width: '230px',
            minWidth: '130px'
        }
    ];

    // Filterable columns for DataTable
    const filterableColumns = [
        {
            header: 'ITEM CATEGORY',
            accessor: 'itemCategory.name',
            filterType: 'select'
        },
        {
            header: 'ITEM TYPE',
            accessor: 'name',
            filterType: 'text'
        },
        {
            header: 'MIN QUANTITY',
            accessor: 'minQuantity',
            filterType: 'number'
        },
        {
            header: 'UNIT',
            accessor: 'measuringUnit',
            filterType: 'select'
        },
        {
            header: 'SERIAL NUMBER',
            accessor: 'serialNumber',
            filterType: 'text'
        }
    ];

    // Actions array for DataTable
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

    // Enhanced handleInputChange function
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === "minQuantity") {
            // Allow empty string or convert to number, minimum 1
            const numValue = value === '' ? '' : Math.max(1, parseInt(value, 10) || 1);
            setNewItemType(prev => ({
                ...prev,
                [name]: numValue
            }));
        } else if (name === "serialNumber") {
            // Allow any alphanumeric characters for serial number
            setNewItemType(prev => ({
                ...prev,
                [name]: value
            }));
        } else {
            setNewItemType(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();



        const payload = {
            name: newItemType.name.trim(),
            itemCategory: newItemType.itemCategory,
            minQuantity: parseInt(newItemType.minQuantity),
            measuringUnit: newItemType.measuringUnit.trim(),
            serialNumber: newItemType.serialNumber.trim(), // Changed from toString() to trim()
            status: newItemType.status || "AVAILABLE",
            comment: newItemType.comment?.trim() || ""
        };

        console.log("Submitting payload:", payload);

        try {
            const token = localStorage.getItem("token");

            let response;
            if (selectedItem) {
                // Update existing item
                response = await fetch(`http://localhost:8080/api/v1/itemTypes/${selectedItem.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload),
                });
            } else {
                // Create new item
                response = await fetch("http://localhost:8080/api/v1/itemTypes", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload),
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server error response:", errorText);

                // Try to parse JSON error response
                let errorMessage = `Failed to ${selectedItem ? 'update' : 'add'} item type`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    // If not JSON, use the raw text
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(`${errorMessage} (Status: ${response.status})`);
            }

            const result = await response.json();

            if (selectedItem) {
                // Update existing item in table
                setTableData((prevData) =>
                    prevData.map((item) =>
                        item.id === selectedItem.id ? { ...item, ...result } : item
                    )
                );
                showSnackbar("Item type successfully updated!", "success");
            } else {
                // Add new item to table
                setTableData((prevData) => [...prevData, result]);
                showSnackbar("Item type successfully added!", "success");
            }

            // Close modal and reset form
            setIsModalOpen(false);
            setNewItemType({
                name: '',
                itemCategory: '',
                minQuantity: '',
                measuringUnit: '',
                serialNumber: '',
                status: 'AVAILABLE',
                comment: '',
            });
            setSelectedItem(null);

        } catch (error) {
            console.error(`Error ${selectedItem ? 'updating' : 'adding'} item type:`, error);
            showSnackbar(error.message, "error");
        }
    };

    return (
        <>
            {/* Item Types Intro Card */}
            <ProcurementIntroCard
                title="Item Types"
                label="WAREHOUSE MANAGEMENT"
                lightModeImage={itemTypesImg}
                darkModeImage={itemTypesDarkImg}
                stats={getItemTypeStats()}
                className="item-types-intro"
            />

            {/* DataTable with integrated search and filters */}
            <DataTable
                data={tableData}
                columns={columns}
                loading={loading}
                emptyMessage="No item types found. Try adjusting your search or add a new item type"
                actions={actions}
                className="item-types-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="160px"
                showAddButton={true}
                addButtonText="Add Item Type"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                }
                onAddClick={() => openItemModal()}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal" ref={modalRef}>
                        <div className="modal-header0">
                            <h2>{selectedItem ? 'Edit Item Type' : 'Add New Item Type'}</h2>
                            <button className="close-modal" onClick={() => setIsModalOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Category Info Card in Modal */}
                        <div className="category-info-card-modal">
                            <div className="category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div className="category-info-content">
                                <h3>Categories Available</h3>
                                <p>
                                    Only child categories are shown in the dropdown below.
                                    If you need to create a new category, please go to the Categories section first and ensure you create a child category.
                                </p>
                            </div>
                        </div>

                        <form className="form2" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Item Name <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={newItemType.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter item name"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="itemCategory">Category <span style={{ color: 'red' }}>*</span></label>
                                    <select
                                        id="itemCategory"
                                        name="itemCategory"
                                        value={newItemType.itemCategory}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="" disabled>Select category</option>
                                        {categories && categories.length > 0 ? (
                                            categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>Loading categories...</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="minQuantity">Minimum Quantity <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="number"
                                        id="minQuantity"
                                        name="minQuantity"
                                        value={newItemType.minQuantity === 0 ? '' : newItemType.minQuantity}
                                        onChange={handleInputChange}
                                        min="1"
                                        placeholder="Enter minimum quantity"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="measuringUnit">Unit <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        id="measuringUnit"
                                        name="measuringUnit"
                                        value={newItemType.measuringUnit}
                                        onChange={handleInputChange}
                                        placeholder="e.g. pieces, kg, litres"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="serialNumber">Serial Number </label>
                                    <input
                                        type="text"  // Changed from "number" to "text"
                                        id="serialNumber"
                                        name="serialNumber"
                                        value={newItemType.serialNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter serial number"
                                        // Remove the min="1" attribute since it's not needed for text
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="comment">Comment</label>
                                    <textarea
                                        id="comment"
                                        name="comment"
                                        value={newItemType.comment}
                                        onChange={handleInputChange}
                                        placeholder="Enter comment (optional)"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer0">
                                <button type="submit" className="btn-primary">
                                    {selectedItem ? 'Update Item Type' : 'Add Item Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="delete"
                title="Delete Item Type"
                message={
                    itemToDelete
                        ? `Are you sure you want to delete the item type "${itemToDelete.name}"? This action cannot be undone.`
                        : "Are you sure you want to delete this item type?"
                }
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteItemType}
                onCancel={cancelDeleteItemType}
                isLoading={deleteLoading}
                size="large"
            />

            {/* Snackbar Notification */}
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