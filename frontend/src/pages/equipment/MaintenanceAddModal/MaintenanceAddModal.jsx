// MaintenanceAddModal.jsx
import React, { useState, useEffect } from 'react';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { maintenanceTypeService } from '../../../services/maintenanceTypeService';
import { siteService } from '../../../services/siteService';
import { itemTypeService } from '../../../services/warehouse/itemTypeService.js';
import { warehouseService } from '../../../services/warehouse/warehouseService.js';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import InlineTransactionValidation from './InlineTransactionValidation';
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
    const [confirmationState, setConfirmationState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

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
            console.log('=== Frontend: Fetching employees for equipment:', equipmentId);
            const response = await inSiteMaintenanceService.getTechnicians(equipmentId);
            console.log('=== Frontend: API Response:', response);
            const employeesList = response.data || [];
            console.log('=== Frontend: Employees list:', employeesList);
            setTechnicians(employeesList);

            // Show warnings based on the results
            if (employeesList.length === 0) {
                console.log('=== Frontend: No employees found, showing warning');
                showWarning('No employees found for this equipment\'s site. Please ensure employees are assigned to the site or assign the equipment to a site with available employees.');
            } else {
                console.log('=== Frontend: Found', employeesList.length, 'employees');
            }
        } catch (error) {
            console.error('=== Frontend: Error fetching employees:', error);
            setTechnicians([]);
            showWarning('Unable to load employees. Please try again or contact your administrator.');
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

        // Ensure itemTypes is always an array before filtering
        return (itemTypes || []).filter(itemType => !selectedItemTypeIds.includes(itemType.id));
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

    const handleReactivateMaintenanceType = async (maintenanceTypeName) => {
        try {
            const response = await maintenanceTypeService.reactivateByName(maintenanceTypeName, newMaintenanceTypeData);

            // Refresh maintenance types list
            const typesResponse = await maintenanceTypeService.getAll();
            setMaintenanceTypes(typesResponse.data);

            // Automatically select the reactivated maintenance type
            setFormData(prev => ({
                ...prev,
                maintenanceTypeId: response.data.id
            }));

            // Close modal and reset form
            setShowMaintenanceTypeModal(false);
            setNewMaintenanceTypeData({ name: '', description: '', active: true });

            showSuccess(`Maintenance type "${maintenanceTypeName}" has been reactivated and selected successfully with updated details.`);
        } catch (error) {
            console.error('Error reactivating maintenance type:', error);
            showError(`Failed to reactivate maintenance type "${maintenanceTypeName}". Please try again or contact your administrator.`);
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

            // Handle specific error cases
            if (error.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (error.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = error.response.data;
                    if (isInactive) {
                        // Show confirmation dialog to reactivate inactive maintenance type
                        setConfirmationState({
                            isOpen: true,
                            title: 'Reactivate Maintenance Type',
                            message: `Maintenance type "${resourceName}" already exists but was previously deactivated. Would you like to reactivate it instead of creating a new one?`,
                            onConfirm: () => handleReactivateMaintenanceType(resourceName)
                        });
                    } else {
                        showError(`Maintenance type "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (error.response.data?.message?.includes('inactive') || error.response.data?.message?.includes('deleted')) {
                        showError(`Maintenance type "${newMaintenanceTypeData.name.trim()}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Maintenance type "${newMaintenanceTypeData.name.trim()}" already exists. Please choose a different name.`);
                    }
                }
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Please check your input and try again';
                showError(`Maintenance type name is invalid: ${message}`);
            } else if (error.response?.status === 403) {
                showError('You don\'t have permission to create maintenance types. Please contact your administrator.');
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
    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="maintenance-modal-backdrop" onClick={handleOverlayClick}>
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
                                        No employees found for this equipment's site. Please assign employees to the site first.
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
                                    <div className={`batch-result ${batchVerificationResult.scenario === 'already_handled' ? 'error' :
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
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-button" disabled={isLoading}>
                            {isLoading ? 'Saving...' : (isEditing ? 'Update Maintenance' : 'Create Maintenance')}
                        </button>
                    </div>
                </form>

                {/* Maintenance Type Creation Modal */}
                {showMaintenanceTypeModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Add New Maintenance Type</h2>
                                <button className="modal-close" onClick={handleCancelMaintenanceTypeCreation}>&times;</button>
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
                                    <button type="button" onClick={handleCancelMaintenanceTypeCreation}>Cancel</button>
                                    <button type="submit" className="save-button" disabled={creatingMaintenanceType}>
                                        {creatingMaintenanceType ? 'Creating...' : 'Create Type'}
                                    </button>
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
        </div>
    );
};

export default MaintenanceAddModal;