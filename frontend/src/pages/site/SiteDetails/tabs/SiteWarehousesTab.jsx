import React, {useEffect, useRef, useState} from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import {useTranslation} from 'react-i18next';
import {useAuth} from "../../../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import {FaPlus, FaEdit, FaTrash, FaUsers} from 'react-icons/fa';
import Snackbar from "../../../../components/common/Snackbar/Snackbar";
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog";
import { siteService } from "../../../../services/siteService";
import { warehouseService } from "../../../../services/warehouseService";
import ContentLoader from "../../../../components/common/ContentLoader/ContentLoader.jsx";

const SiteWarehousesTab = ({siteId}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [warehouseData, setWarehouseData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Add Warehouse modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [managers, setManagers] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [selectedManager, setSelectedManager] = useState(null);
    const [selectedWorkers, setSelectedWorkers] = useState([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
    const [isWorkersDropdownOpen, setIsWorkersDropdownOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    // Edit modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [editPreviewImage, setEditPreviewImage] = useState(null);
    const [editFormData, setEditFormData] = useState({
        id: "",
        name: "",
        photoUrl: "",
        managerId: ""
    });
    const [editManagers, setEditManagers] = useState([]);
    const [selectedEditManagerId, setSelectedEditManagerId] = useState("");

// Updated sections of SiteWarehousesTab.jsx

// Add these state variables to your existing component state:
    const [editSelectedWorkers, setEditSelectedWorkers] = useState([]);
    const [editSelectedWorkerIds, setEditSelectedWorkerIds] = useState([]);
    const [editWorkers, setEditWorkers] = useState([]);

    // Add these to your existing state variables
    const [showManageEmployeesModal, setShowManageEmployeesModal] = useState(false);
    const [managingWarehouse, setManagingWarehouse] = useState(null);
    const [warehouseEmployees, setWarehouseEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const workersDropdownRef = useRef(null);
    const {currentUser} = useAuth();

    const isSiteAdmin = currentUser?.role === "SITE_ADMIN" || currentUser?.role === "ADMIN";

    useEffect(() => {
        if (showAddModal || showEditModal || showManageEmployeesModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showAddModal, showEditModal, showManageEmployeesModal]);

    // Helper function to parse user-friendly error messages specific to warehouse management
    const parseErrorMessage = (error, context = 'general') => {
        // If it's already a user-friendly message, return as is
        if (typeof error === 'string' && !error.includes('{') && !error.includes('Error:')) {
            return error;
        }

        // Extract error details from various error formats
        let errorMessage = '';
        let statusCode = null;

        if (error?.response) {
            statusCode = error.response.status;
            errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.response?.statusText ||
                error.message;
        } else if (error?.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Convert technical errors to user-friendly messages with warehouse context
        const friendlyMessages = {
            // Network and connection errors
            'Network Error': 'Unable to connect to the server. Please check your internet connection and try again.',
            'timeout': 'The request took too long. Please try again.',
            'NETWORK_ERROR': 'Connection problem. Please check your network and try again.',

            // Authentication errors
            'Unauthorized': 'Your session has expired. Please log in again.',
            'Forbidden': 'You don\'t have permission to manage warehouses.',
            'Authentication failed': 'Please log in again to continue.',

            // Server errors
            'Internal Server Error': 'Something went wrong while processing your warehouse request. Please try again in a few moments.',
            'Service Unavailable': 'The warehouse management service is temporarily unavailable. Please try again later.',
            'Bad Gateway': 'Server connection issue. Please try again shortly.',

            // Warehouse-specific business logic errors
            'Warehouse not found': 'The selected warehouse could not be found. It may have been removed.',
            'Site not found': 'The site information could not be found. Please refresh the page.',
            'already exists': 'A warehouse with this name already exists on this site.',
            'Manager already assigned': 'This manager is already assigned to another warehouse.',
            'employees assigned': 'This warehouse has employees assigned and cannot be deleted until they are reassigned.',
            'dependencies': 'This warehouse cannot be deleted because it has active dependencies.',
            'name required': 'Warehouse name is required.',
            'invalid manager': 'The selected manager is not valid or available.',
        };

        // Check for specific error patterns
        for (const [pattern, friendlyMsg] of Object.entries(friendlyMessages)) {
            if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
                return friendlyMsg;
            }
        }

        // Handle HTTP status codes with warehouse context
        switch (statusCode) {
            case 400:
                if (context === 'add') {
                    return 'The warehouse information is invalid. Please check the warehouse name and try again.';
                } else if (context === 'update') {
                    return 'The warehouse update is invalid. Please check the information and try again.';
                } else if (context === 'delete') {
                    return 'This warehouse cannot be deleted. It may have employees or other dependencies.';
                }
                return 'Invalid warehouse information. Please check your input and try again.';
            case 401:
                return 'Your session has expired. Please log in again.';
            case 403:
                return 'You don\'t have permission to manage warehouses.';
            case 404:
                return 'The warehouse or site could not be found. Please refresh the page.';
            case 405:
                if (context === 'update') {
                    return 'The warehouse update request format is not supported. Please check that all required information is provided and try again.';
                } else if (context === 'delete') {
                    return 'Warehouse deletion is currently not supported by the system. Please contact your administrator.';
                } else if (context === 'add') {
                    return 'Adding warehouses is currently not supported by the system. Please contact your administrator.';
                }
                return 'This warehouse operation is not currently supported by the system. Please contact your administrator.';
            case 408:
                return 'The warehouse operation took too long. Please try again.';
            case 409:
                if (context === 'add') {
                    return 'A warehouse with this name already exists on this site or there\'s a conflict with the assigned manager.';
                }
                return 'There\'s a conflict with the warehouse information. Please refresh and try again.';
            case 415:
                return 'The warehouse information format is not valid. Please try again.';
            case 422:
                if (context === 'add') {
                    return 'The warehouse information could not be processed. Please check that all required fields are filled correctly.';
                } else if (context === 'update') {
                    return 'The warehouse update could not be processed. Please check the information provided.';
                }
                return 'The warehouse information could not be processed. Please check your input.';
            case 429:
                return 'Too many warehouse operations. Please wait a moment before trying again.';
            case 500:
                return 'Something went wrong while managing the warehouse. Please try again in a few moments.';
            case 502:
                return 'Warehouse management service connection issue. Please try again shortly.';
            case 503:
                return 'The warehouse management service is temporarily unavailable. Please try again later.';
            case 504:
                return 'The warehouse operation took too long to complete. Please try again.';
            default:
                break;
        }

        // Clean up technical error messages
        if (errorMessage) {
            // Remove common technical prefixes
            errorMessage = errorMessage.replace(/^Error:\s*/i, '');
            errorMessage = errorMessage.replace(/^TypeError:\s*/i, '');
            errorMessage = errorMessage.replace(/^ReferenceError:\s*/i, '');

            // If it still looks like a technical error, provide a contextual generic message
            if (errorMessage.includes('undefined') ||
                errorMessage.includes('null') ||
                errorMessage.includes('{}') ||
                errorMessage.includes('JSON') ||
                errorMessage.length > 150) {

                if (context === 'add') {
                    return 'Unable to add the warehouse. Please check the information and try again.';
                } else if (context === 'update') {
                    return 'Unable to update the warehouse. Please check the information and try again.';
                } else if (context === 'delete') {
                    return 'Unable to delete the warehouse. It may have dependencies that need to be resolved first.';
                }
                return 'An unexpected error occurred while managing the warehouse. Please try again or contact support.';
            }

            return errorMessage;
        }

        // Fallback message with context
        if (context === 'add') {
            return 'Unable to add the warehouse. Please check the information and try again.';
        } else if (context === 'update') {
            return 'Unable to update the warehouse. Please try again.';
        } else if (context === 'delete') {
            return 'Unable to delete the warehouse. Please try again.';
        }

        return 'An unexpected error occurred while managing warehouses. Please try again or contact support.';
    };

    // Define columns for DataTable
    const columns = [
        {
            header: 'ID',
            accessor: 'conventionalId',
            sortable: true
        },
        {
            header: 'Name',
            accessor: 'name',
            sortable: true
        },
        {
            header: 'Manager',
            accessor: 'manager',
            sortable: true
        }
    ];

    // Define actions for DataTable
    const actions = isSiteAdmin ? [
        {
            label: 'Manage Employees',
            icon: <FaUsers />, // You'll need to import this: import { FaPlus, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
            onClick: (row) => handleOpenManageEmployeesModal(row),
            className: 'manage'
        },
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenEditModal(row),
            className: 'edit'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => handleOpenDeleteModal(row),
            className: 'danger'
        }
    ] : [];

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

    // Helper function to find and format manager name consistently
    // const findManagerName = (warehouse) => {
    //     if (warehouse.managerName) {
    //         return warehouse.managerName;
    //     }
    //
    //     if (warehouse.employees && Array.isArray(warehouse.employees) && warehouse.employees.length > 0) {
    //         const manager = warehouse.employees.find(emp =>
    //             (emp.jobPosition && emp.jobPosition.positionName &&
    //                 emp.jobPosition.positionName.toLowerCase() === "warehouse manager") ||
    //             (emp.position && emp.position.toLowerCase() === "warehouse manager")
    //         );
    //
    //         if (manager) {
    //             return `${manager.firstName} ${manager.lastName}`;
    //         }
    //     }
    //
    //     return "No Manager";
    // };

    useEffect(() => {
        fetchWarehouses();
    }, [siteId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (workersDropdownRef.current && !workersDropdownRef.current.contains(event.target)) {
                setIsWorkersDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await siteService.getSiteWarehouses(siteId);
            const data = response.data;

            console.log("Warehouse data from API:", data);

            if (Array.isArray(data)) {
                // For each warehouse, fetch full details to get employee information
                const warehousesWithDetails = await Promise.all(
                    data.map(async (warehouse, index) => {
                        try {
                            // Fetch full warehouse details including employees
                            const detailResponse = await warehouseService.getById(warehouse.id);
                            const fullWarehouseData = detailResponse.data || detailResponse;

                            console.log(`Full details for ${warehouse.name}:`, fullWarehouseData);

                            return {
                                conventionalId: `WH-${String(index + 1).padStart(3, '0')}`,
                                name: warehouse.name,
                                warehouseID: warehouse.id,
                                manager: findManagerName(fullWarehouseData), // Use full data for manager lookup
                                originalData: fullWarehouseData // Store full data instead of limited data
                            };
                        } catch (detailError) {
                            console.error(`Error fetching details for warehouse ${warehouse.name}:`, detailError);
                            // Fallback to basic data if detail fetch fails
                            return {
                                conventionalId: `WH-${String(index + 1).padStart(3, '0')}`,
                                name: warehouse.name,
                                warehouseID: warehouse.id,
                                manager: "No Manager", // Fallback
                                originalData: warehouse
                            };
                        }
                    })
                );

                setWarehouseData(warehousesWithDetails);
            } else {
                setWarehouseData([]);
                setSnackbar({
                    show: true,
                    message: 'No warehouses found for this site',
                    type: 'info'
                });
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching warehouses:', err);
            const friendlyError = parseErrorMessage(err, 'fetch');
            setError(friendlyError);
            setWarehouseData([]);
            setLoading(false);
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

// Enhanced findManagerName function with detailed employee debugging
    const findManagerName = (warehouse) => {
        console.log("Finding manager for warehouse:", warehouse.name);

        // Check if managerName is directly available
        if (warehouse.managerName) {
            return warehouse.managerName;
        }

        // Check if employees array exists and has data
        if (warehouse.employees && Array.isArray(warehouse.employees) && warehouse.employees.length > 0) {
            console.log("Employees found:", warehouse.employees.length);

            // Debug: Log each employee's complete structure
            warehouse.employees.forEach((emp, index) => {
                console.log(`Employee ${index + 1} complete structure:`, JSON.stringify(emp, null, 2));
                console.log(`Employee ${index + 1} keys:`, Object.keys(emp));

                // Check all possible position-related fields
                console.log(`Employee ${index + 1} position fields:`, {
                    jobPosition: emp.jobPosition,
                    position: emp.position,
                    role: emp.role,
                    jobTitle: emp.jobTitle,
                    positionName: emp.positionName
                });
            });

            // Try multiple ways to find the manager
            const manager = warehouse.employees.find(emp => {
                console.log(`Checking employee: ${emp.firstName} ${emp.lastName}`);

                // Method 0: Check if employee.name contains manager info
                if (emp.name) {
                    const nameMatch = emp.name.toLowerCase().includes("warehouse manager") ||
                        emp.name.toLowerCase().includes("manager");
                    console.log(`Method 0 - name field: "${emp.name}" -> ${nameMatch}`);
                    if (nameMatch) return true;
                }

                // Method 1: jobPosition.positionName
                if (emp.jobPosition?.positionName) {
                    const positionMatch = emp.jobPosition.positionName.toLowerCase() === "warehouse manager";
                    console.log(`Method 1 - jobPosition.positionName: "${emp.jobPosition.positionName}" -> ${positionMatch}`);
                    if (positionMatch) return true;
                }

                // Method 2: direct position field
                if (emp.position) {
                    const positionMatch = emp.position.toLowerCase() === "warehouse manager";
                    console.log(`Method 2 - position: "${emp.position}" -> ${positionMatch}`);
                    if (positionMatch) return true;
                }

                // Method 3: role field
                if (emp.role) {
                    const roleMatch = emp.role.toLowerCase() === "warehouse_manager" ||
                        emp.role.toLowerCase() === "warehouse manager";
                    console.log(`Method 3 - role: "${emp.role}" -> ${roleMatch}`);
                    if (roleMatch) return true;
                }

                // Method 4: jobTitle field
                if (emp.jobTitle) {
                    const titleMatch = emp.jobTitle.toLowerCase() === "warehouse manager";
                    console.log(`Method 4 - jobTitle: "${emp.jobTitle}" -> ${titleMatch}`);
                    if (titleMatch) return true;
                }

                // Method 5: positionName field (direct)
                if (emp.positionName) {
                    const nameMatch = emp.positionName.toLowerCase() === "warehouse manager";
                    console.log(`Method 5 - positionName: "${emp.positionName}" -> ${nameMatch}`);
                    if (nameMatch) return true;
                }

                return false;
            });

            if (manager) {
                // Use the name field directly since firstName/lastName don't exist in this API response
                const managerName = manager.name || `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || 'Unknown Manager';
                console.log("Found manager:", managerName);
                return managerName;
            } else {
                console.log("No manager found with any of the search methods");
            }
        }

        return "No Manager";
    };

    // Replace your existing fetchEmployees method with this updated version
    const fetchEmployees = async () => {
        try {
            // Fetch available managers (not assigned to any warehouse)
            const managersResponse = await siteService.getAvailableWarehouseManagers();
            const managersData = managersResponse.data?.data || managersResponse.data || [];
            console.log("Managers response:", managersResponse);
            console.log("Managers data:", managersData);
            setManagers(Array.isArray(managersData) ? managersData : []);

            // Fetch available workers (not assigned to any warehouse and not warehouse managers)
            const workersResponse = await siteService.getAvailableWarehouseWorkers();
            const workersData = workersResponse.data?.data || workersResponse.data || [];
            console.log("Workers response:", workersResponse);
            console.log("Workers data:", workersData);
            setWorkers(Array.isArray(workersData) ? workersData : []);

            if (managersData.length === 0 && workersData.length === 0) {
                setSnackbar({
                    show: true,
                    message: 'No available managers or workers found',
                    type: 'info'
                });
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
            const friendlyError = parseErrorMessage(error, 'fetch');
            setFormError(friendlyError);
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

/// Replace your existing fetchEditManagers function with this updated version:

    const fetchEditManagers = async (warehouseToEdit = null) => {
        try {
            console.log("=== FETCH EDIT MANAGERS DEBUG ===");
            const targetWarehouse = warehouseToEdit || editingWarehouse;
            console.log("targetWarehouse:", targetWarehouse);

            // Get available managers and current warehouse's manager
            const managersResponse = await siteService.getAvailableWarehouseManagers();
            let availableManagers = managersResponse.data?.data || managersResponse.data || [];

            if (!Array.isArray(availableManagers)) {
                console.warn("Available managers for edit is not an array:", availableManagers);
                availableManagers = [];
            }

            // If we're editing a warehouse and it has a current manager, include that manager
            if (targetWarehouse && targetWarehouse.employees) {
                console.log("targetWarehouse.employees:", targetWarehouse.employees);

                const currentManager = targetWarehouse.employees.find(emp => {
                    const isManager = (emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager") ||
                        (emp.position?.toLowerCase() === "warehouse manager") ||
                        (emp.role?.toLowerCase() === "warehouse_manager") ||
                        (emp.role?.toLowerCase() === "warehouse manager") ||
                        (emp.name?.toLowerCase().includes("warehouse manager"));
                    console.log(`Checking ${emp.name}: isManager = ${isManager}, position = ${emp.position}`);
                    return isManager;
                });

                console.log("currentManager found in fetchEditManagers:", currentManager);

                if (currentManager && !availableManagers.find(m => m.id === currentManager.id)) {
                    // Split name into firstName and lastName since the API only provides 'name'
                    const nameParts = currentManager.name ? currentManager.name.split(' ') : ['Unknown', 'Manager'];
                    const managerToAdd = {
                        id: currentManager.id,
                        firstName: nameParts[0] || 'Unknown',
                        lastName: nameParts.slice(1).join(' ') || 'Manager'
                    };
                    console.log("Adding current manager to available list:", managerToAdd);
                    availableManagers.push(managerToAdd);
                }
            }

            console.log("Final editManagers list:", availableManagers);
            setEditManagers(availableManagers);

            // Fetch available workers
            const workersResponse = await siteService.getAvailableWarehouseWorkers();
            let availableWorkers = workersResponse.data?.data || workersResponse.data || [];

            if (!Array.isArray(availableWorkers)) {
                console.warn("Available workers for edit is not an array:", availableWorkers);
                availableWorkers = [];
            }

            // If we're editing a warehouse, include current workers who are not managers
            if (targetWarehouse && targetWarehouse.employees) {
                const currentWorkers = targetWarehouse.employees.filter(emp => {
                    // Exclude the manager from workers list
                    const isManager = (emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager") ||
                        (emp.position?.toLowerCase() === "warehouse manager") ||
                        (emp.role?.toLowerCase() === "warehouse_manager") ||
                        (emp.role?.toLowerCase() === "warehouse manager") ||
                        (emp.name?.toLowerCase().includes("warehouse manager"));
                    return !isManager;
                });

                console.log("Current workers found:", currentWorkers);

                // Add current workers to available list and selected list
                const currentWorkerIds = [];
                const currentWorkersFormatted = [];

                currentWorkers.forEach(worker => {
                    if (!availableWorkers.find(w => w.id === worker.id)) {
                        // Split name into firstName and lastName since the API only provides 'name'
                        const nameParts = worker.name ? worker.name.split(' ') : ['Unknown', 'Worker'];
                        const workerToAdd = {
                            id: worker.id,
                            firstName: nameParts[0] || 'Unknown',
                            lastName: nameParts.slice(1).join(' ') || 'Worker'
                        };
                        availableWorkers.push(workerToAdd);
                    }

                    // Add to selected workers for edit modal
                    currentWorkerIds.push(worker.id);
                    const nameParts = worker.name ? worker.name.split(' ') : ['Unknown', 'Worker'];
                    currentWorkersFormatted.push({
                        id: worker.id,
                        firstName: nameParts[0] || 'Unknown',
                        lastName: nameParts.slice(1).join(' ') || 'Worker'
                    });
                });

                console.log("Setting edit selected workers:", currentWorkersFormatted);
                console.log("Setting edit selected worker IDs:", currentWorkerIds);

                setEditSelectedWorkerIds(currentWorkerIds);
                setEditSelectedWorkers(currentWorkersFormatted);
            } else {
                // Reset if no current workers
                setEditSelectedWorkerIds([]);
                setEditSelectedWorkers([]);
            }

            setEditWorkers(availableWorkers);

        } catch (error) {
            console.error("Error fetching managers and workers:", error);
            const friendlyError = parseErrorMessage(error, 'fetch');
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
            setEditManagers([]);
            setEditWorkers([]);
            setEditSelectedWorkers([]);
            setEditSelectedWorkerIds([]);
        }
    };

    // Handle opening the Add Warehouse modal
    const handleOpenAddModal = () => {
        setShowAddModal(true);
        setSelectedManager(null);
        setSelectedWorkers([]);
        setSelectedWorkerIds([]);
        // ADD THESE MISSING RESETS:
        setEditSelectedWorkers([]);
        setEditSelectedWorkerIds([]);
        setIsWorkersDropdownOpen(false);
        setPreviewImage(null);
        setFormError(null);
        fetchEmployees();
    };

    // Handle closing the Add Warehouse modal
    const handleCloseAddModal = () => {
        setShowAddModal(false);
    };

    // Handle file change for warehouse image
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    // Handle edit file change
    const handleEditFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditFormData({ ...editFormData, photo: file });
            setEditPreviewImage(URL.createObjectURL(file));
        }
    };

    // Handle edit input changes
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData({ ...editFormData, [name]: value });

        if (name === 'managerId') {
            setSelectedEditManagerId(value);
        }
    };

    // Open edit modal
    // Replace your existing handleOpenEditModal function with this updated version:

    const handleOpenEditModal = async (row) => {
        try {
            setEditPreviewImage(null);

            const warehouse = row.originalData;
            console.log("=== EDIT MODAL DEBUG ===");
            console.log("Opening edit modal for warehouse:", warehouse);
            console.log("Warehouse employees:", warehouse.employees);

            // Debug: Log each employee's structure
            if (warehouse.employees) {
                warehouse.employees.forEach((emp, index) => {
                    console.log(`Employee ${index + 1}:`, {
                        id: emp.id,
                        name: emp.name,
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        jobPosition: emp.jobPosition,
                        position: emp.position,
                        role: emp.role
                    });
                });
            }

            // Find current manager using the same logic as findManagerName
            let currentManager = null;
            if (warehouse.employees && Array.isArray(warehouse.employees)) {
                currentManager = warehouse.employees.find(emp => {
                    return (emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager") ||
                        (emp.position?.toLowerCase() === "warehouse manager") ||
                        (emp.role?.toLowerCase() === "warehouse_manager") ||
                        (emp.role?.toLowerCase() === "warehouse manager") ||
                        (emp.name?.toLowerCase().includes("warehouse manager"));
                });
            }

            console.log("Found current manager:", currentManager);

            // Find current workers (all employees except the manager)
            let currentWorkers = [];
            if (warehouse.employees && Array.isArray(warehouse.employees)) {
                currentWorkers = warehouse.employees.filter(emp => emp.id !== currentManager?.id);
            }

            console.log("Found current workers:", currentWorkers);

            setEditFormData({
                id: warehouse.id,
                name: warehouse.name || "",
                photoUrl: warehouse.photoUrl || "",
                managerId: currentManager?.id || ""
            });

            setSelectedEditManagerId(currentManager?.id || "");

            if (warehouse.photoUrl) {
                setEditPreviewImage(warehouse.photoUrl);
            }

            setEditingWarehouse(warehouse);

            // Fetch managers and workers for dropdown BEFORE showing modal
            await fetchEditManagers(warehouse);

            // Now show the modal
            setShowEditModal(true);

        } catch (error) {
            console.error("Error opening edit modal:", error);
            const friendlyError = parseErrorMessage(error, 'general');
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

    const handleSelectEditWorker = (worker) => {
        if (!editSelectedWorkerIds.includes(worker.id)) {
            setEditSelectedWorkers([...editSelectedWorkers, worker]);
            setEditSelectedWorkerIds([...editSelectedWorkerIds, worker.id]);
        }
    };

    const handleRemoveEditWorker = (workerId) => {
        setEditSelectedWorkers(editSelectedWorkers.filter(worker => worker.id !== workerId));
        setEditSelectedWorkerIds(editSelectedWorkerIds.filter(id => id !== workerId));
    };

    // Open delete confirmation dialog
    const handleOpenDeleteModal = (row) => {
        const warehouse = row.originalData;
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

    // Close edit modal
    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditingWarehouse(null);
        setEditPreviewImage(null);
        setEditManagers([]);
        setEditWorkers([]);
        setEditSelectedWorkers([]);
        setEditSelectedWorkerIds([]);
        setSelectedEditManagerId("");
        setEditFormData({
            id: "",
            name: "",
            photoUrl: "",
            managerId: ""
        });
    };

    // Handle update warehouse
    const handleUpdateWarehouse = async (e) => {
        e.preventDefault();

        if (!editFormData.name.trim()) {
            setSnackbar({
                show: true,
                message: 'Warehouse name is required',
                type: 'error'
            });
            return;
        }

        try {
            const formDataToSend = new FormData();

            // Create warehouse data object
            const warehouseData = {
                name: editFormData.name.trim(),
            };

            // Add manager if selected
            if (editFormData.managerId) {
                warehouseData.managerId = editFormData.managerId;
            }

            // Add workers if selected
            if (editSelectedWorkerIds.length > 0) {
                warehouseData.workerIds = editSelectedWorkerIds;
            }

            // Always append warehouseData as JSON string
            formDataToSend.append("warehouseData", JSON.stringify(warehouseData));

            // Add photo if uploaded
            if (editFormData.photo) {
                formDataToSend.append("photo", editFormData.photo);
            }

            console.log("Sending warehouse update data:", {
                id: editFormData.id,
                warehouseData: warehouseData,
                hasPhoto: !!editFormData.photo,
                selectedWorkers: editSelectedWorkers
            });

            const response = await warehouseService.update(editFormData.id, formDataToSend);
            console.log("Update response:", response);

            // Refresh warehouse list
            fetchWarehouses();
            handleCloseEditModal();
            setSnackbar({
                show: true,
                message: "Warehouse has been successfully updated!",
                type: 'success'
            });

        } catch (error) {
            console.error("Failed to update warehouse:", error);
            const friendlyError = parseErrorMessage(error, 'update');
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

    // Handle delete warehouse
    const handleDeleteWarehouse = async (warehouseId) => {
        try {
            await warehouseService.delete(warehouseId);

            // Refresh warehouse list
            fetchWarehouses();
            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: "Warehouse has been successfully deleted!",
                type: 'success'
            });

        } catch (error) {
            console.error("Failed to delete warehouse:", error);
            const friendlyError = parseErrorMessage(error, 'delete');
            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

    // Handle manager selection
    const handleSelectManager = (managerId) => {
        if (!managerId) {
            setSelectedManager(null);
            return;
        }

        try {
            let manager = managers.find(m => m.id === managerId);

            if (!manager) {
                const parsedId = parseInt(managerId, 10);
                manager = managers.find(m => m.id === parsedId);
            }

            if (!manager) {
                manager = managers.find(m => String(m.id) === String(managerId));
            }

            if (manager) {
                setSelectedManager(manager);
            } else {
                console.error("Could not find manager with ID:", managerId);
                setSelectedManager(null);
            }
        } catch (error) {
            console.error("Error selecting manager:", error);
            setSelectedManager(null);
        }
    };

    // Toggle workers dropdown
    const toggleWorkersDropdown = () => {
        setIsWorkersDropdownOpen(!isWorkersDropdownOpen);
    };

    // Handle worker selection
    const handleSelectWorker = (worker) => {
        if (!selectedWorkerIds.includes(worker.id)) {
            setSelectedWorkers([...selectedWorkers, worker]);
            setSelectedWorkerIds([...selectedWorkerIds, worker.id]);
        }
    };

    // Handle removing a worker from selection
    const handleRemoveWorker = (workerId) => {
        setSelectedWorkers(selectedWorkers.filter(worker => worker.id !== workerId));
        setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== workerId));
    };

    // Handle form submission
    const handleAddWarehouse = async (event) => {
        event.preventDefault();

        const formElements = event.currentTarget.elements;
        const warehouseName = formElements.name.value.trim();

        if (!warehouseName) {
            setSnackbar({
                show: true,
                message: 'Warehouse name is required',
                type: 'error'
            });
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        const formData = new FormData();

        const warehouseData = {
            name: warehouseName,
        };

        const employees = [];

        if (selectedManager) {
            employees.push({id: selectedManager.id});
        }

        if (selectedWorkers.length > 0) {
            selectedWorkers.forEach(worker => {
                employees.push({id: worker.id});
            });
        }

        if (employees.length > 0) {
            warehouseData.employees = employees;
        }

        formData.append("warehouseData", JSON.stringify(warehouseData));

        const fileInput = document.getElementById("imageUpload");
        if (fileInput && fileInput.files.length > 0) {
            formData.append("photo", fileInput.files[0]);
        }

        try {
            await siteService.addWarehouse(siteId, formData);
            setShowAddModal(false);
            await fetchWarehouses();
            setSnackbar({
                show: true,
                message: 'Warehouse has been successfully added!',
                type: 'success'
            });
        } catch (err) {
            console.error("Failed to add warehouse:", err.message);
            const friendlyError = parseErrorMessage(err, 'add');
            setFormError(friendlyError);
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowClick = (row) => {
        navigate(`/warehouses/${row.warehouseID}`);
        setSnackbar({
            show: true,
            message: `Navigating to warehouse details: ${row.conventionalId}`,
            type: 'info'
        });
    };

    // Handle opening the manage employees modal
    const handleOpenManageEmployeesModal = async (row) => {
        try {
            const warehouse = row.originalData;
            setManagingWarehouse(warehouse);
            setShowManageEmployeesModal(true);
            await fetchWarehouseEmployees(warehouse.id);
        } catch (error) {
            console.error("Error opening manage employees modal:", error);
            const friendlyError = parseErrorMessage(error, 'general');
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

// Close manage employees modal
    const handleCloseManageEmployeesModal = () => {
        setShowManageEmployeesModal(false);
        setManagingWarehouse(null);
        setWarehouseEmployees([]);
    };

// Fetch warehouse employees
    const fetchWarehouseEmployees = async (warehouseId) => {
        try {
            setLoadingEmployees(true);
            const response = await siteService.getWarehouseEmployees(warehouseId);
            const employees = response.data?.data || [];

            console.log("Warehouse employees fetched:", employees);
            setWarehouseEmployees(Array.isArray(employees) ? employees : []);
        } catch (error) {
            console.error("Error fetching warehouse employees:", error);
            const friendlyError = parseErrorMessage(error, 'fetch');
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
            setWarehouseEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    };

// Handle unassigning an employee
    const handleUnassignEmployee = (employee) => {
        const message = `Are you sure you want to unassign "${employee.fullName}" from this warehouse?\n\nThis will also remove them from the site. This action cannot be undone.`;

        showConfirmDialog(
            'warning',
            'Unassign Employee',
            message,
            () => performUnassignEmployee(employee)
        );
    };

// Perform the actual unassignment
    const performUnassignEmployee = async (employee) => {
        try {
            await siteService.unassignEmployeeFromWarehouse(managingWarehouse.id, employee.id);

            // Refresh the employee list
            await fetchWarehouseEmployees(managingWarehouse.id);

            // Refresh the main warehouse list to update counts
            fetchWarehouses();

            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: `${employee.fullName} has been successfully unassigned from the warehouse!`,
                type: 'success'
            });
        } catch (error) {
            console.error("Failed to unassign employee:", error);
            const friendlyError = parseErrorMessage(error, 'unassign');
            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: friendlyError,
                type: 'error'
            });
        }
    };

    // DataTable configuration for warehouse employees
    const warehouseEmployeeColumns = [
        {
            header: 'Name',
            accessor: 'fullName',
            sortable: true,
            minWidth: '200px'
        },
        {
            header: 'Position',
            accessor: 'jobPosition',
            sortable: true,
            minWidth: '150px',
            render: (row, value) => (
                <span className={`warehouse-manage-employee-position-badge-datatable ${row.isManager ? 'warehouse-manage-employee-position-badge-manager-datatable' : 'warehouse-manage-employee-position-badge-worker-datatable'}`}>
                {value}
            </span>
            )
        },
        // {
        //     header: 'Role Type',
        //     accessor: 'isManager',
        //     sortable: true,
        //     minWidth: '120px',
        //     render: (row, value) => (
        //         <span className={`warehouse-manage-employee-role-type-badge ${value ? 'manager' : 'worker'}`}>
        //         {value ? 'Manager' : 'Worker'}
        //     </span>
        //     )
        // }
    ];

    const warehouseEmployeeActions = [
        {
            label: 'Unassign',
            icon: <FaTrash />,
            onClick: (row) => handleUnassignEmployee(row),
            className: 'danger'
        }
    ];

    const warehouseEmployeeFilterableColumns = [
        {
            header: 'Position',
            accessor: 'jobPosition',
            filterType: 'select'
        },
    ];

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            // Check which modal is open and call the appropriate close function
            if (showAddModal) {
                handleCloseAddModal();
            } else if (showEditModal) {
                handleCloseEditModal();
            } else if (showManageEmployeesModal) {
                handleCloseManageEmployeesModal();
            }
        }
    };



    // if (loading) return <div className="loading-container">Loading warehouse information...</div>;
    if (loading) return <ContentLoader
        context="employee-details"
        message="Loading Warehouses"
        fadeIn={true}
    />;

    return (
        <div className="site-warehouses-tab">
            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={handleCloseSnackbar}
                duration={3000}
            />

            {error ? (
                <div className="error-container">
                    <p>{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            fetchWarehouses();
                        }}
                        className="retry-button"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <div className="data-table-container">
                    <DataTable
                        data={warehouseData}
                        columns={columns}
                        actions={actions}
                        loading={loading}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={columns}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                        defaultItemsPerPage={10}
                        tableTitle=""
                        onRowClick={handleRowClick}
                        rowClassName="clickable-row"
                        showAddButton={isSiteAdmin}
                        addButtonText="Add Warehouse"
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleOpenAddModal}
                        addButtonProps={{
                            className: 'assign-button',
                            title: 'Add a new warehouse to this site'
                        }}
                        showExportButton={true}
                        exportButtonText="Export Warehouses"
                        exportFileName="site_warehouses"
                    />
                </div>
            )}

            {/* Add Warehouse Modal */}
            {showAddModal && (
                <div className="modern-modal-overlay" onClick={handleOverlayClick}>
                    <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modern-modal-header">
                            <h2>Add New Warehouse</h2>
                            <button className="modern-modal-close" onClick={handleCloseAddModal}>
                                ×
                            </button>
                        </div>

                        <div className="modern-modal-body">
                            {formError && (
                                <div className="modern-form-error">{formError}</div>
                            )}

                            <div className="modern-modal-layout">
                                {/* Image Upload */}
                                <label className={`modern-image-upload ${previewImage ? 'has-image' : ''}`}>
                                    <input
                                        type="file"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    {previewImage ? (
                                        <>
                                            <img src={previewImage} alt="Warehouse" className="modern-image-preview" />
                                            <div className="modern-image-overlay">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setPreviewImage(null);
                                                    }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="modern-image-placeholder">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span className="upload-text">{t('common.uploadPhoto')}</span>
                                            <span className="upload-hint">JPG, PNG or GIF</span>
                                        </div>
                                    )}
                                </label>

                                {/* Form Fields */}
                                <form className="modern-form-section" onSubmit={handleAddWarehouse}>
                                    <div className="modern-form-field">
                                        <label className="modern-form-label">
                                            Warehouse Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="modern-form-input"
                                            placeholder="Enter warehouse name"
                                            required
                                        />
                                    </div>

                                    <div className="modern-form-field">
                                        <label className="modern-form-label">Warehouse Manager</label>
                                        <select
                                            name="managerId"
                                            className="modern-form-select"
                                            onChange={(e) => handleSelectManager(e.target.value)}
                                        >
                                            <option value="">Select Warehouse Manager</option>
                                            {managers.map(manager => (
                                                <option key={manager.id} value={manager.id}>
                                                    {manager.firstName} {manager.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="modern-form-field">
                                        <label className="modern-form-label">Warehouse Workers</label>
                                        <div className="modern-dropdown" ref={workersDropdownRef}>
                                            <div
                                                className="modern-dropdown-header"
                                                onClick={toggleWorkersDropdown}
                                            >
                                                <span>Select Workers</span>
                                                <span className={`modern-dropdown-icon ${isWorkersDropdownOpen ? 'open' : ''}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </span>
                                            </div>

                                            {isWorkersDropdownOpen && (
                                                <div className="modern-dropdown-menu">
                                                    {workers
                                                        .filter(worker => !selectedWorkerIds.includes(worker.id))
                                                        .map(worker => (
                                                            <div
                                                                key={worker.id}
                                                                className="modern-dropdown-item"
                                                                onClick={() => handleSelectWorker(worker)}
                                                            >
                                                                {worker.firstName} {worker.lastName}
                                                            </div>
                                                        ))}
                                                    {workers.filter(worker => !selectedWorkerIds.includes(worker.id)).length === 0 && (
                                                        <div className="modern-dropdown-item disabled">
                                                            No workers available
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {selectedWorkers.length > 0 && (
                                            <div className="modern-chips-container">
                                                {selectedWorkers.map(worker => (
                                                    <div key={worker.id} className="modern-chip">
                                                        <span>{worker.firstName} {worker.lastName}</span>
                                                        <button
                                                            type="button"
                                                            className="modern-chip-remove"
                                                            onClick={() => handleRemoveWorker(worker.id)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button
                                type="button"
                                className="modern-btn modern-btn-cancel"
                                onClick={handleCloseAddModal}
                                disabled={isSubmitting}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="modern-btn modern-btn-primary"
                                onClick={handleAddWarehouse}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Warehouse'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Warehouse Modal */}
            {showEditModal && (
                <div className="modern-modal-overlay" onClick={handleOverlayClick}>
                    <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modern-modal-header">
                            <h2>Edit Warehouse</h2>
                            <button className="modern-modal-close" onClick={handleCloseEditModal}>
                                ×
                            </button>
                        </div>

                        <div className="modern-modal-body">
                            <div className="modern-modal-layout">
                                {/* Image Upload */}
                                <label className={`modern-image-upload ${editPreviewImage ? 'has-image' : ''}`}>
                                    <input
                                        type="file"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handleEditFileChange}
                                    />
                                    {editPreviewImage ? (
                                        <>
                                            <img src={editPreviewImage} alt="Warehouse" className="modern-image-preview" />
                                            <div className="modern-image-overlay">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditPreviewImage(null);
                                                    }}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="modern-image-placeholder">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                            <span className="upload-text">Upload Photo</span>
                                            <span className="upload-hint">JPG, PNG or GIF</span>
                                        </div>
                                    )}
                                </label>

                                {/* Form Fields */}
                                <form className="modern-form-section" onSubmit={handleUpdateWarehouse}>
                                    <div className="modern-form-field">
                                        <label className="modern-form-label">
                                            Warehouse Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={editFormData.name}
                                            onChange={handleEditInputChange}
                                            className="modern-form-input"
                                            placeholder="Enter warehouse name"
                                            required
                                        />
                                    </div>

                                    <div className="modern-form-field">
                                        <label className="modern-form-label">Warehouse Manager</label>
                                        <select
                                            name="managerId"
                                            value={selectedEditManagerId}
                                            onChange={handleEditInputChange}
                                            className="modern-form-select"
                                        >
                                            <option value="">Select Manager</option>
                                            {Array.isArray(editManagers) && editManagers.map(manager => (
                                                <option key={manager.id} value={manager.id}>
                                                    {manager.firstName} {manager.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="modern-form-field">
                                        <label className="modern-form-label">Warehouse Workers</label>
                                        <div className="modern-dropdown" ref={workersDropdownRef}>
                                            <div
                                                className="modern-dropdown-header"
                                                onClick={toggleWorkersDropdown}
                                            >
                                                <span>Select Workers (Optional)</span>
                                                <span className={`modern-dropdown-icon ${isWorkersDropdownOpen ? 'open' : ''}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </span>
                                            </div>

                                            {isWorkersDropdownOpen && (
                                                <div className="modern-dropdown-menu">
                                                    {editWorkers
                                                        .filter(worker => !editSelectedWorkerIds.includes(worker.id))
                                                        .map(worker => (
                                                            <div
                                                                key={worker.id}
                                                                className="modern-dropdown-item"
                                                                onClick={() => handleSelectEditWorker(worker)}
                                                            >
                                                                {worker.firstName} {worker.lastName}
                                                            </div>
                                                        ))}
                                                    {editWorkers.filter(worker => !editSelectedWorkerIds.includes(worker.id)).length === 0 && (
                                                        <div className="modern-dropdown-item disabled">
                                                            No workers available
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {editSelectedWorkers.length > 0 && (
                                            <div className="modern-chips-container">
                                                {editSelectedWorkers.map(worker => (
                                                    <div key={worker.id} className="modern-chip">
                                                        <span>{worker.firstName} {worker.lastName}</span>
                                                        <button
                                                            type="button"
                                                            className="modern-chip-remove"
                                                            onClick={() => handleRemoveEditWorker(worker.id)}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button
                                type="button"
                                className="modern-btn modern-btn-cancel"
                                onClick={handleCloseEditModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="modern-btn modern-btn-primary"
                                onClick={handleUpdateWarehouse}
                            >
                                Update Warehouse
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Employees Modal */}
            {showManageEmployeesModal && managingWarehouse && (
                <div className="add-warehouse-modal-overlay" onClick={handleOverlayClick}>
                    <div className="add-warehouse-modal-content warehouse-manage-employees-modal-content">
                        <div className="add-warehouse-modal-header">
                            <h2>Manage Employees - {managingWarehouse.name}</h2>
                            <button className="add-warehouse-modal-close-button" onClick={handleCloseManageEmployeesModal}>×</button>
                        </div>

                        <div className="add-warehouse-modal-body warehouse-manage-employees-modal-body">
                            <DataTable
                                data={warehouseEmployees}
                                columns={warehouseEmployeeColumns}
                                actions={warehouseEmployeeActions}
                                loading={loadingEmployees}
                                showSearch={true}
                                showFilters={true}
                                filterableColumns={warehouseEmployeeFilterableColumns}
                                itemsPerPageOptions={[5, 10, 15, 20]}
                                defaultItemsPerPage={10}
                                tableTitle=""
                                emptyMessage="No employees assigned to this warehouse"
                                className="warehouse-manage-employees-data-table"
                                showAddButton={false}
                                showExportButton={false}
                                exportButtonText="Export Employees"
                                exportFileName={`warehouse_${managingWarehouse.name}_employees`}
                                actionsColumnWidth="100px"
                            />

                            <div className="warehouse-manage-employees-modal-actions">
                                <button
                                    type="button"
                                    className="add-warehouse-cancel-button"
                                    onClick={handleCloseManageEmployeesModal}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={hideConfirmDialog}
                confirmText="Yes, Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default SiteWarehousesTab;