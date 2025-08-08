// MaintenanceTransactionModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MaintenanceTransactionModal.scss';
import { siteService } from '../../../services/siteService';
import { itemTypeService } from '../../../services/itemTypeService';
import { transactionService } from '../../../services/transactionService';

const MaintenanceTransactionModal = ({
                                         isOpen,
                                         onClose,
                                         equipmentId,
                                         maintenanceId,
                                         initialBatchNumber,
                                         onTransactionAdded
                                     }) => {
    const [batchNumber, setBatchNumber] = useState(initialBatchNumber || '');
    const [isVerifyingBatch, setIsVerifyingBatch] = useState(false);
    const [batchVerificationResult, setBatchVerificationResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showTransactionForm, setShowTransactionForm] = useState(false);

    // States for transaction creation
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [allItemTypes, setAllItemTypes] = useState([]);
    const [filteredItemTypes, setFilteredItemTypes] = useState([]);
    const [transactionFormData, setTransactionFormData] = useState({
        senderId: '',
        description: '',
        items: [{ itemTypeId: '', quantity: 1 }]
    });

    const token = localStorage.getItem('token');
    const axiosInstance = axios.create({
        headers: { Authorization: `Bearer ${token}` }
    });

    // Initialize
    useEffect(() => {
        if (isOpen) {
            fetchSites();
            if (initialBatchNumber) {
                setBatchNumber(initialBatchNumber);
                verifyBatchNumber(initialBatchNumber);
            }
        }
    }, [isOpen, initialBatchNumber]);

    // Fetch sites for transaction form
    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data);
        } catch (error) {
            console.error("Error fetching sites:", error);
            setError("Failed to load sites");
        }
    };

    // Fetch warehouses when site is selected
    const fetchWarehousesBySite = async (siteId) => {
        try {
            const response = await siteService.getSiteWarehouses(siteId);
            setWarehouses(response.data);
            setTransactionFormData(prev => ({
                ...prev,
                senderId: ''
            }));
        } catch (error) {
            console.error("Error fetching warehouses:", error);
            setError("Failed to load warehouses");
        }
    };

    // Fetch item types when warehouse is selected
    const fetchItemTypes = async () => {
        if (!transactionFormData.senderId) return;

        try {
            const response = await itemTypeService.getAll();
            setAllItemTypes(response.data);
            setFilteredItemTypes(response.data);
        } catch (error) {
            console.error("Error fetching item types:", error);
            setError("Failed to load item types");
        }
    };

    // Effect to fetch warehouses when site changes
    useEffect(() => {
        if (selectedSite) {
            fetchWarehousesBySite(selectedSite);
        }
    }, [selectedSite]);

    // Effect to fetch item types when warehouse changes
    useEffect(() => {
        if (transactionFormData.senderId) {
            fetchItemTypes();
        }
    }, [transactionFormData.senderId]);

    // Handle batch number input change
    const handleBatchNumberChange = (e) => {
        setBatchNumber(e.target.value);
        // Reset verification when batch number changes
        setBatchVerificationResult(null);
        setShowTransactionForm(false);
    };

    // Verify batch number
    const verifyBatchNumber = async (batchToVerify = null) => {
        const batchToCheck = batchToVerify || batchNumber;

        if (!batchToCheck) {
            alert("Please enter a batch number to verify");
            return;
        }

        setIsVerifyingBatch(true);
        try {
            const response = await transactionService.getByBatch(batchToCheck);

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
                // Transaction not found - show form to create new transaction
                setBatchVerificationResult({
                    found: false,
                    message: "No transaction found with this batch number. You can create a new transaction below."
                });
                setShowTransactionForm(true);
            }
        } catch (error) {
            console.error("Error verifying batch number:", error);

            if (error.response && error.response.status === 404) {
                // 404 is expected when no transaction is found - show form to create new transaction
                setBatchVerificationResult({
                    found: false,
                    message: "No transaction found with this batch number. You can create a new transaction below."
                });
                setShowTransactionForm(true);
            } else {
                setBatchVerificationResult({
                    found: false,
                    error: true,
                    message: "Error verifying batch number: " + (error.response?.data?.message || error.message)
                });
                setShowTransactionForm(false);
            }
        } finally {
            setIsVerifyingBatch(false);
        }
    };

    // Handle site change for transaction form
    const handleSiteChange = (e) => {
        setSelectedSite(e.target.value);
    };

    // Handle warehouse change for transaction form
    const handleWarehouseChange = (e) => {
        setTransactionFormData({
            ...transactionFormData,
            senderId: e.target.value
        });
    };

    // Handle item change in transaction form
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...transactionFormData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };

        setTransactionFormData({
            ...transactionFormData,
            items: updatedItems
        });
    };

    // Add item in transaction form
    const addItem = () => {
        setTransactionFormData({
            ...transactionFormData,
            items: [...transactionFormData.items, { itemTypeId: '', quantity: 1 }]
        });
    };

    // Remove item in transaction form
    const removeItem = (index) => {
        if (transactionFormData.items.length <= 1) return;

        const updatedItems = transactionFormData.items.filter((_, i) => i !== index);
        setTransactionFormData({
            ...transactionFormData,
            items: updatedItems
        });
    };

    // Get available item types (not already selected)
    const getAvailableItemTypes = (currentIndex) => {
        const selectedItemIds = transactionFormData.items
            .filter((_, idx) => idx !== currentIndex && !!_.itemTypeId)
            .map(item => item.itemTypeId);

        return filteredItemTypes.filter(itemType =>
            !selectedItemIds.includes(itemType.id)
        );
    };

    // Submit transaction
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let transactionResponse;

            if (batchVerificationResult && batchVerificationResult.found && batchVerificationResult.transaction) {
                // Link existing transaction to maintenance
                transactionResponse = await transactionService.linkTransactionToMaintenance(
                    equipmentId,
                    maintenanceId,
                    batchVerificationResult.transaction.id
                );
            } else {
                // Create new transaction
                transactionResponse = await transactionService.createMaintenanceTransaction(
                    equipmentId,
                    maintenanceId,
                    transactionFormData
                );
            }

            console.log("Transaction created/linked successfully:", transactionResponse.data);
            onTransactionAdded(transactionResponse.data);
            onClose();
        } catch (error) {
            console.error("Error creating/linking transaction:", error);
            setError("Failed to create/link transaction: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="maintenance-transaction-modal-backdrop">
            <div className="maintenance-transaction-modal">
                <div className="maintenance-transaction-modal-header">
                    <h2>Add Transaction to Maintenance</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close"></button>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
                    <div className="form-section">
                        <div className="batch-checker">
                            <div className="form-group">
                                <label>Batch Number</label>
                                <div className="batch-input-group">
                                    <input
                                        type="number"
                                        value={batchNumber}
                                        onChange={handleBatchNumberChange}
                                        placeholder="Enter batch number"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="verify-button"
                                        onClick={() => verifyBatchNumber()}
                                        disabled={isVerifyingBatch || !batchNumber}
                                    >
                                        {isVerifyingBatch ? "Checking..." : "Verify"}
                                    </button>
                                </div>
                                {batchVerificationResult && (
                                    <div className={`batch-verification-result ${batchVerificationResult.found && !batchVerificationResult.error ? 'success' : 'warning'}`}>
                                        <div className="verification-icon">
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
                        </div>

                        {/* Transaction creation form - shown only when no transaction is found */}
                        {showTransactionForm && (
                            <div className="transaction-creation-section">
                                <h4>Create New Transaction</h4>
                                <p>This transaction will be linked to the maintenance record with purpose: MAINTENANCE</p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Source Site</label>
                                        <select
                                            value={selectedSite}
                                            onChange={handleSiteChange}
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
                                        <label>Source Warehouse</label>
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

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={transactionFormData.description || ''}
                                        onChange={(e) => setTransactionFormData({
                                            ...transactionFormData,
                                            description: e.target.value
                                        })}
                                        placeholder="Enter transaction description (optional)"
                                        rows="3"
                                        className="description-textarea"
                                    />
                                </div>

                                <div className="form-section">
                                    <div className="section-header">
                                        <h4>Items</h4>
                                        <button
                                            type="button"
                                            className="add-item-button"
                                            onClick={addItem}
                                            disabled={!transactionFormData.senderId}
                                        >
                                            Add Item
                                        </button>
                                    </div>

                                    {transactionFormData.items.map((item, index) => (
                                        <div className="item-row" key={index}>
                                            <div className="item-header">
                                                <span>Item {index + 1}</span>
                                                {transactionFormData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="remove-item-button"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12"/>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Item Type</label>
                                                    <select
                                                        value={item.itemTypeId}
                                                        onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                        required
                                                        disabled={!transactionFormData.senderId}
                                                    >
                                                        <option value="">Select Item Type</option>
                                                        {getAvailableItemTypes(index).map(itemType => (
                                                            <option key={itemType.id} value={itemType.id}>
                                                                {itemType.name} {itemType.unit ? `(${itemType.unit})` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group quantity-group">
                                                    <label>Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                        min="1"
                                                        required
                                                        disabled={!item.itemTypeId}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-primary--outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading || (!batchVerificationResult?.found && !showTransactionForm)}
                        >
                            {isLoading ? 'Processing...' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaintenanceTransactionModal;