import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import { transactionService } from '../../../../services/transactionService';
import { siteService } from '../../../../services/siteService';
import { itemTypeService } from '../../../../services/itemTypeService';
import { equipmentService } from '../../../../services/equipmentService';
import './AddConsumablesModal.scss';

const AddConsumablesModal = ({ 
    isOpen, 
    onClose, 
    equipmentId, 
    equipmentData, 
    onTransactionAdded 
}) => {
    const { showSuccess, showError } = useSnackbar();
    
    // Format current date and time to ISO format for datetime-local input
    const formatDateForInput = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Transaction state
    const [newTransaction, setNewTransaction] = useState({
        transactionDate: formatDateForInput(new Date()),
        items: [{ itemType: { id: "" }, quantity: "1" }],
        senderType: "WAREHOUSE",
        senderId: "",
        receiverType: "EQUIPMENT",
        receiverId: equipmentId,
        batchNumber: "",
        description: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Site and warehouse related states
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [warehouses, setWarehouses] = useState([]);
    const [allItemTypes, setAllItemTypes] = useState([]);
    const [filteredItemTypes, setFilteredItemTypes] = useState([]);
    const [categories, setCategories] = useState([]);

    // Add state for batch verification
    const [isVerifyingBatch, setIsVerifyingBatch] = useState(false);
    const [batchVerificationResult, setBatchVerificationResult] = useState(null);

    // Handle input changes for the transaction form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTransaction({
            ...newTransaction,
            [name]: value,
        });

        // Automatically verify batch number when it changes
        if (name === 'batchNumber') {
            setBatchVerificationResult(null);
            if (value) {
                verifyBatchNumber(value);
            }
        }
    };

    // Handle changes to item fields
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...newTransaction.items];

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

        setNewTransaction({
            ...newTransaction,
            items: updatedItems
        });
    };

    // Add a new item to the transaction
    const addItem = () => {
        setNewTransaction({
            ...newTransaction,
            items: [...newTransaction.items, { itemType: { id: "" }, quantity: "1" }]
        });
    };

    // Remove an item from the transaction
    const removeItem = (index) => {
        if (newTransaction.items.length <= 1) {
            return;
        }

        const updatedItems = newTransaction.items.filter((_, i) => i !== index);
        setNewTransaction({
            ...newTransaction,
            items: updatedItems
        });
    };

    // Get available item types for a specific item dropdown
    const getAvailableItemTypes = (currentIndex) => {
        const selectedItemTypeIds = newTransaction.items
            .filter((_, idx) => idx !== currentIndex && !!_.itemType.id)
            .map(item => item.itemType.id);

        return filteredItemTypes.filter(itemType =>
            !selectedItemTypeIds.includes(itemType.id)
        );
    };

    // Function to render the item options in the dropdown
    const renderItemOptions = (currentIndex) => {
        const availableItems = getAvailableItemTypes(currentIndex);

        return availableItems.map((itemType) => (
            <option key={itemType.id} value={itemType.id}>
                {itemType.name} {itemType.measuringUnit ? `(${itemType.measuringUnit})` : ""}
            </option>
        ));
    };

    // Verify batch number function
    const verifyBatchNumber = async (batchNumber = null) => {
        const batchToVerify = batchNumber || newTransaction.batchNumber;

        if (!batchToVerify) {
            showError("Please enter a batch number to verify");
            return;
        }

        setIsVerifyingBatch(true);
        try {
            const response = await transactionService.getByBatchNumber(batchToVerify);

            if (response.data && response.data.id) {
                let transactionStatus = response.data.status;
                let isPendingTransaction = transactionStatus === "PENDING";

                if (!isPendingTransaction) {
                    setBatchVerificationResult({
                        found: true,
                        error: true,
                        transaction: response.data,
                        message: `Transaction found but it's already ${transactionStatus}. Only PENDING transactions can be linked.`
                    });
                } else {
                    setBatchVerificationResult({
                        found: true,
                        transaction: response.data,
                        message: "Transaction found! It will be linked to this consumable record."
                    });
                }
            }
        } catch (error) {
            console.error("Error verifying batch number:", error);

            if (error.response && error.response.status === 404) {
                setBatchVerificationResult({
                    found: false,
                    message: "No transaction found with this batch number. You can proceed with creating a new transaction."
                });
            } else {
                setBatchVerificationResult({
                    found: false,
                    error: true,
                    message: "Error verifying batch number: " + (error.response?.data?.message || error.message)
                });
            }
        } finally {
            setIsVerifyingBatch(false);
        }
    };

    // Submit transaction form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (batchVerificationResult && batchVerificationResult.found) {
                showError("Cannot add transaction: This batch number is already in use.");
                setIsSubmitting(false);
                return;
            }

            // Validate items
            for (const item of newTransaction.items) {
                if (!item.itemType.id || !item.quantity) {
                    alert("Please complete all item fields");
                    setIsSubmitting(false);
                    return;
                }
            }

            const itemsArray = newTransaction.items.map(item => ({
                itemTypeId: item.itemType.id,
                quantity: parseInt(item.quantity)
            }));

            let transactionDateParam = '';
            if (newTransaction.transactionDate) {
                const formattedDate = new Date(newTransaction.transactionDate)
                    .toISOString()
                    .split('.')[0];
                transactionDateParam = `&transactionDate=${encodeURIComponent(formattedDate)}`;
            }

            const response = await equipmentService.receiveTransaction(
                equipmentId,
                newTransaction.senderId,
                'WAREHOUSE',
                parseInt(newTransaction.batchNumber),
                'CONSUMABLE',
                itemsArray,
                newTransaction.transactionDate,
                newTransaction.description
            );

            console.log("Transaction created:", response.data);

            // Call the callback to refresh parent data
            if (onTransactionAdded) {
                onTransactionAdded();
            }

            // Close modal and show success
            onClose();
            showSuccess("Transaction Request Sent Successfully");

        } catch (error) {
            showError("Error submitting form: " + (error.response?.data?.message || error.message));
            console.error("Error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch all sites
    const fetchAllSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data);
        } catch (error) {
            console.error("Error fetching sites:", error);
        }
    };

    // Fetch warehouses by site
    const fetchWarehousesBySite = async (siteId) => {
        try {
            const response = await siteService.getSiteWarehouses(siteId);
            setWarehouses(response.data);
        } catch (error) {
            console.error("Error fetching warehouses for site:", error);
        }
    };

    // Effect to fetch warehouses when site changes
    useEffect(() => {
        if (selectedSite) {
            fetchWarehousesBySite(selectedSite);
            setNewTransaction(prev => ({
                ...prev,
                senderId: ""
            }));
        }
    }, [selectedSite]);

    // Effect to fetch item types when warehouse changes
    useEffect(() => {
        if (newTransaction.senderId) {
            setNewTransaction(prev => {
                const updatedItems = prev.items.map(item => ({
                    ...item,
                    itemType: { id: "" },
                    quantity: "1"
                }));

                return {
                    ...prev,
                    items: updatedItems
                };
            });

            setFilteredItemTypes([]);

            itemTypeService.getAll()
                .then(response => {
                    setAllItemTypes(response.data);
                    setFilteredItemTypes(response.data);
                })
                .catch(error => console.error("Error fetching item types:", error));
        }
    }, [newTransaction.senderId]);

    // Reset form when modal is opened and set default site
    useEffect(() => {
        if (isOpen) {
            setNewTransaction({
                transactionDate: formatDateForInput(new Date()),
                items: [{ itemType: { id: "" }, quantity: "1" }],
                senderType: "WAREHOUSE",
                senderId: "",
                receiverType: "EQUIPMENT",
                receiverId: equipmentId,
                batchNumber: "",
                description: "",
            });

            // Set default site to equipment's site
            if (equipmentData?.site?.id) {
                setSelectedSite(equipmentData.site.id);
                fetchWarehousesBySite(equipmentData.site.id);
            }

            fetchAllSites();
        }
    }, [isOpen, equipmentId, equipmentData]);

    if (!isOpen) return null;

    return (
        <div className="add-consumables-modal-backdrop">
            <div className="add-consumables-modal">
                <div className="add-consumables-modal-header">
                    <h2>Add Consumables Transaction</h2>
                    <button className="add-consumables-close-modal" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form className="add-consumables-form-transaction" onSubmit={handleSubmit}>
                    {/* Transaction Date - Full Width */}
                    <div className="add-consumables-form-group add-consumables-full-width">
                        <label htmlFor="transactionDate">Transaction Date</label>
                        <input
                            type="datetime-local"
                            id="transactionDate"
                            name="transactionDate"
                            value={newTransaction.transactionDate}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    {/* Batch Number - Full Width */}
                    <div className="add-consumables-form-group add-consumables-full-width">
                        <label htmlFor="batchNumber">Batch Number</label>
                        <div className="add-consumables-batch-input-group">
                            <input
                                type="number"
                                id="batchNumber"
                                name="batchNumber"
                                value={newTransaction.batchNumber}
                                onChange={handleInputChange}
                                min="1"
                                placeholder="Enter batch number"
                                required
                            />
                        </div>
                        {batchVerificationResult && (
                            <div className={`add-consumables-batch-verification-result ${batchVerificationResult.found && !batchVerificationResult.error ? 'add-consumables-success' : 'add-consumables-warning'}`}>
                                <div className="add-consumables-verification-icon">
                                    {batchVerificationResult.found && !batchVerificationResult.error ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                                            <path d="M22 4L12 14.01l-3-3"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M12 8v4M12 16h.01"/>
                                        </svg>
                                    )}
                                </div>
                                <span>{batchVerificationResult.message}</span>
                            </div>
                        )}
                    </div>

                    {/* Description Field - Full Width */}
                    <div className="add-consumables-form-group add-consumables-full-width">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={newTransaction.description || ''}
                            onChange={handleInputChange}
                            placeholder="Enter transaction description (optional)"
                            rows="3"
                            className="add-consumables-description-textarea"
                        />
                    </div>

                    {/* Source and Destination */}
                    <div className="add-consumables-form-row">
                        {/* Site Selection */}
                        <div className="add-consumables-form-group">
                            <label htmlFor="site">Source Site</label>
                            <select
                                id="site"
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                                required
                            >
                                <option value="">Select Site</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Warehouse Selection */}
                        <div className="add-consumables-form-group">
                            <label>Source Warehouse</label>
                            <select
                                value={newTransaction.senderId}
                                onChange={(e) => setNewTransaction({
                                    ...newTransaction,
                                    senderId: e.target.value
                                })}
                                required
                                disabled={!selectedSite}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Destination (Fixed) */}
                    <div className="add-consumables-form-group add-consumables-full-width">
                        <label>Destination (This Equipment)</label>
                        <input
                            type="text"
                            value={equipmentData?.name || "This Equipment"}
                            disabled
                            className="add-consumables-disabled-input"
                        />
                    </div>

                    {/* Items Section - Full Width */}
                    <div className="add-consumables-form-group add-consumables-full-width">
                        <div className="add-consumables-items-section-header">
                            <label>Requested Items</label>
                            <button
                                type="button"
                                className="add-consumables-add-item-button"
                                onClick={addItem}
                                disabled={!newTransaction.senderId}
                            >
                                Add Another Item
                            </button>
                        </div>

                        {newTransaction.items.map((item, index) => (
                            <div key={index} className="add-consumables-transaction-item-container">
                                <div className="add-consumables-transaction-item-header">
                                    <span>Item {index + 1}</span>
                                    {newTransaction.items.length > 1 && (
                                        <button
                                            type="button"
                                            className="add-consumables-remove-item-button"
                                            onClick={() => removeItem(index)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6l12 12"/>
                                            </svg>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div className="add-consumables-form-row">
                                    <div className="add-consumables-form-group">
                                        <label>Item Type</label>
                                        <select
                                            value={item.itemType.id}
                                            onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                            required
                                            disabled={!newTransaction.senderId}
                                        >
                                            <option value="" disabled>Select Item Type</option>
                                            {renderItemOptions(index)}
                                        </select>
                                    </div>

                                    <div className="add-consumables-form-group">
                                        <label>Quantity</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            required
                                            disabled={!item.itemType.id}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="add-consumables-modal-footer">
                        <button type="submit" className="add-consumables-submit-button" disabled={isSubmitting}>
                            {isSubmitting ? "Processing..." : "Request Consumables"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddConsumablesModal; 