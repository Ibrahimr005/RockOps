import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./WarehousesList.scss";
import { FaWarehouse, FaChevronDown } from 'react-icons/fa';
import { useAuth } from "../../../../contexts/AuthContext.jsx";
import LoadingPage from "../../../../components/common/LoadingPage/LoadingPage.jsx";
import PageHeader from "../../../../components/common/PageHeader/PageHeader.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import UnifiedCard from "../../../../components/common/UnifiedCard/UnifiedCard.jsx";
import AssignmentModal from "../AssignmentModal/AssignmentModal.jsx";
import { warehouseService } from "../../../../services/warehouse/warehouseService.js";
import { warehouseEmployeeService } from "../../../../services/warehouse/warehouseEmployeeService.js";
import { itemService } from "../../../../services/warehouse/itemService.js";
import { transactionService } from "../../../../services/transaction/transactionService.js";
import { siteService } from "../../../../services/siteService.js";
import warehouseimg from "../../../../assets/imgs/warehouseimg.jpg";

const WarehousesList = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [filteredWarehouses, setFilteredWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSite, setSelectedSite] = useState("");
    const [selectedManager, setSelectedManager] = useState("");
    const [selectedWorker1, setSelectedWorker1] = useState("");
    const [selectedWorker2, setSelectedWorker2] = useState("");
    const [selectedAlertStatus, setSelectedAlertStatus] = useState("");
    const [sites, setSites] = useState([]);
    const [managers, setManagers] = useState([]);
    const [workers, setWorkers] = useState([]);

    // Assignment modal states
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [warehouseEmployees, setWarehouseEmployees] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [totalItemsMap, setTotalItemsMap] = useState({});

    // Notification states
    const [warehouseNotifications, setWarehouseNotifications] = useState({});
    const [loadingNotifications, setLoadingNotifications] = useState(true);

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

    // Apply filters
    useEffect(() => {
        if (!warehouses || warehouses.length === 0) {
            setFilteredWarehouses([]);
            return;
        }

        let result = [...warehouses];

        // Apply site filter
        if (selectedSite) {
            result = result.filter(w => w.site?.id === selectedSite);
        }

        // Apply manager filter
        if (selectedManager) {
            if (selectedManager === 'none') {
                result = result.filter(w => {
                    const hasManager = w.employees?.some(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                    );
                    return !hasManager;
                });
            } else {
                result = result.filter(w => {
                    const manager = w.employees?.find(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                    );
                    return manager?.id === selectedManager;
                });
            }
        }

        // Apply worker filter 1
        if (selectedWorker1) {
            if (selectedWorker1 === 'none') {
                result = result.filter(w => {
                    const workers = w.employees?.filter(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                    ) || [];
                    return workers.length === 0;
                });
            } else {
                result = result.filter(w => {
                    const workers = w.employees?.filter(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                    ) || [];
                    return workers.some(worker => worker.id === selectedWorker1);
                });
            }
        }

        // Apply worker filter 2
        if (selectedWorker2) {
            if (selectedWorker2 === 'none') {
                result = result.filter(w => {
                    const workers = w.employees?.filter(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                    ) || [];
                    return workers.length === 0;
                });
            } else {
                result = result.filter(w => {
                    const workers = w.employees?.filter(
                        emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                    ) || [];
                    return workers.some(worker => worker.id === selectedWorker2);
                });
            }
        }

        // Apply alert status filter
        if (selectedAlertStatus) {
            result = result.filter(w => {
                const notifications = warehouseNotifications[w.id] || {};
                const hasAlerts = notifications.incomingTransactions > 0 || notifications.discrepancies > 0;
                return selectedAlertStatus === 'yes' ? hasAlerts : !hasAlerts;
            });
        }

        setFilteredWarehouses(result);
    }, [warehouses, selectedSite, selectedManager, selectedWorker1, selectedWorker2, selectedAlertStatus, warehouseNotifications]);

    const handleResetFilters = () => {
        setSelectedSite("");
        setSelectedManager("");
        setSelectedWorker1("");
        setSelectedWorker2("");
        setSelectedAlertStatus("");
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (selectedSite) count++;
        if (selectedManager) count++;
        if (selectedWorker1) count++;
        if (selectedWorker2) count++;
        if (selectedAlertStatus) count++;
        return count;
    };

    // Fetch sites for filter dropdown
    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data || []);
        } catch (error) {
            console.error("Error fetching sites:", error);
            setSites([]);
        }
    };

    // Extract unique managers and workers from warehouses
    useEffect(() => {
        if (warehouses.length > 0) {
            // Extract all unique managers
            const allManagers = [];
            const managerIds = new Set();

            warehouses.forEach(warehouse => {
                const manager = warehouse.employees?.find(
                    emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                );
                if (manager && !managerIds.has(manager.id)) {
                    managerIds.add(manager.id);
                    allManagers.push(manager);
                }
            });

            setManagers(allManagers);

            // Extract all unique workers
            const allWorkers = [];
            const workerIds = new Set();

            warehouses.forEach(warehouse => {
                const workers = warehouse.employees?.filter(
                    emp => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                ) || [];

                workers.forEach(worker => {
                    if (!workerIds.has(worker.id)) {
                        workerIds.add(worker.id);
                        allWorkers.push(worker);
                    }
                });
            });

            setWorkers(allWorkers);
        }
    }, [warehouses]);

    // Function to fetch notification data for each warehouse
    const fetchWarehouseNotifications = async (warehouseId) => {
        try {
            const [transactions, items] = await Promise.all([
                transactionService.getTransactionsForWarehouse(warehouseId),
                itemService.getItemsByWarehouse(warehouseId)
            ]);

            const itemsArray = Array.isArray(items) ? items : [];

            const incomingTransactionsCount = transactions.filter(transaction =>
                transaction.status === "PENDING" &&
                (transaction.receiverId === warehouseId || transaction.senderId === warehouseId) &&
                transaction.sentFirst !== warehouseId
            ).length;

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
            fetchSites();
        }
    }, [currentUser]);

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
        if (showAssignmentModal) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [showAssignmentModal]);

    const handleOpenAssignmentModal = (warehouse) => {
        console.log('🔵 Opening assignment modal for:', warehouse.name);
        setSelectedWarehouse(warehouse);
        setShowAssignmentModal(true);
        fetchWarehouseEmployees();
    };

    const handleCloseAssignmentModal = () => {
        setShowAssignmentModal(false);
        setSelectedWarehouse(null);
    };

    const handleAssignmentSuccess = () => {
        fetchWarehouses();
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
            <PageHeader
                title="Warehouses"
                subtitle="Overview and management of warehouse facilities and inventory locations"
                filterButton={{
                    onClick: () => setShowFilters(!showFilters),
                    isActive: showFilters
                }}
            />

            {/* Filter Panel */}
            {showFilters && (
                <div className="page-header__filter-panel">
                    <div className="page-header__filter-header">
                        <h4>Filter Warehouses</h4>
                        <div className="filter-actions">
                            <button
                                className="filter-reset-btn"
                                onClick={handleResetFilters}
                                disabled={getActiveFilterCount() === 0}
                            >
                                Clear All
                            </button>
                            <button
                                className={`filter-collapse-btn ${showFilters ? '' : 'collapsed'}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <FaChevronDown />
                            </button>
                        </div>
                    </div>

                    <div className="page-header__filter-list">
                        <div className="page-header__filter-item">
                            <label>Site</label>
                            <select
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                            >
                                <option value="">All Sites</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Manager</label>
                            <select
                                value={selectedManager}
                                onChange={(e) => setSelectedManager(e.target.value)}
                            >
                                <option value="">All Managers</option>
                                <option value="none">None (No Manager)</option>
                                {managers.map(manager => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.firstName} {manager.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Worker 1</label>
                            <select
                                value={selectedWorker1}
                                onChange={(e) => setSelectedWorker1(e.target.value)}
                            >
                                <option value="">All Workers</option>
                                <option value="none">None (No Workers)</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.firstName} {worker.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Worker 2</label>
                            <select
                                value={selectedWorker2}
                                onChange={(e) => setSelectedWorker2(e.target.value)}
                            >
                                <option value="">All Workers</option>
                                <option value="none">None (No Workers)</option>
                                {workers.map(worker => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.firstName} {worker.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Has Alerts</label>
                            <select
                                value={selectedAlertStatus}
                                onChange={(e) => setSelectedAlertStatus(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="unified-cards-grid">
                {filteredWarehouses.length > 0 ? (
                    filteredWarehouses.map((warehouse) => {
                        const manager = warehouse.employees?.find(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
                        );

                        const warehouseWorkers = warehouse.employees?.filter(
                            (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse worker"
                        ) || [];

                        const notifications = warehouseNotifications[warehouse.id] || {};
                        const hasAlerts = notifications.incomingTransactions > 0 || notifications.discrepancies > 0;

                        const alertTooltip = hasAlerts ? (
                            notifications.incomingTransactions && notifications.discrepancies
                                ? `${notifications.incomingTransactions} incoming transactions, ${notifications.discrepancies} inventory issues`
                                : notifications.incomingTransactions
                                    ? `${notifications.incomingTransactions} incoming transactions`
                                    : `${notifications.discrepancies} inventory issues`
                        ) : '';

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
                                imageFallback={warehouseimg}
                                stats={stats}
                                actions={actions}
                                hasAlert={hasAlerts}
                                alertTooltip={alertTooltip}
                                onClick={(id) => navigate(`/warehouses/${id}`)}
                            />
                        );
                    })
                ) : (
                    <UnifiedCard
                        isEmpty={true}
                        emptyIcon={FaWarehouse}
                        emptyMessage="No warehouses found. Try adjusting your search filters or add a new warehouse"
                    />
                )}
            </div>

            {/* Assignment Modal */}
            {console.log('🟢 Rendering, showAssignmentModal:', showAssignmentModal, 'selectedWarehouse:', selectedWarehouse)}
            <AssignmentModal
                isOpen={showAssignmentModal}
                onClose={handleCloseAssignmentModal}
                selectedWarehouse={selectedWarehouse}
                warehouseEmployees={warehouseEmployees}
                onSuccess={handleAssignmentSuccess}
                showSnackbar={showSnackbar}
                showConfirmDialog={showConfirmDialog}
                hideConfirmDialog={hideConfirmDialog}
            />

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