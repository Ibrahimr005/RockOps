import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { siteService } from '../../../../services/siteService.js';
import { warehouseService } from '../../../../services/warehouse/warehouseService.js';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService.js';
import { employeeService } from '../../../../services/hr/employeeService.js';
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import { offerService } from '../../../../services/procurement/offerService.js';
import './IncomingRequestOrders.scss';
import RequestOrderViewModal from "../RequestOrderViewModal/RequestOrderViewModal.jsx";

const IncomingRequestOrders = ({
                                   onDataChange,
                                   requestOrders,
                                   loading
                               }) => {
    const navigate = useNavigate();
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedRowForApproval, setSelectedRowForApproval] = useState(null);
    const [isApproving, setIsApproving] = useState(false);

    // View modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);

    // Form data and related states
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        siteId: '',
        requesterId: '',
        requesterName: '',
        items: [{ itemTypeId: '', quantity: '', comment: '' }],
        status: 'PENDING',
        deadline: '',
        employeeRequestedBy: ''
    });
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // Initialize all arrays to prevent undefined errors
            setSites([]);
            setItemTypes([]);
            setEmployees([]);
            setWarehouses([]);

            await Promise.all([
                fetchSites(),
                fetchItemTypes(),
                fetchEmployees()
            ]);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            // Ensure all arrays are set even on error
            setSites([]);
            setItemTypes([]);
            setEmployees([]);
            setWarehouses([]);
            showErrorNotification('Failed to load initial data');
        }
    };

    const fetchSites = async () => {
        try {
            const data = await siteService.getAllSites();
            setSites(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching sites:', err);
            setSites([]); // Set empty array on error
            showErrorNotification('Failed to load sites');
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching item types:', err);
            setItemTypes([]); // Set empty array on error
            showErrorNotification('Failed to load item types');
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            // Handle different response structures
            const employeesData = response.data || response;
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setEmployees([]); // Set empty array on error
            showErrorNotification('Failed to load employees');
        }
    };

    const showErrorNotification = (message) => {
        console.error('Error notification:', message);
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
    };

    const showSuccessNotification = (message) => {
        console.log('Success notification:', message);
        setNotificationMessage(String(message || 'Operation successful'));
        setNotificationType('success');
        setShowNotification(true);
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    const handleApproveClick = async (row, e) => {
        e.stopPropagation();
        setSelectedRowForApproval(row);
        setShowConfirmDialog(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedRowForApproval) return;

        setIsApproving(true);

        try {
            // Step 1: Update the request order status
            await requestOrderService.updateStatus(selectedRowForApproval.id, 'APPROVED');

            // Step 2: Create a new offer based on this request order
            const offerData = {
                requestOrderId: selectedRowForApproval.id,
                title: `Procurement Offer for: ${selectedRowForApproval.title}`,
                description: `This procurement offer responds to the request "${selectedRowForApproval.title}".
        Original request description: ${selectedRowForApproval.description}`,
                status: 'UNSTARTED',
                validUntil: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                offerItems: []
            };

            await offerService.create(offerData);

            // Success notification
            showSuccessNotification('Request Order accepted successfully, Visit Offers to start on the offer.');

            // Refresh the request orders list in parent
            if (onDataChange) {
                onDataChange();
            }
        } catch (err) {
            console.error('Error approving request order:', err);
            showErrorNotification(`Error: ${err.message || 'Failed to accept request order'}`);
        } finally {
            setIsApproving(false);
            setShowConfirmDialog(false);
            setSelectedRowForApproval(null);
        }
    };

    const handleCancelApproval = () => {
        setShowConfirmDialog(false);
        setSelectedRowForApproval(null);
        setIsApproving(false);
    };

    const handleEditClick = (row, e) => {
        e.stopPropagation();
        handleOpenEditModal(row);
    };

    const handleViewClick = (row, e) => {
        e.stopPropagation();
        setSelectedRequestOrder(row);
        setShowViewModal(true);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedRequestOrder(null);
    };

    // Handle add button click
    const handleAddClick = () => {
        setIsEditMode(false);
        setCurrentOrderId(null);
        setFormData({
            title: '',
            description: '',
            siteId: '',
            requesterId: '',
            requesterName: '',
            items: [{ itemTypeId: '', quantity: '', comment: '' }],
            status: 'PENDING',
            deadline: '',
            employeeRequestedBy: ''
        });
        setWarehouses([]);
        setShowAddModal(true);
    };

    // Form handling functions
    const handleSiteChange = async (e) => {
        const siteId = e.target.value;

        // Reset downstream selections
        setFormData(prev => ({
            ...prev,
            siteId,
            requesterId: '',
            requesterName: ''
        }));

        // Fetch warehouses for the selected site
        if (siteId) {
            try {
                const data = await warehouseService.getBySite(siteId);
                setWarehouses(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching warehouses:', err);
                setWarehouses([]);
                showErrorNotification('Failed to load warehouses');
            }
        } else {
            setWarehouses([]);
        }
    };

    const handleWarehouseChange = (e) => {
        const requesterId = e.target.value;

        // Find the selected warehouse's name
        const selectedWarehouse = Array.isArray(warehouses)
            ? warehouses.find(warehouse => warehouse.id === requesterId)
            : null;
        const requesterName = selectedWarehouse ? selectedWarehouse.name : '';

        setFormData(prev => ({
            ...prev,
            requesterId,
            requesterName
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems[index] = {
                ...newItems[index],
                [field]: value
            };
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
                { itemTypeId: '', quantity: '', comment: '' }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        // Don't allow removing if there's only one item
        if (formData.items.length <= 1) return;

        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            return {
                ...prev,
                items: newItems
            };
        });
    };

    const getUserInfo = () => {
        let username = "system"; // Default fallback
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
        return username;
    };

    const handleAddRequest = async (e) => {
        e.preventDefault();
        const username = getUserInfo();

        // Validate form data before submission
        if (!formData.title || !formData.description || !formData.requesterId || !formData.deadline) {
            showErrorNotification('Please fill in all required fields');
            return;
        }

        if (!formData.items.some(item => item.itemTypeId && item.quantity)) {
            showErrorNotification('Please add at least one item with type and quantity');
            return;
        }

        // Prepare the request payload to match your Spring Boot backend expectations
        const requestPayload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            createdBy: username,
            status: 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: formData.requesterId, // Should be UUID string
            employeeRequestedBy: formData.employeeRequestedBy || null,
            deadline: formData.deadline, // Send as datetime-local format, not ISO
            items: formData.items
                .filter(item => item.itemTypeId && item.quantity) // Only include valid items
                .map(item => ({
                    itemTypeId: item.itemTypeId, // Should be UUID string
                    quantity: parseFloat(item.quantity),
                    comment: (item.comment || '').trim()
                }))
        };

        console.log('Creating request with payload:', JSON.stringify(requestPayload, null, 2));

        try {
            const result = await requestOrderService.create(requestPayload);
            console.log('Request creation successful:', result);

            // Request created successfully
            handleCloseModal();
            if (onDataChange) {
                onDataChange(); // Refresh the list
            }

            showSuccessNotification('Request Order created successfully');
        } catch (err) {
            console.error('Full error object:', err);

            // Enhanced error handling
            let errorMessage = 'Failed to create request order';

            if (err.response) {
                // Server responded with error status
                console.error('Server error details:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                    headers: err.response.headers
                });

                if (err.response.data) {
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (err.response.data.message) {
                        errorMessage = err.response.data.message;
                    } else if (err.response.data.error) {
                        errorMessage = err.response.data.error;
                    } else {
                        errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
                    }
                } else {
                    errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
                }
            } else if (err.request) {
                // Network error
                console.error('Network error - no response received:', err.request);
                errorMessage = 'Network error - please check your connection and try again';
            } else {
                // Other error
                console.error('Request setup error:', err.message);
                errorMessage = err.message || 'Unknown error occurred';
            }

            showErrorNotification(`Error: ${errorMessage}`);
        }
    };

    const handleUpdateRequest = async (e) => {
        e.preventDefault();
        const username = getUserInfo();

        // Validate form data before submission
        if (!formData.title || !formData.description || !formData.requesterId || !formData.deadline) {
            showErrorNotification('Please fill in all required fields');
            return;
        }

        if (!formData.items.some(item => item.itemTypeId && item.quantity)) {
            showErrorNotification('Please add at least one item with type and quantity');
            return;
        }

        // Prepare the update payload
        const requestPayload = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            updatedBy: username,
            status: formData.status,
            partyType: 'WAREHOUSE',
            requesterId: formData.requesterId, // Should be UUID string
            employeeRequestedBy: formData.employeeRequestedBy || null,
            deadline: formData.deadline, // Send as datetime-local format, not ISO
            items: formData.items
                .filter(item => item.itemTypeId && item.quantity) // Only include valid items
                .map(item => ({
                    id: item.id || null, // Include the item ID if it exists (for updates)
                    itemTypeId: item.itemTypeId, // Should be UUID string
                    quantity: parseFloat(item.quantity),
                    comment: (item.comment || '').trim()
                }))
        };

        console.log('Updating request with payload:', JSON.stringify(requestPayload, null, 2));

        try {
            const result = await requestOrderService.update(currentOrderId, requestPayload);
            console.log('Request update successful:', result);

            // Update successful
            handleCloseModal();
            if (onDataChange) {
                onDataChange(); // Refresh the list
            }

            showSuccessNotification('Request Order updated successfully');
        } catch (err) {
            console.error('Full error object:', err);

            // Enhanced error handling
            let errorMessage = 'Failed to update request order';

            if (err.response) {
                // Server responded with error status
                console.error('Server error details:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                    headers: err.response.headers
                });

                if (err.response.data) {
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (err.response.data.message) {
                        errorMessage = err.response.data.message;
                    } else if (err.response.data.error) {
                        errorMessage = err.response.data.error;
                    } else {
                        errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
                    }
                } else {
                    errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
                }
            } else if (err.request) {
                // Network error
                console.error('Network error - no response received:', err.request);
                errorMessage = 'Network error - please check your connection and try again';
            } else {
                // Other error
                console.error('Request setup error:', err.message);
                errorMessage = err.message || 'Unknown error occurred';
            }

            showErrorNotification(`Error: ${errorMessage}`);
        }
    };

    const handleOpenEditModal = async (order) => {
        try {
            // Set edit mode
            setIsEditMode(true);
            setCurrentOrderId(order.id);

            // Format the deadline for datetime-local input (if it exists)
            const deadline = order.deadline
                ? new Date(order.deadline).toISOString().slice(0, 16)
                : '';

            // Handle items specifically - make sure we're getting the items array correctly
            let itemsToSet = [{ itemTypeId: '', quantity: '', comment: '' }]; // Default

            // Check if order.items exists and is an array
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToSet = order.items.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemTypeId,
                    quantity: item.quantity,
                    comment: item.comment || ''
                }));
            }
            // If the items are in a different property, check there
            else if (order.requestItems && Array.isArray(order.requestItems) && order.requestItems.length > 0) {
                itemsToSet = order.requestItems.map(item => ({
                    id: item.id,
                    itemTypeId: item.itemTypeId || item.itemType?.id, // Handle nested structure if needed
                    quantity: item.quantity,
                    comment: item.comment || ''
                }));
            }

            // Populate form with the order data directly
            setFormData({
                title: order.title || '',
                description: order.description || '',
                siteId: order.siteId || '',
                requesterId: order.requesterId || '',
                requesterName: order.requesterName || '',
                status: order.status || 'PENDING',
                deadline: deadline,
                employeeRequestedBy: order.employeeRequestedBy || '',
                items: itemsToSet
            });

            // Load warehouses for the selected site
            if (order.siteId) {
                try {
                    const data = await warehouseService.getBySite(order.siteId);
                    setWarehouses(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('Error fetching warehouses:', err);
                    setWarehouses([]);
                    showErrorNotification('Failed to load warehouses for selected site');
                }
            }

            // Show the modal
            setShowAddModal(true);
        } catch (error) {
            console.error('Error opening edit modal:', error);
            showErrorNotification('Failed to open edit modal');
        }
    };

    useEffect(() => {
        if (showAddModal) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [showAddModal]);

    const handleCloseModal = () => {
        setShowAddModal(false);
        setIsEditMode(false);
        setCurrentOrderId(null);
        // Reset form data
        setFormData({
            title: '',
            description: '',
            siteId: '',
            requesterId: '',
            requesterName: '',
            items: [{ itemTypeId: '', quantity: '', comment: '' }],
            status: 'PENDING',
            deadline: '',
            employeeRequestedBy: ''
        });
        setWarehouses([]);
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requesterName',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'deadline',
            header: 'DEADLINE',
            accessor: 'deadline',
            sortable: true,
            minWidth: '250px',
            render: (row) => (
                <span className="pro-roi-date-cell">
                    {new Date(row.deadline).toLocaleDateString()}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '250px'
        },
        {
            id: 'createdAt',
            header: 'CREATED AT',
            accessor: 'createdAt',
            sortable: true,
            minWidth: '250px',
            render: (row) => (
                <span className="pro-roi-date-cell">
                    {new Date(row.createdAt).toLocaleDateString()}
                </span>
            )
        }
    ];

    // Define actions for DataTable
    const actions = [
        {
            label: 'View',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            ),
            onClick: (row) => handleViewClick(row, { stopPropagation: () => {} }),
            className: 'view'
        },
        {
            label: 'Approve',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            ),
            onClick: (row) => handleApproveClick(row, { stopPropagation: () => {} }),
            className: 'approve'
        },
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            onClick: (row) => handleEditClick(row, { stopPropagation: () => {} }),
            className: 'edit'
        }
    ];

    // Define filterable columns
    const filterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Requester',
            accessor: 'requesterName',
            filterType: 'select'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        }
    ];

    return (
        <div className="pro-roi-incoming-requests-container">
            <DataTable
                data={requestOrders || []}
                columns={columns}
                actions={actions}
                onRowClick={handleRowClick}
                loading={loading}
                emptyMessage="No incoming requests found"
                className="pro-roi-incoming-requests-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                // Add button props
                showAddButton={true}
                addButtonText="Add Request Order"
                addButtonIcon={<FaPlus />}
                onAddClick={handleAddClick}
                addButtonProps={{
                    title: "Create new request order"
                }}
            />

            {/* Modal for Adding/Editing Request */}
            {showAddModal && (
                <div className="pro-ro-modal-backdrop">
                    <div className="pro-ro-modal">
                        <div className="pro-ro-modal-header">
                            <h2>{isEditMode ? 'Update Request Order' : 'Create New Request'}</h2>
                            <button className="btn-close" onClick={handleCloseModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="pro-ro-modal-content">
                            <form className="pro-ro-form" onSubmit={isEditMode ? handleUpdateRequest : handleAddRequest}>
                                {/* Basic Request Information */}
                                <div className="pro-ro-form-section">
                                    <div className="pro-ro-form-field pro-ro-full-width">
                                        <label htmlFor="title">Title <span style={{color: 'red'}}>*</span></label>
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

                                    <div className="pro-ro-form-field">
                                        <label htmlFor="employeeRequestedBy">Requested By (Employee)</label>
                                        <select
                                            id="employeeRequestedBy"
                                            name="employeeRequestedBy"
                                            value={formData.employeeRequestedBy || ''}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select Employee</option>
                                            {Array.isArray(employees) && employees.map(employee => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.name || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pro-ro-form-field">
                                        <label htmlFor="deadline">Deadline <span style={{color: 'red'}}>*</span></label>
                                        <input
                                            type="datetime-local"
                                            id="deadline"
                                            name="deadline"
                                            value={formData.deadline || ''}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="pro-ro-form-field pro-ro-full-width">
                                        <label htmlFor="description">Description <span style={{color: 'red'}}>*</span></label>
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
                                <div className="pro-ro-form-section">
                                    <div className="pro-ro-section-header">
                                        <h3>Request Items</h3>
                                        <button
                                            type="button"
                                            className="pro-ro-add-item-button"
                                            onClick={handleAddItem}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                            Add Another Item
                                        </button>
                                    </div>

                                    {formData.items.map((item, index) => (
                                        <div key={index} className="pro-ro-item-card">
                                            <div className="pro-ro-item-header">
                                                <span>Item {index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="pro-ro-remove-button"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12" />
                                                        </svg>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pro-ro-item-fields">
                                                <div className="pro-ro-form-field">
                                                    <label>Item Type <span style={{color: 'red'}}>*</span></label>
                                                    <select
                                                        value={item.itemTypeId || ''}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {Array.isArray(itemTypes) && itemTypes
                                                            .filter(type =>
                                                                // Show the item type if it's the currently selected one for this item
                                                                // OR if it's not selected in any other item
                                                                type.id === item.itemTypeId ||
                                                                !formData.items.some(i => i !== item && i.itemTypeId === type.id)
                                                            )
                                                            .map(type => (
                                                                <option key={type.id} value={type.id}>{type.name || 'Unknown Item Type'}</option>
                                                            ))}
                                                    </select>
                                                </div>

                                                <div className="pro-ro-form-field">
                                                    <label>Quantity <span style={{color: 'red'}}>*</span></label>
                                                    <div className="pro-ro-quantity-unit-container">
                                                        <input
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            className="pro-ro-quantity-input"
                                                        />
                                                        {item.itemTypeId && Array.isArray(itemTypes) && (
                                                            <span className="pro-ro-unit-label">
                                                                {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pro-ro-form-field pro-ro-full-width">
                                                <label>Comment (Optional)</label>
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

                                {/* Site and Warehouse Selection */}
                                <div className="pro-ro-form-section">
                                    <div className="pro-ro-section-header">
                                        <h3>Requester Information</h3>
                                    </div>

                                    <div className="pro-ro-form-field">
                                        <label htmlFor="site">Site <span style={{color: 'red'}}>*</span></label>
                                        <select
                                            id="site"
                                            name="siteId"
                                            value={formData.siteId || ''}
                                            onChange={handleSiteChange}
                                            required
                                        >
                                            <option value="">Select Site</option>
                                            {Array.isArray(sites) && sites.map(site => (
                                                <option key={site.id} value={site.id}>{site.name || 'Unknown Site'}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.siteId && (
                                        <div className="pro-ro-form-field">
                                            <label htmlFor="requesterId">Select Warehouse <span style={{color: 'red'}}>*</span></label>
                                            <select
                                                id="requesterId"
                                                name="requesterId"
                                                value={formData.requesterId || ''}
                                                onChange={handleWarehouseChange}
                                                required
                                            >
                                                <option value="">Select Warehouse</option>
                                                {Array.isArray(warehouses) && warehouses.map(warehouse => (
                                                    <option key={warehouse.id} value={warehouse.id}>
                                                        {warehouse.name || 'Unknown Warehouse'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {formData.requesterId && (
                                        <div className="pro-ro-form-field pro-ro-selected-requester">
                                            <span className="pro-ro-requester-label">Selected Warehouse:</span>
                                            <span className="pro-ro-requester-value">{formData.requesterName}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pro-ro-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={handleCloseModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"

                                    >
                                        {isEditMode ? 'Update Request' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Approval */}
            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="success"
                title="Approve Request Order"
                message={`Are you sure you want to approve "${selectedRowForApproval?.title}"? This will create a new procurement offer.`}
                confirmText="Approve & Create Offer"
                cancelText="Cancel"
                onConfirm={handleConfirmApproval}
                onCancel={handleCancelApproval}
                isLoading={isApproving}
                size="large"
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />

            {/* Request Order View Modal */}
            <RequestOrderViewModal
                requestOrder={selectedRequestOrder}
                isOpen={showViewModal}
                onClose={handleCloseViewModal}
            />
        </div>
    );
};

export default IncomingRequestOrders;