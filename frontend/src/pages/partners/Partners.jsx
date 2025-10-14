// Partners.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSnackbar } from '../../contexts/SnackbarContext.jsx';
import { useTranslation } from 'react-i18next';
import './Partners.scss';
import { FaEdit, FaTrashAlt, FaUsers } from "react-icons/fa";
import DataTable from '../../components/common/DataTable/DataTable';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import ConfirmationDialog from '../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import { partnerService } from '../../services/partnerService.js';
import '../../styles/modal-styles.scss';

const Partners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPartner, setNewPartner] = useState({ firstName: '', lastName: '' });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });
    const [actionLoading, setActionLoading] = useState(false);

    const { currentUser } = useAuth();
    const { showSuccess, showError } = useSnackbar();
    const { t } = useTranslation();

    // Check if user is admin
    const isAdmin = currentUser && currentUser.role === 'ADMIN';

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const response = await partnerService.getAll();
            setPartners(response.data);
        } catch (err) {
            console.error('Error fetching partners:', err);
            setError(err.message);
            showError(t('partners.fetchError', 'Unable to load partners'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();

        try {
            setActionLoading(true);
            const response = await partnerService.add(newPartner.firstName, newPartner.lastName);
            setPartners([...partners, response.data]);
            setNewPartner({ firstName: '', lastName: '' });
            setShowAddModal(false);
            showSuccess(t('partners.addSuccess', 'Partner added successfully'));
        } catch (err) {
            console.error('Error adding partner:', err);
            showError(t('partners.addError', 'Failed to add partner'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPartner({
            ...newPartner,
            [name]: value
        });
    };

    const handleEditPartner = (partner) => {
        setEditingPartner({
            id: partner.id,
            firstName: partner.firstName,
            lastName: partner.lastName
        });
        setShowEditModal(true);
    };

    const handleUpdatePartner = async (e) => {
        e.preventDefault();

        try {
            setActionLoading(true);
            const response = await partnerService.update(
                editingPartner.id,
                editingPartner.firstName,
                editingPartner.lastName
            );

            // Update the partners list
            setPartners(partners.map(p =>
                p.id === editingPartner.id ? response.data : p
            ));

            setShowEditModal(false);
            setEditingPartner(null);
            showSuccess(t('partners.updateSuccess', 'Partner updated successfully'));
        } catch (err) {
            console.error('Error updating partner:', err);
            showError(t('partners.updateError', 'Failed to update partner'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingPartner({
            ...editingPartner,
            [name]: value
        });
    };

    const handleDeletePartner = (partner) => {
        // Check if this is Rock4Mining partner
        if (partner.firstName === 'Rock4Mining') {
            showError('Cannot delete the default Rock4Mining partner');
            return;
        }

        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Delete Partner',
            message: `Are you sure you want to delete partner "${partner.firstName} ${partner.lastName}"? This action cannot be undone.`,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await partnerService.delete(partner.id);
                    setPartners(partners.filter(p => p.id !== partner.id));
                    showSuccess(t('partners.deleteSuccess', 'Partner deleted successfully'));
                } catch (err) {
                    console.error('Error deleting partner:', err);

                    // Enhanced error message handling
                    let errorMessage = t('partners.deleteError', 'Failed to delete partner');
                    if (err.response?.data?.message) {
                        errorMessage = err.response.data.message;
                    } else if (err.message) {
                        errorMessage = err.message;
                    }

                    showError(errorMessage);
                } finally {
                    setActionLoading(false);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                }
            }
        });
    };

    const handleDialogCancel = () => {
        setConfirmDialog(prev => ({ ...prev, isVisible: false }));
    };

    if (error) return <div className="error">{t('common.error', 'Error')}: {error}</div>;

    const columns = [
        {
            header: 'ID',
            accessor: 'id',
            width: '80px'
        },
        {
            header: t('partners.firstName', 'First Name'),
            accessor: 'firstName'
        },
        {
            header: t('partners.lastName', 'Last Name'),
            accessor: 'lastName'
        }
    ];

    const actions = isAdmin ? [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: handleEditPartner,
            className: 'primary'
        },
        {
            label: 'Delete',
            icon: <FaTrashAlt />,
            onClick: handleDeletePartner,
            className: 'danger'
        }
    ] : [];

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            if (showAddModal) {
                setShowAddModal(false);
            } else if (showEditModal) {
                setShowEditModal(false);
                setEditingPartner(null);
            }
        }
    };

    return (
        <div className="partner-table-container">
            <PageHeader
                title="Partners"
                subtitle="Manage business partners and vendor relationships"
            />

            <DataTable
                data={partners}
                columns={columns}
                loading={loading}
                tableTitle=""
                showSearch={true}
                showFilters={true}
                filterableColumns={columns}
                actions={actions}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50, 100]}
                showAddButton={isAdmin}
                addButtonText={t('partners.addButton', 'Add Partner')}
                addButtonIcon={<FaUsers />}
                onAddClick={() => setShowAddModal(true)}
                showExportButton={true}
                exportFileName="partners"
                exportButtonText="Export Partners"
            />

            {/* Add Partner Modal */}
            {showAddModal && (
                <div className="modal-backdrop" onClick={handleOverlayClick}>
                    <div className="modal-container modal-md">
                        <div className="modal-header">
                            <h3>{t('partners.addTitle', 'Add New Partner')}</h3>
                            <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <form className="modal-body" onSubmit={handleAddPartner}>
                            <div className="form-group">
                                <label htmlFor="firstName">{t('partners.firstName', 'First Name')}</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={newPartner.firstName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={actionLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">{t('partners.lastName', 'Last Name')}</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={newPartner.lastName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={actionLoading}
                                />
                            </div>

                        </form>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-btn-secondary"
                                onClick={() => setShowAddModal(false)}
                                disabled={actionLoading}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn btn-success"
                                onClick={handleAddPartner}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        {t('common.adding', 'Adding...')}
                                    </>
                                ) : (
                                    t('common.add', 'Add')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Partner Modal */}
            {showEditModal && editingPartner && (
                <div className="modal-backdrop" onClick={handleOverlayClick}>
                    <div className="modal-container modal-md">
                        <div className="modal-header">
                            <h3>{t('partners.editTitle', 'Edit Partner')}</h3>
                            <button className="btn-close" onClick={() => {
                                setShowEditModal(false);
                                setEditingPartner(null);
                            }}>×</button>
                        </div>
                        <form className="modal-body" onSubmit={handleUpdatePartner}>
                            <div className="form-group">
                                <label htmlFor="editFirstName">{t('partners.firstName', 'First Name')}</label>
                                <input
                                    type="text"
                                    id="editFirstName"
                                    name="firstName"
                                    value={editingPartner.firstName}
                                    onChange={handleEditInputChange}
                                    required
                                    disabled={actionLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editLastName">{t('partners.lastName', 'Last Name')}</label>
                                <input
                                    type="text"
                                    id="editLastName"
                                    name="lastName"
                                    value={editingPartner.lastName}
                                    onChange={handleEditInputChange}
                                    required
                                    disabled={actionLoading}
                                />
                            </div>
                        </form>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-btn-secondary"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingPartner(null);
                                }}
                                disabled={actionLoading}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                onClick={handleUpdatePartner}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        {t('common.updating', 'Updating...')}
                                    </>
                                ) : (
                                    t('common.update', 'Update')
                                )}
                            </button>
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
                confirmText="Yes, Delete"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={handleDialogCancel}
                isLoading={actionLoading}
                size="medium"
            />
        </div>
    );
};

export default Partners;