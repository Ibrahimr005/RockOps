import React, { useState, useEffect, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import contactTypeService from '../../../services/contactTypeService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { createErrorHandlers } from '../../../utils/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';
import { ROLES } from '../../../utils/roles';
import DataTable from '../../../components/common/DataTable/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import '../../../styles/modal-styles.scss';
import '../../../styles/form-validation.scss';
import './ContactTypeManagement.scss';

const ContactTypeManagement = () => {
    const [contactTypes, setContactTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingContactType, setEditingContactType] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isActive: true
    });
    
    // Confirmation dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [contactTypeToDelete, setContactTypeToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showSuccess, showError, showInfo, showConfirmation } = useSnackbar();
    const { currentUser } = useAuth();

    // Create error handlers for this component
    const errorHandlers = createErrorHandlers(showError, 'contact type');

    // Check permissions (maintenance managers and admins)
    // Handle both 'role' (singular) and 'roles' (plural) properties
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const hasManagementAccess = userRoles.some(role => 
        [ROLES.ADMIN, ROLES.MAINTENANCE_MANAGER].includes(role)
    );

    // Debug logging removed - permission issue resolved

    // Fetch all contact types
    const fetchContactTypes = async () => {
        try {
            setLoading(true);
            const response = await contactTypeService.getAllContactTypesForManagement();
            
            // Admin sees all contact types, others see only active ones
            const isAdmin = userRoles.includes(ROLES.ADMIN);
            const filteredContactTypes = isAdmin ? response : response.filter(contactType => contactType.isActive);

            // Transform contact types to include computed fields for export
            const transformedContactTypes = filteredContactTypes.map(contactType => ({
                ...contactType,
                statusText: contactType.isActive ? 'Active' : 'Inactive'
            }));

            setContactTypes(transformedContactTypes);
            
            if (filteredContactTypes.length === 0) {
                showInfo(isAdmin ? 'No contact types found. Add your first contact type!' : 'No active contact types found.');
            }
            setLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
            
            // Extract the actual error message from the backend
            let errorMessage = 'An error occurred';
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data) {
                errorMessage = typeof err.response.data === 'string' ? err.response.data : err.response.data.error || 'Server error occurred';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            showError(`Failed to load contact types: ${errorMessage}`);
            setError(`Failed to load contact types: ${errorMessage}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContactTypes();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Open modal for creating new contact type
    const handleCreate = () => {
        setEditingContactType(null);
        setFormData({
            name: '',
            description: '',
            isActive: true
        });
        setShowModal(true);
    };

    // Open modal for editing existing contact type
    const handleEdit = (contactType) => {
        setEditingContactType(contactType);
        setFormData({
            name: contactType.name || '',
            description: contactType.description || '',
            isActive: contactType.isActive !== false
        });
        setShowModal(true);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            showError('Contact type name is required');
            return;
        }

        try {
            if (editingContactType) {
                await contactTypeService.updateContactType(editingContactType.id, formData);
                showSuccess('Contact type updated successfully');
            } else {
                await contactTypeService.createContactType(formData);
                showSuccess('Contact type created successfully');
            }
            
            setShowModal(false);
            fetchContactTypes();
        } catch (err) {
            console.error('Form submission error:', err);
            
            // Extract the actual error message from the backend
            let errorMessage = 'An error occurred';
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data) {
                errorMessage = typeof err.response.data === 'string' ? err.response.data : err.response.data.error || 'Server error occurred';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            // Handle specific error cases
            if (err.response?.status === 409 || errorMessage.toLowerCase().includes('already exists')) {
                // Show the detailed backend message which explains case-insensitive matching
                showError(errorMessage);
            } else if (err.response?.status === 404) {
                showError('Contact type not found. It may have been deleted by another user.');
            } else if (err.response?.status === 400) {
                showError(`Invalid data: ${errorMessage}`);
            } else if (err.response?.status === 500) {
                showError(`Server error: ${errorMessage}`);
            } else {
                showError(`Failed to ${editingContactType ? 'update' : 'create'} contact type: ${errorMessage}`);
            }
        }
    };

    // Handle delete - open confirmation dialog
    const handleDelete = (contactType) => {
        setContactTypeToDelete(contactType);
        setShowDeleteDialog(true);
    };


    // Handle confirmed delete (permanent deletion for admin)
    const handleConfirmDelete = async () => {
        if (!contactTypeToDelete) return;

        try {
            setIsDeleting(true);
            await contactTypeService.deleteContactType(contactTypeToDelete.id);
            showSuccess('Contact type permanently deleted');
            fetchContactTypes();
            setShowDeleteDialog(false);
            setContactTypeToDelete(null);
        } catch (err) {
            console.error('Delete error:', err);
            
            // Extract the actual error message from the backend
            let errorMessage = 'An error occurred';
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data) {
                errorMessage = typeof err.response.data === 'string' ? err.response.data : err.response.data.error || 'Server error occurred';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            showError(`Failed to delete contact type: ${errorMessage}`);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle cancel delete
    const handleCancelDelete = () => {
        setShowDeleteDialog(false);
        setContactTypeToDelete(null);
        setIsDeleting(false);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingContactType(null);
        setFormData({
            name: '',
            description: '',
            isActive: true
        });
    };

    // Export is now handled by DataTable component's built-in functionality

    // Table columns configuration
    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            sortable: true,
            render: (row) => (
                <div className="contact-type-name">
                    <FaUsers className="contact-type-icon" />
                    <span>{row.name}</span>
                </div>
            )
        },
        {
            header: 'Description',
            accessor: 'description',
            sortable: true,
            render: (row) => (
                <span className="contact-type-description">
                    {row.description || 'N/A'}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: 'statusText',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <div className="action-buttons">
                    {hasManagementAccess && (
                        <>
                            <button
                                className="rockops-table__action-button primary"
                                onClick={() => handleEdit(row)}
                                title="Edit Contact Type"
                            >
                                <FaEdit />
                            </button>
                            <button
                                className="rockops-table__action-button danger"
                                onClick={() => handleDelete(row)}
                                title="Delete Contact Type"
                            >
                                <FaTrash />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    // Custom dropdown filters
    const [statusFilter, setStatusFilter] = useState('all');
    
    const customFilters = [
        {
            label: 'Status',
            component: (
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                </select>
            )
        }
    ];

    // Apply status filter to data
    const filteredData = useMemo(() => {
        if (statusFilter === 'all') return contactTypes;
        if (statusFilter === 'active') return contactTypes.filter(ct => ct.isActive);
        if (statusFilter === 'inactive') return contactTypes.filter(ct => !ct.isActive);
        return contactTypes;
    }, [contactTypes, statusFilter]);

    if (!hasManagementAccess) {
        return (
            <div className="contact-type-management">
                <PageHeader 
                    title="Contact Types" 
                    subtitle="Manage different types of contacts"
                    icon={<FaUsers />}
                />
                <div className="access-denied">
                    <p>You don't have permission to manage contact types.</p>
                    <p>Contact your administrator for access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contact-type-management">
            <PageHeader 
                title="Contact Types" 
                subtitle="Manage different types of contacts"
                icon={<FaUsers />}
            />

            <div className="contact-type-content">
                <DataTable
                    data={filteredData}
                    columns={columns}
                    loading={loading}
                    error={error}
                    showAddButton={true}
                    onAddClick={handleCreate}
                    addButtonText="Add Contact Type"
                    addButtonIcon={<FaPlus />}
                    showExportButton={true}
                    exportButtonText="Export Contact Types"
                    exportFileName="contact-types"
                    onExportStart={() => console.log('Export started')}
                    onExportComplete={() => showSuccess('Contact types exported successfully')}
                    onExportError={(error) => showError('Failed to export contact types')}
                    emptyMessage="No contact types found. Create your first contact type!"
                    customFilters={customFilters}
                    searchPlaceholder="Search contact types..."
                />
            </div>

            {/* Modal for Create/Edit Contact Type */}
            {showModal && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <FaUsers />
                                <span>{editingContactType ? 'Edit Contact Type' : 'New Contact Type'}</span>
                            </div>
                            <button className="modal-close" onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleSubmit} className="contact-type-form" id="contact-type-form">
                                <div className="form-group">
                                    <label htmlFor="name" data-required="true">Contact Type Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter contact type name (e.g., Technician, Supervisor)"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Enter a description for this contact type"
                                        rows="3"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                        <span className="checkmark"></span>
                                        Active Contact Type
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" form="contact-type-form">
                                {editingContactType ? 'Update Contact Type' : 'Create Contact Type'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Delete */}
            <ConfirmationDialog
                isVisible={showDeleteDialog}
                type="delete"
                size="medium"
                title="Delete Contact Type"
                message={`Are you sure you want to delete the contact type "${contactTypeToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                isLoading={isDeleting}
            />
        </div>
    );
};

export default ContactTypeManagement;
