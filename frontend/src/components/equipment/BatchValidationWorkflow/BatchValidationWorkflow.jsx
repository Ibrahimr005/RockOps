// BatchValidationWorkflow.jsx - Shared component for batch-first transaction workflow
import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { batchValidationService } from '../../../services/batchValidationService.js';
import { siteService } from '../../../services/siteService.js';
import { itemService } from '../../../services/warehouse/itemService.js';
import { warehouseService } from '../../../services/warehouseService.js';
import './BatchValidationWorkflow.scss';

const BatchValidationWorkflow = ({
    equipmentId,
    equipmentData,
    transactionPurpose, // 'CONSUMABLE' or 'MAINTENANCE'
    onTransactionCreate,
    onTransactionValidate,
    isOpen,
    onClose,
    title,
    maintenanceData = null, // For maintenance linking
    useMaintenanceValidation = false // Whether to use maintenance-specific validation
}) => {
    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

    // Batch validation state
    const [batchNumber, setBatchNumber] = useState('');
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [currentStep, setCurrentStep] = useState('batch_input'); // 'batch_input', 'scenario_handling'

    // Transaction creation state
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [warehouseItems, setWarehouseItems] = useState([]);
    const [availableItemTypes, setAvailableItemTypes] = useState([]);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // Transaction items
    const [transactionItems, setTransactionItems] = useState([
        { itemType: { id: '' }, quantity: 1 }
    ]);

    // Validation state
    const [validationItems, setValidationItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form data
    const [transactionDate, setTransactionDate] = useState(
        new Date().toISOString().slice(0, 16)
    );
    const [description, setDescription] = useState('');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            resetForm();
            fetchSites();
            if (equipmentData?.site?.id) {
                setSelectedSite(equipmentData.site.id);
            }
        }
    }, [isOpen, equipmentData]);

    const resetForm = () => {
        setBatchNumber('');
        setValidationResult(null);
        setCurrentStep('batch_input');
        setSelectedSite(equipmentData?.site?.id || '');
        setSelectedWarehouse('');
        setTransactionItems([{ itemType: { id: '' }, quantity: 1 }]);
        setValidationItems([]);
        setDescription('');
        setTransactionDate(new Date().toISOString().slice(0, 16));
    };

    // Fetch sites
    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    // Fetch warehouses by site
    const fetchWarehousesBySite = async (siteId) => {
        if (!siteId) {
            setWarehouses([]);
            return;
        }

        setIsLoadingWarehouses(true);
        try {
            const response = await siteService.getSiteWarehouses(siteId);
            setWarehouses(response.data || []);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            showError('Unable to load warehouses for this site.');
            setWarehouses([]);
        } finally {
            setIsLoadingWarehouses(false);
        }
    };

    // Fetch warehouse items
    const fetchWarehouseItems = async (warehouseId) => {
        if (!warehouseId) {
            setWarehouseItems([]);
            setAvailableItemTypes([]);
            return;
        }

        setIsLoadingItems(true);
        try {
            console.log('🔍 Frontend: Starting to fetch warehouse items for warehouse ID:', warehouseId);
            
            // Validate warehouse exists
            const warehouseResponse = await warehouseService.getById(warehouseId);
            console.log('🏢 Frontend: Warehouse validation response:', warehouseResponse);
            
            // Fetch items
            console.log('📞 Frontend: Calling itemService.getItemsByWarehouse...');
            const response = await itemService.getItemsByWarehouse(warehouseId);
            console.log('📦 Frontend: Full API response:', response);
            console.log('📦 Frontend: Response status:', response.status);
            console.log('📦 Frontend: Response headers:', response.headers);
            
            // FIXED: itemService.getItemsByWarehouse now returns response.data directly
            // So we don't need to extract response.data again - the response IS the data array
            const items = Array.isArray(response) ? response : [];
            console.log('📋 Frontend: Extracted items array:', items);
            console.log('📋 Frontend: Number of items received:', items.length);
            
            if (items.length > 0) {
                console.log('📄 Frontend: First item details:', JSON.stringify(items[0], null, 2));
                items.forEach((item, index) => {
                    console.log(`📌 Frontend: Item ${index + 1}:`, {
                        id: item.id,
                        quantity: item.quantity,
                        itemStatus: item.itemStatus,
                        itemType: item.itemType ? {
                            id: item.itemType.id,
                            name: item.itemType.name,
                            measuringUnit: item.itemType.measuringUnit
                        } : null
                    });
                });
            }
            
            setWarehouseItems(items);

            // Extract unique item types with available quantities
            console.log('🔍 Frontend: Starting to process items for dropdown...');
            const itemTypesMap = new Map();
            items.forEach((item, index) => {
                console.log(`🔎 Frontend: Processing item ${index + 1}:`, {
                    hasItemType: !!item.itemType,
                    quantity: item.quantity,
                    quantityGreaterThanZero: item.quantity > 0,
                    itemStatus: item.itemStatus,
                    statusIsInWarehouse: item.itemStatus === 'IN_WAREHOUSE',
                    passesConditions: !!(item.itemType && item.quantity > 0 && item.itemStatus === 'IN_WAREHOUSE')
                });
                
                if (item.itemType && item.quantity > 0 && item.itemStatus === 'IN_WAREHOUSE') {
                    console.log(`✅ Frontend: Item ${index + 1} passes all conditions, adding to map`);
                    const existingItem = itemTypesMap.get(item.itemType.id);
                    if (existingItem) {
                        // If item type already exists, add to the quantity
                        console.log(`📈 Frontend: Adding to existing item type ${item.itemType.name}, old quantity: ${existingItem.availableQuantity}, adding: ${item.quantity}`);
                        existingItem.availableQuantity += item.quantity;
                    } else {
                        // New item type
                        console.log(`🆕 Frontend: Creating new item type entry for ${item.itemType.name} with quantity: ${item.quantity}`);
                        itemTypesMap.set(item.itemType.id, {
                            id: item.itemType.id,
                            name: item.itemType.name,
                            measuringUnit: item.itemType.measuringUnit,
                            availableQuantity: item.quantity,
                            category: item.itemType.category
                        });
                    }
                } else {
                    console.log(`❌ Frontend: Item ${index + 1} does not pass conditions, skipping`);
                    if (!item.itemType) console.log('   - Missing itemType');
                    if (!(item.quantity > 0)) console.log(`   - Quantity not > 0: ${item.quantity}`);
                    if (item.itemStatus !== 'IN_WAREHOUSE') console.log(`   - Status not IN_WAREHOUSE: ${item.itemStatus}`);
                }
            });

            const availableTypes = Array.from(itemTypesMap.values());
            console.log('✅ Frontend: Processed available item types:', availableTypes.length);
            console.log('📊 Frontend: Available items:', availableTypes);
            setAvailableItemTypes(availableTypes);

            if (availableTypes.length === 0) {
                console.log('⚠️ Frontend: No available items found for warehouse');
                showWarning('This warehouse has no available items for transaction.');
            }
        } catch (error) {
            console.error('Error fetching warehouse items:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to access this warehouse.');
            } else if (error.response?.status === 404) {
                showError('Warehouse not found.');
            } else {
                showError('Unable to load warehouse items.');
            }
            setWarehouseItems([]);
            setAvailableItemTypes([]);
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Handle site selection
    useEffect(() => {
        if (selectedSite) {
            fetchWarehousesBySite(selectedSite);
            setSelectedWarehouse('');
        }
    }, [selectedSite]);

    // Handle warehouse selection
    useEffect(() => {
        if (selectedWarehouse) {
            fetchWarehouseItems(selectedWarehouse);
            setTransactionItems([{ itemType: { id: '' }, quantity: 1 }]);
        }
    }, [selectedWarehouse]);

    // Validate batch number
    const handleBatchValidation = async () => {
        if (!batchNumber || batchNumber.toString().trim() === '') {
            showError('Please enter a batch number.');
            return;
        }

        setIsValidating(true);
        try {
            let result;
            if (useMaintenanceValidation && maintenanceData?.maintenanceId) {
                // Use maintenance-specific validation
                result = await batchValidationService.validateBatchForEquipmentMaintenance(
                    equipmentId, 
                    maintenanceData.maintenanceId,
                    parseInt(batchNumber)
                );
            } else {
                // Use general equipment validation
                result = await batchValidationService.validateBatchForEquipment(
                    equipmentId, 
                    parseInt(batchNumber)
                );
            }
            setValidationResult(result);
            setCurrentStep('scenario_handling');

            // Handle scenarios
            if (result.scenario === 'not_found') {
                showInfo('Batch number available. You can create a new transaction.');
            } else if (result.scenario === 'incoming_validation') {
                showInfo('Incoming transaction found. You can validate the received items.');
                prepareValidationItems(result.transaction.items);
            } else if (result.scenario === 'already_validated' || result.scenario === 'used_by_other_entity') {
                showWarning(result.message);
            } else {
                showWarning(result.message);
            }
        } catch (error) {
            console.error('Error validating batch:', error);
            if (error.response?.status === 403) {
                showError('You don\'t have permission to check this batch number.');
            } else {
                showError('Unable to validate batch number. Please try again.');
            }
        } finally {
            setIsValidating(false);
        }
    };

    // Prepare validation items for incoming transactions
    const prepareValidationItems = (items) => {
        const validationData = items.map(item => ({
            id: item.id,
            itemTypeId: item.itemTypeId,
            itemTypeName: item.itemTypeName,
            measuringUnit: item.measuringUnit,
            expectedQuantity: item.quantity,
            receivedQuantity: '',
            itemNotReceived: false
        }));
        setValidationItems(validationData);
    };

    // Handle item changes for new transactions
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...transactionItems];
        if (field === 'itemTypeId') {
            updatedItems[index] = {
                ...updatedItems[index],
                itemType: { id: value }
            };
        } else {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };
        }
        setTransactionItems(updatedItems);
    };

    // Add new item
    const addItem = () => {
        setTransactionItems([
            ...transactionItems,
            { itemType: { id: '' }, quantity: 1 }
        ]);
    };

    // Remove item
    const removeItem = (index) => {
        if (transactionItems.length > 1) {
            setTransactionItems(transactionItems.filter((_, i) => i !== index));
        }
    };

    // Handle validation item changes
    const handleValidationItemChange = (index, field, value) => {
        const updatedItems = [...validationItems];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };
        setValidationItems(updatedItems);
    };

    // Get available item types excluding already selected ones
    const getAvailableItemTypes = (currentIndex) => {
        const selectedIds = transactionItems
            .filter((_, idx) => idx !== currentIndex)
            .map(item => item.itemType.id)
            .filter(id => id);
        
        return availableItemTypes.filter(itemType => 
            !selectedIds.includes(itemType.id)
        );
    };

    // Get max quantity for an item type
    const getMaxQuantityForItem = (itemTypeId) => {
        const itemType = availableItemTypes.find(item => item.id === itemTypeId);
        return itemType?.availableQuantity || 1;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (validationResult?.scenario === 'incoming_validation') {
                // Handle transaction validation
                await handleTransactionValidation();
            } else if (validationResult?.scenario === 'not_found') {
                // Handle new transaction creation
                await handleTransactionCreation();
            } else {
                showError('Cannot proceed with this batch number.');

            }
        } catch (error) {
            console.error('Error handling transaction:', error);
            showError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle transaction validation
    const handleTransactionValidation = async () => {
        // Validate received quantities
        for (const [index, item] of validationItems.entries()) {
            if (!item.itemNotReceived && (!item.receivedQuantity || item.receivedQuantity <= 0)) {
                showError(`Please enter received quantity for item ${index + 1} or mark it as not received.`);
                return;
            }
        }

        // Prepare validation data
        const validationData = {
            transactionId: validationResult.transaction.id,
            validationItems: validationItems.map(item => ({
                transactionItemId: item.id,
                receivedQuantity: item.itemNotReceived ? 0 : parseInt(item.receivedQuantity),
                itemNotReceived: item.itemNotReceived
            })),
            maintenanceData,
            transactionPurpose
        };

        await onTransactionValidate(validationData);
        showSuccess('Transaction validated successfully!');
        onClose();
    };

    // Handle transaction creation
    const handleTransactionCreation = async () => {
        // Validate items
        for (const [index, item] of transactionItems.entries()) {
            if (!item.itemType.id || !item.quantity) {
                showError('Please complete all item fields.');
                return;
            }

            const maxQuantity = getMaxQuantityForItem(item.itemType.id);
            if (parseInt(item.quantity) > maxQuantity) {
                const itemType = availableItemTypes.find(it => it.id === item.itemType.id);
                showError(`Item ${index + 1} (${itemType?.name}): Requested quantity exceeds available quantity.`);
                return;
            }
        }

        // Validate batch number uniqueness with backend
        try {
            await batchValidationService.validateBatchNumberUniqueness(parseInt(batchNumber));
        } catch (error) {
            showError(error.message || 'Batch number validation failed.');
            return;
        }

        // Prepare transaction data
        const transactionData = {
            batchNumber: parseInt(batchNumber),
            senderId: selectedWarehouse,
            senderType: 'WAREHOUSE',
            receiverId: equipmentId,
            receiverType: 'EQUIPMENT',
            items: transactionItems.map(item => ({
                itemTypeId: item.itemType.id,
                quantity: parseInt(item.quantity)
            })),
            transactionDate,
            description,
            purpose: transactionPurpose,
            maintenanceData
        };

        await onTransactionCreate(transactionData);
        showSuccess('Transaction created successfully!');
        onClose();
    };

    // Reset to batch input
    const handleBackToBatchInput = () => {
        setCurrentStep('batch_input');
        setValidationResult(null);
        setBatchNumber('');
    };

    if (!isOpen) return null;

    return (
        <div className="batch-validation-modal-backdrop">
            <div className="batch-validation-modal">
                <div className="batch-validation-modal-header">
                    <h2>{title}</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form className="batch-validation-form" onSubmit={handleSubmit}>
                    {currentStep === 'batch_input' && (
                        <div className="batch-input-section">
                            <div className="form-group full-width">
                                <label htmlFor="batchNumber">
                                    Enter Batch Number
                                    <span className="required">*</span>
                                </label>
                                <div className="batch-input-group">
                                    <input
                                        type="number"
                                        id="batchNumber"
                                        value={batchNumber}
                                        onChange={(e) => setBatchNumber(e.target.value)}
                                        placeholder="Enter batch number"
                                        min="1"
                                        required
                                        className="batch-number-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleBatchValidation}
                                        disabled={isValidating || !batchNumber}
                                        className="validate-batch-button"
                                    >
                                        {isValidating ? 'Validating...' : 'Validate'}
                                    </button>
                                </div>
                                <p className="batch-input-help">
                                    Enter the batch number to check if a transaction already exists or create a new one.
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStep === 'scenario_handling' && validationResult && (
                        <div className="scenario-handling-section">
                            <div className="validation-result">
                                <div className={`result-banner ${validationResult.scenario}`}>
                                    <div className="result-info">
                                        <h4>Batch #{batchNumber}</h4>
                                        <p>{validationResult.message}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleBackToBatchInput}
                                        className="change-batch-button"
                                    >
                                        Change Batch
                                    </button>
                                </div>
                            </div>

                            {validationResult.scenario === 'not_found' && (
                                <div className="create-transaction-section">
                                    <h4>Create New Transaction</h4>
                                    
                                    {/* Date and Description */}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="transactionDate">Transaction Date</label>
                                            <input
                                                type="datetime-local"
                                                id="transactionDate"
                                                value={transactionDate}
                                                onChange={(e) => setTransactionDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="description">Description (Optional)</label>
                                            <input
                                                type="text"
                                                id="description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Enter description"
                                            />
                                        </div>
                                    </div>

                                    {/* Site and Warehouse Selection */}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="site">Source Site</label>
                                            <select
                                                id="site"
                                                value={selectedSite}
                                                onChange={(e) => setSelectedSite(e.target.value)}
                                                required
                                            >
                                                <option value="">Select Site</option>
                                                {sites.map(site => (
                                                    <option key={site.id} value={site.id}>
                                                        {site.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="warehouse">Source Warehouse</label>
                                            <select
                                                id="warehouse"
                                                value={selectedWarehouse}
                                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                                required
                                                disabled={!selectedSite || isLoadingWarehouses}
                                            >
                                                <option value="">
                                                    {isLoadingWarehouses 
                                                        ? "Loading warehouses..." 
                                                        : !selectedSite 
                                                            ? "Select a site first" 
                                                            : "Select Warehouse"
                                                    }
                                                </option>
                                                {warehouses.map(warehouse => (
                                                    <option key={warehouse.id} value={warehouse.id}>
                                                        {warehouse.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="items-section">
                                        <div className="items-header">
                                            <label>Requested Items</label>
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                disabled={!selectedWarehouse || isLoadingItems || availableItemTypes.length === 0}
                                                className="add-item-button"
                                            >
                                                Add Item
                                            </button>
                                        </div>

                                        {transactionItems.map((item, index) => (
                                            <div key={index} className="item-container">
                                                <div className="item-header">
                                                    <span>Item {index + 1}</span>
                                                    {transactionItems.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="remove-item-button"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Item Type</label>
                                                        <select
                                                            value={item.itemType.id}
                                                            onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                            required
                                                            disabled={!selectedWarehouse || isLoadingItems}
                                                        >
                                                            <option value="">
                                                                {isLoadingItems 
                                                                    ? "Loading items..." 
                                                                    : availableItemTypes.length === 0 
                                                                        ? "No items available" 
                                                                        : "Select Item Type"
                                                                }
                                                            </option>
                                                            {getAvailableItemTypes(index).map(itemType => (
                                                                <option key={itemType.id} value={itemType.id}>
                                                                    {itemType.name} 
                                                                    {itemType.measuringUnit ? ` (${itemType.measuringUnit})` : ""} 

                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Quantity</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            min="1"
                                                            max={item.itemType.id ? getMaxQuantityForItem(item.itemType.id) : undefined}
                                                            required
                                                            disabled={!item.itemType.id}
                                                            placeholder={item.itemType.id ? `Max: ${getMaxQuantityForItem(item.itemType.id)}` : "Select item first"}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {validationResult.scenario === 'incoming_validation' && (
                                <div className="validate-transaction-section">
                                    <h4>Validate Incoming Transaction</h4>
                                    <p className="validation-instructions">
                                        Enter the quantities you actually received. Items you didn't receive can be marked as "Not Received".
                                    </p>

                                    <div className="validation-items">
                                        {validationItems.map((item, index) => (
                                            <div key={index} className="validation-item">
                                                <div className="item-info">
                                                    <strong>{item.itemTypeName}</strong>
                                                    {item.measuringUnit && <span> ({item.measuringUnit})</span>}
                                                    <div className="expected-quantity">
                                                        Expected: {item.expectedQuantity}
                                                    </div>
                                                </div>
                                                <div className="validation-controls">
                                                    <div className="form-group">
                                                        <label>Received Quantity</label>
                                                        <input
                                                            type="number"
                                                            value={item.receivedQuantity}
                                                            onChange={(e) => handleValidationItemChange(index, 'receivedQuantity', e.target.value)}
                                                            min="0"
                                                            disabled={item.itemNotReceived}
                                                            placeholder="Enter received quantity"
                                                        />
                                                    </div>
                                                    <div className="form-group checkbox-group">
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.itemNotReceived}
                                                                onChange={(e) => handleValidationItemChange(index, 'itemNotReceived', e.target.checked)}
                                                            />
                                                            Not received
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-footer">
                        {currentStep === 'batch_input' ? (
                            <button
                                type="button"
                                onClick={handleBatchValidation}
                                disabled={isValidating || !batchNumber}
                                className="btn-primary"
                            >
                                {isValidating ? 'Validating...' : 'Continue'}
                            </button>
                        ) : validationResult && (validationResult.scenario === 'not_found' || validationResult.scenario === 'incoming_validation') ? (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary"
                            >
                                {isSubmitting 
                                    ? 'Processing...' 
                                    : validationResult.scenario === 'incoming_validation' 
                                        ? 'Validate Transaction' 
                                        : 'Create Transaction'
                                }
                            </button>
                        ) : null}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BatchValidationWorkflow;