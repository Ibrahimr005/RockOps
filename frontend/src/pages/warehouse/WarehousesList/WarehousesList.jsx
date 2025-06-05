import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./WarehousesList.scss";
import warehouseImg from "../../../assets/imgs/warehouse1.jpg"; // Default warehouse image
import { FaWarehouse, FaTimes } from 'react-icons/fa'; // Added FaTimes for remove icons
import { useAuth } from "../../../contexts/AuthContext";

const WarehousesList = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Modal states and data
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [sites, setSites] = useState([]);
    const [managers, setManagers] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        siteId: "",
        managerId: "",
        workerIds: [], // Changed from workerId to workerIds array
        photo: null
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [selectedWorker, setSelectedWorker] = useState(""); // New state for the worker select
    const [totalItemsMap, setTotalItemsMap] = useState({});



    // Fetch warehouses on initial load
    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Fetch related data when modal opens
    useEffect(() => {
        if (showAddModal || showEditModal) {
            fetchSites();
            fetchManagers();
            fetchWorkers();
        }
    }, [showAddModal, showEditModal]);

    // Set form data when editing warehouse
    useEffect(() => {
        if (editingWarehouse) {
            // Find manager ID if it exists
            const manager = editingWarehouse.employees?.find(
                emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
            );

            const managerId = manager?.id || "";

            // Find all worker IDs if they exist
            const warehouseWorkers = editingWarehouse.employees?.filter(
                emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
            ) || [];

            const workerIds = warehouseWorkers.map(worker => worker.id) || [];

            setFormData({
                id: editingWarehouse.id,
                name: editingWarehouse.name || "",
                siteId: editingWarehouse.site?.id || "",
                managerId: managerId,
                workerIds: workerIds, // Store array of worker IDs
                photo: null
            });

            // Set preview image if warehouse has photo
            if (editingWarehouse.photoUrl) {
                setPreviewImage(editingWarehouse.photoUrl);
            } else {
                setPreviewImage(null);
            }
        }
    }, [editingWarehouse]);

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch("http://localhost:8080/api/v1/warehouses", {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setWarehouses(data);
            console.log("warehousesssss" + data);
            setError(null);
        } catch (error) {
            console.error("Error fetching warehouses:", error);
            setError("Failed to load warehouses. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTotalItemsInWarehouse = async (warehouseId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/items/warehouse/${warehouseId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            const items = await response.json();

            // Filter items with status 'IN_WAREHOUSE'
            const inWarehouseItems = items.filter(item => item.itemStatus === 'IN_WAREHOUSE');

            // Calculate total items based on the quantity field
            const total = inWarehouseItems.reduce((sum, item) => sum + item.quantity, 0);

            // Update the total items map for the specific warehouse
            setTotalItemsMap(prevState => ({
                ...prevState,
                [warehouseId]: total
            }));
        } catch (err) {
            setError(err.message);
            console.error('Error fetching items:', err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (warehouses.length > 0) {
            // Fetch total items for each warehouse once
            warehouses.forEach(warehouse => {
                // Call only if we haven't already fetched for this warehouse
                if (!(warehouse.id in totalItemsMap)) {
                    fetchTotalItemsInWarehouse(warehouse.id);
                }
            });
        }
    }, [warehouses, totalItemsMap]);

    const fetchSites = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8080/api/v1/site", {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch sites");
            const data = await response.json();
            setSites(data);
        } catch (error) {
            console.error("Error fetching sites:", error);
        }
    };

    const fetchManagers = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8080/api/v1/employees/warehouse-managers", {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch managers");
            const data = await response.json();
            setManagers(data);
        } catch (error) {
            console.error("Error fetching managers:", error);
        }
    };

    const fetchWorkers = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:8080/api/v1/employees/warehouse-workers", {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch workers");
            const data = await response.json();
            setWorkers(data);
        } catch (error) {
            console.error("Error fetching workers:", error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, photo: file });
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // New function to handle warehouse worker selection
    const handleWorkerSelect = (e) => {
        const workerId = e.target.value;
        if (workerId) {
            setSelectedWorker(workerId);
        }
    };

    // New function to add a worker to the selected workers array
    const handleAddWorker = () => {
        if (selectedWorker && !formData.workerIds.includes(selectedWorker)) {
            setFormData({
                ...formData,
                workerIds: [...formData.workerIds, selectedWorker]
            });
            setSelectedWorker(""); // Reset selected worker
        }
    };

    // New function to remove a worker from the selected workers array
    const handleRemoveWorker = (workerId) => {
        setFormData({
            ...formData,
            workerIds: formData.workerIds.filter(id => id !== workerId)
        });
    };

    // Helper function to get worker name by ID
    const getWorkerName = (workerId) => {
        const worker = workers.find(w => w.id === workerId);
        return worker ? `${worker.firstName} ${worker.lastName}` : "Unknown Worker";
    };

    const handleOpenAddModal = () => {
        // Reset form data for adding new warehouse
        setFormData({
            id: "",
            name: "",
            siteId: "",
            managerId: "",
            workerIds: [], // Reset worker IDs array
            photo: null
        });
        setSelectedWorker(""); // Reset selected worker
        setPreviewImage(null);
        setShowAddModal(true);
    };

    const handleOpenEditModal = (warehouse) => {
        // Set editing warehouse first to trigger the useEffect
        setEditingWarehouse(warehouse);
        setShowEditModal(true);
    };

    const handleCloseModals = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingWarehouse(null);
        setPreviewImage(null);
        setFormData({
            id: "",
            name: "",
            siteId: "",
            managerId: "",
            workerIds: [], // Reset worker IDs array
            photo: null
        });
        setSelectedWorker(""); // Reset selected worker
    };

    const handleAddWarehouse = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");

        // Create warehouse data object exactly matching the backend format
        const warehouseData = {
            name: formData.name,
            site: { id: formData.siteId }
        };

        // Create employees array from manager and workers
        const employeesArray = [];

        // Add manager if selected
        if (formData.managerId) {
            employeesArray.push({ id: formData.managerId });
        }

        // Add workers if selected
        if (formData.workerIds.length > 0) {
            formData.workerIds.forEach(workerId => {
                employeesArray.push({ id: workerId });
            });
        }

        // Only add employees to request if there are any
        if (employeesArray.length > 0) {
            warehouseData.employees = employeesArray;
        }

        console.log("Sending warehouse data:", JSON.stringify(warehouseData));

        try {
            const response = await fetch("http://localhost:8080/api/v1/warehouseMT", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(warehouseData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            // Handle photo upload if a photo was selected
            if (formData.photo) {
                const newWarehouse = await response.json();
                const photoFormData = new FormData();
                photoFormData.append("photo", formData.photo);

                const photoResponse = await fetch(`http://localhost:8080/api/v1/warehouses/${newWarehouse.id}/photo`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: photoFormData,
                });

                if (!photoResponse.ok) {
                    console.warn("Photo upload failed, but warehouse was created successfully");
                }
            }

            // Refresh warehouse list and close modal
            fetchWarehouses();
            handleCloseModals();
        } catch (err) {
            console.error("Failed to add warehouse:", err.message);
            alert("Failed to add warehouse. Please try again. Error: " + err.message);
        }
    };

    const handleUpdateWarehouse = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem("token");

        // Create warehouse data object exactly matching the backend format
        const warehouseData = {
            id: formData.id,
            name: formData.name,
            site: { id: formData.siteId }
        };

        // Create employees array from manager and workers
        const employeesArray = [];

        // Add manager if selected
        if (formData.managerId) {
            employeesArray.push({ id: formData.managerId });
        }

        // Add workers if selected
        if (formData.workerIds.length > 0) {
            formData.workerIds.forEach(workerId => {
                employeesArray.push({ id: workerId });
            });
        }

        // Only add employees to request if there are any
        if (employeesArray.length > 0) {
            warehouseData.employees = employeesArray;
        }

        console.log("Sending warehouse update data:", JSON.stringify(warehouseData));

        try {
            const response = await fetch(`http://localhost:8080/api/v1/warehouseMT/update/${formData.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(warehouseData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            // Handle photo upload if a photo was selected
            if (formData.photo) {
                const photoFormData = new FormData();
                photoFormData.append("photo", formData.photo);

                const photoResponse = await fetch(`http://localhost:8080/api/v1/warehouses/${formData.id}/photo`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: photoFormData,
                });

                if (!photoResponse.ok) {
                    console.warn("Photo upload failed, but warehouse was updated successfully");
                }
            }

            // Refresh warehouse list and close modal
            fetchWarehouses();
            handleCloseModals();
        } catch (err) {
            console.error("Failed to update warehouse:", err.message);
            alert("Failed to update warehouse. Please try again. Error: " + err.message);
        }
    };

    if (loading) return <div className="warehouse-list-loading">Loading warehouses...</div>;
    if (error) return <div className="warehouse-list-error">{error}</div>;



    return (
        <div className="warehouse-list-container">
            <div className="departments-header">
                <h1 className="warehouse-list-title">Warehouses</h1>




            </div>

            <div className="warehouse-list-grid">
                {warehouses.length > 0 ? (
                    warehouses.map((warehouse) => {


                        const manager = warehouse.employees?.find(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                        );

                        const warehouseWorkers = warehouse.employees?.filter(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                        ) || [];

                        return (
                            <div key={warehouse.id} className="warehouse-list-card" onClick={() => navigate(`/warehouses/${warehouse.id}`)} style={{ cursor: "pointer" }}>
                                <div className="warehouse-list-card-image">
                                    <img src={warehouse.photoUrl ? warehouse.photoUrl : warehouseImg} alt="Warehouse" />
                                </div>

                                <div className="warehouse-list-card-content">
                                    <h2 className="warehouse-list-card-name">{warehouse.name || 'Unnamed Warehouse'}</h2>

                                    <div className="warehouse-list-card-stats">
                                        <div className="warehouse-list-stat-item">
                                            <p className="warehouse-list-stat-label">Site:</p>
                                            <p className="warehouse-list-stat-value">{warehouse.site?.name || "Not Assigned"}</p>
                                        </div>
                                        <div className="warehouse-list-stat-item">
                                            <p className="warehouse-list-stat-label">Total Items:</p>
                                            <p className="warehouse-list-stat-value">
                                                {totalItemsMap[warehouse.id] || "0"}
                                            </p>
                                        </div>
                                        <div className="warehouse-list-stat-item warehouse-list-full-width">
                                            <p className="warehouse-list-stat-label">Warehouse Manager:</p>
                                            <p className="warehouse-list-stat-value">{manager ? manager.firstName + " " + manager.lastName : "Not Assigned"}</p>
                                        </div>
                                        <div className="warehouse-list-stat-item warehouse-list-full-width">
                                            <p className="warehouse-list-stat-label">Warehouse Workers:</p>
                                            <p className="warehouse-list-stat-value">
                                                {warehouseWorkers.length > 0
                                                    ? warehouseWorkers.map(worker => `${worker.firstName} ${worker.lastName}`).join(', ')
                                                    : "Not Assigned"}
                                            </p>
                                        </div>

                                    </div>

                                    <div className="warehouse-list-card-actions">




                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/warehouses/warehouse-details/${warehouse.id}`);
                                            }}
                                            className="warehouse-list-view-button"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="warehouse-list-empty-message">
                        <div className="warehouse-list-empty-icon">
                            <FaWarehouse size={50} />
                        </div>
                        <p>No warehouses found. </p>
                    </div>
                )}
            </div>

            {/* Add Warehouse Modal */}
            {showAddModal && (
                <div className="warehouse-modal-overlay">
                    <div className="warehouse-modal-content">
                        <div className="warehouse-modal-header">
                            <h2>Add New Warehouse</h2>
                            <button className="warehouse-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="warehouse-modal-body">
                            <div className="warehouse-form-container">
                                <div className="warehouse-form-card">
                                    <div className="warehouse-form-profile-section">
                                        <label htmlFor="warehouseImageUpload" className="warehouse-form-image-label">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Warehouse" className="warehouse-form-image" />
                                            ) : (
                                                <div className="warehouse-form-image-placeholder"></div>
                                            )}
                                            <span className="warehouse-form-upload-text">Upload Photo</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="warehouseImageUpload"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                        />
                                    </div>

                                    <div className="warehouse-form-fields-section">
                                        <form onSubmit={handleAddWarehouse}>
                                            <div className="warehouse-form-grid">
                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Name</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                        className="warehouse-form-input"
                                                        placeholder="Enter warehouse name"
                                                    />
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Site</label>
                                                    <select
                                                        name="siteId"
                                                        value={formData.siteId}
                                                        onChange={handleInputChange}
                                                        required
                                                        className="warehouse-form-select"
                                                    >
                                                        <option value="">Select a Site</option>
                                                        {sites.map(site => (
                                                            <option key={site.id} value={site.id}>{site.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Manager</label>
                                                    <select
                                                        name="managerId"
                                                        value={formData.managerId}
                                                        onChange={handleInputChange}
                                                        className="warehouse-form-select"
                                                    >
                                                        <option value="">Select a Manager</option>
                                                        {managers.map(manager => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.firstName} {manager.lastName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Workers</label>
                                                    <div className="warehouse-form-worker-selector">
                                                        <div className="warehouse-form-worker-input-group">
                                                            <select
                                                                value={selectedWorker}
                                                                onChange={handleWorkerSelect}
                                                                className="warehouse-form-select"
                                                            >
                                                                <option value="">Select a Worker</option>
                                                                {workers
                                                                    .filter(worker => !formData.workerIds.includes(worker.id))
                                                                    .map(worker => (
                                                                        <option key={worker.id} value={worker.id}>
                                                                            {worker.firstName} {worker.lastName}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={handleAddWorker}
                                                                disabled={!selectedWorker}
                                                                className="warehouse-form-worker-add-button"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>

                                                        {/* Display selected workers */}
                                                        <div className="warehouse-form-selected-workers">
                                                            {formData.workerIds.length > 0 ? (
                                                                formData.workerIds.map((workerId) => (
                                                                    <div key={workerId} className="warehouse-form-selected-worker">
                                                                        <span>{getWorkerName(workerId)}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveWorker(workerId)}
                                                                            className="warehouse-form-worker-remove-button"
                                                                        >
                                                                            <FaTimes />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="warehouse-form-no-workers">No workers selected</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="warehouse-form-button-group">
                                                <button type="submit" className="warehouse-form-add-button">Add Warehouse</button>
                                                <button type="button" className="warehouse-form-cancel-button" onClick={handleCloseModals}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Warehouse Modal */}
            {showEditModal && (
                <div className="warehouse-modal-overlay">
                    <div className="warehouse-modal-content">
                        <div className="warehouse-modal-header">
                            <h2>Edit Warehouse</h2>
                            <button className="warehouse-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="warehouse-modal-body">
                            <div className="warehouse-form-container">
                                <div className="warehouse-form-card">
                                    <div className="warehouse-form-profile-section">
                                        <label htmlFor="warehouseEditImageUpload" className="warehouse-form-image-label">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Warehouse" className="warehouse-form-image" />
                                            ) : (
                                                <div className="warehouse-form-image-placeholder"></div>
                                            )}
                                            <span className="warehouse-form-upload-text">Upload Photo</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="warehouseEditImageUpload"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                        />
                                    </div>

                                    <div className="warehouse-form-fields-section">
                                        <form onSubmit={handleUpdateWarehouse}>
                                            <div className="warehouse-form-grid">
                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Name</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                        className="warehouse-form-input"
                                                        placeholder="Enter warehouse name"
                                                    />
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Site</label>
                                                    <select
                                                        name="siteId"
                                                        value={formData.siteId}
                                                        onChange={handleInputChange}
                                                        required
                                                        className="warehouse-form-select"
                                                    >
                                                        <option value="">Select a Site</option>
                                                        {sites.map(site => (
                                                            <option key={site.id} value={site.id}>{site.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Manager</label>
                                                    <select
                                                        name="managerId"
                                                        value={formData.managerId}
                                                        onChange={handleInputChange}
                                                        className="warehouse-form-select"
                                                    >
                                                        <option value="">Select a Manager</option>
                                                        {managers.map(manager => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.firstName} {manager.lastName}
                                                            </option>
                                                        ))}
                                                    </select>

                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label className="warehouse-form-label">Warehouse Workers</label>
                                                    <div className="warehouse-form-worker-selector">
                                                        <div className="warehouse-form-worker-input-group">
                                                            <select
                                                                value={selectedWorker}
                                                                onChange={handleWorkerSelect}
                                                                className="warehouse-form-select"
                                                            >
                                                                <option value="">Select a Worker</option>
                                                                {workers
                                                                    .filter(worker => !formData.workerIds.includes(worker.id))
                                                                    .map(worker => (
                                                                        <option key={worker.id} value={worker.id}>
                                                                            {worker.firstName} {worker.lastName}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={handleAddWorker}
                                                                disabled={!selectedWorker}
                                                                className="warehouse-form-worker-add-button"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>

                                                        {/* Display selected workers with a header */}
                                                        <div className="warehouse-form-selected-workers">
                                                            {formData.workerIds.length > 0 && (
                                                                <div className="warehouse-form-workers-header">
                                                                    <p>Current assigned workers:</p>
                                                                </div>
                                                            )}

                                                            {formData.workerIds.length > 0 ? (
                                                                formData.workerIds.map((workerId) => (
                                                                    <div key={workerId} className="warehouse-form-selected-worker">
                                                                        <span>{getWorkerName(workerId)}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveWorker(workerId)}
                                                                            className="warehouse-form-worker-remove-button"
                                                                        >
                                                                            <FaTimes />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="warehouse-form-no-workers">No workers selected</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="warehouse-form-button-group">
                                                <button type="submit" className="warehouse-form-add-button">Update Warehouse</button>
                                                <button type="button" className="warehouse-form-cancel-button" onClick={handleCloseModals}>Cancel</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehousesList;