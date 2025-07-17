import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./WarehousesList.scss";
import warehouseImg from "../../../assets/imgs/warehouse1.jpg";
import { FaWarehouse, FaTimes, FaUserCog, FaPlus } from 'react-icons/fa';
import { useAuth } from "../../../contexts/AuthContext";
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import Snackbar from "../../../components/common/Snackbar/Snackbar";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog";

const WarehousesList = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Assignment modal states
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [warehouseEmployees, setWarehouseEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [totalItemsMap, setTotalItemsMap] = useState({});
    const [assignmentLoading, setAssignmentLoading] = useState(false);

    // Pending changes tracking
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [pendingUnassignments, setPendingUnassignments] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // Check if current user is warehouse manager
    const isWarehouseManager = currentUser?.role === 'WAREHOUSE_MANAGER';

    // Snackbar helper functions
    const showSnackbar = (type, message) => {
        setSnackbar({ show: true, type, message });
    };

    const hideSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    // Confirmation dialog helper functions
    const showConfirmDialog = (type, title, message, onConfirm) => {
        setConfirmDialog({
            isVisible: true,
            type,
            title,
            message,
            onConfirm
        });
    };

    const hideConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    // API functions for actual assignment/unassignment
    const assignEmployeeToWarehouseAPI = async (employeeId, warehouseId) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/v1/warehouseEmployees/${employeeId}/assign-warehouse`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ warehouseId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to assign employee");
        }

        return await response.json();
    };

    const unassignEmployeeFromWarehouseAPI = async (employeeId, warehouseId) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/v1/warehouseEmployees/${employeeId}/unassign-warehouse`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ warehouseId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to unassign employee");
        }

        return await response.json();
    };

    // Fetch warehouses on initial load - wait for currentUser to be available
    useEffect(() => {
        console.log("Current user in useEffect:", currentUser);
        if (currentUser && currentUser.role) {
            fetchWarehouses();
        }
    }, [currentUser]);

    // Fetch warehouse employees when assignment modal opens
    useEffect(() => {
        if (showAssignmentModal) {
            fetchWarehouseEmployees();
        }
    }, [showAssignmentModal]);

    // Fetch assigned employees when warehouse is selected
    useEffect(() => {
        if (selectedWarehouse && showAssignmentModal) {
            fetchWarehouseAssignedEmployees(selectedWarehouse.id);
        }
    }, [selectedWarehouse, showAssignmentModal]);

    // Replace the fetchAndFilterWarehousesForEmployee function in your WarehousesList.jsx

    const fetchAndFilterWarehousesForEmployee = async (allWarehouses) => {
        try {
            const token = localStorage.getItem('token');
            console.log("Filtering warehouses for employee:", currentUser.username);
            console.log("Total warehouses available:", allWarehouses.length);

            // Get all warehouse assignments for this user
            const response = await fetch(`http://localhost:8080/api/v1/warehouseEmployees/by-username/${currentUser.username}/assignments`, {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) {
                console.log("No assignments found for user or API error, showing empty list");
                setWarehouses([]);
                return;
            }

            const assignments = await response.json();
            console.log("Found assignments:", assignments);

            if (!Array.isArray(assignments) || assignments.length === 0) {
                console.log("No assignments array or empty assignments");
                setWarehouses([]);
                return;
            }

            // Extract warehouse IDs from assignments
            const assignedWarehouseIds = assignments
                .map(assignment => assignment.warehouse?.id)
                .filter(Boolean); // Remove null/undefined values

            console.log("Assigned warehouse IDs:", assignedWarehouseIds);

            // Filter warehouses to only show assigned ones
            const assignedWarehouses = allWarehouses.filter(warehouse =>
                assignedWarehouseIds.includes(warehouse.id)
            );

            setWarehouses(assignedWarehouses);
            console.log(`Warehouse employee can see ${assignedWarehouses.length} out of ${allWarehouses.length} warehouses`);
            console.log("Visible warehouses:", assignedWarehouses.map(w => w.name));

        } catch (error) {
            console.error("Error filtering warehouses for employee:", error);
            // If filtering fails, show empty list for security
            setWarehouses([]);
        }
    };

// Also update the fetchWarehouses function to add better debugging:

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            console.log("Fetching warehouses for user role:", currentUser?.role);

            // Always fetch from the main warehouses endpoint
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
            console.log("Fetched warehouse data:", data);

            // If user is a warehouse employee, filter warehouses on frontend
            if (currentUser?.role === 'WAREHOUSE_EMPLOYEE') {
                console.log("User is WAREHOUSE_EMPLOYEE, filtering warehouses");
                // Get user's assigned warehouses via separate API call
                await fetchAndFilterWarehousesForEmployee(data);
            } else {
                // For other roles, show all warehouses
                console.log("User is not WAREHOUSE_EMPLOYEE, showing all warehouses");
                setWarehouses(data);
                console.log("Fetched all warehouses for role:", currentUser?.role);
            }

            setError(null);
        } catch (error) {
            console.error("Error fetching warehouses:", error);
            setError("Failed to load warehouses. Please try again later.");
        } finally {
            setLoading(false);
        }
    };



    const fetchWarehouseEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch("http://localhost:8080/api/v1/warehouseEmployees/warehouse-employees", {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch warehouse employees: ${response.status}`);
            }

            // Add response text debugging
            const responseText = await response.text();
            console.log("Raw response:", responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                console.error("Response text:", responseText);
                throw new Error("Invalid JSON response from server");
            }

            setWarehouseEmployees(data);
            console.log("Successfully fetched warehouse employees:", data.length);
        } catch (error) {
            console.error("Error fetching warehouse employees:", error);
            setWarehouseEmployees([]);
            showSnackbar('error', `Failed to load warehouse employees: ${error.message}`);
        }
    };

    const fetchWarehouseAssignedEmployees = async (warehouseId) => {
        try {
            setAssignmentLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/warehouses/${warehouseId}/assigned-users-dto`, {
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!response.ok) throw new Error("Failed to fetch assigned employees");
            const data = await response.json();

            if (!Array.isArray(data)) {
                setAssignedEmployees([]);
                return;
            }

            if (data.length === 0) {
                setAssignedEmployees([]);
                return;
            }

            const employees = data.map((dto) => ({
                id: dto.userId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                username: dto.username,
                role: dto.role,
                assignedAt: dto.assignedAt,
                assignedBy: dto.assignedBy,
                assignmentId: dto.assignmentId
            }));

            setAssignedEmployees(employees);
        } catch (error) {
            console.error("Error fetching assigned employees:", error);
            setAssignedEmployees([]);
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleOpenAssignmentModal = (warehouse) => {
        setSelectedWarehouse(warehouse);
        setShowAssignmentModal(true);
        setSelectedEmployee("");
        setAssignedEmployees([]);
        setAssignmentLoading(false);
        setPendingAssignments([]);
        setPendingUnassignments([]);
        setHasUnsavedChanges(false);

        // Debug log
        console.log('Opening assignment modal for:', warehouse.name);
    };

    const handleCloseAssignmentModal = () => {
        if (hasUnsavedChanges) {
            showConfirmDialog(
                'warning',
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to close without applying them?',
                () => {
                    setShowAssignmentModal(false);
                    setSelectedWarehouse(null);
                    setSelectedEmployee("");
                    setAssignedEmployees([]);
                    setAssignmentLoading(false);
                    setPendingAssignments([]);
                    setPendingUnassignments([]);
                    setHasUnsavedChanges(false);
                    hideConfirmDialog();
                }
            );
            return;
        }

        setShowAssignmentModal(false);
        setSelectedWarehouse(null);
        setSelectedEmployee("");
        setAssignedEmployees([]);
        setAssignmentLoading(false);
        setPendingAssignments([]);
        setPendingUnassignments([]);
        setHasUnsavedChanges(false);
    };

    const handleApplyChanges = async () => {
        if (!hasUnsavedChanges) {
            setShowAssignmentModal(false);
            setSelectedWarehouse(null);
            setSelectedEmployee("");
            setAssignedEmployees([]);
            setAssignmentLoading(false);
            setPendingAssignments([]);
            setPendingUnassignments([]);
            setHasUnsavedChanges(false);
            return;
        }

        try {
            setAssignmentLoading(true);

            // Process all pending assignments
            for (const employeeId of pendingAssignments) {
                await assignEmployeeToWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            // Process all pending unassignments
            for (const employeeId of pendingUnassignments) {
                await unassignEmployeeFromWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            // Refresh data
            await fetchWarehouseAssignedEmployees(selectedWarehouse.id);
            await fetchWarehouseEmployees();

            // Show success message
            const totalChanges = pendingAssignments.length + pendingUnassignments.length;
            showSnackbar('success', `Successfully applied ${totalChanges} change${totalChanges !== 1 ? 's' : ''} to ${selectedWarehouse.name}`);

            // Close modal
            setShowAssignmentModal(false);
            setSelectedWarehouse(null);
            setSelectedEmployee("");
            setAssignedEmployees([]);
            setAssignmentLoading(false);
            setPendingAssignments([]);
            setPendingUnassignments([]);
            setHasUnsavedChanges(false);

        } catch (error) {
            console.error("Error applying changes:", error);
            showSnackbar('error', `Failed to apply changes: ${error.message}`);
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleEmployeeSelect = (e) => {
        const employeeId = e.target.value;
        setSelectedEmployee(employeeId);
    };

    // Handle employee assignment - ONLY UI changes, NO API calls
    const handleAssignEmployee = () => {
        if (!selectedEmployee || !selectedWarehouse) {
            return;
        }

        const employeeToAssign = warehouseEmployees.find(emp => emp.id === selectedEmployee);
        if (!employeeToAssign) {
            return;
        }

        // Create temporary assignment for UI display only
        const tempAssignment = {
            id: employeeToAssign.id,
            firstName: employeeToAssign.firstName,
            lastName: employeeToAssign.lastName,
            username: employeeToAssign.username,
            role: employeeToAssign.role,
            assignedAt: new Date().toISOString(),
            assignedBy: currentUser?.username || 'Unknown',
            assignmentId: `temp-${Date.now()}`,
            isPending: true
        };

        // Update UI state only
        setPendingAssignments(prev => [...prev, selectedEmployee]);
        setAssignedEmployees(prev => [...prev, tempAssignment]);
        setHasUnsavedChanges(true);
        setSelectedEmployee("");

    };

    // Handle employee unassignment - remove from UI immediately
    const handleUnassignEmployee = (employeeId) => {
        if (!selectedWarehouse) {
            return;
        }

        const employeeToRemove = assignedEmployees.find(emp => emp.id === employeeId);

        // Check if this employee is in pending assignments (newly added this session)
        if (pendingAssignments.includes(employeeId)) {
            setPendingAssignments(prev => prev.filter(id => id !== employeeId));
            setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));

            const stillHasAssignments = pendingAssignments.filter(id => id !== employeeId).length > 0;
            const stillHasUnassignments = pendingUnassignments.length > 0;
            setHasUnsavedChanges(stillHasAssignments || stillHasUnassignments);


            return;
        }

        // Add to pending unassignments and remove from UI
        setPendingUnassignments(prev => [...prev, employeeId]);
        setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        setHasUnsavedChanges(true);


    };

    const getAvailableEmployeesForAssignment = () => {
        if (!selectedWarehouse) return [];

        // Debug logs
        console.log('=== ASSIGNMENT DEBUG ===');
        console.log('Selected Warehouse:', selectedWarehouse.name);
        console.log('All Warehouse Employees:', warehouseEmployees.length);
        console.log('Assigned to Current Warehouse:', assignedEmployees.length);
        console.log('Assigned Employee IDs:', assignedEmployees.map(emp => emp.id));

        // For multi-warehouse assignment: Only filter out employees assigned to THIS specific warehouse
        const assignedToCurrentWarehouseIds = assignedEmployees.map(emp => emp.id);

        // Return all warehouse employees who are NOT already assigned to this specific warehouse
        const availableEmployees = warehouseEmployees.filter(emp =>
            !assignedToCurrentWarehouseIds.includes(emp.id)
        );

        console.log('Available Employees for Assignment:', availableEmployees.length);
        console.log('Available Employee Names:', availableEmployees.map(emp => `${emp.firstName} ${emp.lastName}`));
        console.log('=== END DEBUG ===');

        return availableEmployees;
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
            const inWarehouseItems = items.filter(item => item.itemStatus === 'IN_WAREHOUSE');
            const total = inWarehouseItems.reduce((sum, item) => sum + item.quantity, 0);

            setTotalItemsMap(prevState => ({
                ...prevState,
                [warehouseId]: total
            }));
        } catch (err) {
            console.error('Error fetching items:', err);
        }
    };

    useEffect(() => {
        if (warehouses.length > 0) {
            warehouses.forEach(warehouse => {
                if (!(warehouse.id in totalItemsMap)) {
                    fetchTotalItemsInWarehouse(warehouse.id);
                }
            });
        }
    }, [warehouses, totalItemsMap]);

    if (loading) return <LoadingPage/>;
    if (error) return <div className="warehouse-list-error">{error}</div>;

    // Debug: Show current user info temporarily
    if (process.env.NODE_ENV === 'development') {
        console.log("Current user object:", JSON.stringify(currentUser, null, 2));
    }

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
                                            className="btn-primary"
                                        >
                                            View Details
                                        </button>

                                        {isWarehouseManager && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAssignmentModal(warehouse);
                                                }}
                                                className="btn-primary"
                                            >
                                                Assign Employees
                                            </button>
                                        )}
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
                        <p>No warehouses found.</p>
                    </div>
                )}
            </div>

            {/* Warehouse Assignment Modal */}
            {showAssignmentModal && (
                <div className="warehouse-list-modal-overlay">
                    <div className="warehouse-list-modal-content warehouse-list-assignment-modal">
                        <div className="warehouse-list-modal-header">
                            <h2>
                                <FaUserCog />
                                Assign Employees to {selectedWarehouse?.name}
                            </h2>
                            <button className="warehouse-list-modal-close-button" onClick={handleCloseAssignmentModal}>×</button>
                        </div>

                        <div className="warehouse-list-modal-body">
                            <div className="warehouse-list-assignment-container">
                                {/* Warehouse Info Display */}
                                <div className="warehouse-list-assignment-section">
                                    <h3>Selected Warehouse</h3>
                                    <div className="warehouse-list-selected-warehouse">
                                        <img
                                            src={selectedWarehouse?.photoUrl || warehouseImg}
                                            alt={selectedWarehouse?.name}
                                            className="warehouse-list-selected-warehouse-image"
                                        />
                                        <div className="warehouse-list-selected-warehouse-details">
                                            <h4>{selectedWarehouse?.name}</h4>
                                            <p>Site: {selectedWarehouse?.site?.name || "Not Assigned"}</p>
                                            <p>Total Items: {totalItemsMap[selectedWarehouse?.id] || "0"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Assignment Section */}
                                <div className="warehouse-list-assignment-section">
                                    <h3>Assign New Employee</h3>
                                    <div className="warehouse-list-assignment-input-group">
                                        <select
                                            value={selectedEmployee}
                                            onChange={handleEmployeeSelect}
                                            className="warehouse-list-form-select"
                                            disabled={assignmentLoading}
                                        >
                                            <option value="">Choose an employee to assign...</option>
                                            {getAvailableEmployeesForAssignment().map(employee => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.firstName} {employee.lastName}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssignEmployee}
                                            disabled={!selectedEmployee || assignmentLoading}
                                            className="warehouse-list-assignment-add-button"
                                        >
                                            {assignmentLoading ? (
                                                <>
                                                    <div className="warehouse-list-assignment-loading"></div>
                                                    Assigning...
                                                </>
                                            ) : (
                                                <>
                                                    <FaPlus />
                                                    Assign
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {warehouseEmployees.length === 0 && (
                                        <div className="warehouse-list-assignment-info">
                                            <p>No warehouse employees found. Please create warehouse employee accounts first.</p>
                                        </div>
                                    )}
                                    {getAvailableEmployeesForAssignment().length === 0 && warehouseEmployees.length > 0 && (
                                        <div className="warehouse-list-assignment-info">
                                            <p>All available employees are already assigned to this warehouse.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Currently Assigned Employees */}
                                <div className="warehouse-list-assignment-section">
                                    <h3>Currently Assigned Employees</h3>
                                    {assignmentLoading && assignedEmployees.length === 0 ? (
                                        <div className="warehouse-list-assignment-loading">
                                            <div className="loading-spinner"></div>
                                            <p>Loading assigned employees...</p>
                                        </div>
                                    ) : (
                                        <div className="warehouse-list-assigned-list">
                                            {assignedEmployees.length > 0 ? (
                                                assignedEmployees.map(employee => (
                                                    <div
                                                        key={employee.id}
                                                        className={`warehouse-list-assigned-item ${
                                                            employee.isPending ? 'pending-assignment' : ''
                                                        }`}
                                                    >
                                                        <div className="warehouse-list-assigned-info">
                                                            <div className="warehouse-list-assigned-avatar">
                                                                <span className="warehouse-list-employee-initials">
                                                                    {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                                                </span>
                                                            </div>
                                                            <div className="warehouse-list-assigned-details">
                                                                <h4>{employee.firstName} {employee.lastName}</h4>
                                                                <p className="warehouse-list-assignment-date">
                                                                    Assigned on: {employee.assignedAt ? new Date(employee.assignedAt).toLocaleDateString() : 'No date available'}
                                                                </p>
                                                                <p className="warehouse-list-assignment-by">
                                                                    Assigned by: {employee.assignedBy || 'Unknown user'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleUnassignEmployee(employee.id)}
                                                            className="warehouse-list-assigned-remove-button"
                                                            title="Unassign employee"
                                                            disabled={assignmentLoading}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="warehouse-list-no-assignments">
                                                    <div className="warehouse-list-no-assignments-icon">
                                                        <FaUserCog size={48} />
                                                    </div>
                                                    <h4>No Employees Assigned</h4>
                                                    <p>No employees are currently assigned to {selectedWarehouse?.name}</p>
                                                    <p className="warehouse-list-assignment-hint">
                                                        Use the section above to assign employees to this warehouse.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="warehouse-list-assignment-footer">
                                    <button
                                        className={`btn-primary ${hasUnsavedChanges ? 'has-changes' : ''}`}
                                        onClick={handleApplyChanges}
                                        disabled={assignmentLoading}
                                    >
                                        {assignmentLoading ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar */}
            <Snackbar
                show={snackbar.show}
                type={snackbar.type}
                message={snackbar.message}
                onClose={hideSnackbar}
                duration={3000}
            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={hideConfirmDialog}
                confirmText="Yes, Close"
                cancelText="Stay Here"
            />
        </div>
    );
};

export default WarehousesList;