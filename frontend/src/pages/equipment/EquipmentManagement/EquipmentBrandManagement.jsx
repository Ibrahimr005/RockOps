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
        country: '',
        description: ''
    });
    const [deletingBrand, setDeletingBrand] = useState(null);

    // Use the snackbar context
    const { showSuccess, showError, showInfo, showWarning, showSnackbar, hideSnackbar } = useSnackbar();

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
                country: brand.country || '',
                description: brand.description || ''
            });
        } else {
            setEditingBrand(null);
            setFormData({
                name: '',
                country: '',
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
        // Store the brand to be deleted
        setDeletingBrand({ id: brandId, name: brandName });

        // Custom message with buttons
        const message = `Are you sure you want to delete "${brandName}"?`;

        // Show persistent confirmation warning that won't auto-hide
        showWarning(message, 0, true);

        // Create action buttons in the DOM
        setTimeout(() => {
            const snackbar = document.querySelector('.global-notification');
            if (snackbar) {
                // Create and append action buttons container
                const actionContainer = document.createElement('div');
                actionContainer.className = 'snackbar-actions';

                // Yes button
                const yesButton = document.createElement('button');
                yesButton.innerText = 'YES';
                yesButton.className = 'snackbar-action-button confirm';
                yesButton.onclick = () => {
                    performDelete(brandId, brandName);
                    hideSnackbar();
                };

                // No button
                const noButton = document.createElement('button');
                noButton.innerText = 'NO';
                noButton.className = 'snackbar-action-button cancel';
                noButton.onclick = () => {
                    setDeletingBrand(null);
                    hideSnackbar();
                };

                actionContainer.appendChild(yesButton);
                actionContainer.appendChild(noButton);
                snackbar.appendChild(actionContainer);
            }
        }, 100);
    };

    const performDelete = async (brandId, brandName) => {
        try {
            await equipmentBrandService.deleteEquipmentBrand(brandId);
            showSuccess(`Equipment brand "${brandName}" has been deleted successfully`);
            fetchBrands(); // Refresh the list
        } catch (err) {
            errorHandlers.handleDeleteError(err);
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
            header: 'Country',
            accessor: 'country',
            sortable: true
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true
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
            <div className="equipment-types-header">
                <h1>Equipment Brands</h1>
                {permissions.canCreate && (
                    <button
                        className="equipment-types-add-button"
                        onClick={() => handleOpenModal()}
                    >
                        <FaPlus /> Add Equipment Brand
                    </button>
                )}
            </div>

            <DataTable
                data={brands}
                columns={columns}
                loading={loading}
                actions={actions}
                tableTitle="Equipment Brands List"
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
            />

            {/* Modal for adding/editing equipment brands */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingBrand ? 'Edit Equipment Brand' : 'Add Equipment Brand'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
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
                                <label htmlFor="country">Country</label>
                                <input
                                    type="text"
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
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
                                    className="cancel-button"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                {(permissions.canCreate || permissions.canEdit) && (
                                    <button type="submit" className="submit-button">
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