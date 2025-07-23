import React, { useState, useEffect } from 'react';
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import "./PendingRequestOrders.scss";
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';
import { warehouseService } from '../../../../services/warehouse/warehouseService';

const PendingRequestOrders = React.forwardRef(({ warehouseId, refreshTrigger, onShowSnackbar, userRole }, ref) => {
    const navigate = useNavigate();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);

    // Modal and form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentEditId, setCurrentEditId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
        deadline: '',
        employeeRequestedBy: '',
    });
    const [itemTypes, setItemTypes] = useState([]);
    const [employees, setEmployees] = useState([]);

    // NEW: Category filtering states
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({}); // Store child categories per item
    const [showFilters, setShowFilters] = useState({}); // Track which items have filters expanded

    React.useImperativeHandle(ref, () => ({
        handleAddRequest: () => {
            handleAddRequest();
        },
        openRestockModal: (restockItems) => {
            openRestockModal(restockItems);
        }
    }));

    // Column configuration for pending request orders
    const pendingOrderColumns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            width: '200px',
            minWidth: '150px',
            sortable: true,
            filterable: true,
            render: (row, value) => {
                return value || 'N/A';
            }
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'deadline',
            width: '140px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value ? new Date(value).toLocaleDateString() : 'N/A';
            }
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            width: '140px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value ? new Date(value).toLocaleDateString() : 'N/A';
            }
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            width: '150px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || 'N/A';
            }
        }
    ];

    // Actions configuration for pending orders - edit and delete
    const pendingOrderActions = [
        {
            label: 'Edit Request',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            ),
            onClick: (row) => handleEditRequest(row),
            className: 'request-edit-button'
        },
        {
            label: 'Delete Request',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2 0,0,1-2,2H7a2,2 0,0,1-2-2V6m3,0V4a2,2 0,0,1,2-2h4a2,2 0,0,1,2,2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            ),
            onClick: (row) => handleDeleteRequest(row),
            className: 'request-delete-button'
        }
    ];

    // Filterable columns configuration
    const pendingFilterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        }
    ];

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPendingOrders();
            fetchItemTypes();
            fetchEmployees();
            fetchParentCategories(); // NEW: Fetch parent categories
        }
    }, [warehouseId, refreshTrigger]);

// NEW: Toggle filters with animation
    const toggleFilters = (index) => {
        if (showFilters[index]) {
            // If currently showing, start collapse animation
            const filterElement = document.querySelector(`[data-filter-index="${index}"]`);
            if (filterElement) {
                filterElement.classList.add('collapsing');

                // Wait for animation to finish, then hide
                setTimeout(() => {
                    setShowFilters(prev => ({
                        ...prev,
                        [index]: false
                    }));
                }, 300); // Match the animation duration
            }
        } else {
            // If currently hidden, show immediately (slideDown animation will play)
            setShowFilters(prev => ({
                ...prev,
                [index]: true
            }));
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(data);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
        }
    };

