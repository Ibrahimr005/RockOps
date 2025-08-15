import React, {useEffect, useRef, useState} from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import {useTranslation} from 'react-i18next';
import {useAuth} from "../../../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Snackbar from "../../../../components/common/Snackbar/Snackbar";
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog";
import { siteService } from "../../../../services/siteService";
import { warehouseService } from "../../../../services/warehouseService";

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
    const findManagerName = (warehouse) => {
        if (warehouse.managerName) {
            return warehouse.managerName;
        }

        if (warehouse.employees && Array.isArray(warehouse.employees) && warehouse.employees.length > 0) {
            const manager = warehouse.employees.find(emp =>
                (emp.jobPosition && emp.jobPosition.positionName &&
                    emp.jobPosition.positionName.toLowerCase() === "warehouse manager") ||
                (emp.position && emp.position.toLowerCase() === "warehouse manager")
            );

            if (manager) {
                return `${manager.firstName} ${manager.lastName}`;
            }
        }

        return "No Manager";
    };

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
            const response = await siteService.getSiteWarehouses(siteId);
            const data = response.data;

            // Add this debug line
            console.log("Warehouse data from API:", data);

            if (Array.isArray(data)) {
                const transformedData = data.map((item, index) => {
                    // Add this debug line too
                    console.log("Individual warehouse:", item);

                    return {
                        conventionalId: `WH-${String(index + 1).padStart(3, '0')}`,
                        name: item.name,
                        warehouseID: item.id,
                        manager: findManagerName(item),
                        originalData: item
                    };
                });

                setWarehouseData(transformedData);
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
            setError(err.message);
            setWarehouseData([]);
            setLoading(false);
            setSnackbar({
                show: true,
                message: err.message,
                type: 'error'
            });
        }
    };

    const fetchEmployees = async () => {
        try {
            // Fetch managers
            const managersResponse = await siteService.getWarehouseManagers();
            const managersData = managersResponse.data;
            setManagers(managersData);

            // Fetch workers
            const workersResponse = await siteService.getWarehouseWorkers();
            const workersData = workersResponse.data;
            setWorkers(workersData);

            if (managersData.length === 0 && workersData.length === 0) {
                setSnackbar({
                    show: true,
                    message: 'No available managers or workers found',
                    type: 'info'
                });
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
            setFormError("Failed to load employee data. Please try again.");
            setSnackbar({
                show: true,
                message: 'Failed to load employee data',
                type: 'error'
            });
        }
    };

    const fetchEditManagers = async () => {
        try {
            const response = await siteService.getWarehouseManagers();
            setEditManagers(response.data || []);
        } catch (error) {
            console.error("Error fetching managers:", error);
            setSnackbar({
                show: true,
                message: 'Failed to load managers',
                type: 'error'
            });
            setEditManagers([]);
        }
    };

    // Handle opening the Add Warehouse modal
    const handleOpenAddModal = () => {
        setShowAddModal(true);
        setSelectedManager(null);
        setSelectedWorkers([]);
        setSelectedWorkerIds([]);
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
    const handleOpenEditModal = async (row) => {
        try {
            setEditPreviewImage(null);
            const warehouse = row.originalData;

            // Find current manager
            const currentManager = warehouse.employees?.find(
                (emp) => emp.jobPosition?.positionName?.toLowerCase() === "warehouse manager"
            );

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
            setShowEditModal(true);

            // Fetch managers for dropdown
            await fetchEditManagers();
        } catch (error) {
            console.error("Error opening edit modal:", error);
            setSnackbar({
                show: true,
                message: "Error opening edit form",
                type: 'error'
            });
        }
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

        try {
            const formDataToSend = new FormData();

            // Create warehouse data object
            const warehouseData = {
                name: editFormData.name,
                photoUrl: editFormData.photoUrl
            };

            // Add manager if selected
            if (editFormData.managerId) {
                warehouseData.managerId = editFormData.managerId;
            }

            formDataToSend.append("warehouseData", JSON.stringify(warehouseData));

            // Add photo if uploaded
            if (editFormData.photo) {
                formDataToSend.append("photo", editFormData.photo);
            }

            await warehouseService.update(editFormData.id, formDataToSend);

            // Refresh warehouse list
            fetchWarehouses();
            handleCloseEditModal();
            setSnackbar({
                show: true,
                message: "Warehouse updated successfully!",
                type: 'success'
            });

        } catch (error) {
            console.error("Failed to update warehouse:", error);
            setSnackbar({
                show: true,
                message: `Failed to update warehouse: ${error.message}`,
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
                message: "Warehouse deleted successfully!",
                type: 'success'
            });

        } catch (error) {
            console.error("Failed to delete warehouse:", error);
            hideConfirmDialog();
            setSnackbar({
                show: true,
                message: `Failed to delete warehouse: ${error.message}`,
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
        setIsSubmitting(true);
        setFormError(null);

        const formElements = event.currentTarget.elements;
        const formData = new FormData();

        const warehouseData = {
            name: formElements.name.value,
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
                message: 'Warehouse successfully added',
                type: 'success'
            });
        } catch (err) {
            console.error("Failed to add warehouse:", err.message);
            setFormError(`Failed to add warehouse: ${err.message}`);
            setSnackbar({
                show: true,
                message: `Failed to add warehouse: ${err.message}`,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowClick = (row) => {
        navigate(`/warehouses/warehouse-details/${row.warehouseID}`);
        setSnackbar({
            show: true,
            message: `Navigating to warehouse details: ${row.conventionalId}`,
            type: 'info'
        });
    };

    if (loading) return <div className="loading-container">{t('site.loadingWarehouses')}</div>;

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
                <div className="error-container">{error}</div>
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
                        tableTitle="Warehouses List"
                        onRowClick={handleRowClick}
                        rowClassName="clickable-row"
                        showAddButton={isSiteAdmin}
                        addButtonText="Add Warehouse"
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleOpenAddModal}
                        addButtonProps={{
                            className: 'assign-button',
                        }}
                        showExportButton={true}
                        exportButtonText="Export Warehouses"
                        exportFileName="site_warehouses"
                    />
                </div>
            )}

            {/* Add Warehouse Modal */}
            {showAddModal && (
                <div className="add-warehouse-modal-overlay">
                    <div className="add-warehouse-modal-content">
                        <div className="add-warehouse-modal-header">
                            <h2>Add New Warehouse</h2>
                            <button
                                className="add-warehouse-modal-close-button"
                                onClick={handleCloseAddModal}
                            >
                                ×
                            </button>
                        </div>

                        <div className="add-warehouse-modal-body">
                            <div className="add-warehouse-form-container">
                                <div className="add-warehouse-form-card">
                                    <div className="add-warehouse-profile-section">
                                        <label htmlFor="imageUpload" className="add-warehouse-image-upload-label">
                                            {previewImage ? (
                                                <img
                                                    src={previewImage}
                                                    alt="Warehouse"
                                                    className="add-warehouse-image-preview"
                                                />
                                            ) : (
                                                <div className="add-warehouse-image-placeholder"></div>
                                            )}
                                            <span className="add-warehouse-upload-text">
                                    {t('common.uploadPhoto')}
                                </span>
                                        </label>
                                        <input
                                            type="file"
                                            id="imageUpload"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                        />
                                    </div>

                                    <div className="add-warehouse-form-fields-section">
                                        {formError && (
                                            <div className="add-warehouse-form-error">{formError}</div>
                                        )}

                                        <form onSubmit={handleAddWarehouse}>
                                            <div className="add-warehouse-form-grid">
                                                <div className="add-warehouse-form-group">
                                                    <label>Warehouse Name</label>
                                                    <input type="text" name="name" required />
                                                </div>

                                                <div className="add-warehouse-form-group">
                                                    <label>Warehouse Manager</label>
                                                    <select
                                                        name="managerId"
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

                                                <div className="add-warehouse-form-group add-warehouse-workers-section">
                                                    <label>Warehouse Workers</label>
                                                    <div className="add-warehouse-workers-dropdown" ref={workersDropdownRef}>
                                                        <div
                                                            className="add-warehouse-dropdown-header"
                                                            onClick={toggleWorkersDropdown}
                                                        >
                                                            <span>Select Workers</span>
                                                            <span
                                                                className={`add-warehouse-dropdown-icon ${isWorkersDropdownOpen ? 'open' : ''}`}
                                                            >
                                                    ▼
                                                </span>
                                                        </div>

                                                        {isWorkersDropdownOpen && (
                                                            <div className="add-warehouse-dropdown-menu">
                                                                {workers
                                                                    .filter(worker => !selectedWorkerIds.includes(worker.id))
                                                                    .map(worker => (
                                                                        <div
                                                                            key={worker.id}
                                                                            className="add-warehouse-dropdown-item"
                                                                            onClick={() => handleSelectWorker(worker)}
                                                                        >
                                                                            {worker.firstName} {worker.lastName}
                                                                        </div>
                                                                    ))}
                                                                {workers.filter(worker => !selectedWorkerIds.includes(worker.id)).length === 0 && (
                                                                    <div className="add-warehouse-dropdown-item">
                                                                        No workers available
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {selectedWorkers.length > 0 && (
                                                        <div className="add-warehouse-workers-list">
                                                            {selectedWorkers.map(worker => (
                                                                <div key={worker.id} className="add-warehouse-worker-chip">
                                                                    <span>{worker.firstName} {worker.lastName}</span>
                                                                    <span
                                                                        className="add-warehouse-remove-worker"
                                                                        onClick={() => handleRemoveWorker(worker.id)}
                                                                    >
                                                            ×
                                                        </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="add-warehouse-form-actions">
                                                <button
                                                    type="button"
                                                    className="add-warehouse-cancel-button"
                                                    onClick={handleCloseAddModal}
                                                    disabled={isSubmitting}
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="add-warehouse-submit-button"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Adding...' : 'Add Warehouse'}
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

            {/* Edit Warehouse Modal */}
            {showEditModal && (
                <div className="warehouse-modal-overlay">
                    <div className="warehouse-modal-content">
                        <div className="warehouse-modal-header">
                            <h2>Edit Warehouse</h2>
                            <button className="warehouse-modal-close-button" onClick={handleCloseEditModal}>×</button>
                        </div>

                        <div className="warehouse-modal-body">
                            <div className="warehouse-form-container">
                                <div className="warehouse-form-card">
                                    <div className="warehouse-profile-section">
                                        <label htmlFor="warehouseEditImageUpload" className="warehouse-image-upload-label">
                                            {editPreviewImage ? (
                                                <img src={editPreviewImage} alt="Warehouse" className="warehouse-image-preview" />
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
                                            onChange={handleEditFileChange}
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
                                                        value={editFormData.name}
                                                        onChange={handleEditInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="warehouse-form-group">
                                                    <label>Warehouse Manager</label>
                                                    <select
                                                        name="managerId"
                                                        value={selectedEditManagerId}
                                                        onChange={handleEditInputChange}
                                                    >
                                                        <option value="">Select Manager</option>
                                                        {editManagers.map(manager => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.firstName} {manager.lastName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/*/!* Display current site as read-only info *!/*/}
                                                {/*<div className="warehouse-form-group">*/}
                                                {/*    <label>Current Site</label>*/}
                                                {/*    <div className="warehouse-readonly-field">*/}
                                                {/*        {currentSiteName || "Current Site"}*/}
                                                {/*    </div>*/}
                                                {/*</div>*/}
                                            </div>

                                            <div className="warehouse-form-actions">
                                                <button
                                                    type="button"
                                                    className="warehouse-cancel-button"
                                                    onClick={handleCloseEditModal}
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