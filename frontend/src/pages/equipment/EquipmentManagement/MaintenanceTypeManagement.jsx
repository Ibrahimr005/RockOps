import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import './EquipmentTypeManagement.scss';
import '../../../styles/form-validation.scss';

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
            console.error('Error saving maintenance type:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (err.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = err.response.data;
                    if (isInactive) {
                        // Show confirmation dialog to reactivate inactive maintenance type
                        showConfirmation(
                            `Maintenance type "${resourceName}" already exists but was previously deactivated. Would you like to reactivate it instead of creating a new one?`,
                            () => handleReactivateMaintenanceType(resourceName),
                            () => showError(`To create a new maintenance type, please choose a different name than "${resourceName}".`)
                        );
                    } else {
                        showError(`Maintenance type "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (err.response.data?.message?.includes('inactive') || err.response.data?.message?.includes('deleted')) {
                        showError(`Maintenance type "${formData.name}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Maintenance type "${formData.name}" already exists. Please choose a different name.`);
                    }
                }
            } else if (err.response?.status === 400) {
                // Validation errors
                const message = err.response.data?.message || 'Please check your input and try again';
                if (message.includes('name') || message.includes('Name')) {
                    showError(`Maintenance type name is invalid: ${message}`);
                } else {
                    showError(`Please check your input: ${message}`);
                }
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to save maintenance types. Please contact your administrator.');
            } else if (err.response?.status === 500) {
                showError('Server error occurred. Please try again later or contact support.');
            } else {
                // Fallback to enhanced error handlers for other cases
                if (editingMaintenanceType) {
                    errorHandlers.handleUpdateError(err);
                } else {
                    errorHandlers.handleCreateError(err);
                }
            }
        }
    };

    const handleReactivateMaintenanceType = async (maintenanceTypeName) => {
        try {
            // Use current form data for reactivation, or create default data
            const reactivationData = {
                name: formData.name || maintenanceTypeName,
                description: formData.description || `Reactivated maintenance type: ${maintenanceTypeName}`,
                active: true
            };
            
            // Call backend to reactivate the maintenance type with form data
            await maintenanceTypeService.reactivateByName(maintenanceTypeName, reactivationData);
            
            // Close modal and refresh data
            setShowModal(false);
            setFormData({ name: '', description: '', active: true });
            
            showSuccess(`Maintenance type "${maintenanceTypeName}" has been reactivated successfully with updated details.`);
            fetchMaintenanceTypes(); // Refresh the list
        } catch (error) {
            console.error('Error reactivating maintenance type:', error);
            showError(`Failed to reactivate maintenance type "${maintenanceTypeName}". Please try again or contact your administrator.`);
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
            sortable: true,
            filterType: 'text',
            exportFormatter: (value) => {
                // Sanitize name for export to prevent encoding issues
                if (!value) return '';
                
                const cleanValue = String(value)
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
                    .replace(/[\uFFFD]/g, '') // Remove replacement characters
                    .trim();
                
                return cleanValue;
            }
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            filterType: 'text',
            width: '250px',
            maxWidth: '250px',
            render: (row) => {
                const description = row.description || 'N/A';
                const maxLength = 80; // Character limit before truncation
                
                if (description === 'N/A' || description.length <= maxLength) {
                    return <span className="description-text">{description}</span>;
                }
                
                const truncated = description.substring(0, maxLength) + '...';
                return (
                    <span 
                        className="description-text truncated" 
                        title={description}
                        style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '230px'
                        }}
                    >
                        {truncated}
                    </span>
                );
            },
            exportFormatter: (value) => {
                // For Excel export, return the full description without truncation
                // Sanitize the value to prevent encoding issues
                if (!value) return '';
                
                // Convert to string and clean any problematic characters
                const cleanValue = String(value)
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
                    .replace(/[\uFFFD]/g, '') // Remove replacement characters
                    .trim();
                
                return cleanValue;
            }
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

    // Remove separate filterableColumns definition since we now use columns.filter(col => col.filterType)

    if (error) {
        return <div className="equipment-types-error">{error}</div>;
    }

    return (
        <div className="equipment-types-container">
            <PageHeader
                title="Maintenance Types"
                subtitle="Define and manage different types of maintenance activities"
            />

            <DataTable
                data={maintenanceTypes}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.filterType)}
                emptyMessage="No maintenance types found. Create your first maintenance type to get started."
                showAddButton={permissions.canCreate}
                addButtonText="Add Maintenance Type"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
                showExportButton={true}
                exportButtonText="Export Maintenance Types"
                exportFileName="maintenance_types"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'name': 'Maintenance Type Name',
                    'description': 'Description',
                    'active': 'Active Status'
                }}
                // Enforce column width limits and text wrapping for Excel export
                exportColumnWidths={{
                    'name': 25,
                    'description': 50,
                    'active': 15
                }}
                enableTextWrapping={true}
                preventTextOverflow={true}
                onExportStart={() => showSuccess("Preparing maintenance types export with optimized formatting...")}
                onExportComplete={(result) => showSuccess(`Successfully exported ${result.rowCount} maintenance types to Excel`)}
                onExportError={(error) => showError("Failed to export maintenance types")}
            />

            {/* Modal for adding/editing maintenance types */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingMaintenanceType ? 'Edit Maintenance Type' : 'Add Maintenance Type'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}>
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Name <span className="required-field">*</span></label>
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
                                    maxLength="1000"
                                    placeholder="Describe this maintenance type... (Max 1000 characters)"
                                />
                                <div className="character-counter">
                                    {formData.description.length}/1000 characters
                                </div>
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
                                <button type="submit" className="btn-primary">
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