// Replace fetchChildCategories:
    const fetchChildCategories = async (parentCategoryId, itemIndex) => {
        if (!parentCategoryId) {
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
            return;
        }

        try {
            const data = await itemCategoryService.getChildrenByParent(parentCategoryId);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: data
            }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
        }
    };

    // NEW: Get filtered item types for a specific item
    const getFilteredItemTypes = (itemIndex) => {
        const item = formData.items[itemIndex];
        if (!item) return itemTypes;

        // If child category is selected, filter by child category (most specific)
        if (item.itemCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.id === item.itemCategoryId
            );
        }

        // If only parent category is selected, show all item types under that parent
        if (item.parentCategoryId) {
            return itemTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === item.parentCategoryId
            );
        }

        // If nothing is selected, show all item types
        return itemTypes;
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(data);
        } catch (error) {
            console.error('Error fetching item types:', error);
        }
    };

    // Added function to fetch employees
    const fetchEmployees = async () => {
        try {
            const data = await warehouseService.getEmployees(warehouseId);
            setEmployees(data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            setEmployees([
                { id: '1', name: 'John Doe' },
                { id: '2', name: 'Jane Smith' },
                { id: '3', name: 'Mike Johnson' }
            ]);
        }
    };

    // Fetch pending request orders
    const fetchPendingOrders = async () => {
        setIsLoadingPending(true);
        try {
            const data = await requestOrderService.getByWarehouseAndStatus(warehouseId, 'PENDING');
            setPendingOrders(data);
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            setPendingOrders([]);
        } finally {
            setIsLoadingPending(false);
        }
    };

    // Handle edit request
    const handleEditRequest = async (request) => {
        try {
            // Fetch the full request details with items
            // Replace the fetch call in handleEditRequest:
            const requestDetails = await requestOrderService.getById(request.id);

            // Set edit mode and populate form
            setIsEditMode(true);
            setCurrentEditId(request.id);

            // Format deadline for datetime-local input
            const deadline = requestDetails.deadline
                ? new Date(requestDetails.deadline).toISOString().slice(0, 16)
                : '';

            // Prepare items data
            const items = requestDetails.requestItems && requestDetails.requestItems.length > 0
                ? requestDetails.requestItems.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemType?.id || item.itemTypeId,
                    quantity: item.quantity,
                    comment: item.comment || '',
                    parentCategoryId: '', // Reset filtering for edit mode
                    itemCategoryId: ''
                }))
                : [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }];

            setFormData({
                title: requestDetails.title || '',
                description: requestDetails.description || '',
                deadline: deadline,
                employeeRequestedBy: requestDetails.employeeRequestedBy || '',
                items: items
            });

            setShowAddModal(true);

        } catch (error) {
            console.error('Error fetching request details:', error);
            onShowSnackbar('Failed to load request details. Please try again.', 'error');
        }
    };

    // Handle delete request
    const handleDeleteRequest = async (request) => {
        if (!window.confirm('Are you sure you want to delete this request?')) {
            return;
        }

        try {
            // TODO: Implement delete API call when backend endpoint is available
            console.log('Delete request:', request);

            // For now, just refresh the table
            fetchPendingOrders();

            onShowSnackbar('Delete functionality to be implemented', 'info');

        } catch (error) {
            console.error('Error deleting request:', error);
            onShowSnackbar('Failed to delete request. Please try again.', 'error');
        }
    };

    // Handle row click to navigate to detail page
    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    // Handle add button click from DataTable
    const handleAddRequest = () => {
        setShowAddModal(true);
    };

    const openRestockModal = (restockItems) => {
        const now = new Date();
        // Set deadline to 7 days from now
        const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const deadlineString = deadline.toISOString().slice(0, 16);

        // Format restock items with empty category filters
        const formattedRestockItems = restockItems.map(item => ({
            ...item,
            parentCategoryId: '',
            itemCategoryId: ''
        }));

        setFormData({
            title: 'Restock Request - Low Stock Items',
            description: `Automatic restock request for ${restockItems.length} item(s) below minimum quantity threshold.`,
            deadline: deadlineString,
            employeeRequestedBy: '',
            items: formattedRestockItems
        });

        setIsEditMode(false);
        setCurrentEditId(null);
        setShowAddModal(true);


    };

    // Modal and form handlers
    const handleCloseModal = () => {
        setShowAddModal(false);
        setIsEditMode(false);
        setCurrentEditId(null);
        // Reset form data
        setFormData({
            title: '',
            description: '',
            items: [{ itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }],
            deadline: '',
            employeeRequestedBy: '',
        });
        // Clear child categories and filter states
        setChildCategoriesByItem({});
        setShowFilters({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // UPDATED: Handle item changes including category filtering
    const handleItemChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];

            if (field === 'parentCategoryId') {
                // Reset child category and item type when parent changes
                newItems[index] = {
                    ...newItems[index],
                    parentCategoryId: value,
                    itemCategoryId: '',
                    itemTypeId: ''
                };
                // Fetch child categories for this item
                if (value) {
                    fetchChildCategories(value, index);
                } else {
                    setChildCategoriesByItem(prev => ({
                        ...prev,
                        [index]: []
                    }));
                }
            } else if (field === 'itemCategoryId') {
                // Reset item type when child category changes
                newItems[index] = {
                    ...newItems[index],
                    itemCategoryId: value,
                    itemTypeId: ''
                };
            } else {
                newItems[index] = {
                    ...newItems[index],
                    [field]: value
                };
            }

            return {
                ...prev,
                items: newItems
            };
        });
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                { itemTypeId: '', quantity: '', comment: '', parentCategoryId: '', itemCategoryId: '' }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length <= 1) return;

        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return {
                ...prev,
                items: newItems
            };
        });

        // Clean up child categories and filter states for removed item
        setChildCategoriesByItem(prev => {
            const newChildCategories = { ...prev };
            delete newChildCategories[index];
            // Reindex remaining items
            const reindexed = {};
            Object.keys(newChildCategories).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newChildCategories[key];
                } else {
                    reindexed[key] = newChildCategories[key];
                }
            });
            return reindexed;
        });

        // Clean up filter states
        setShowFilters(prev => {
            const newShowFilters = { ...prev };
            delete newShowFilters[index];
            // Reindex remaining items
            const reindexed = {};
            Object.keys(newShowFilters).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newShowFilters[key];
                } else {
                    reindexed[key] = newShowFilters[key];
                }
            });
            return reindexed;
        });
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();

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

        // Prepare the request payload (exclude category filter fields)
        const requestPayload = {
            title: formData.title,
            description: formData.description,
            createdBy: username,
            status: 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: warehouseId,
            deadline: formData.deadline,
            employeeRequestedBy: formData.employeeRequestedBy,
            items: formData.items.map(item => ({
                ...(item.id && { id: item.id }),
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || ''
                // Don't include parentCategoryId and itemCategoryId in the payload
            }))
        };

        try {
            const token = localStorage.getItem('token');

            // Replace the API calls in handleCreateRequest:
            let response;
            if (isEditMode && currentEditId) {
                // Update existing request
                response = await requestOrderService.update(currentEditId, requestPayload);
            } else {
                // Create new request
                response = await requestOrderService.create(requestPayload);
            }

            if (!response.ok) {
                throw new Error(isEditMode ? 'Failed to update request order' : 'Failed to create request order');
            }

            // Request created/updated successfully
            handleCloseModal();
            fetchPendingOrders(); // Refresh the pending orders list

            onShowSnackbar(isEditMode ? 'Request Order updated successfully!' : 'Request Order created successfully!', 'success');

        } catch (error) {
            console.error('Error saving request order:', error);
            onShowSnackbar(`Error: ${error.message}`, 'error');
        }
    };

    return (
        <div className="pending-request-orders-container">
            {/* Pending Orders Section */}
            <div className="request-orders-section">
                <div className="table-header-section">

                </div>

                <div className="request-orders-table-card">
                    <DataTable
                        data={pendingOrders}
                        columns={pendingOrderColumns}
                        actions={pendingOrderActions}
                        onRowClick={handleRowClick}
                        loading={isLoadingPending}
                        emptyMessage="No pending request orders found"
                        className="request-orders-table"
                        itemsPerPageOptions={[5, 10, 15, 20]}
                        defaultItemsPerPage={10}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={pendingFilterableColumns}
                        actionsColumnWidth="120px"
                        showAddButton={true}
                        addButtonText="Add Request"
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleAddRequest}
                    />
                </div>
            </div>

            {/* Modal for Creating Request */}
            {showAddModal && (
                <div className="warehouse-request-modal-backdrop">
                    <div className="warehouse-request-modal">
                        <div className="warehouse-request-modal-header">
                            <h2>{isEditMode ? 'Edit Request' : 'Create New Request'}</h2>
                            <button className="btn-close" onClick={handleCloseModal}>
                            </button>
                        </div>

                        <div className="warehouse-request-modal-content">
                            <form className="warehouse-request-form" onSubmit={handleCreateRequest}>
                                {/* Basic Request Information */}
                                <div className="warehouse-request-form-section">
                                    <div className="warehouse-request-form-field warehouse-request-full-width">
                                        <label htmlFor="title">Title <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            value={formData.title || ''}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Enter request title"
                                        />
                                    </div>

                                    <div className="warehouse-request-form-field">
                                        <label htmlFor="deadline">Deadline <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            type="datetime-local"
                                            id="deadline"
                                            name="deadline"
                                            value={formData.deadline || ''}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="warehouse-request-form-field">
                                        <label htmlFor="employeeRequestedBy">Employee Requested By</label>
                                        <select
                                            id="employeeRequestedBy"
                                            name="employeeRequestedBy"
                                            value={formData.employeeRequestedBy || ''}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(employee => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="warehouse-request-form-field warehouse-request-full-width">
                                        <label htmlFor="description">Description <span style={{ color: 'red' }}>*</span></label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            value={formData.description || ''}
                                            onChange={handleInputChange}
                                            placeholder="Enter request description"
                                            rows={4}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Request Items */}
                                <div className="warehouse-request-form-section">
                                    <div className="warehouse-request-section-header">
                                        <h3>Request Items</h3>
                                        <button
                                            type="button"
                                            className="warehouse-request-add-item-button"
                                            onClick={handleAddItem}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                            Add Another Item
                                        </button>
                                    </div>

                                    {formData.items.map((item, index) => (
                                        <div key={index} className="warehouse-request-item-card">
                                            <div className="warehouse-request-item-header">
                                                <span>Item {index + 1}</span>
                                                <div className="warehouse-request-item-header-actions">
                                                    <button
                                                        type="button"
                                                        className={`warehouse-request-filter-toggle ${showFilters[index] ? 'active' : ''}`}
                                                        onClick={() => toggleFilters(index)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                        </svg>
                                                        {showFilters[index] ? 'Hide Filters' : 'Filter Categories'}
                                                    </button>
                                                    {formData.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="warehouse-request-remove-button"
                                                            onClick={() => handleRemoveItem(index)}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6L6 18M6 6l12 12" />
                                                            </svg>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* COLLAPSIBLE FILTERS */}
                                            {/* COLLAPSIBLE FILTERS */}
                                            {showFilters[index] && (
                                                <div
                                                    className="warehouse-request-collapsible-filters"
                                                    data-filter-index={index}
                                                >
                                                    <div className="warehouse-request-filters-header">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                        </svg>
                                                        <h4>Category Filters</h4>
                                                    </div>

                                                    <div className="warehouse-request-filters-content">
                                                        <div className="warehouse-request-form-field">
                                                            <label>Parent Category</label>
                                                            <select
                                                                value={item.parentCategoryId || ''}
                                                                onChange={(e) => handleItemChange(index, 'parentCategoryId', e.target.value)}
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

                                                        <div className="warehouse-request-form-field">
                                                            <label>Child Category</label>
                                                            <select
                                                                value={item.itemCategoryId || ''}
                                                                onChange={(e) => handleItemChange(index, 'itemCategoryId', e.target.value)}
                                                                disabled={!item.parentCategoryId}
                                                            >
                                                                <option value="">All child categories</option>
                                                                {(childCategoriesByItem[index] || []).map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <span className="form-helper-text">
                                                                {!item.parentCategoryId ? (
                                                                    "Select a parent category first"
                                                                ) : (childCategoriesByItem[index] || []).length === 0 ? (
                                                                    "No child categories found for the selected parent category"
                                                                ) : (
                                                                    "Optional - leave empty to show all from parent"
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* MAIN ITEM FIELDS - CLEAN & SIMPLE */}
                                            <div className="warehouse-request-item-fields">
                                                <div className="warehouse-request-form-field">
                                                    <label>Item Type <span style={{ color: 'red' }}>*</span></label>
                                                    <select
                                                        value={item.itemTypeId || ''}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {getFilteredItemTypes(index)
                                                            .filter(type =>
                                                                type.id === item.itemTypeId ||
                                                                !formData.items.some(i => i !== item && i.itemTypeId === type.id)
                                                            )
                                                            .map(type => (
                                                                <option key={type.id} value={type.id}>{type.name}</option>
                                                            ))}
                                                    </select>

                                                </div>

                                                <div className="warehouse-request-form-field">
                                                    <label>Quantity <span style={{ color: 'red' }}>*</span></label>
                                                    <div className="warehouse-request-quantity-unit-container">
                                                        <input
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            className="warehouse-request-quantity-input"
                                                        />
                                                        {item.itemTypeId && (
                                                            <span className="warehouse-request-unit-label">
                                                                {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="warehouse-request-form-field warehouse-request-full-width">
                                                <label>Comment</label>
                                                <input
                                                    type="text"
                                                    value={item.comment || ''}
                                                    onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                                                    placeholder="Add any additional details about this item"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="warehouse-request-modal-footer">
                                    <button
                                        type="submit"
                                        className="warehouse-request-submit-button"
                                    >
                                        {isEditMode ? 'Update Request' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PendingRequestOrders;