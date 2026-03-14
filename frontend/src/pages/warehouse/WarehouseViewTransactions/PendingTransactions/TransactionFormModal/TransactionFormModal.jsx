import React, { useState, useEffect } from "react";
import { FaCheck } from 'react-icons/fa';
import { itemTypeService } from '../../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../../services/warehouse/itemCategoryService';
import { siteService } from '../../../../../services/siteService';
import { Button, CloseButton } from '../../../../../components/common/Button';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import "./TransactionFormModal.scss";

// Valid receiver types — warehouse is always the sender
const RECEIVER_TYPES = ["WAREHOUSE", "EQUIPMENT", "LOSS"];

const TransactionFormModal = ({
                                  isOpen,
                                  onClose,
                                  mode = "create",
                                  transaction = null,
                                  warehouseId,
                                  warehouseData,
                                  items = [],
                                  allItemTypes = [],
                                  onSubmit,
                                  showSnackbar
                              }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const [allSites, setAllSites] = useState([]);
    const [selectedReceiverSite, setSelectedReceiverSite] = useState("");
    const [receiverOptions, setReceiverOptions] = useState([]);

    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});

    const [newTransaction, setNewTransaction] = useState({
        transactionDate: "",
        items: [{ itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }],
        receiverType: "",
        receiverId: "",
        batchNumber: "",
        description: "",
    });

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen) {
            fetchAllSites();
            fetchParentCategories();
            setCurrentStep(1);
            setIsFormDirty(false);
            if (mode === "create") {
                resetForm();
            } else if (mode === "update" && transaction) {
                initializeUpdateForm(transaction);
            }
        }
    }, [isOpen, mode, transaction]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
            document.body.style.overflow = 'hidden';
        } else {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Auto-populate receiver site from warehouse's site on create
    useEffect(() => {
        if (warehouseData?.site?.id && mode === "create") {
            setSelectedReceiverSite(warehouseData.site.id);
        }
    }, [warehouseData?.site?.id, mode]);

    // Fetch receiver options when type or site changes
    useEffect(() => {
        const updateReceiverOptions = async () => {
            if (newTransaction.receiverType && newTransaction.receiverType !== "LOSS" && selectedReceiverSite) {
                let data = await fetchEntitiesByTypeAndSite(newTransaction.receiverType, selectedReceiverSite);
                if (newTransaction.receiverType === "WAREHOUSE") {
                    data = data.filter(entity => entity.id !== warehouseId);
                }
                setReceiverOptions(data);
            } else {
                setReceiverOptions([]);
            }
        };
        updateReceiverOptions();
    }, [newTransaction.receiverType, selectedReceiverSite, warehouseId]);

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const resetForm = () => {
        setNewTransaction({
            transactionDate: "",
            items: [{ itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }],
            receiverType: "",
            receiverId: "",
            batchNumber: "",
            description: "",
        });
        setSelectedReceiverSite(warehouseData?.site?.id || "");
        setChildCategoriesByItem({});
    };

    const initializeUpdateForm = async (tx) => {
        const formattedItems = (tx.items || []).map(item => ({
            itemType: { id: item.itemTypeId || "", name: item.itemTypeName || "" },
            quantity: item.quantity || 1,
            parentCategoryId: "",
            itemCategoryId: ""
        }));

        setNewTransaction({
            transactionDate: formatDateTimeForInput(tx.transactionDate),
            items: formattedItems,
            receiverType: tx.receiverType || "",
            receiverId: tx.receiverId || "",
            batchNumber: tx.batchNumber || "",
            description: tx.description || "",
        });

        if (tx.receiver?.site) {
            setSelectedReceiverSite(tx.receiver.site.id);
            const entities = await fetchEntitiesByTypeAndSite(tx.receiverType, tx.receiver.site.id);
            setReceiverOptions(entities);
        }
    };

    const formatDateTimeForInput = (dateTimeString) => {
        if (!dateTimeString) return "";
        return new Date(dateTimeString).toISOString().slice(0, 16);
    };

    // ─── Data Fetching ────────────────────────────────────────────────────────

    const fetchAllSites = async () => {
        try {
            const response = await siteService.getAll();
            const data = response.data || response;
            setAllSites(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch sites:", error);
            setAllSites([]);
        }
    };

    const fetchParentCategories = async () => {
        try {
            const data = await itemCategoryService.getParents();
            setParentCategories(data);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
        }
    };

    const fetchChildCategories = async (parentCategoryId, itemIndex) => {
        if (!parentCategoryId) {
            setChildCategoriesByItem(prev => ({ ...prev, [itemIndex]: [] }));
            return;
        }
        try {
            const data = await itemCategoryService.getChildren();
            const filtered = data.filter(c => c.parentCategory?.id === parentCategoryId);
            setChildCategoriesByItem(prev => ({ ...prev, [itemIndex]: filtered }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({ ...prev, [itemIndex]: [] }));
        }
    };

    const fetchEntitiesByTypeAndSite = async (entityType, siteId) => {
        if (!entityType || !siteId) return [];
        try {
            let response;
            if (entityType === "WAREHOUSE") {
                response = await siteService.getSiteWarehouses(siteId);
            } else if (entityType === "EQUIPMENT") {
                response = await siteService.getSiteEquipmentDTO(siteId);
            } else {
                return [];
            }
            const data = response.data || response;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Failed to fetch ${entityType} for site ${siteId}:`, error);
            return [];
        }
    };

    // ─── Step Validation ──────────────────────────────────────────────────────

    const isStepCompleted = (step) => {
        if (step === 1) {
            return !!(newTransaction.transactionDate && newTransaction.batchNumber);
        }
        if (step === 2) {
            return newTransaction.items.some(item => item.itemType.id && item.quantity);
        }
        if (step === 3) {
            if (newTransaction.receiverType === "LOSS") return true;
            return !!(selectedReceiverSite && newTransaction.receiverType && newTransaction.receiverId);
        }
        return false;
    };

    // ─── Step Navigation ──────────────────────────────────────────────────────

    const handleNextStep = () => { if (currentStep < 3) setCurrentStep(currentStep + 1); };
    const handlePreviousStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };
    const handleStepClick = (step) => setCurrentStep(step);

    // ─── Close / Discard ─────────────────────────────────────────────────────

    const handleCloseAttempt = () => {
        if (isFormDirty) setShowDiscardDialog(true);
        else onClose();
    };

    const handleDiscardChanges = () => {
        setShowDiscardDialog(false);
        setIsFormDirty(false);
        setCurrentStep(1);
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) handleCloseAttempt();
    };

    // ─── Input Handlers ───────────────────────────────────────────────────────

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setIsFormDirty(true);
        setNewTransaction(prev => ({ ...prev, [name]: value }));
    };

    const handleReceiverTypeChange = (e) => {
        setIsFormDirty(true);
        setNewTransaction(prev => ({ ...prev, receiverType: e.target.value, receiverId: "" }));
    };

    const handleReceiverSiteChange = (e) => {
        setIsFormDirty(true);
        setSelectedReceiverSite(e.target.value);
        // Keep receiverType so the user doesn't have to re-select it; only reset receiverId
        setNewTransaction(prev => ({ ...prev, receiverId: "" }));
    };

    // ─── Item Handlers ────────────────────────────────────────────────────────

    const handleItemChange = (index, field, value) => {
        setIsFormDirty(true);
        const updatedItems = [...newTransaction.items];

        if (field === 'parentCategoryId') {
            updatedItems[index] = { ...updatedItems[index], parentCategoryId: value, itemCategoryId: '', itemType: { id: '' } };
            fetchChildCategories(value, index);
        } else if (field === 'itemCategoryId') {
            updatedItems[index] = { ...updatedItems[index], itemCategoryId: value, itemType: { id: '' } };
        } else if (field === 'itemTypeId') {
            updatedItems[index] = { ...updatedItems[index], itemType: { id: value } };
        } else if (field === 'quantity') {
            // Validate against warehouse stock
            if (value && updatedItems[index].itemType.id) {
                const warehouseItemsOfType = items.filter(wi =>
                    wi.itemStatus === "IN_WAREHOUSE" && wi.itemType.id === updatedItems[index].itemType.id
                );
                if (warehouseItemsOfType.length > 0) {
                    const totalAvailable = aggregateWarehouseItems(warehouseItemsOfType)
                        .find(a => a.itemType.id === updatedItems[index].itemType.id)?.quantity || 0;
                    if (parseInt(value) > totalAvailable) {
                        showSnackbar(`Only ${totalAvailable} available for this item type.`, "error");
                        return;
                    }
                }
            }
            updatedItems[index] = { ...updatedItems[index], quantity: value };
        } else {
            updatedItems[index] = { ...updatedItems[index], [field]: value };
        }

        setNewTransaction(prev => ({ ...prev, items: updatedItems }));
    };

    const addItem = () => {
        setIsFormDirty(true);
        setNewTransaction(prev => ({
            ...prev,
            items: [...prev.items, { itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }]
        }));
    };

    const removeItem = (index) => {
        if (newTransaction.items.length <= 1) return;
        setIsFormDirty(true);

        const updatedItems = newTransaction.items.filter((_, i) => i !== index);
        setNewTransaction(prev => ({ ...prev, items: updatedItems }));

        // Reindex child categories and showFilters
        const reindex = (obj) => {
            const result = {};
            Object.keys(obj).forEach(key => {
                const k = parseInt(key);
                if (k < index) result[k] = obj[k];
                else if (k > index) result[k - 1] = obj[k];
            });
            return result;
        };
        setChildCategoriesByItem(prev => reindex(prev));
    };

    // ─── Item Type Helpers ────────────────────────────────────────────────────

    const aggregateWarehouseItems = (warehouseItems) => {
        const map = {};
        warehouseItems.forEach(item => {
            const key = item.itemType?.id;
            if (!key) return;
            if (map[key]) {
                map[key].quantity += item.quantity;
            } else {
                map[key] = { ...item, quantity: item.quantity, id: `agg_${key}`, isAggregated: true };
            }
        });
        return Object.values(map);
    };

    const getAvailableItemTypes = (currentIndex) => {
        const selectedIds = newTransaction.items
            .filter((_, i) => i !== currentIndex && !!_.itemType.id)
            .map(it => it.itemType.id);

        const warehouseItems = items.filter(wi => wi.itemStatus === "IN_WAREHOUSE");
        let aggregated = aggregateWarehouseItems(warehouseItems);

        const item = newTransaction.items[currentIndex];
        if (item.itemCategoryId) {
            aggregated = aggregated.filter(a => a.itemType?.itemCategory?.id === item.itemCategoryId);
        } else if (item.parentCategoryId) {
            aggregated = aggregated.filter(a => a.itemType?.itemCategory?.parentCategory?.id === item.parentCategoryId);
        }

        return aggregated.filter(a => !selectedIds.includes(a.itemType.id));
    };

    const renderItemOptions = (currentIndex) => {
        const available = getAvailableItemTypes(currentIndex);
        const current = newTransaction.items[currentIndex];

        return (
            <>
                <option value="" disabled>Select Item Type</option>
                {mode === "update" && current?.itemType?.id && current?.itemType?.name &&
                    !available.find(a => a.itemType.id === current.itemType.id) && (
                        <option value={current.itemType.id}>{current.itemType.name} (current)</option>
                    )}
                {available.map(aggItem => {
                    const it = aggItem.itemType;
                    const unit = it.measuringUnit?.displayName || it.measuringUnit?.abbreviation;
                    return (
                        <option key={it.id} value={it.id}>
                            {it.name}{unit ? ` (${unit})` : ""} — {aggItem.quantity} available
                        </option>
                    );
                })}
            </>
        );
    };

    // ─── Validation ───────────────────────────────────────────────────────────

    const validateTransactionForm = () => {
        for (const item of newTransaction.items) {
            if (!item.itemType.id || !item.quantity) {
                showSnackbar('Please complete all item fields', 'error');
                return false;
            }

            const warehouseItemsOfType = items.filter(wi =>
                wi.itemStatus === "IN_WAREHOUSE" && wi.itemType.id === item.itemType.id
            );

            if (warehouseItemsOfType.length === 0) {
                showSnackbar('Item not found in warehouse inventory', 'error');
                return false;
            }

            const aggregated = aggregateWarehouseItems(warehouseItemsOfType);
            const match = aggregated.find(a => a.itemType.id === item.itemType.id);

            if (!match || match.quantity < parseInt(item.quantity)) {
                showSnackbar(
                    `Not enough stock for ${match?.itemType?.name || 'item'}. Available: ${match?.quantity || 0}.`,
                    'error'
                );
                return false;
            }
        }
        return true;
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmitTransaction = async (e) => {
        e.preventDefault();

        if (!validateTransactionForm()) return;

        let username = "system";
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (userInfo.username) username = userInfo.username;
        } catch { /* ignore */ }

        const transactionData = {
            transactionDate: newTransaction.transactionDate,
            senderType: "WAREHOUSE",                        // always WAREHOUSE
            senderId: warehouseId,                          // always this warehouse
            sentFirst: warehouseId,                         // warehouse initiates the transaction
            receiverType: newTransaction.receiverType,
            receiverId: newTransaction.receiverType === "LOSS"
                ? "00000000-0000-0000-0000-000000000000"
                : newTransaction.receiverId.toString(),
            username,
            batchNumber: parseInt(newTransaction.batchNumber),
            description: newTransaction.description || null,
            items: newTransaction.items.map(item => ({
                itemTypeId: item.itemType.id,
                quantity: parseInt(item.quantity)
            }))
        };

        await onSubmit(transactionData, mode, transaction?.id);
        setIsFormDirty(false);
        setCurrentStep(1);
        onClose();
    };

    if (!isOpen) return null;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-xl transaction-modal">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            {mode === "create" ? "Create New Transaction" : "Update Transaction"}
                        </h2>
                        <CloseButton onClick={handleCloseAttempt} />
                    </div>

                    {/* Step Indicator */}
                    <div className="step-indicator">
                        <div className="step-indicator-container">
                            {[1, 2, 3].map((step) => (
                                <div
                                    key={step}
                                    className={`step-item ${currentStep === step ? 'active' : ''} ${isStepCompleted(step) ? 'completed' : ''}`}
                                    onClick={() => handleStepClick(step)}
                                >
                                    <div className="step-circle">
                                        {isStepCompleted(step)
                                            ? <FaCheck className="step-icon" />
                                            : <span className="step-number">{step}</span>}
                                    </div>
                                    <div className="step-label">
                                        {step === 1 && 'Transaction Info'}
                                        {step === 2 && 'Items'}
                                        {step === 3 && 'Receiver Info'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-body">
                        <form className="transaction-form-modal-wh" onSubmit={handleSubmitTransaction}>

                            {/* ── Step 1: Transaction Info ── */}
                            {currentStep === 1 && (
                                <div className="modal-section-wh">
                                    <h3 className="modal-section-title">Transaction Information</h3>

                                    <div className="form-group-full-wh">
                                        <label htmlFor="transactionDate" className="form-label">
                                            Transaction Date <span className="required">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            id="transactionDate"
                                            name="transactionDate"
                                            className="form-input"
                                            value={newTransaction.transactionDate}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group-full-wh">
                                        <label htmlFor="batchNumber" className="form-label">
                                            Batch Number <span className="required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="batchNumber"
                                            name="batchNumber"
                                            className="form-input"
                                            value={newTransaction.batchNumber}
                                            onChange={handleInputChange}
                                            min="1"
                                            placeholder="Enter batch number"
                                            required
                                        />
                                    </div>

                                    <div className="form-group-full-wh">
                                        <label htmlFor="description" className="form-label">
                                            Description <span className="optional">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="description"
                                            name="description"
                                            className="form-input"
                                            value={newTransaction.description}
                                            onChange={handleInputChange}
                                            placeholder="Optional notes about this transaction"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Items ── */}
                            {currentStep === 2 && (
                                <div className="modal-section-wh">
                                    <div className="section-header">
                                        <h3 className="modal-section-title">Transaction Items</h3>
                                        <button type="button" className="btn-add-item" onClick={addItem}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 5v14M5 12h14"/>
                                            </svg>
                                            Add Another Item
                                        </button>
                                    </div>

                                    <div className="items-container">
                                        {newTransaction.items.map((item, index) => (
                                            <div key={index} className="item-card">
                                                <div className="item-header">
                                                    <span className="item-number">Item {index + 1}</span>
                                                    {newTransaction.items.length > 1 && (
                                                        <button type="button" className="btn-remove-item" onClick={() => removeItem(index)}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6L6 18M6 6l12 12"/>
                                                            </svg>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="item-body">
                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label className="form-label">Parent Category</label>
                                                            <select
                                                                className="form-select"
                                                                value={item.parentCategoryId || ''}
                                                                onChange={(e) => handleItemChange(index, 'parentCategoryId', e.target.value)}
                                                            >
                                                                <option value="">All Categories</option>
                                                                {parentCategories.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">Child Category</label>
                                                            <select
                                                                className="form-select"
                                                                value={item.itemCategoryId || ''}
                                                                onChange={(e) => handleItemChange(index, 'itemCategoryId', e.target.value)}
                                                                disabled={!item.parentCategoryId}
                                                            >
                                                                <option value="">All child categories</option>
                                                                {(childCategoriesByItem[index] || []).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                            <span className="field-helper-text">
                                                                {!item.parentCategoryId
                                                                    ? "Select a parent category first"
                                                                    : (childCategoriesByItem[index] || []).length === 0
                                                                        ? "No child categories available"
                                                                        : "Further refine your search"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="form-row">
                                                        <div className="form-group">
                                                            <label className="form-label">
                                                                Item Type <span className="required">*</span>
                                                            </label>
                                                            <select
                                                                className="form-select"
                                                                value={item.itemType.id}
                                                                onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                                required
                                                            >
                                                                {renderItemOptions(index)}
                                                            </select>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">
                                                                Quantity <span className="required">*</span>
                                                            </label>
                                                            <div className="quantity-input-wrapper">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    className="form-input quantity-input"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                                        handleItemChange(index, 'quantity', val);
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                                        if (!val || parseInt(val) < 1) handleItemChange(index, 'quantity', '1');
                                                                    }}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    required
                                                                />
                                                                {item.itemType.id && (
                                                                    <span className="unit-badge">
                                                                        {(() => {
                                                                            const wi = items.find(it => it.itemType.id === item.itemType.id);
                                                                            return wi?.itemType?.measuringUnit?.displayName
                                                                                || wi?.itemType?.measuringUnit?.abbreviation
                                                                                || 'units';
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Receiver Info ── */}
                            {currentStep === 3 && (
                                <div className="modal-section-wh">
                                    <h3 className="modal-section-title">Receiver Information</h3>

                                    {/* Loss banner */}
                                    {newTransaction.receiverType === "LOSS" && (
                                        <div className="info-banner warning">
                                            <div className="info-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                                </svg>
                                            </div>
                                            <div className="info-content">
                                                <strong>Loss/Disposal Transaction</strong>
                                                <p>This transaction will be automatically completed. Items will be removed from your warehouse inventory immediately.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Sender (Fixed)</label>
                                            <input type="text" className="form-input" value={warehouseData.name} disabled />
                                        </div>

                                        {/* Site selector — hidden for LOSS */}
                                        {newTransaction.receiverType !== "LOSS" && (
                                            <div className="form-group">
                                                <label htmlFor="receiverSite" className="form-label">
                                                    Destination Site <span className="required">*</span>
                                                </label>
                                                <select
                                                    id="receiverSite"
                                                    className="form-select"
                                                    value={selectedReceiverSite}
                                                    onChange={handleReceiverSiteChange}
                                                >
                                                    <option value="" disabled>Select Site</option>
                                                    {allSites.map(site => (
                                                        <option key={site.id} value={site.id}>{site.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group-full-wh">
                                        <label htmlFor="receiverType" className="form-label">
                                            Destination Type <span className="required">*</span>
                                        </label>
                                        <select
                                            id="receiverType"
                                            className="form-select"
                                            value={newTransaction.receiverType}
                                            onChange={handleReceiverTypeChange}
                                            required
                                        >
                                            <option value="" disabled>Select Type</option>
                                            {RECEIVER_TYPES.map(type => (
                                                <option key={type} value={type}>
                                                    {type === "LOSS" ? "Loss/Disposal" : type.charAt(0) + type.slice(1).toLowerCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Entity selector — only for non-LOSS with site selected */}
                                    {selectedReceiverSite && newTransaction.receiverType && newTransaction.receiverType !== "LOSS" && (
                                        <div className="form-group-full-wh">
                                            <label htmlFor="receiverId" className="form-label">
                                                Select {newTransaction.receiverType.charAt(0) + newTransaction.receiverType.slice(1).toLowerCase()}
                                                <span className="required"> *</span>
                                            </label>
                                            <select
                                                id="receiverId"
                                                className="form-select"
                                                value={newTransaction.receiverId}
                                                onChange={(e) => {
                                                    setIsFormDirty(true);
                                                    setNewTransaction(prev => ({ ...prev, receiverId: e.target.value }));
                                                }}
                                                required
                                            >
                                                <option value="" disabled>
                                                    Select {newTransaction.receiverType.charAt(0) + newTransaction.receiverType.slice(1).toLowerCase()}
                                                </option>
                                                {receiverOptions.length > 0 ? (
                                                    receiverOptions.map(entity => {
                                                        const displayName = newTransaction.receiverType === "EQUIPMENT"
                                                            ? (entity.model && entity.name ? `${entity.model} ${entity.name}` : entity.name || "No model name")
                                                            : entity.name;
                                                        return (
                                                            <option key={entity.id} value={entity.id}>
                                                                {displayName}
                                                            </option>
                                                        );
                                                    })
                                                ) : (
                                                    <option value="" disabled>
                                                        No {newTransaction.receiverType.toLowerCase()}s available at this site
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="modal-footer">
                        <div className="footer-left">
                            {currentStep > 1 && (
                                <Button variant="ghost" onClick={handlePreviousStep}>Previous</Button>
                            )}
                        </div>
                        <div className="footer-right">
                            {currentStep < 3 ? (
                                <Button variant="primary" onClick={handleNextStep}>Next</Button>
                            ) : (
                                <Button variant="success" type="submit" onClick={handleSubmitTransaction}>
                                    {mode === "create" ? "Create Transaction" : "Update Transaction"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={handleDiscardChanges}
                onCancel={() => setShowDiscardDialog(false)}
                size="medium"
            />
        </>
    );
};

export default TransactionFormModal;