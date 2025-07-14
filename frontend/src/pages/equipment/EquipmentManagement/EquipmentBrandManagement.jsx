import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { equipmentBrandService } from '../../../services/equipmentBrandService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import DataTable from '../../../components/common/DataTable/DataTable';
import './EquipmentTypeManagement.scss';

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
            if (editingBrand) {
                errorHandlers.handleUpdateError(err);
            } else {
                errorHandlers.handleCreateError(err);
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
            sortable: true
        },

        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row) => row.description || 'N/A'
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
            <DataTable
                data={brands}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Equipment Brands"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
                showAddButton={permissions.canCreate}
                addButtonText="Add Equipment Brand"
                addButtonIcon={<FaPlus />}
                onAddClick={() => handleOpenModal()}
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
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
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
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-primary--outline"
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