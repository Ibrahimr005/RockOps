import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"
import './IncomingRequestOrders.scss';

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
        fetchSites();
        fetchItemTypes();
        fetchEmployees();
    }, []);

    const fetchSites = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/site', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load sites');
            }

            const data = await response.json();
            setSites(data);
        } catch (err) {
            console.error('Error fetching sites:', err);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/itemTypes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load item types');
            }

            const data = await response.json();
            setItemTypes(data);
        } catch (err) {
            console.error('Error fetching item types:', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/employees', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    const handleApproveClick = async (row, e) => {
        e.stopPropagation();

        if (window.confirm('Are you sure you want to approve this request and create an offer?')) {
            try {
                // Step 1: Update the request order status
                const token = localStorage.getItem('token');
                const updateResponse = await fetch(`http://localhost:8080/api/v1/requestOrders/${row.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'APPROVED' })
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update request order status');
                }

                // Step 2: Create a new offer based on this request order
                const offerData = {
                    requestOrderId: row.id,
                    title: `Procurement Offer for: ${row.title}`,
                    description: `This procurement offer responds to the request "${row.title}".
            Original request description: ${row.description}`,
                    status: 'UNSTARTED',
                    validUntil: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    offerItems: []
                };

                const createOfferResponse = await fetch('http://localhost:8080/api/v1/offers', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(offerData)
                });

                if (!createOfferResponse.ok) {
                    setNotificationMessage('Failed to accept request order');
                    setShowNotification(true);
                    setNotificationType("error");
                    return;
                }

                // Success notification
                setNotificationMessage('Request Order accepted successfully, Visit Offers to start on the offer.');
                setShowNotification(true);
                setNotificationType("success");

                // Refresh the request orders list in parent
                if (onDataChange) {
                    onDataChange();
                }
            } catch (err) {
                console.error('Error approving request order:', err);
                setNotificationMessage(`Error: ${err.message}`);
                setShowNotification(true);
                setNotificationType("error");
            }
        }
    };

    const handleEditClick = (row, e) => {
        e.stopPropagation();
        handleOpenEditModal(row);
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
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8080/api/v1/warehouses/site/${siteId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to load warehouses');
                }

                const data = await response.json();
                setWarehouses(data);
            } catch (err) {
                console.error('Error fetching warehouses:', err);
                setWarehouses([]);
            }
        } else {
            setWarehouses([]);
        }
    };

    const handleWarehouseChange = (e) => {
        const requesterId = e.target.value;

        // Find the selected warehouse's name
        const selectedWarehouse = warehouses.find(warehouse => warehouse.id === requesterId);
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

    const handleAddRequest = async (e) => {
        e.preventDefault();

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

        // Prepare the request payload to match your backend expectations
        const requestPayload = {
            title: formData.title,
            description: formData.description,
            createdBy: username,
            status: 'PENDING',
            partyType: 'WAREHOUSE', // Always set to WAREHOUSE
            requesterId: formData.requesterId,
            employeeRequestedBy: formData.employeeRequestedBy,
            deadline: formData.deadline,
            items: formData.items.map(item => ({
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || ''
            }))
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/requestOrders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                setNotificationMessage('Failed to create request order');
                setShowNotification(true);
                setNotificationType("error");
                return;
            }

            // Request created successfully
            handleCloseModal();
            if (onDataChange) {
                onDataChange(); // Refresh the list
            }

            setNotificationMessage('Request Order created successfully');
            setShowNotification(true);
            setNotificationType("success");

        } catch (err) {
            console.error('Error creating request order:', err);
            setNotificationMessage(`Error: ${err.message}`);
            setShowNotification(true);
            setNotificationType("error");
        }
    };

    const handleUpdateRequest = async (e) => {
        e.preventDefault();

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

        // Prepare the update payload
        const requestPayload = {
            title: formData.title,
            description: formData.description,
            updatedBy: username,
            status: formData.status,
            partyType: 'WAREHOUSE', // Always set to WAREHOUSE
            requesterId: formData.requesterId,
            employeeRequestedBy: formData.employeeRequestedBy,
            deadline: formData.deadline,
            items: formData.items.map(item => ({
                id: item.id, // Include the item ID if it exists (for updates)
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || ''
            }))
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/requestOrders/${currentOrderId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                throw new Error('Failed to update request order');
            }

            // Update successful
            handleCloseModal();
            if (onDataChange) {
                onDataChange(); // Refresh the list
            }

            setNotificationMessage('Request Order updated successfully');
            setShowNotification(true);
            setNotificationType("success");

        } catch (err) {
            console.error('Error updating request order:', err);
            setNotificationMessage(`Error: ${err.message}`);
            setShowNotification(true);
            setNotificationType("error");
        }
    };

    const handleOpenEditModal = async (order) => {
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
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8080/api/v1/warehouses/site/${order.siteId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setWarehouses(data);
                }
            } catch (err) {
                console.error('Error fetching warehouses:', err);
            }
        }

        // Show the modal
        setShowAddModal(true);
    };

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
                            <button className="pro-ro-close-modal" onClick={handleCloseModal}>
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
                                        <label htmlFor="title">Title</label>
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
                                            {employees.map(employee => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pro-ro-form-field">
                                        <label htmlFor="deadline">Deadline</label>
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
                                        <label htmlFor="description">Description</label>
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
                                                    <label>Item Type</label>
                                                    <select
                                                        value={item.itemTypeId || ''}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {itemTypes
                                                            .filter(type =>
                                                                // Show the item type if it's the currently selected one for this item
                                                                // OR if it's not selected in any other item
                                                                type.id === item.itemTypeId ||
                                                                !formData.items.some(i => i !== item && i.itemTypeId === type.id)
                                                            )
                                                            .map(type => (
                                                                <option key={type.id} value={type.id}>{type.name}</option>
                                                            ))}
                                                    </select>
                                                </div>

                                                <div className="pro-ro-form-field">
                                                    <label>Quantity</label>
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
                                                        {item.itemTypeId && (
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
                                        <label htmlFor="site">Site</label>
                                        <select
                                            id="site"
                                            name="siteId"
                                            value={formData.siteId || ''}
                                            onChange={handleSiteChange}
                                            required
                                        >
                                            <option value="">Select Site</option>
                                            {sites.map(site => (
                                                <option key={site.id} value={site.id}>{site.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.siteId && (
                                        <div className="pro-ro-form-field">
                                            <label htmlFor="requesterId">Select Warehouse</label>
                                            <select
                                                id="requesterId"
                                                name="requesterId"
                                                value={formData.requesterId || ''}
                                                onChange={handleWarehouseChange}
                                                required
                                            >
                                                <option value="">Select Warehouse</option>
                                                {warehouses.map(warehouse => (
                                                    <option key={warehouse.id} value={warehouse.id}>
                                                        {warehouse.name}
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
                                        className="pro-ro-cancel-button"
                                        onClick={handleCloseModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="pro-ro-submit-button"
                                        disabled={!formData.requesterId || !formData.title || formData.items.length === 0}
                                    >
                                        {isEditMode ? 'Update Request' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default IncomingRequestOrders;