import React, { useState, useEffect } from 'react';
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx"
import { useNavigate } from 'react-router-dom';
import './WarehouseRequestOrders.scss';

const WarehouseRequestOrders = ({ warehouseId }) => {
    const navigate = useNavigate();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [validatedOrders, setValidatedOrders] = useState([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);
    const [isLoadingValidated, setIsLoadingValidated] = useState(false);
    const [userRole, setUserRole] = useState("");

    // Modal and form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentEditId, setCurrentEditId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        items: [{ itemTypeId: '', quantity: '', comment: '' }],
        deadline: '',
        // Removed employeeRequestedBy since it's not being used
    });
    const [itemTypes, setItemTypes] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

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

    // Column configuration for validated request orders
    const validatedOrderColumns = [
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
            width: '200px',
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
            width: '200px',
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
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || 'N/A';
            }
        },
        {
            id: 'approvedBy',
            header: 'APPROVED BY',
            accessor: 'approvedBy',
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                return value || row.validatedBy || 'N/A';
            }
        },
        {
            id: 'approvedAt',
            header: 'APPROVED AT',
            accessor: 'approvedAt',
            width: '200px',
            minWidth: '120px',
            sortable: true,
            filterable: true,
            filterType: 'text',
            render: (row, value) => {
                const approvedDate = value || row.validatedDate || row.approvedDate;
                return approvedDate ? new Date(approvedDate).toLocaleDateString() : 'N/A';
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

    const validatedFilterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'select'
        },
        {
            header: 'Approved By',
            accessor: 'approvedBy',
            filterType: 'select'
        }
    ];

    // Get user role from localStorage
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

    // Fetch initial data
    useEffect(() => {
        if (warehouseId) {
            fetchPendingOrders();
            fetchValidatedOrders();
            fetchItemTypes();
            // Removed fetchEmployees() since it's not being used
        }
    }, [warehouseId]);

    // Fetch item types
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
        } catch (error) {
            console.error('Error fetching item types:', error);
        }
    };

    // Removed fetchEmployees() function since it's not being used

    // Fetch pending request orders
    const fetchPendingOrders = async () => {
        setIsLoadingPending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8080/api/v1/requestOrders/warehouse?warehouseId=${warehouseId}&status=PENDING`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setPendingOrders(data);
        } catch (error) {
            console.error('Error fetching pending orders:', error);
            setPendingOrders([]);
        } finally {
            setIsLoadingPending(false);
        }
    };

    // Fetch validated request orders
    const fetchValidatedOrders = async () => {
        setIsLoadingValidated(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8080/api/v1/requestOrders/warehouse?warehouseId=${warehouseId}&status=APPROVED`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setValidatedOrders(data);
        } catch (error) {
            console.error('Error fetching validated orders:', error);
            setValidatedOrders([]);
        } finally {
            setIsLoadingValidated(false);
        }
    };

    // Handle edit request
    const handleEditRequest = async (request) => {
        try {
            // Fetch the full request details with items
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/requestOrders/${request.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch request details');
            }

            const requestDetails = await response.json();

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
                    comment: item.comment || ''
                }))
                : [{ itemTypeId: '', quantity: '', comment: '' }];

            setFormData({
                title: requestDetails.title || '',
                description: requestDetails.description || '',
                deadline: deadline,
                items: items
            });

            setShowAddModal(true);

        } catch (error) {
            console.error('Error fetching request details:', error);
            setNotificationMessage('Failed to load request details. Please try again.');
            setShowNotification(true);
            setNotificationType('error');
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

            setNotificationMessage('Delete functionality to be implemented');
            setShowNotification(true);
            setNotificationType('info');

        } catch (error) {
            console.error('Error deleting request:', error);
            setNotificationMessage('Failed to delete request. Please try again.');
            setShowNotification(true);
            setNotificationType('error');
        }
    };

    // Handle row click to navigate to detail page
    const handleRowClick = (row) => {
        navigate(`/procurement/request-orders/${row.id}`);
    };

    // Modal and form handlers
    const handleOpenModal = () => {
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setIsEditMode(false);
        setCurrentEditId(null);
        // Reset form data
        setFormData({
            title: '',
            description: '',
            items: [{ itemTypeId: '', quantity: '', comment: '' }],
            deadline: '',
            // Removed employeeRequestedBy since it's not being used
        });
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

        // Prepare the request payload
        const requestPayload = {
            title: formData.title,
            description: formData.description,
            createdBy: username,
            status: 'PENDING',
            partyType: 'WAREHOUSE',
            requesterId: warehouseId,
            deadline: formData.deadline,
            items: formData.items.map(item => ({
                ...(item.id && { id: item.id }), // Include item ID if editing existing item
                itemTypeId: item.itemTypeId,
                quantity: item.quantity,
                comment: item.comment || ''
            }))
        };

        try {
            const token = localStorage.getItem('token');

            let response;
            if (isEditMode && currentEditId) {
                // Update existing request
                response = await fetch(`http://localhost:8080/api/v1/requestOrders/${currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestPayload)
                });
            } else {
                // Create new request
                response = await fetch('http://localhost:8080/api/v1/requestOrders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestPayload)
                });
            }

            if (!response.ok) {
                throw new Error(isEditMode ? 'Failed to update request order' : 'Failed to create request order');
            }

            // Request created/updated successfully
            handleCloseModal();
            fetchPendingOrders(); // Refresh the pending orders list

            setNotificationMessage(isEditMode ? 'Request Order updated successfully!' : 'Request Order created successfully!');
            setShowNotification(true);
            setNotificationType('success');

        } catch (error) {
            console.error('Error saving request order:', error);
            setNotificationMessage(`Error: ${error.message}`);
            setShowNotification(true);
            setNotificationType('error');
        }
    };

    return (
        <div className="warehouse-request-orders-container">


            {/* Pending Orders Section */}
            <div className="request-orders-section">
                <h2 className="request-section-title">Pending Requests</h2>
                <p className="request-section-description">
                    ( Orders awaiting approval or rejection )
                </p>

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
                    />
                </div>
            </div>

            {/* Validated Orders Section */}
            <div className="request-orders-section">
                <h2 className="request-section-title">Validated Requests</h2>
                <p className="request-section-description">
                    ( Orders that have been processed and approved )
                </p>

                <div className="request-orders-table-card">
                    <DataTable
                        data={validatedOrders}
                        columns={validatedOrderColumns}
                        onRowClick={handleRowClick}
                        loading={isLoadingValidated}
                        emptyMessage="No validated request orders found"
                        className="request-orders-table"
                        itemsPerPageOptions={[5, 10, 15, 20]}
                        defaultItemsPerPage={10}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={validatedFilterableColumns}
                    />
                </div>
            </div>

            {/* Add Button - Only show for warehouse managers */}
            {userRole === "WAREHOUSE_MANAGER" && (
                <button
                    className="request-orders-add-button"
                    title="Create New Request"
                    onClick={handleOpenModal}
                >
                    <svg className="request-orders-plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                </button>
            )}

            {/* Modal for Creating Request */}
            {showAddModal && (
                <div className="warehouse-request-modal-backdrop">
                    <div className="warehouse-request-modal">
                        <div className="warehouse-request-modal-header">
                            <h2>{isEditMode ? 'Edit Request' : 'Create New Request'}</h2>
                            <button className="warehouse-request-close-modal" onClick={handleCloseModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="warehouse-request-modal-content">
                            <form className="warehouse-request-form" onSubmit={handleCreateRequest}>
                                {/* Basic Request Information */}
                                <div className="warehouse-request-form-section">
                                    <div className="warehouse-request-form-field warehouse-request-full-width">
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

                                    <div className="warehouse-request-form-field">
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

                                    <div className="warehouse-request-form-field">
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

                                    <div className="warehouse-request-form-field warehouse-request-full-width">
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

                                            <div className="warehouse-request-item-fields">
                                                <div className="warehouse-request-form-field">
                                                    <label>Item Type</label>
                                                    <select
                                                        value={item.itemTypeId || ''}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {itemTypes
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
                                                    <label>Quantity</label>
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

                                <div className="warehouse-request-modal-footer">
                                    <button
                                        type="button"
                                        className="warehouse-request-cancel-button"
                                        onClick={handleCloseModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="warehouse-request-submit-button"
                                        disabled={!formData.title || formData.items.length === 0}
                                    >
                                        {isEditMode ? 'Update Request' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
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
        </div>
    );
};

export default WarehouseRequestOrders;