import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import './EquipmentTypeManagement.scss';

const MaintenanceTypeManagement = () => {
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingMaintenanceType, setEditingMaintenanceType] = useState(null);
    const [deletingMaintenanceType, setDeletingMaintenanceType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        active: true
    });

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar, showConfirmation } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // Create error handlers for this component
    const errorHandlers = createErrorHandlers(showError, 'maintenance type');

    // Fetch all maintenance types
    const fetchMaintenanceTypes = async () => {
        try {
            setLoading(true);
            const response = await maintenanceTypeService.getAllForManagement();
            if (response.data) {
                // Filter to only show active maintenance types
                const activeMaintenanceTypes = response.data.filter(maintenanceType => maintenanceType.active);
                setMaintenanceTypes(activeMaintenanceTypes);
                
                if (activeMaintenanceTypes.length === 0) {
                    showInfo('No active maintenance types found. Add your first maintenance type!');
                }
            } else {
                // Initialize with empty array if no data
                setMaintenanceTypes([]);
                showInfo('No maintenance types found. Add your first maintenance type!');
            }
            setLoading(false);
        } catch (err) {
            errorHandlers.handleFetchError(err);
            setError('Failed to load maintenance types');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaintenanceTypes();
    }, []);

    const handleOpenModal = async (maintenanceType = null) => {
        if (maintenanceType) {
            setEditingMaintenanceType(maintenanceType);
            setFormData({
                name: maintenanceType.name,
                description: maintenanceType.description || '',
                active: maintenanceType.active
            });
        } else {
            setEditingMaintenanceType(null);
            setFormData({
                name: '',
                description: '',
                active: true
            });
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingMaintenanceType) {
                // Update existing maintenance type
                await maintenanceTypeService.update(editingMaintenanceType.id, formData);
                showSuccess(`Maintenance type "${formData.name}" updated successfully!`);
            } else {
                // Create new maintenance type
                await maintenanceTypeService.create(formData);
                showSuccess(`Maintenance type "${formData.name}" created successfully!`);
            }

            setShowModal(false);
            fetchMaintenanceTypes(); // Refresh the list
        } catch (err) {
            if (editingMaintenanceType) {
                errorHandlers.handleUpdateError(err);
            } else {
                errorHandlers.handleCreateError(err);
            }
        }
    };

    const confirmDelete = (maintenanceTypeId, maintenanceTypeName) => {
        showConfirmation(
            `Are you sure you want to delete "${maintenanceTypeName}"?`,
            () => performDelete(maintenanceTypeId, maintenanceTypeName),
            () => setDeletingMaintenanceType(null)
        );
    };

    const performDelete = async (maintenanceTypeId, maintenanceTypeName) => {
        try {
            await maintenanceTypeService.delete(maintenanceTypeId);
            showSuccess(`Maintenance type "${maintenanceTypeName}" has been deleted successfully`);
            fetchMaintenanceTypes(); // Refresh the list
        } catch (err) {
            console.error('Error deleting maintenance type:', err);
            showError(`Failed to delete maintenance type: ${err.response?.data?.message || err.message}`);
        } finally {
            setDeletingMaintenanceType(null);
        }
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true
        },
        {
            header: 'Description',
            accessor: 'description',
            body: (rowData) => rowData.description || 'No description',
            sortable: true
        },
        {
            header: 'Status',
            accessor: 'active',
            body: (rowData) => (
                <span className={`status-badge ${rowData.active ? 'active' : 'inactive'}`}>
                    {rowData.active ? 'Active' : 'Inactive'}
                </span>
            ),
            sortable: true
        }
    ];

    const actions = permissions.canEdit || permissions.canDelete ? [
        ...(permissions.canEdit ? [{
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleOpenModal(row),
            className: 'primary'
        }] : []),
        ...(permissions.canDelete ? [{
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => confirmDelete(row.id, row.name),
            className: 'danger'
        }] : [])
    ] : [];

    const filterableColumns = [
        { header: 'Name', accessor: 'name' },
        { header: 'Description', accessor: 'description' }
    ];

    if (error) {
        return <div className="equipment-types-error">{error}</div>;
    }

    return (
        <div className="equipment-types-container">
            <div className="equipment-types-header">
                <div className="header-left">
                    <h1>Maintenance Types</h1>
                    <p className="header-subtitle">Manage maintenance types that can be performed on equipment</p>
                </div>
                {permissions.canCreate && (
                    <button 
                        className="equipment-types-add-button" 
                        onClick={() => handleOpenModal()}
                    >
                        <FaPlus /> Add Maintenance Type
                    </button>
                )}
            </div>

            <DataTable
                data={maintenanceTypes}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Maintenance Types"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                emptyStateMessage="No maintenance types found. Create your first maintenance type to get started."
            />

            {/* Modal for adding/editing maintenance types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingMaintenanceType ? 'Edit Maintenance Type' : 'Add Maintenance Type'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Oil Change, Repair, Inspection"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Describe this maintenance type..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={formData.active}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            active: e.target.checked
                                        }))}
                                    />
                                    <span className="checkbox-text">Active</span>
                                </label>
                                <small className="form-help-text">
                                    Inactive maintenance types will not be available for selection
                                </small>
                            </div>

                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="save-button">
                                    {editingMaintenanceType ? 'Update' : 'Create'} Maintenance Type
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceTypeManagement; 