import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { equipmentBrandService } from '../../../services/equipmentBrandService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import './EquipmentTypeManagement.scss';
import '../../../styles/form-validation.scss';

const EquipmentBrandManagement = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [deletingBrand, setDeletingBrand] = useState(null);

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar, showConfirmation } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // Create error handlers for this component
    const errorHandlers = createErrorHandlers(showError, 'equipment brand');

    // Fetch all equipment brands
    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await equipmentBrandService.getAllEquipmentBrands();
            if (response.data) {
                setBrands(response.data);
            } else {
                // Initialize with empty array if no data
                setBrands([]);
                showInfo('No equipment brands found. Add your first brand!');
            }
            setLoading(false);
        } catch (err) {
            errorHandlers.handleFetchError(err);
            setError('Failed to load equipment brands');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const handleOpenModal = (brand = null) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData({
                name: brand.name,
                description: brand.description || ''
            });
        } else {
            setEditingBrand(null);
            setFormData({
                name: '',
                description: ''
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
            if (editingBrand) {
                await equipmentBrandService.updateEquipmentBrand(editingBrand.id, formData);
                showSuccess(`Equipment brand "${formData.name}" has been updated successfully`);
            } else {
                await equipmentBrandService.createEquipmentBrand(formData);
                showSuccess(`Equipment brand "${formData.name}" has been added successfully`);
            }

            setShowModal(false);
            fetchBrands(); // Refresh the list
        } catch (err) {
            console.error('Error saving equipment brand:', err);
            
            // Handle specific error cases
            if (err.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (err.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = err.response.data;
                    if (isInactive) {
                        showError(`Equipment brand "${resourceName}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment brand "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (err.response.data?.message?.includes('inactive') || err.response.data?.message?.includes('deleted')) {
                        showError(`Equipment brand "${formData.name}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment brand "${formData.name}" already exists. Please choose a different name.`);
                    }
                }
            } else if (err.response?.status === 400) {
                // Validation errors
                const message = err.response.data?.message || 'Please check your input and try again';
                if (message.includes('name') || message.includes('Name')) {
                    showError(`Brand name is invalid: ${message}`);
                } else {
                    showError(`Please check your input: ${message}`);
                }
            } else if (err.response?.status === 403) {
                showError('You don\'t have permission to save equipment brands. Please contact your administrator.');
            } else if (err.response?.status === 500) {
                showError('Server error occurred. Please try again later or contact support.');
            } else {
                // Fallback to enhanced error handlers for other cases
                if (editingBrand) {
                    errorHandlers.handleUpdateError(err);
                } else {
                    errorHandlers.handleCreateError(err);
                }
            }
        }
    };

    const confirmDelete = (brandId, brandName) => {
        showConfirmation(
            `Are you sure you want to delete "${brandName}"?`,
            () => performDelete(brandId, brandName),
            () => setDeletingBrand(null)
        );
    };

    const performDelete = async (brandId, brandName) => {
        try {
            await equipmentBrandService.deleteEquipmentBrand(brandId);
            showSuccess(`Equipment brand "${brandName}" has been deleted successfully`);
            fetchBrands(); // Refresh the list
        } catch (err) {
            console.error('Error deleting equipment brand:', err);
            showError(`Failed to delete equipment brand: ${err.response?.data?.message || err.message}`);
        } finally {
            setDeletingBrand(null);
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

    // Only show edit/delete actions if user has permissions
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

    if (error) {
        return <div className="equipment-types-error">{error}</div>;
    }

    return (
        <div className="equipment-types-container">
            <PageHeader
                title="Equipment Brands"
                subtitle="Manage equipment brands and manufacturers for your fleet"
            />

            <DataTable
                data={brands}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(col => col.filterType)}
                showAddButton={permissions.canCreate}
                addButtonText="Add Equipment Brand"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
                showExportButton={true}
                exportButtonText="Export Equipment Brands"
                exportFileName="equipment_brands"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'name': 'Brand Name',
                    'description': 'Description'
                }}
                // Enforce column width limits and text wrapping for Excel export
                exportColumnWidths={{
                    'name': 25,
                    'description': 50
                }}
                enableTextWrapping={true}
                preventTextOverflow={true}
                onExportStart={() => showSuccess("Preparing equipment brands export with optimized formatting...")}
                onExportComplete={(result) => showSuccess(`Successfully exported ${result.rowCount} equipment brands to Excel`)}
                onExportError={(error) => showError("Failed to export equipment brands")}
            />

            {/* Modal for adding/editing equipment brands */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingBrand ? 'Edit Equipment Brand' : 'Add Equipment Brand'}</h2>
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
                                    placeholder="Enter brand name (e.g., Caterpillar, Komatsu, John Deere)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    maxLength="1000"
                                    placeholder="Enter a description of this equipment brand... (Max 1000 characters)"
                                />
                                <div className="character-counter">
                                    {formData.description.length}/1000 characters
                                </div>
                            </div>
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                {(permissions.canCreate || permissions.canEdit) && (
                                    <button type="submit" className="btn-primary">
                                        {editingBrand ? 'Update' : 'Add'} Brand
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentBrandManagement; 