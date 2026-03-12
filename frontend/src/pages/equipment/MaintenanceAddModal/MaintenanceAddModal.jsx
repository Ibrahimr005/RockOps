// MaintenanceAddModal.jsx
import React, { useState, useEffect } from 'react';
import { FaLink, FaUnlink, FaChevronDown, FaChevronUp, FaEye, FaCheck } from 'react-icons/fa';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { transactionService } from '../../../services/transaction/transactionService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { Button, CloseButton } from '../../../components/common/Button';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import './MaintenanceAddModal.scss';
import '../../../styles/form-validation.scss';

const MaintenanceAddModal = ({
    isOpen,
    onClose,
    equipmentId,
    onMaintenanceAdded,
    editingMaintenance = null
}) => {
    const [formData, setFormData] = useState({
        technicianId: '',
        maintenanceDate: '',
        maintenanceTypeId: '',
        description: '',
        status: 'IN_PROGRESS'
    });

    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Linked transactions state
    const [availableTransactions, setAvailableTransactions] = useState([]);
    const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
    const [alreadyLinkedTransactions, setAlreadyLinkedTransactions] = useState([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [isTransactionSectionOpen, setIsTransactionSectionOpen] = useState(false);

    // Maintenance type creation modal state
    const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
    const [newMaintenanceTypeData, setNewMaintenanceTypeData] = useState({ name: '', description: '', active: true });
    const [creatingMaintenanceType, setCreatingMaintenanceType] = useState(false);
    const [confirmationState, setConfirmationState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Dirty state tracking
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const { showSuccess, showWarning, showError } = useSnackbar();

    const isEditing = !!editingMaintenance;

    // Format date for datetime-local input
    const formatDateForInput = (date) => {
        if (!date) return '';

        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    useEffect(() => {
        if (isOpen) {
            if (isEditing && editingMaintenance) {
                setFormData({
                    technicianId: editingMaintenance.technicianId || '',
                    maintenanceDate: formatDateForInput(editingMaintenance.maintenanceDate),
                    maintenanceTypeId: editingMaintenance.maintenanceTypeId || '',
                    description: editingMaintenance.description || '',
                    status: editingMaintenance.status || 'IN_PROGRESS'
                });
                // For editing, load already-linked transactions
                if (editingMaintenance.relatedTransactions) {
                    setAlreadyLinkedTransactions(editingMaintenance.relatedTransactions);
                }
            } else {
                setFormData({
                    technicianId: '',
                    maintenanceDate: formatDateForInput(new Date()),
                    maintenanceTypeId: '',
                    description: '',
                    status: 'IN_PROGRESS'
                });
                setAlreadyLinkedTransactions([]);
            }

            setError(null);
            setSelectedTransactionIds([]);
            setIsFormDirty(false);

            fetchTechnicians();
            fetchMaintenanceTypes();
            fetchAvailableTransactions();

            // Auto-expand transaction section for editing IN_PROGRESS maintenance
            if (isEditing && editingMaintenance?.status === 'IN_PROGRESS') {
                setIsTransactionSectionOpen(true);
            } else {
                setIsTransactionSectionOpen(false);
            }
        }
    }, [isOpen, editingMaintenance, isEditing]);

    // Handle body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const fetchTechnicians = async () => {
        try {
            const response = await inSiteMaintenanceService.getTechnicians(equipmentId);
            const employeesList = response.data || [];
            setTechnicians(employeesList);

            if (employeesList.length === 0) {
                showWarning('No employees found for this equipment\'s site.');
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setTechnicians([]);
            showWarning('Unable to load employees. Please try again.');
        }
    };

    const fetchMaintenanceTypes = async () => {
        try {
            const response = await maintenanceTypeService.getAll();
            setMaintenanceTypes(response.data);
        } catch (error) {
            console.error('Error fetching maintenance types:', error);
        }
    };

    // Fetch accepted MAINTENANCE transactions for this equipment that are not linked to any maintenance record
    const fetchAvailableTransactions = async () => {
        setIsLoadingTransactions(true);
        try {
            const response = await transactionService.getTransactionsForEquipment(equipmentId);
            const allTransactions = response.data || response || [];

            // Filter: accepted + MAINTENANCE purpose + not linked to any maintenance record
            const unlinked = allTransactions.filter(t =>
                t.status === 'ACCEPTED' &&
                t.purpose === 'MAINTENANCE' &&
                !t.maintenanceId
            );

            setAvailableTransactions(unlinked);

            // Auto-expand if there are available transactions
            if (unlinked.length > 0 && !isEditing) {
                setIsTransactionSectionOpen(true);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setAvailableTransactions([]);
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    const handleInputChange = (e) => {
        setIsFormDirty(true);
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const toggleTransactionSelection = (transactionId) => {
        setIsFormDirty(true);
        setSelectedTransactionIds(prev =>
            prev.includes(transactionId)
                ? prev.filter(id => id !== transactionId)
                : [...prev, transactionId]
        );
    };

    // Maintenance type creation functions
    const handleMaintenanceTypeChange = (e) => {
        const { value } = e.target;
        if (value === 'add_new') {
            setShowMaintenanceTypeModal(true);
        } else {
            handleInputChange(e);
        }
    };

    const handleNewMaintenanceTypeInputChange = (e) => {
        const { name, value } = e.target;
        setNewMaintenanceTypeData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleReactivateMaintenanceType = async (maintenanceTypeName) => {
        try {
            const response = await maintenanceTypeService.reactivateByName(maintenanceTypeName, newMaintenanceTypeData);

            const typesResponse = await maintenanceTypeService.getAll();
            setMaintenanceTypes(typesResponse.data);

            setFormData(prev => ({
                ...prev,
                maintenanceTypeId: response.data.id
            }));

            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });
            showSuccess(`Maintenance type "${maintenanceTypeName}" has been reactivated and selected.`);
        } catch (error) {
            console.error('Error reactivating maintenance type:', error);
            showError(`Failed to reactivate maintenance type "${maintenanceTypeName}".`);
        }
    };

    const handleCreateMaintenanceType = async (e) => {
        e.preventDefault();
        if (!newMaintenanceTypeData.name.trim()) {
            showError('Maintenance type name is required');
            return;
        }

        setCreatingMaintenanceType(true);
        try {
            const response = await maintenanceTypeService.create(newMaintenanceTypeData);
            const newMaintenanceType = response.data;

            setMaintenanceTypes(prev => [...prev, newMaintenanceType]);
            setFormData(prev => ({
                ...prev,
                maintenanceTypeId: newMaintenanceType.id
            }));

            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });
            showSuccess(`Maintenance type "${newMaintenanceType.name}" created and selected`);
        } catch (error) {
            console.error('Error creating maintenance type:', error);

            if (error.response?.status === 409) {
                if (error.response.data?.isInactive) {
                    setConfirmationState({
                        isOpen: true,
                        title: 'Reactivate Maintenance Type',
                        message: `Maintenance type "${error.response.data.resourceName}" already exists but was deactivated. Would you like to reactivate it?`,
                        onConfirm: () => handleReactivateMaintenanceType(error.response.data.resourceName)
                    });
                } else {
                    showError(`Maintenance type "${newMaintenanceTypeData.name.trim()}" already exists.`);
                }
            } else if (error.response?.status === 400) {
                showError(`Invalid maintenance type name: ${error.response.data?.message || 'Please check your input'}`);
            } else if (error.response?.status === 403) {
                showError('You don\'t have permission to create maintenance types.');
            } else {
                showError(`Failed to create maintenance type: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setCreatingMaintenanceType(false);
        }
    };

    const handleCancelMaintenanceTypeCreation = () => {
        setShowMaintenanceTypeModal(false);
        setNewMaintenanceTypeData({ name: '', description: '', active: true });
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    // Format date for display in transaction cards
    const formatTransactionDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        }).format(new Date(dateString));
    };

    // Create or update maintenance record, then link selected transactions
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let maintenanceResponse;

            if (isEditing) {
                maintenanceResponse = await inSiteMaintenanceService.update(
                    equipmentId,
                    editingMaintenance.id,
                    formData
                );
            } else {
                maintenanceResponse = await inSiteMaintenanceService.create(equipmentId, formData);
            }

            const maintenanceId = maintenanceResponse.data?.maintenance?.id || maintenanceResponse.data?.id;

            // Link selected transactions to the maintenance record
            if (selectedTransactionIds.length > 0 && maintenanceId) {
                const linkPromises = selectedTransactionIds.map(transactionId =>
                    inSiteMaintenanceService.linkTransaction(equipmentId, maintenanceId, transactionId)
                );

                try {
                    await Promise.all(linkPromises);
                    showSuccess(`${selectedTransactionIds.length} transaction${selectedTransactionIds.length > 1 ? 's' : ''} linked to maintenance record`);
                } catch (linkError) {
                    console.error('Error linking transactions:', linkError);
                    showWarning('Maintenance record saved but some transactions could not be linked. You can link them later.');
                }
            }

            const successMessage = isEditing
                ? "Maintenance record updated successfully"
                : "Maintenance record created successfully";

            showSuccess(successMessage);

            if (onMaintenanceAdded) {
                onMaintenanceAdded();
            }
            onClose();
        } catch (error) {
            console.error("Error saving maintenance:", error);

            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else if (error.message) {
                setError(error.message);
            } else {
                setError(`Failed to ${isEditing ? 'update' : 'create'} maintenance record`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    return (
        <div className="maintenance-modal-backdrop" onClick={handleOverlayClick}>
            <div className="maintenance-modal">
                <div className="maintenance-modal-header">
                    <h2>{isEditing ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</h2>
                    <CloseButton onClick={handleCloseAttempt} />
                </div>

                <form onSubmit={handleSubmit} className="maintenance-form">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-section">
                        <h3>Maintenance Details</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Assigned Employee</label>
                                <select
                                    name="technicianId"
                                    value={formData.technicianId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">
                                        {technicians.length === 0 ? 'No employees available' : 'Select Employee'}
                                    </option>
                                    {technicians.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.firstName} {employee.lastName} - {employee.jobPosition?.positionName || 'No Position'}
                                        </option>
                                    ))}
                                </select>
                                {technicians.length === 0 && (
                                    <small className="form-helper-text warning">
                                        No employees found for this equipment's site.
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Maintenance Date</label>
                                <input
                                    type="datetime-local"
                                    name="maintenanceDate"
                                    value={formData.maintenanceDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Maintenance Type</label>
                                <select
                                    name="maintenanceTypeId"
                                    value={formData.maintenanceTypeId}
                                    onChange={handleMaintenanceTypeChange}
                                    required
                                >
                                    <option value="">Select Maintenance Type</option>
                                    {maintenanceTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                    <option value="add_new" className="add-new-option">
                                        + Add New Maintenance Type
                                    </option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                placeholder="Describe the maintenance being performed..."
                            />
                            <div className="character-count" style={{
                                textAlign: 'right',
                                fontSize: '0.8rem',
                                color: '#6c757d',
                                marginTop: '4px'
                            }}>
                                {formData.description.length} characters
                            </div>
                        </div>
                    </div>

                    {/* Linked Transactions Section */}
                    <div className="form-section">
                        <div
                            className="maintenance-linked-transactions-header"
                            onClick={() => setIsTransactionSectionOpen(!isTransactionSectionOpen)}
                        >
                            <div className="maintenance-linked-transactions-title">
                                <FaLink />
                                <h3>Linked Transactions</h3>
                                {availableTransactions.length > 0 && (
                                    <span className="maintenance-linked-transactions-badge">
                                        {availableTransactions.length} available
                                    </span>
                                )}
                                {selectedTransactionIds.length > 0 && (
                                    <span className="maintenance-linked-transactions-selected-badge">
                                        {selectedTransactionIds.length} selected
                                    </span>
                                )}
                            </div>
                            {isTransactionSectionOpen ? <FaChevronUp /> : <FaChevronDown />}
                        </div>

                        {isTransactionSectionOpen && (
                            <div className="maintenance-linked-transactions-content">
                                <p className="section-description">
                                    Link accepted maintenance transactions to this record. These are transactions that were validated through the Transaction Hub with a maintenance purpose.
                                </p>

                                {/* Already linked transactions (for editing) */}
                                {alreadyLinkedTransactions.length > 0 && (
                                    <div className="maintenance-linked-existing">
                                        <h4>Currently Linked</h4>
                                        <div className="maintenance-transaction-list">
                                            {alreadyLinkedTransactions.map(transaction => (
                                                <div key={transaction.id} className="maintenance-transaction-card linked">
                                                    <div className="maintenance-transaction-card-header">
                                                        <span className="maintenance-transaction-batch">
                                                            Batch #{transaction.batchNumber}
                                                        </span>
                                                        <span className="maintenance-transaction-status linked">
                                                            <FaCheck /> Linked
                                                        </span>
                                                    </div>
                                                    <div className="maintenance-transaction-card-details">
                                                        <span>From: {transaction.senderName || 'Unknown'}</span>
                                                        <span>{formatTransactionDate(transaction.transactionDate || transaction.createdAt)}</span>
                                                    </div>
                                                    {transaction.items && (
                                                        <div className="maintenance-transaction-items-summary">
                                                            {transaction.items.map((item, idx) => (
                                                                <span key={idx} className="maintenance-transaction-item-tag">
                                                                    {item.itemTypeName || 'Item'} x{item.equipmentReceivedQuantity || item.quantity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Available unlinked transactions */}
                                {isLoadingTransactions ? (
                                    <div className="maintenance-transactions-loading">
                                        Loading available transactions...
                                    </div>
                                ) : availableTransactions.length === 0 ? (
                                    <div className="maintenance-transactions-empty">
                                        <FaUnlink />
                                        <p>No unlinked maintenance transactions available.</p>
                                        <small>
                                            Transactions must be accepted through the Transaction Hub with a "Maintenance" purpose before they can be linked here.
                                        </small>
                                    </div>
                                ) : (
                                    <div className="maintenance-available-transactions">
                                        <h4>Available to Link</h4>
                                        <div className="maintenance-transaction-list">
                                            {availableTransactions.map(transaction => {
                                                const isSelected = selectedTransactionIds.includes(transaction.id);
                                                return (
                                                    <div
                                                        key={transaction.id}
                                                        className={`maintenance-transaction-card selectable ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => toggleTransactionSelection(transaction.id)}
                                                    >
                                                        <div className="maintenance-transaction-card-header">
                                                            <span className="maintenance-transaction-batch">
                                                                Batch #{transaction.batchNumber}
                                                            </span>
                                                            <div className="maintenance-transaction-card-checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {}}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="maintenance-transaction-card-details">
                                                            <span>From: {transaction.senderName || 'Unknown'}</span>
                                                            <span>{formatTransactionDate(transaction.transactionDate || transaction.createdAt)}</span>
                                                        </div>
                                                        {transaction.items && (
                                                            <div className="maintenance-transaction-items-summary">
                                                                {transaction.items.map((item, idx) => (
                                                                    <span key={idx} className="maintenance-transaction-item-tag">
                                                                        {item.itemTypeName || 'Item'} x{item.equipmentReceivedQuantity || item.quantity}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <Button variant="ghost" onClick={handleCloseAttempt} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            loading={isLoading}
                            loadingText="Saving..."
                        >
                            {isEditing ? 'Update Maintenance' : 'Create Maintenance'}
                        </Button>
                    </div>
                </form>

                {/* Maintenance Type Creation Modal */}
                {showMaintenanceTypeModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Add New Maintenance Type</h2>
                                <CloseButton onClick={handleCancelMaintenanceTypeCreation} />
                            </div>
                            <form onSubmit={handleCreateMaintenanceType}>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={newMaintenanceTypeData.name}
                                        onChange={handleNewMaintenanceTypeInputChange}
                                        placeholder="e.g. Oil Change, Tire Rotation"
                                        required
                                    />
                                    <small className="form-help-text">Unique name for this maintenance type</small>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={newMaintenanceTypeData.description}
                                        onChange={handleNewMaintenanceTypeInputChange}
                                        placeholder="Optional description..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="active"
                                            checked={newMaintenanceTypeData.active}
                                            onChange={(e) => setNewMaintenanceTypeData(prev => ({ ...prev, active: e.target.checked }))}
                                        />
                                        <span className="checkbox-text">Active</span>
                                    </label>
                                </div>
                                <div className="modal-actions">
                                    <Button variant="ghost" onClick={handleCancelMaintenanceTypeCreation}>Cancel</Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        loading={creatingMaintenanceType}
                                        loadingText="Creating..."
                                    >
                                        Create Type
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationDialog
                isVisible={confirmationState.isOpen}
                title={confirmationState.title}
                message={confirmationState.message}
                onConfirm={() => {
                    if (confirmationState.onConfirm) confirmationState.onConfirm();
                    setConfirmationState(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
                confirmText="Reactivate"
                type="warning"
            />

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
                onCancel={() => setShowDiscardDialog(false)}
                size="medium"
            />
        </div>
    );
};

export default MaintenanceAddModal;
