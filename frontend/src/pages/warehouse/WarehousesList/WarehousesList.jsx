import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./WarehousesList.scss";
import warehouseImg from "../../../assets/imgs/warehouse1.jpg";
import { FaWarehouse, FaTimes, FaUserCog, FaPlus, FaExclamationTriangle, FaBell } from 'react-icons/fa';
import { useAuth } from "../../../contexts/AuthContext";
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import Snackbar from "../../../components/common/Snackbar/Snackbar";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog";
import UnifiedCard from "../../../components/common/UnifiedCard/UnifiedCard";
import { warehouseService } from "../../../services/warehouse/warehouseService";
import { warehouseEmployeeService } from "../../../services/warehouse/warehouseEmployeeService";
import { itemService } from "../../../services/warehouse/itemService";
import { transactionService } from "../../../services/transaction/transactionService.js";
import { siteService } from "../../../services/siteService";

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
    const [managers, setManagers] = useState([]);
    const [selectedManagerId, setSelectedManagerId] = useState("");

    // Edit modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        photoUrl: "",
        managerId: ""
    });

    // Notification states
    const [warehouseNotifications, setWarehouseNotifications] = useState({});
    const [loadingNotifications, setLoadingNotifications] = useState(true);

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
    const isWarehouseManager = currentUser?.role === 'WAREHOUSE_MANAGER' || currentUser?.role === 'ADMIN';

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

    // Handle file change for image upload
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, photo: file });
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'managerId') {
            setSelectedManagerId(value);
        }
    };

    // Open edit modal
    const handleOpenEditModal = async (warehouse) => {
        try {
            setPreviewImage(null);

            // Find current manager
            const currentManager = warehouse.employees?.find(
                (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
            );

            setFormData({
                id: warehouse.id,
                name: warehouse.name || "",
                photoUrl: warehouse.photoUrl || "",
                managerId: currentManager?.id || ""
            });

            setSelectedManagerId(currentManager?.id || "");

            if (warehouse.photoUrl) {
                setPreviewImage(warehouse.photoUrl);
            }

            setEditingWarehouse(warehouse);
            setShowEditModal(true);

            // Fetch managers for dropdown
            await fetchManagers();
        } catch (error) {
            console.error("Error opening edit modal:", error);
            showSnackbar('error', "Error opening edit form");
        }
    };

    // Open delete confirmation dialog
    const handleOpenDeleteModal = (warehouse) => {
        const hasEmployees = warehouse.employees && warehouse.employees.length > 0;
        const employeeCount = warehouse.employees ? warehouse.employees.length : 0;

        const message = hasEmployees
            ? `This action will permanently delete "${warehouse.name}" and cannot be undone.\n\n⚠️ This warehouse has ${employeeCount} assigned employee(s). Please reassign them before deleting.`
            : `This action will permanently delete "${warehouse.name}" and cannot be undone.`;

        showConfirmDialog(
            'danger',
            'Delete Warehouse',
            message,
            () => handleDeleteWarehouse(warehouse.id)
        );
    };

    // Close modals
    const handleCloseModals = () => {
        setShowEditModal(false);
        setEditingWarehouse(null);
        setPreviewImage(null);
        setManagers([]);
        setSelectedManagerId("");
        setFormData({
            id: "",
            name: "",
            photoUrl: "",
            managerId: ""
        });
    };

    // Handle update warehouse
    const handleUpdateWarehouse = async (e) => {
        e.preventDefault();

        try {
            const formDataToSend = new FormData();

            // Create warehouse data object
            const warehouseData = {
                name: formData.name,
                photoUrl: formData.photoUrl
            };

            // Add manager if selected
            if (formData.managerId) {
                warehouseData.managerId = formData.managerId;
            }

            formDataToSend.append("warehouseData", JSON.stringify(warehouseData));

            // Add photo if uploaded
            if (formData.photo) {
                formDataToSend.append("photo", formData.photo);
            }

            await warehouseService.update(formData.id, formDataToSend);

            // Refresh warehouse list
            fetchWarehouses();
            handleCloseModals();
            showSnackbar('success', "Warehouse updated successfully!");

        } catch (error) {
            console.error("Failed to update warehouse:", error);
            showSnackbar('error', `Failed to update warehouse: ${error.message}`);
        }
    };

    const fetchManagers = async () => {
        try {
            const response = await siteService.getWarehouseManagers();
            setManagers(response.data || []);
        } catch (error) {
            console.error("Error fetching managers:", error);
            showSnackbar('error', "Failed to load managers");
            setManagers([]);
        }
    };

    // Handle delete warehouse
    const handleDeleteWarehouse = async (warehouseId) => {
        try {
            await warehouseService.delete(warehouseId);

            // Refresh warehouse list
            fetchWarehouses();
            hideConfirmDialog();
            showSnackbar('success', "Warehouse deleted successfully!");

        } catch (error) {
            console.error("Failed to delete warehouse:", error);
            hideConfirmDialog();
            showSnackbar('error', `Failed to delete warehouse: ${error.message}`);
        }
    };

    const assignEmployeeToWarehouseAPI = async (employeeId, warehouseId) => {
        return await warehouseEmployeeService.assignToWarehouse(employeeId, { warehouseId });
    };

    const unassignEmployeeFromWarehouseAPI = async (employeeId, warehouseId) => {
        return await warehouseEmployeeService.unassignFromWarehouse(employeeId, { warehouseId });
    };

    // Function to fetch notification data for each warehouse
    const fetchWarehouseNotifications = async (warehouseId) => {
        try {
            const [transactions, items] = await Promise.all([
                transactionService.getTransactionsForWarehouse(warehouseId),
                itemService.getItemsByWarehouse(warehouseId)
            ]);

            // Ensure items is always an array
            const itemsArray = Array.isArray(items) ? items : [];

            // Count incoming transactions
            const incomingTransactionsCount = transactions.filter(transaction =>
                transaction.status === "PENDING" &&
                (transaction.receiverId === warehouseId || transaction.senderId === warehouseId) &&
                transaction.sentFirst !== warehouseId
            ).length;

            // Count actual discrepancy items
            const missingItems = itemsArray.filter(item => item.itemStatus === 'MISSING' && !item.resolved);
            const excessItems = itemsArray.filter(item => item.itemStatus === 'OVERRECEIVED' && !item.resolved);
            const discrepancyCount = missingItems.length + excessItems.length;

            return {
                incomingTransactions: incomingTransactionsCount,
                discrepancies: discrepancyCount,
                missingItems: missingItems.length,
                excessItems: excessItems.length,
                hasAlerts: incomingTransactionsCount > 0 || discrepancyCount > 0
            };
        } catch (error) {
            console.error(`Error fetching notifications for warehouse ${warehouseId}:`, error);
            return {
                incomingTransactions: 0,
                discrepancies: 0,
                missingItems: 0,
                excessItems: 0,
                hasAlerts: false
            };
        }
    };

    // Fetch warehouses on initial load
    useEffect(() => {
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

    // Fetch notifications for all warehouses
    useEffect(() => {
        const fetchAllNotifications = async () => {
            if (warehouses.length === 0) return;

            setLoadingNotifications(true);
            const notifications = {};

            if (currentUser?.role === 'WAREHOUSE_MANAGER' || currentUser?.role === 'WAREHOUSE_EMPLOYEE' || currentUser?.role === 'ADMIN') {
                await Promise.all(
                    warehouses.map(async (warehouse) => {
                        const notificationData = await fetchWarehouseNotifications(warehouse.id);
                        notifications[warehouse.id] = notificationData;
                    })
                );
            }

            setWarehouseNotifications(notifications);
            setLoadingNotifications(false);
        };

        fetchAllNotifications();
    }, [warehouses, currentUser?.role]);

    const fetchAndFilterWarehousesForEmployee = async (allWarehouses) => {
        try {
            console.log("Filtering warehouses for employee:", currentUser.username);
            console.log("Total warehouses available:", allWarehouses.length);

            const assignments = await warehouseEmployeeService.getAssignmentsByUsername(currentUser.username);
            console.log("Found assignments:", assignments);

            if (!Array.isArray(assignments) || assignments.length === 0) {
                console.log("No assignments array or empty assignments");
                setWarehouses([]);
                return;
            }

            const assignedWarehouseIds = assignments
                .map(assignment => assignment.warehouse?.id)
                .filter(Boolean);

            console.log("Assigned warehouse IDs:", assignedWarehouseIds);

            const assignedWarehouses = allWarehouses.filter(warehouse =>
                assignedWarehouseIds.includes(warehouse.id)
            );

            setWarehouses(assignedWarehouses);
            console.log(`Warehouse employee can see ${assignedWarehouses.length} out of ${allWarehouses.length} warehouses`);
            console.log("Visible warehouses:", assignedWarehouses.map(w => w.name));

        } catch (error) {
            console.error("Error filtering warehouses for employee:", error);
            setWarehouses([]);
        }
    };

    const fetchWarehouses = async () => {
        try {
            setLoading(true);

            console.log("Fetching warehouses for user role:", currentUser?.role);

            const respo = await warehouseService.getAll();
            console.log("Fetched warehouse data:", JSON.stringify(respo, null, 2));

            if (currentUser?.role === 'WAREHOUSE_EMPLOYEE') {
                console.log("User is WAREHOUSE_EMPLOYEE, filtering warehouses");
                await fetchAndFilterWarehousesForEmployee(respo);
            } else {
                console.log("User is not WAREHOUSE_EMPLOYEE, showing all warehouses");
                setWarehouses(respo);
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
            const data = await warehouseEmployeeService.getWarehouseEmployees();
            setWarehouseEmployees(data);
            console.log("Successfully fetched warehouse employees:", data.length);
        } catch (error) {
            console.error("Error fetching warehouse employees:", error);
            setWarehouseEmployees([]);
            showSnackbar('error', `Failed to load warehouse employees: ${error.message}`);
        }
    };

    useEffect(() => {
        if (showAssignmentModal || showEditModal) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [showAssignmentModal, showEditModal]);

    const fetchWarehouseAssignedEmployees = async (warehouseId) => {
        try {
            setAssignmentLoading(true);
            const data = await warehouseEmployeeService.getWarehouseAssignedUsers(warehouseId);

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

            for (const employeeId of pendingAssignments) {
                await assignEmployeeToWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            for (const employeeId of pendingUnassignments) {
                await unassignEmployeeFromWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            await fetchWarehouseAssignedEmployees(selectedWarehouse.id);
            await fetchWarehouseEmployees();

            const totalChanges = pendingAssignments.length + pendingUnassignments.length;
            showSnackbar('success', `Successfully applied ${totalChanges} change${totalChanges !== 1 ? 's' : ''} to ${selectedWarehouse.name}`);

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

    const handleAssignEmployee = () => {
        if (!selectedEmployee || !selectedWarehouse) {
            return;
        }

        const employeeToAssign = warehouseEmployees.find(emp => emp.id === selectedEmployee);
        if (!employeeToAssign) {
            return;
        }

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

        setPendingAssignments(prev => [...prev, selectedEmployee]);
        setAssignedEmployees(prev => [...prev, tempAssignment]);
        setHasUnsavedChanges(true);
        setSelectedEmployee("");
    };

    const handleUnassignEmployee = (employeeId) => {
        if (!selectedWarehouse) {
            return;
        }

        if (pendingAssignments.includes(employeeId)) {
            setPendingAssignments(prev => prev.filter(id => id !== employeeId));
            setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));

            const stillHasAssignments = pendingAssignments.filter(id => id !== employeeId).length > 0;
            const stillHasUnassignments = pendingUnassignments.length > 0;
            setHasUnsavedChanges(stillHasAssignments || stillHasUnassignments);

            return;
        }

        setPendingUnassignments(prev => [...prev, employeeId]);
        setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        setHasUnsavedChanges(true);
    };

    const getAvailableEmployeesForAssignment = () => {
        if (!selectedWarehouse) return [];

        const assignedToCurrentWarehouseIds = assignedEmployees.map(emp => emp.id);

        const availableEmployees = warehouseEmployees.filter(emp =>
            !assignedToCurrentWarehouseIds.includes(emp.id)
        );

        return availableEmployees;
    };

    const fetchTotalItemsInWarehouse = async (warehouseId) => {
        try {
            const items = await itemService.getItemsByWarehouse(warehouseId);
            const itemsArray = Array.isArray(items) ? items : [];
            const inWarehouseItems = itemsArray.filter(item => item.itemStatus === 'IN_WAREHOUSE');
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

    return (
        <div className="warehouse-list-container">
            <div className="departments-header">
                <h1 className="warehouse-list-title">Warehouses</h1>
            </div>

            <div className="unified-cards-grid">
                {warehouses.length > 0 ? (
                    warehouses.map((warehouse) => {
                        const manager = warehouse.employees?.find(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                        );

                        const warehouseWorkers = warehouse.employees?.filter(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                        ) || [];

                        // Get notification data for this warehouse
                        const notifications = warehouseNotifications[warehouse.id] || {};
                        const hasAlerts = notifications.incomingTransactions > 0 || notifications.discrepancies > 0;

                        const alertTooltip = hasAlerts ? (
                            notifications.incomingTransactions && notifications.discrepancies
                                ? `${notifications.incomingTransactions} incoming transactions, ${notifications.discrepancies} inventory issues`
                                : notifications.incomingTransactions
                                    ? `${notifications.incomingTransactions} incoming transactions`
                                    : `${notifications.discrepancies} inventory issues`
                        ) : '';

                        // Define stats
                        const stats = [
                            { label: 'Site', value: warehouse.site?.name || 'Not Assigned' },
                            { label: 'Total Items', value: totalItemsMap[warehouse.id] || '0' },
                            {
                                label: 'Warehouse Manager',
                                value: manager ? `${manager.firstName} ${manager.lastName}` : 'Not Assigned',
                                fullWidth: true
                            },
                            {
                                label: 'Warehouse Workers',
                                value: warehouseWorkers.length > 0
                                    ? warehouseWorkers.map(w => `${w.firstName} ${w.lastName}`).join(', ')
                                    : 'Not Assigned',
                                fullWidth: true
                            }
                        ];

                        // Define actions based on role
                        const actions = [
                            {
                                label: 'View Details',
                                variant: 'primary',
                                onClick: (id) => navigate(`/warehouses/warehouse-details/${id}`)
                            }
                        ];

                        if (isWarehouseManager) {
                            actions.push({
                                label: 'Assign Employees',
                                variant: 'secondary',
                                onClick: (id) => handleOpenAssignmentModal(warehouse)
                            });
                        }

                        return (
                            <UnifiedCard
                                key={warehouse.id}
                                id={warehouse.id}
                                title={warehouse.name || 'Unnamed Warehouse'}
                                imageUrl={warehouse.photoUrl}
                                imageFallback={warehouseImg}
                                stats={stats}
                                actions={actions}
                                hasAlert={hasAlerts}
                                alertTooltip={alertTooltip}
                                onClick={(id) => navigate(`/warehouses/${id}`)}
                            />
                        );
                    })
                ) : (
                    <div className="unified-cards-empty">
                        <div className="unified-cards-empty-icon">
                            <FaWarehouse size={50} />
                        </div>
                        <p>No warehouses found.</p>
                    </div>
                )}
            </div>

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
                                    <div className="warehouse-profile-section">
                                        <label htmlFor="warehouseEditImageUpload" className="warehouse-image-upload-label">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Warehouse" className="warehouse-image-preview" />
                                            ) : (
                                                <div className="warehouse-image-placeholder"></div>
                                            )}
                                            <span className="warehouse-upload-text">Upload Photo</span>
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
                                                    <label>Warehouse Name</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label>Warehouse Manager</label>
                                                    <select
                                                        name="managerId"
                                                        value={selectedManagerId}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="">Select Manager</option>
                                                        {managers.map(manager => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.firstName} {manager.lastName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label>Current Site</label>
                                                    <div className="warehouse-readonly-field">
                                                        {editingWarehouse?.site?.name || "Not Assigned"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="warehouse-form-actions">
                                                <button
                                                    type="button"
                                                    className="warehouse-cancel-button"
                                                    onClick={handleCloseModals}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="warehouse-submit-button"
                                                >
                                                    Update Warehouse
                                                </button>
                                            </div>
                                        </form>
                                    </div>
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
            />

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={hideConfirmDialog}
                confirmText="Confirm"
                cancelText="Cancel"
            />
        </div>
    );
};

export default WarehousesList;