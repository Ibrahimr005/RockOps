import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./ProcurementRequestOrder.scss";
import procurementImage from "../../../assets/imgs/pro_icon.png";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx"
import IncomingRequestOrders from './IncomingRequests/IncomingRequestOrders';
import ApprovedRequestOrders from './ApprovedRequests/ApprovedRequestOrders';
import PageHeader from '../../../components/common/PageHeader/PageHeader';

const ProcurementRequestOrders = ({ onEdit, onDelete }) => {
    const [requestOrders, setRequestOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Tab state
    const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' or 'approved'

    // Form data and related states
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        siteId: '',
        requesterId: '',
        requesterName: '',
        items: [{ itemTypeId: '', quantity: '', comment: '' }], // Start with one item
        status: 'PENDING',
        deadline: '',
        employeeRequestedBy: ''
    });
    const [employees, setEmployees] = useState([]);
    const [sites, setSites] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);

    useEffect(() => {
        fetchRequestOrders();
        fetchSites();
        fetchItemTypes();
    }, []);

    const fetchRequestOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/requestOrders', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load request orders');
            }

            const data = await response.json();
            setRequestOrders(data);
            setError(null);
        } catch (err) {
            setError('Failed to load request orders.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
            fetchRequestOrders(); // Refresh the list

            setNotificationMessage('Request Order created successfully');
            setShowNotification(true);
            setNotificationType("success");

            // Reset form data
            setFormData({
                title: '',
                description: '',
                siteId: '',
                requesterId: '',
                requesterName: '',
                items: [{ itemTypeId: '', quantity: '', comment: '' }],
                status: 'PENDING'
            });

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
            fetchRequestOrders(); // Refresh the list

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

    const handleOpenModal = () => {
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
            status: 'PENDING'
        });
        setWarehouses([]);
    };

    const handleEditClick = async (order) => {
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


    return (
        <div className="procurement-requests-container">
            {/* Intro Card with centered title and search bar */}
            <div className="procurement-intro-card">
                <div className="procurement-intro-left">
                    <img
                        src={procurementImage}
                        alt="Procurement"
                        className="procurement-intro-image"
                    />
                </div>
                <div className="procurement-intro-content">
                    <div className="procurement-intro-header">
                        <span className="procurement-label">PROCUREMENT CENTER</span>
                        <h2 className="procurement-intro-title">Request Orders</h2>
                    </div>

                    <div className="procurement-stats">
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">
                                {requestOrders.filter(order => order.status === 'PENDING').length}
                            </span>
                            <span className="procurement-stat-label">Pending Requests</span>
                        </div>
                        <div className="procurement-stat-item">
                            <span className="procurement-stat-value">
                                {requestOrders.filter(order => order.status === 'APPROVED').length}
                            </span>
                            <span className="procurement-stat-label">Approved Requests</span>
                        </div>
                    </div>
                </div>
                <div className="procurement-intro-right">
                    <button className="procurement-info-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />c
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="procurement-tabs">
                <button
                    className={`procurement-tab ${activeTab === 'incoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('incoming')}
                >
                    Incoming Requests
                </button>
                <button
                    className={`procurement-tab ${activeTab === 'approved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approved')}
                >
                    Approved Requests
                </button>
            </div>

            {/* Conditionally render the appropriate table based on active tab */}
            {activeTab === 'incoming' ? (
                <IncomingRequestOrders
                    onEditRequest={handleEditClick}
                    onDataChange={fetchRequestOrders}
                    requestOrders={requestOrders}  // Pass the data
                    loading={loading}              // Pass loading state
                />
            ) : (
                <ApprovedRequestOrders
                    onDataChange={fetchRequestOrders}
                    requestOrders={requestOrders}  // Pass the data
                    loading={loading}              // Pass loading state
                />
            )}

            {/* Add Button */}
            <div className="procurement-requests-add-button-container">
                <button
                    className="procurement-requests-add-button"
                    onClick={handleOpenModal}
                >
                    <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>

            {/* Modal for Adding/Editing Request */}
            {showAddModal && (
                <div className="ro-modal-backdrop">
                    <div className="ro-modal">
                        <div className="ro-modal-header">
                            <h2>{isEditMode ? 'Update Request Order' : 'Create New Request'}</h2>
                            <button className="ro-close-modal" onClick={handleCloseModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="ro-modal-content">
                            <form className="ro-form" onSubmit={isEditMode ? handleUpdateRequest : handleAddRequest}>
                                {/* Basic Request Information */}
                                <div className="ro-form-section">
                                    <div className="ro-form-field ro-full-width">
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

                                    <div className="ro-form-field">
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

                                    <div className="ro-form-field">
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

                                    <div className="ro-form-field ro-full-width">
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
                                <div className="ro-form-section">
                                    <div className="ro-section-header">
                                        <h3>Request Items</h3>
                                        <button
                                            type="button"
                                            className="ro-add-item-button"
                                            onClick={handleAddItem}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                            Add Another Item
                                        </button>
                                    </div>

                                    {formData.items.map((item, index) => (
                                        <div key={index} className="ro-item-card">
                                            <div className="ro-item-header">
                                                <span>Item {index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="ro-remove-button"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12" />
                                                        </svg>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="ro-item-fields">
                                                <div className="ro-form-field">
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

                                                <div className="ro-form-field">
                                                    <label>Quantity</label>
                                                    <div className="ro-quantity-unit-container">
                                                        <input
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            min="0.01"
                                                            step="0.01"
                                                            required
                                                            className="ro-quantity-input"
                                                        />
                                                        {item.itemTypeId && (
                                                            <span className="ro-unit-label">
                                                                {itemTypes.find(type => type.id === item.itemTypeId)?.measuringUnit || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ro-form-field ro-full-width">
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
                                <div className="ro-form-section">
                                    <div className="ro-section-header">
                                        <h3>Requester Information</h3>
                                    </div>

                                    <div className="ro-form-field">
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
                                        <div className="ro-form-field">
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
                                        <div className="ro-form-field ro-selected-requester">
                                            <span className="ro-requester-label">Selected Warehouse:</span>
                                            <span className="ro-requester-value">{formData.requesterName}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="ro-modal-footer">
                                    <button
                                        type="button"
                                        className="ro-cancel-button"
                                        onClick={handleCloseModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="ro-submit-button"
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

            {/* Notification */}
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

export default ProcurementRequestOrders;