import React, { useState, useEffect, useRef } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx"; // Updated import
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import "./WarehouseViewItemTypesTable.scss";

const WarehouseViewItemTypesTable = ({ warehouseId, onAddButtonClick }) => {
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const modalRef = useRef(null);
    const [newItemType, setNewItemType] = useState({
        name: "", // Name of the item
        itemCategory: "",  // Single category ID for the item type
        minQuantity: 0, // Minimum quantity for the item
        measuringUnit: "", // Measuring unit (e.g., kg, pieces)
        serialNumber: "", // Serial number (optional)
        status: "AVAILABLE", // Default status for new item
        comment: "" // New field for comments (added)
    });
    const [categories, setCategories] = useState([]);

    // Snackbar notification states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

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
                minQuantity: 0,
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
                // Updated to use the global endpoint instead of warehouse-specific
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
                console.log("Categories fetched:", data); // Better debug message
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
            onClick: (row) => deleteItemType(row.id)
        }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // If the input name is minQuantity, parse the value to an integer
        if (name === "minQuantity") {
            setNewItemType(prev => ({
                ...prev,
                [name]: parseInt(value, 10) || 0 // Ensures that we convert the string to an integer, defaulting to 0 if NaN
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

        // Validate that all required fields are filled in
        if (
            !newItemType.name ||
            !newItemType.itemCategory ||
            !newItemType.minQuantity ||
            !newItemType.measuringUnit ||
            !newItemType.serialNumber
        ) {
            showSnackbar("Please fill in all the required fields.", "error");
            return; // Stop the form submission
        }

        // Create payload based on the backend's expected format
        const payload = {
            name: newItemType.name,
            itemCategory: newItemType.itemCategory, // Send just the ID as a string
            minQuantity: parseInt(newItemType.minQuantity),
            measuringUnit: newItemType.measuringUnit,
            serialNumber: newItemType.serialNumber,
            status: newItemType.status,
            comment: newItemType.comment || ""
        };

        console.log("Submitting payload:", payload);

        if (selectedItem) {
            // If we are updating an existing item, call the update function
            updateItemType(selectedItem.id, payload);
        } else {
            // If we're adding a new item, call the add function
            try {
                const token = localStorage.getItem("token");
                // Updated to use global endpoint
                const response = await fetch("http://localhost:8080/api/v1/itemTypes", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`Failed to add item type: ${response.status}`);
                }

                const newItem = await response.json();
                setTableData((prevData) => [...prevData, newItem]);

                showSnackbar("Item type successfully added!", "success");

                setIsModalOpen(false);

                setNewItemType({
                    name: '',
                    itemCategory: '',
                    minQuantity: 0,
                    measuringUnit: '',
                    serialNumber: '',
                    status: 'AVAILABLE',
                    comment: '',
                });
            } catch (error) {
                console.error('Error adding item type:', error);
                showSnackbar(`Failed to add item type: ${error.message}`, "error");
            }
        }
    };

    const deleteItemType = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/itemTypes/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete item type: ${response.status}`);
            }

            // Remove the item from the table data without refetching the entire table
            setTableData(prevData => prevData.filter(item => item.id !== id));

            showSnackbar("Item type successfully deleted!", "success");
        } catch (error) {
            console.error("Error deleting item type:", error);
            showSnackbar(`Failed to delete item type: ${error.message}`, "error");
        }
    };

    const updateItemType = async (id, updatedItem) => {
        try {
            // Check if the comment is empty, and replace it with "No comment" if it is
            if (!updatedItem.comment) {
                updatedItem.comment = "No comment";
            }

            console.log("Updating item with data:", updatedItem);

            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/itemTypes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedItem),
            });

            if (!response.ok) {
                throw new Error(`Failed to update item type: ${response.status}`);
            }

            const updatedData = await response.json();
            // Update the table with the updated item
            setTableData((prevData) =>
                prevData.map((item) =>
                    item.id === id ? { ...item, ...updatedData } : item
                )
            );

            showSnackbar("Item type successfully updated!", "success");

            // Close modal and reset form
            setIsModalOpen(false);
            setNewItemType({
                name: '',
                itemCategory: '',
                minQuantity: 0,
                measuringUnit: '',
                serialNumber: '',
                status: 'AVAILABLE',
                comment: '',
            });
        } catch (error) {
            console.error('Error updating item type:', error);
            showSnackbar(`Failed to update item type: ${error.message}`, "error");
        }
    };

    return (
        <>
            {/* Header with count */}
            <div className="header-container">
                <div className="left-section">
                    <div className="item-count">{tableData.length} items</div>
                </div>
            </div>

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

                        <form  className="form2" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Item Name</label>
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
                                    <label htmlFor="itemCategory">Category</label>
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
                                    <label htmlFor="minQuantity">Minimum Quantity</label>
                                    <input
                                        type="number"
                                        id="minQuantity"
                                        name="minQuantity"
                                        value={newItemType.minQuantity}
                                        onChange={handleInputChange}
                                        min="0"
                                        placeholder="Enter minimum quantity"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="measuringUnit">Unit</label>
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
                                    <label htmlFor="serialNumber">Serial Number</label>
                                    <input
                                        type="text"
                                        id="serialNumber"
                                        name="serialNumber"
                                        value={newItemType.serialNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter serial number "
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
                                <button type="submit" className="submit-button">
                                    {selectedItem ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Snackbar Notification */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </>
    );
};

export default WarehouseViewItemTypesTable;