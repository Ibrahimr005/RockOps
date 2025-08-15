// MaintenanceAddModalNew.jsx - Updated maintenance modal with batch validation workflow
import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { siteService } from '../../../services/siteService';
import BatchValidationWorkflow from '../../../components/equipment/BatchValidationWorkflow/BatchValidationWorkflow.jsx';
import './MaintenanceAddModal.scss';

const MaintenanceAddModalNew = ({
    isOpen,
    onClose,
    equipmentId,
    onMaintenanceAdded,
    editingMaintenance = null
}) => {
    const { showSuccess, showError, showWarning } = useSnackbar();

    // Maintenance form state
    const [maintenanceFormData, setMaintenanceFormData] = useState({
        technicianId: '',
        maintenanceDate: new Date().toISOString().slice(0, 16),
        maintenanceTypeId: '',
        description: '',
        status: 'IN_PROGRESS'
    });

    // Data loading state
    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    // Transaction workflow state
    const [showTransactionWorkflow, setShowTransactionWorkflow] = useState(false);
    const [currentMaintenanceId, setCurrentMaintenanceId] = useState(null);

    // Maintenance type creation modal state
    const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
    const [newMaintenanceTypeData, setNewMaintenanceTypeData] = useState({ 
        name: '', 
        description: '', 
        active: true 
    });
    const [creatingMaintenanceType, setCreatingMaintenanceType] = useState(false);

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

    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            if (isEditing && editingMaintenance) {
                setMaintenanceFormData({
                    technicianId: editingMaintenance.technicianId || '',
                    maintenanceDate: formatDateForInput(editingMaintenance.maintenanceDate),
                    maintenanceTypeId: editingMaintenance.maintenanceTypeId || '',
                    description: editingMaintenance.description || '',
                    status: editingMaintenance.status || 'IN_PROGRESS'
                });
            } else {
                setMaintenanceFormData({
                    technicianId: '',
                    maintenanceDate: new Date().toISOString().slice(0, 16),
                    maintenanceTypeId: '',
                    description: '',
                    status: 'IN_PROGRESS'
                });
            }
            
            loadInitialData();
            setShowTransactionWorkflow(false);
        }
    }, [isOpen, editingMaintenance, isEditing]);

    // Load initial data
    const loadInitialData = async () => {
        setIsLoadingData(true);
        try {
            const [technicianResponse, maintenanceTypeResponse] = await Promise.all([
                inSiteMaintenanceService.getTechnicians(equipmentId),
                maintenanceTypeService.getAll()
            ]);

            setTechnicians(technicianResponse.data || []);
            setMaintenanceTypes(maintenanceTypeResponse.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Failed to load required data. Please try again.');
        } finally {
            setIsLoadingData(false);
        }
    };

    // Handle form field changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setMaintenanceFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Create maintenance type
    const handleCreateMaintenanceType = async () => {
        if (!newMaintenanceTypeData.name.trim()) {
            showError('Maintenance type name is required.');
            return;
        }

        setCreatingMaintenanceType(true);
        try {
            const response = await maintenanceTypeService.create(newMaintenanceTypeData);
            setMaintenanceTypes(prev => [...prev, response.data]);
            setMaintenanceFormData(prev => ({
                ...prev,
                maintenanceTypeId: response.data.id
            }));
            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });
            showSuccess('Maintenance type created successfully!');
        } catch (error) {
            console.error('Error creating maintenance type:', error);
            showError('Failed to create maintenance type. Please try again.');
        } finally {
            setCreatingMaintenanceType(false);
        }
    };

    // Handle maintenance form submission
    const handleMaintenanceSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        if (!maintenanceFormData.technicianId || !maintenanceFormData.maintenanceTypeId) {
            showError('Please fill in all required fields.');
            return;
        }

        try {
            let maintenanceId = currentMaintenanceId;

            if (isEditing) {
                // Update existing maintenance
                await inSiteMaintenanceService.update(equipmentId, editingMaintenance.id, maintenanceFormData);
                showSuccess('Maintenance record updated successfully!');
                onMaintenanceAdded();
                onClose();
            } else {
                // Create new maintenance record
                const response = await inSiteMaintenanceService.create(equipmentId, maintenanceFormData);
                maintenanceId = response.data.id;
                setCurrentMaintenanceId(maintenanceId);
                showSuccess('Maintenance record created successfully!');
                
                // Show transaction workflow for adding items
                setShowTransactionWorkflow(true);
            }
        } catch (error) {
            console.error('Error handling maintenance:', error);
            if (error.response?.status === 400) {
                showError(error.response.data?.message || 'Invalid maintenance data.');
            } else if (error.response?.status === 403) {
                showError('You don\'t have permission to perform this action.');
            } else {
                showError('Failed to save maintenance record. Please try again.');
            }
        }
    };

    // Handle transaction creation (after maintenance is created)
    const handleTransactionCreate = async (transactionData) => {
        try {
            const itemsArray = transactionData.items.map(item => ({
                itemTypeId: item.itemTypeId,
                quantity: item.quantity
            }));

            // Create transaction linked to maintenance
            await inSiteMaintenanceService.createTransactionForMaintenance(
                equipmentId,
                currentMaintenanceId,
                {
                    senderId: transactionData.senderId,
                    senderType: transactionData.senderType,
                    batchNumber: transactionData.batchNumber,
                    items: itemsArray,
                    transactionDate: transactionData.transactionDate,
                    description: transactionData.description
                }
            );

            showSuccess('Maintenance transaction created successfully!');
            onMaintenanceAdded();
            onClose();
        } catch (error) {
            console.error('Error creating maintenance transaction:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to create this transaction.');
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Invalid transaction data.';
                showError(message);
            } else {
                showError('Failed to create transaction. Please try again.');
            }
            throw error;
        }
    };

    // Handle transaction validation (for incoming transactions)
    const handleTransactionValidate = async (validationData) => {
        try {
            const receivedQuantities = {};
            const itemsNotReceived = {};

            validationData.validationItems.forEach(item => {
                receivedQuantities[item.transactionItemId] = item.receivedQuantity;
                itemsNotReceived[item.transactionItemId] = item.itemNotReceived;
            });

            // Validate transaction and link to maintenance
            await inSiteMaintenanceService.validateTransactionForMaintenance(
                equipmentId,
                currentMaintenanceId,
                validationData.transactionId,
                {
                    receivedQuantities,
                    itemsNotReceived,
                    comments: 'Validated via maintenance interface'
                }
            );

            showSuccess('Transaction validated and linked to maintenance successfully!');
            onMaintenanceAdded();
            onClose();
        } catch (error) {
            console.error('Error validating maintenance transaction:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to validate this transaction.');
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Invalid validation data.';
                showError(message);
            } else {
                showError('Failed to validate transaction. Please try again.');
            }
            throw error;
        }
    };

    // Skip transaction workflow (just create maintenance without transaction)
    const handleSkipTransaction = () => {
        onMaintenanceAdded();
        onClose();
    };

    if (!isOpen) return null;

    // Show transaction workflow if maintenance is created and not editing
    if (showTransactionWorkflow && !isEditing) {
        return (
            <div className="maintenance-add-modal-backdrop">
                <div className="maintenance-add-modal">
                    <div className="maintenance-add-modal-header">
                        <h2>Add Transaction to Maintenance</h2>
                        <button className="btn-close" onClick={onClose} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div className="transaction-workflow-container">
                        <div className="workflow-instructions">
                            <p>
                                Maintenance record created successfully! Now you can add a transaction for items needed for this maintenance.
                            </p>
                            <div className="workflow-options">
                                <button 
                                    type="button" 
                                    onClick={handleSkipTransaction}
                                    className="btn-secondary"
                                >
                                    Skip - No Items Needed
                                </button>
                            </div>
                        </div>
                        
                        <BatchValidationWorkflow
                            equipmentId={equipmentId}
                            equipmentData={{}} // Will be handled within the workflow
                            transactionPurpose="MAINTENANCE"
                            onTransactionCreate={handleTransactionCreate}
                            onTransactionValidate={handleTransactionValidate}
                            isOpen={true}
                            onClose={() => setShowTransactionWorkflow(false)}
                            title="Add Items for Maintenance"
                            maintenanceData={{
                                maintenanceId: currentMaintenanceId,
                                ...maintenanceFormData
                            }}
                            useMaintenanceValidation={true}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-add-modal-backdrop">
            <div className="maintenance-add-modal">
                <div className="maintenance-add-modal-header">
                    <h2>{isEditing ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form className="maintenance-add-form" onSubmit={handleMaintenanceSubmit}>
                    {/* Technician Selection */}
                    <div className="form-group">
                        <label htmlFor="technicianId">
                            Technician <span className="required">*</span>
                        </label>
                        <select
                            id="technicianId"
                            name="technicianId"
                            value={maintenanceFormData.technicianId}
                            onChange={handleInputChange}
                            required
                            disabled={isLoadingData}
                        >
                            <option value="">{isLoadingData ? 'Loading technicians...' : 'Select Technician'}</option>
                            {technicians.map(technician => (
                                <option key={technician.id} value={technician.id}>
                                    {technician.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Maintenance Date */}
                    <div className="form-group">
                        <label htmlFor="maintenanceDate">
                            Maintenance Date <span className="required">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            id="maintenanceDate"
                            name="maintenanceDate"
                            value={maintenanceFormData.maintenanceDate}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    {/* Maintenance Type */}
                    <div className="form-group">
                        <label htmlFor="maintenanceTypeId">
                            Maintenance Type <span className="required">*</span>
                        </label>
                        <div className="maintenance-type-input-group">
                            <select
                                id="maintenanceTypeId"
                                name="maintenanceTypeId"
                                value={maintenanceFormData.maintenanceTypeId}
                                onChange={handleInputChange}
                                required
                                disabled={isLoadingData}
                            >
                                <option value="">{isLoadingData ? 'Loading types...' : 'Select Maintenance Type'}</option>
                                {maintenanceTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowMaintenanceTypeModal(true)}
                                className="add-type-button"
                                title="Add new maintenance type"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Status (for editing) */}
                    {isEditing && (
                        <div className="form-group">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                name="status"
                                value={maintenanceFormData.status}
                                onChange={handleInputChange}
                            >
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    )}

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={maintenanceFormData.description}
                            onChange={handleInputChange}
                            placeholder="Enter maintenance description"
                            rows="4"
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            disabled={isLoadingData}
                        >
                            {isEditing ? 'Update Maintenance' : 'Create Maintenance'}
                        </button>
                    </div>
                </form>

                {/* Maintenance Type Creation Modal */}
                {showMaintenanceTypeModal && (
                    <div className="maintenance-type-modal-backdrop">
                        <div className="maintenance-type-modal">
                            <div className="maintenance-type-modal-header">
                                <h3>Add New Maintenance Type</h3>
                                <button 
                                    className="btn-close" 
                                    onClick={() => setShowMaintenanceTypeModal(false)}
                                    aria-label="Close"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="maintenance-type-form">
                                <div className="form-group">
                                    <label htmlFor="typeName">Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="typeName"
                                        value={newMaintenanceTypeData.name}
                                        onChange={(e) => setNewMaintenanceTypeData(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                        placeholder="Enter maintenance type name"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="typeDescription">Description</label>
                                    <textarea
                                        id="typeDescription"
                                        value={newMaintenanceTypeData.description}
                                        onChange={(e) => setNewMaintenanceTypeData(prev => ({
                                            ...prev,
                                            description: e.target.value
                                        }))}
                                        placeholder="Enter description"
                                        rows="3"
                                    />
                                </div>
                                
                                <div className="maintenance-type-modal-footer">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowMaintenanceTypeModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleCreateMaintenanceType}
                                        className="btn-primary"
                                        disabled={creatingMaintenanceType}
                                    >
                                        {creatingMaintenanceType ? 'Creating...' : 'Create Type'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceAddModalNew;