// ========================================
// FILE: PaymentTypes.jsx
// Payment Types Management Page
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    FaPlus,
    FaCreditCard,
    FaUniversity,
    FaWallet,
    FaEdit,
    FaToggleOn,
    FaToggleOff,
    FaCheck,
    FaSpinner,
    FaCheckCircle,
    FaBan
} from 'react-icons/fa';
import DataTable from '../../../components/common/DataTable/DataTable';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import PageHeader from '../../../components/common/PageHeader/index.js';
import payrollService from '../../../services/payroll/payrollService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import StatisticsCards from '../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './PaymentTypes.scss';

const PaymentTypes = () => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // ========================================
    // STATE
    // ========================================
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        requiresBankDetails: false,
        requiresWalletDetails: false,
        isActive: true
    });
    const [saving, setSaving] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null
    });

    // ========================================
    // DATA LOADING
    // ========================================
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await payrollService.getAllPaymentTypes();
            const types = Array.isArray(response) ? response :
                (response?.data ? response.data :
                    (response?.content ? response.content : []));
            setPaymentTypes(types);
        } catch (error) {
            console.error('Error loading payment types:', error);
            showError(error.message || 'Failed to load payment types');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Scroll lock for inline modals
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    // ========================================
    // STATISTICS
    // ========================================
    const statistics = {
        total: paymentTypes.length,
        active: paymentTypes.filter(t => t.isActive !== false).length,
        inactive: paymentTypes.filter(t => t.isActive === false).length,
        withBank: paymentTypes.filter(t => t.requiresBankDetails).length,
        withWallet: paymentTypes.filter(t => t.requiresWalletDetails).length
    };

    // ========================================
    // MODAL HANDLERS
    // ========================================
    const openCreateModal = () => {
        setEditingType(null);
        setFormData({
            code: '',
            name: '',
            description: '',
            requiresBankDetails: false,
            requiresWalletDetails: false,
            isActive: true
        });
        setShowModal(true);
    };

    const openEditModal = (type) => {
        setEditingType(type);
        setFormData({
            code: type.code || '',
            name: type.name || '',
            description: type.description || '',
            requiresBankDetails: type.requiresBankDetails || false,
            requiresWalletDetails: type.requiresWalletDetails || false,
            isActive: type.isActive !== false
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingType(null);
        setFormData({
            code: '',
            name: '',
            description: '',
            requiresBankDetails: false,
            requiresWalletDetails: false,
            isActive: true
        });
    };

    // ========================================
    // FORM HANDLERS
    // ========================================
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code || !formData.name) {
            showWarning('Code and Name are required');
            return;
        }

        try {
            setSaving(true);

            if (editingType) {
                // Update existing
                await payrollService.updatePaymentType(editingType.id, formData);
                showSuccess(`Payment type "${formData.name}" updated successfully`);
            } else {
                // Create new
                await payrollService.createPaymentType(formData);
                showSuccess(`Payment type "${formData.name}" created successfully`);
            }

            closeModal();
            loadData();
        } catch (error) {
            console.error('Error saving payment type:', error);
            showError(error.message || 'Failed to save payment type');
        } finally {
            setSaving(false);
        }
    };

    // ========================================
    // ACTION HANDLERS
    // ========================================
    const handleToggleStatus = async (type) => {
        const isCurrentlyActive = type.isActive !== false;
        const action = isCurrentlyActive ? 'deactivate' : 'activate';

        setConfirmDialog({
            isVisible: true,
            type: isCurrentlyActive ? 'warning' : 'success',
            title: `${isCurrentlyActive ? 'Deactivate' : 'Activate'} Payment Type`,
            message: `Are you sure you want to ${action} "${type.name}"? ${isCurrentlyActive ? 'It will no longer be available for selection.' : 'It will become available for selection.'}`,
            onConfirm: async () => {
                try {
                    setProcessingId(type.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));

                    if (isCurrentlyActive) {
                        await payrollService.deactivatePaymentType(type.id);
                    } else {
                        await payrollService.activatePaymentType(type.id);
                    }

                    showSuccess(`Payment type "${type.name}" ${action}d successfully`);
                    loadData();
                } catch (error) {
                    console.error(`Error ${action}ing payment type:`, error);
                    showError(error.message || `Failed to ${action} payment type`);
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleDeactivate = (type) => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Deactivate Payment Type',
            message: `Are you sure you want to deactivate "${type.name}"? It will no longer be available for selection.`,
            onConfirm: async () => {
                try {
                    setProcessingId(type.id);
                    setConfirmDialog(prev => ({ ...prev, isVisible: false }));
                    await payrollService.deactivatePaymentType(type.id);
                    showSuccess(`Payment type "${type.name}" deactivated`);
                    loadData();
                } catch (error) {
                    console.error('Error deactivating payment type:', error);
                    showError(error.message || 'Failed to deactivate payment type');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    // ========================================
    // TABLE COLUMNS
    // ========================================
    const columns = [
        {
            accessor: 'code',
            header: 'Code',
            sortable: true,
            filterable: true,
            render: (row) => (
                <span className="payment-type-code">{row.code}</span>
            )
        },
        {
            accessor: 'name',
            header: 'Name',
            sortable: true,
            filterable: true,
            render: (row) => (
                <div className="payment-type-name-cell">
                    <div className="type-icon">
                        {row.requiresBankDetails ? <FaUniversity /> :
                            row.requiresWalletDetails ? <FaWallet /> :
                                <FaCreditCard />}
                    </div>
                    <span className="type-name">{row.name}</span>
                </div>
            )
        },
        {
            accessor: 'description',
            header: 'Description',
            sortable: false,
            render: (row) => (
                <span className="payment-type-description">
                    {row.description || '-'}
                </span>
            )
        },
        {
            accessor: 'requirements',
            header: 'Requirements',
            sortable: false,
            render: (row) => (
                <div className="requirements-cell">
                    {row.requiresBankDetails && (
                        <span className="requirement-badge bank">
                            <FaUniversity /> Bank
                        </span>
                    )}
                    {row.requiresWalletDetails && (
                        <span className="requirement-badge wallet">
                            <FaWallet /> Wallet
                        </span>
                    )}
                    {!row.requiresBankDetails && !row.requiresWalletDetails && (
                        <span className="requirement-badge none">None</span>
                    )}
                </div>
            )
        },
        {
            accessor: 'isActive',
            header: 'Status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row) => (
                <span className={`status-badge ${row.isActive !== false ? 'active' : 'inactive'}`}>
                    {row.isActive !== false ? (
                        <><FaCheckCircle /> Active</>
                    ) : (
                        <><FaBan /> Inactive</>
                    )}
                </span>
            )
        }
    ];

    // ========================================
    // TABLE ACTIONS
    // ========================================
    const actions = [
        {
            label: 'Edit',
            icon: <FaEdit />,
            onClick: openEditModal,
            className: 'action-edit'
        },
        {
            label: (row) => row.isActive !== false ? 'Deactivate' : 'Activate',
            icon: (row) => processingId === row.id ? <FaSpinner className="spin" /> :
                row.isActive !== false ? <FaToggleOff /> : <FaToggleOn />,
            onClick: handleToggleStatus,
            isDisabled: (row) => processingId === row.id,
            className: (row) => row.isActive !== false ? 'action-deactivate' : 'action-activate'
        }
    ];

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="payment-types-page">
            {/* Header */}
            <PageHeader
                title="Payment Types"
                subtitle="Manage payment methods for employee salaries and disbursements"
            />

            {/* Statistics Cards */}
            <StatisticsCards
                cards={[
                    { icon: <FaCreditCard />, label: "Total Types", value: statistics.total, variant: "total" },
                    { icon: <FaCheckCircle />, label: "Active", value: statistics.active, variant: "active" },
                    { icon: <FaBan />, label: "Inactive", value: statistics.inactive, variant: "danger" },
                    { icon: <FaUniversity />, label: "Bank Transfer", value: statistics.withBank, variant: "info" },
                    { icon: <FaWallet />, label: "Mobile Wallet", value: statistics.withWallet, variant: "purple" },
                ]}
                columns={5}
            />

            {/* Data Table */}
            <DataTable
                data={paymentTypes}
                columns={columns}
                loading={loading}
                emptyMessage="No payment types found. Create your first payment type to get started."

                showSearch={true}
                showFilters={true}
                filterableColumns={columns.filter(c => c.filterable)}

                actions={actions}
                actionsColumnWidth="160px"

                showAddButton={true}
                addButtonText="New Payment Type"
                addButtonIcon={<FaPlus />}
                onAddClick={openCreateModal}

                showExportButton={true}
                exportFileName="payment-types-export"

                defaultItemsPerPage={10}
                itemsPerPageOptions={[10, 25, 50]}
                defaultSortField="name"
                defaultSortDirection="asc"

                className="payment-types-table"
            />

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="payment-type-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <FaCreditCard />
                                {editingType ? 'Edit Payment Type' : 'Create Payment Type'}
                            </h3>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>
                                        Code <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            code: e.target.value.toUpperCase().replace(/\s+/g, '_')
                                        }))}
                                        placeholder="e.g., BANK_TRANSFER"
                                        maxLength={50}
                                        disabled={editingType}
                                    />
                                    <span className="hint">Unique identifier (uppercase, underscores allowed)</span>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Bank Transfer"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Brief description of this payment method"
                                        rows={3}
                                    />
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="requiresBankDetails"
                                            checked={formData.requiresBankDetails}
                                            onChange={handleInputChange}
                                        />
                                        <FaUniversity />
                                        <span>Requires Bank Details</span>
                                    </label>
                                    <span className="hint">
                                        Employees will need to provide bank account information
                                    </span>
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="requiresWalletDetails"
                                            checked={formData.requiresWalletDetails}
                                            onChange={handleInputChange}
                                        />
                                        <FaWallet />
                                        <span>Requires Wallet Details</span>
                                    </label>
                                    <span className="hint">
                                        Employees will need to provide mobile wallet number
                                    </span>
                                </div>

                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                        <FaCheckCircle />
                                        <span>Active</span>
                                    </label>
                                    <span className="hint">
                                        Inactive payment types won't be available for selection
                                    </span>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={saving || !formData.code || !formData.name}
                                >
                                    {saving ? (
                                        <>
                                            <FaSpinner className="spin" />
                                            Saving...
                                        </>
                                    ) : editingType ? (
                                        <>
                                            <FaCheck />
                                            Update
                                        </>
                                    ) : (
                                        <>
                                            <FaPlus />
                                            Create
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
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
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default PaymentTypes;
