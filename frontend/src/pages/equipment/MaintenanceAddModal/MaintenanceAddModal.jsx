// MaintenanceAddModal.jsx
import React, { useState, useEffect } from 'react';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { siteService } from '../../../services/siteService';
import { itemTypeService } from '../../../services/warehouse/itemTypeService.js';
import { warehouseService } from '../../../services/warehouse/warehouseService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import InlineTransactionValidation from './InlineTransactionValidation';
import './MaintenanceAddModal.scss';

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
        status: 'IN_PROGRESS',
        batchNumber: ''
    });

    const [transactionFormData, setTransactionFormData] = useState({
        senderId: '',
        senderType: 'WAREHOUSE',
        items: [{ itemTypeId: '', quantity: 1 }]
    });

    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);
    const [sites, setSites] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [batchVerificationResult, setBatchVerificationResult] = useState(null);
    const [isVerifyingBatch, setIsVerifyingBatch] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showInlineValidation, setShowInlineValidation] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null);
    const [isValidatingTransaction, setIsValidatingTransaction] = useState(false);
    const [inventoryByWarehouse, setInventoryByWarehouse] = useState({});
    const [validationData, setValidationData] = useState(null);

    // Maintenance type creation modal state
    const [showMaintenanceTypeModal, setShowMaintenanceTypeModal] = useState(false);
    const [newMaintenanceTypeData, setNewMaintenanceTypeData] = useState({ name: '', description: '', active: true });
    const [creatingMaintenanceType, setCreatingMaintenanceType] = useState(false);

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
                // Populate form with existing data for editing
                setFormData({
                    technicianId: editingMaintenance.technicianId || '',
                    maintenanceDate: formatDateForInput(editingMaintenance.maintenanceDate),
                    maintenanceTypeId: editingMaintenance.maintenanceTypeId || '',
                    description: editingMaintenance.description || '',
                    status: editingMaintenance.status || 'IN_PROGRESS',
                    batchNumber: editingMaintenance.batchNumber || ''
                });
            } else {
                // Reset form data for new maintenance
                setFormData({
                    technicianId: '',
                    maintenanceDate: formatDateForInput(new Date()),
                    maintenanceTypeId: '',
                    description: '',
                    status: 'IN_PROGRESS',
                    batchNumber: ''
                });
            }
            
            setError(null);
            setBatchVerificationResult(null);
            setShowTransactionForm(false);

            fetchTechnicians();
            fetchMaintenanceTypes();
            fetchSites();
            fetchItemTypes();
        }
    }, [isOpen, editingMaintenance, isEditing]);

    const fetchTechnicians = async () => {
        try {
            const response = await inSiteMaintenanceService.getTechnicians(equipmentId);
            setTechnicians(response.data);
        } catch (error) {
            console.error('Error fetching technicians:', error);
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

    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchWarehousesBySite = async (siteId) => {
        try {
            const response = await warehouseService.getBySite(siteId);
            setWarehouses(response.data);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        }
    };

    const fetchItemTypes = async () => {
        try {
            const response = await itemTypeService.getAll();
            setItemTypes(response.data);
        } catch (error) {
            console.error('Error fetching item types:', error);
        }
    };

    const fetchInventoryByWarehouse = async (warehouseId) => {
        try {
            const response = await warehouseService.getInventory(warehouseId);
            setInventoryByWarehouse(prev => ({
                ...prev,
                [warehouseId]: response.data
            }));
        } catch (error) {
            console.error('Error fetching warehouse inventory:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Automatically verify batch number when it changes
        if (name === 'batchNumber') {
            setBatchVerificationResult(null);
            setShowTransactionForm(false);
            setShowInlineValidation(false);
            setPendingTransaction(null);
            if (value) {
                verifyBatchNumberAutomatically(value);
            }
        }
    };

    // Verify batch number
    const verifyBatchNumber = async () => {
        if (!formData.batchNumber) {
            showWarning("Please enter a batch number to verify");
            return;
        }

        setIsVerifyingBatch(true);
        try {
            const response = await inSiteMaintenanceService.checkTransactionExists(equipmentId, formData.batchNumber);

            if (response.data && response.data.id) {
                // Transaction found
                let transactionStatus = response.data.status;
                let isPendingTransaction = transactionStatus === "PENDING";

                if (transactionStatus === "ACCEPTED") {
                    setBatchVerificationResult({
                        found: true,
                        error: true,
                        transaction: response.data,
                        message: `⚠️ Warning: Transaction found but it's already ACCEPTED. Accepted transactions cannot be linked to maintenance records.`
                    });
                    setShowTransactionForm(false);
                } else if (transactionStatus === "REJECTED") {
                    setBatchVerificationResult({
                        found: true,
                        error: true,
                        transaction: response.data,
                        message: `⚠️ Warning: Transaction found but it's already REJECTED. Rejected transactions cannot be linked to maintenance records.`
                    });
                    setShowTransactionForm(false);
                } else if (!isPendingTransaction) {
                    setBatchVerificationResult({
                        found: true,
                        error: true,
                        transaction: response.data,
                        message: `Transaction found but it's already ${transactionStatus}. Only PENDING transactions can be linked.`
                    });
                    setShowTransactionForm(false);
                } else {
                    setBatchVerificationResult({
                        found: true,
                        transaction: response.data,
                        message: "✅ Transaction found! It will be linked to this maintenance record and marked as MAINTENANCE purpose."
                    });
                    setShowTransactionForm(false);
                }
            } else {
                // No transaction found
                setBatchVerificationResult({
                    found: false,
                    message: "❌ No transaction found with this batch number. You can create a new transaction below."
                });
                setShowTransactionForm(true);
            }
        } catch (error) {
            console.error('Error verifying batch number:', error);
            setBatchVerificationResult({
                found: false,
                error: true,
                message: "Error checking batch number. You can still create a new transaction below."
            });
            setShowTransactionForm(true);
        } finally {
            setIsVerifyingBatch(false);
        }
    };

    // Automatically verify batch number (without manual trigger)
    const verifyBatchNumberAutomatically = async (batchNumber) => {
        if (!batchNumber) {
            return;
        }

        setIsVerifyingBatch(true);
        try {
            const response = await inSiteMaintenanceService.checkTransactionExists(equipmentId, batchNumber);
            const data = response.data;

            setBatchVerificationResult(data);

            // Handle different scenarios based on the enhanced backend response
            switch (data.scenario) {
                case 'already_handled':
                    // Scenario 1: Already accepted or rejected
                    setShowTransactionForm(false);
                    setShowInlineValidation(false);
                    setPendingTransaction(null);
                    break;

                case 'pending_validation':
                    // Scenario 2: Pending transaction - show inline validation
                    setShowTransactionForm(false);
                    setShowInlineValidation(true);
                    setPendingTransaction(data.transaction);
                    break;

                case 'other_status':
                    // Other status (e.g., DELIVERING, PARTIALLY_ACCEPTED)
                    setShowTransactionForm(false);
                    setShowInlineValidation(false);
                    setPendingTransaction(null);
                    break;

                case 'not_found':
                    // Scenario 3: No transaction found - show create form
                    setShowTransactionForm(true);
                    setShowInlineValidation(false);
                    setPendingTransaction(null);
                    break;

                default:
                    // Fallback
                    setShowTransactionForm(false);
                    setShowInlineValidation(false);
                    setPendingTransaction(null);
                    break;
            }
        } catch (error) {
            console.error('Error verifying batch number:', error);
            setBatchVerificationResult({
                scenario: 'error',
                found: false,
                error: true,
                message: "Error checking batch number. You can still create a new transaction below."
            });
            setShowTransactionForm(true);
            setShowInlineValidation(false);
            setPendingTransaction(null);
        } finally {
            setIsVerifyingBatch(false);
        }
    };

    const handleSiteChange = (e) => {
        const siteId = e.target.value;
        setSelectedSite(siteId);
        if (siteId) {
            fetchWarehousesBySite(siteId);
        }
    };

    const handleWarehouseChange = (e) => {
        const warehouseId = e.target.value;
        setTransactionFormData(prev => ({ ...prev, senderId: warehouseId }));
        if (warehouseId) {
            fetchInventoryByWarehouse(warehouseId);
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...transactionFormData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: field === 'quantity' ? parseInt(value) || 1 : value
        };
        setTransactionFormData(prev => ({
            ...prev,
            items: updatedItems
        }));
    };

    const addItem = () => {
        setTransactionFormData(prev => ({
            ...prev,
            items: [...prev.items, { itemTypeId: '', quantity: 1 }]
        }));
    };

    const removeItem = (index) => {
        if (transactionFormData.items.length > 1) {
            const updatedItems = transactionFormData.items.filter((_, i) => i !== index);
            setTransactionFormData(prev => ({
                ...prev,
                items: updatedItems
            }));
        }
    };

    const getAvailableItemTypes = (currentIndex) => {
        const selectedItemTypeIds = transactionFormData.items
            .map((item, index) => index !== currentIndex ? item.itemTypeId : null)
            .filter(id => id);
        
        return itemTypes.filter(itemType => !selectedItemTypeIds.includes(itemType.id));
    };



    // Handle canceling inline validation
    const handleCancelInlineValidation = () => {
        setShowInlineValidation(false);
        setPendingTransaction(null);
        setBatchVerificationResult(null);
        setFormData(prev => ({ ...prev, batchNumber: '' }));
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

            // Add the new maintenance type to the list
            setMaintenanceTypes(prev => [...prev, newMaintenanceType]);

            // Automatically select the newly created maintenance type
            setFormData(prev => ({
                ...prev,
                maintenanceTypeId: newMaintenanceType.id
            }));

            // Close the modal and reset form
            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });
            showSuccess(`Maintenance type "${newMaintenanceType.name}" created successfully and selected`);
        } catch (error) {
            console.error('Error creating maintenance type:', error);
            showError(`Failed to create maintenance type: ${error.response?.data?.message || error.message}`);
        } finally {
            setCreatingMaintenanceType(false);
        }
    };

    const handleCancelMaintenanceTypeCreation = () => {
        setShowMaintenanceTypeModal(false);
        setNewMaintenanceTypeData({ name: '', description: '', active: true });
    };

    // Create or update maintenance record and transaction if needed
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check if we have a pending transaction that needs validation
        if (showInlineValidation && (!validationData || !validationData.isValid)) {
            setError('Please complete the transaction validation form above.');
            return;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            let maintenanceResponse;
            
            if (isEditing) {
                // Update existing maintenance record
                maintenanceResponse = await inSiteMaintenanceService.update(
                    equipmentId, 
                    editingMaintenance.id, 
                    formData
                );
            } else {
                // Create new maintenance record (include validation data if available)
                const maintenancePayload = { ...formData };
                if (validationData && pendingTransaction) {
                    maintenancePayload.transactionValidation = {
                        transactionId: pendingTransaction.id,
                        ...validationData
                    };
                }
                maintenanceResponse = await inSiteMaintenanceService.create(equipmentId, maintenancePayload);
            }

            console.log("Maintenance response:", maintenanceResponse.data);

            // Check if there was an error with transaction linking
            if (maintenanceResponse.data.status === "transaction_status_invalid") {
                setError(maintenanceResponse.data.error);
                setIsLoading(false);
                return;
            }

            // For new maintenance records, handle transaction creation
            if (!isEditing) {
                const maintenanceId = maintenanceResponse.data?.maintenance?.id || maintenanceResponse.data?.id;
                console.log("Maintenance ID:", maintenanceId);

                // If we're creating a new transaction (batch number is provided, form is shown, and warehouse is selected)
                if (formData.batchNumber && showTransactionForm && transactionFormData.senderId) {
                    // Validate transaction form data
                    if (transactionFormData.items.some(item => !item.itemTypeId || item.quantity < 1)) {
                        throw new Error("Please complete all transaction item fields with valid quantities");
                    }

                    // Create the transaction and link it to the maintenance record
                    await inSiteMaintenanceService.createMaintenanceTransaction(
                        equipmentId,
                        maintenanceId,
                        transactionFormData.senderId,
                        'WAREHOUSE',
                        formData.batchNumber,
                        transactionFormData.items
                    );
                }
            }

            // Show success message using snackbar
            const successMessage = isEditing 
                ? "Maintenance record updated successfully"
                : "Maintenance record created successfully";
            
            showSuccess(successMessage);

            // Notify parent component and close
            if (onMaintenanceAdded) {
                onMaintenanceAdded();
            }
            onClose();
        } catch (error) {
            console.error("Error saving maintenance:", error);
            
            // Handle different types of errors
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

    return (
        <div className="maintenance-modal-backdrop">
            <div className="maintenance-modal">
                <div className="maintenance-modal-header">
                    <h2>{isEditing ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close"></button>
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
                                <label>Technician</label>
                                <select
                                    name="technicianId"
                                    value={formData.technicianId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Technician</option>
                                    {technicians.map(tech => (
                                        <option key={tech.id} value={tech.id}>
                                            {tech.firstName} {tech.lastName}
                                        </option>
                                    ))}
                                </select>
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
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="form-section">
                            <h3>Parts & Materials Transaction</h3>
                            <p className="section-description">
                                Link this maintenance to a transaction by entering a batch number (optional)
                            </p>

                            <div className="batch-checker">
                                <div className="form-group">
                                    <label>Batch Number (optional)</label>
                                    <input
                                        type="number"
                                        name="batchNumber"
                                        value={formData.batchNumber}
                                        onChange={handleInputChange}
                                        onWheel={(e) => e.target.blur()}
                                        placeholder="Enter batch number (optional)"
                                    />
                                    {isVerifyingBatch && (
                                        <div className="batch-checking-indicator">
                                            <span>Checking...</span>
                                        </div>
                                    )}
                                </div>

                                {batchVerificationResult && (
                                    <div className={`batch-result ${
                                        batchVerificationResult.scenario === 'already_handled' ? 'error' : 
                                        batchVerificationResult.scenario === 'pending_validation' ? 'success' : 
                                        batchVerificationResult.scenario === 'other_status' ? 'error' :
                                        batchVerificationResult.scenario === 'not_found' ? 'warning' : 'error'
                                    }`}>
                                        <p>{batchVerificationResult.message}</p>
                                        
                                        {/* Show transaction details for already handled transactions */}
                                        {batchVerificationResult.scenario === 'already_handled' && batchVerificationResult.transaction && (
                                            <div className="transaction-details">
                                                <p><strong>Transaction Details:</strong></p>
                                                <p>ID: {batchVerificationResult.transaction.id}</p>
                                                <p>Status: {batchVerificationResult.transaction.status}</p>
                                                <p>Items: {batchVerificationResult.transaction.itemCount || 0}</p>
                                                {batchVerificationResult.viewUrl && (
                                                    <p>
                                                        <a href={batchVerificationResult.viewUrl} target="_blank" rel="noopener noreferrer">
                                                            View Transaction Details
                                                        </a>
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Show transaction details for other status transactions */}
                                        {batchVerificationResult.scenario === 'other_status' && batchVerificationResult.transaction && (
                                            <div className="transaction-details">
                                                <p><strong>Transaction Details:</strong></p>
                                                <p>ID: {batchVerificationResult.transaction.id}</p>
                                                <p>Status: {batchVerificationResult.transaction.status}</p>
                                                <p>Items: {batchVerificationResult.transaction.itemCount || 0}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Show inline validation component for pending transactions */}
                                {showInlineValidation && pendingTransaction && (
                                    <InlineTransactionValidation
                                        transaction={pendingTransaction}
                                        onValidationDataChange={setValidationData}
                                        onCancel={handleCancelInlineValidation}
                                        isLoading={isValidatingTransaction}
                                    />
                                )}
                            </div>

                            {showTransactionForm && (
                                <div className="transaction-form">
                                    <h4>Create New Transaction</h4>
                                    <p>Since no transaction was found with the provided batch number, you can create a new one:</p>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Site</label>
                                            <select value={selectedSite} onChange={handleSiteChange} required>
                                                <option value="">Select Site</option>
                                                {sites.map(site => (
                                                    <option key={site.id} value={site.id}>
                                                        {site.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Warehouse</label>
                                            <select
                                                value={transactionFormData.senderId}
                                                onChange={handleWarehouseChange}
                                                required
                                                disabled={!selectedSite}
                                            >
                                                <option value="">Select Warehouse</option>
                                                {warehouses.map(warehouse => (
                                                    <option key={warehouse.id} value={warehouse.id}>
                                                        {warehouse.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="items-section">
                                        <h5>Items</h5>
                                        {transactionFormData.items.map((item, index) => (
                                            <div key={index} className="item-row">
                                                <div className="form-group">
                                                    <label>Item Type</label>
                                                    <select
                                                        value={item.itemTypeId}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {getAvailableItemTypes(index).map(itemType => (
                                                            <option key={itemType.id} value={itemType.id}>
                                                                {itemType.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label>Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    className="remove-item-button"
                                                    onClick={() => removeItem(index)}
                                                    disabled={transactionFormData.items.length === 1}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}

                                        <button type="button" className="add-item-button" onClick={addItem}>
                                            Add Item
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn-primary--outline" onClick={onClose}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary" 
                            disabled={isLoading || isValidatingTransaction || (showInlineValidation && (!validationData || !validationData.isValid))}
                        >
                            {isLoading ? 'Saving...' : 
                             isValidatingTransaction ? 'Processing...' :
                             showInlineValidation && validationData && validationData.isValid 
                                ? (validationData.action === 'accept' 
                                    ? 'Create Maintenance & Accept Transaction' 
                                    : 'Create Maintenance & Reject Transaction')
                                : showInlineValidation 
                                    ? 'Complete validation form above'
                                    : (isEditing ? 'Update Maintenance' : 'Create Maintenance')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Maintenance Type Creation Modal */}
            {showMaintenanceTypeModal && (
                <div className="modal-overlay" onClick={handleCancelMaintenanceTypeCreation}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Maintenance Type</h2>
                            <button
                                className="modal-close"
                                onClick={handleCancelMaintenanceTypeCreation}
                                disabled={creatingMaintenanceType}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleCreateMaintenanceType}>
                            <div className="form-group">
                                <label htmlFor="maintenanceTypeName">Name *</label>
                                <input
                                    type="text"
                                    id="maintenanceTypeName"
                                    name="name"
                                    value={newMaintenanceTypeData.name}
                                    onChange={handleNewMaintenanceTypeInputChange}
                                    placeholder="e.g., Oil Change, Repair, Inspection"
                                    required
                                    disabled={creatingMaintenanceType}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="maintenanceTypeDescription">Description</label>
                                <textarea
                                    id="maintenanceTypeDescription"
                                    name="description"
                                    value={newMaintenanceTypeData.description}
                                    onChange={handleNewMaintenanceTypeInputChange}
                                    placeholder="Describe this maintenance type..."
                                    rows="3"
                                    disabled={creatingMaintenanceType}
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="active"
                                        checked={newMaintenanceTypeData.active !== false}
                                        onChange={(e) => setNewMaintenanceTypeData(prev => ({
                                            ...prev,
                                            active: e.target.checked
                                        }))}
                                        disabled={creatingMaintenanceType}
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
                                    onClick={handleCancelMaintenanceTypeCreation}
                                    disabled={creatingMaintenanceType}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={creatingMaintenanceType || !newMaintenanceTypeData.name.trim()}
                                >
                                    {creatingMaintenanceType ? 'Creating...' : 'Create Maintenance Type'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceAddModal;