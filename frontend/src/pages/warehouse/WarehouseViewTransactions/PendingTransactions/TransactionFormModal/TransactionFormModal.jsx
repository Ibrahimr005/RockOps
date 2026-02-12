import React, { useState, useEffect } from "react";
import { FaCheck } from 'react-icons/fa';
import { itemTypeService } from '../../../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../../../services/warehouse/itemCategoryService';
import { siteService } from '../../../../../services/siteService';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import "./TransactionFormModal.scss";

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
    // Current step state (1, 2, or 3)
    const [currentStep, setCurrentStep] = useState(1);

    // Track if form has been modified
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const [transactionRole, setTransactionRole] = useState("sender");
    const [senderOptions, setSenderOptions] = useState([]);
    const [receiverOptions, setReceiverOptions] = useState([]);
    const [allSites, setAllSites] = useState([]);
    const [selectedSenderSite, setSelectedSenderSite] = useState("");
    const [selectedReceiverSite, setSelectedReceiverSite] = useState("");
    const [newTransaction, setNewTransaction] = useState({
        transactionDate: "",
        items: [{ itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }],
        senderType: "WAREHOUSE",
        senderId: warehouseId,
        receiverType: "",
        receiverId: "",
        batchNumber: "",
    });

    const entityTypes = ["WAREHOUSE", "EQUIPMENT"];
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});
    const [showFilters, setShowFilters] = useState({});

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

    const resetForm = () => {
        setTransactionRole("sender");
        setNewTransaction({
            transactionDate: "",
            items: [{ itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }],
            senderType: "WAREHOUSE",
            senderId: warehouseId,
            receiverType: "",
            receiverId: "",
            batchNumber: "",
        });
        setSelectedSenderSite("");
        if (warehouseData.site?.id) {
            setSelectedReceiverSite(warehouseData.site.id);
        } else {
            setSelectedReceiverSite("");
        }
        setChildCategoriesByItem({});
        setShowFilters({});
    };

    const initializeUpdateForm = async (transaction) => {
        const formattedItems = (transaction.items || []).map(item => ({
            itemType: {
                id: item.itemTypeId || "",
                name: item.itemTypeName || "",
                measuringUnit: ""
            },
            quantity: item.quantity || 1,
            parentCategoryId: "",
            itemCategoryId: ""
        }));

        setNewTransaction({
            ...transaction,
            senderType: transaction.senderType || "",
            senderId: transaction.senderId || "",
            receiverType: transaction.receiverType || "",
            receiverId: transaction.receiverId || "",
            items: formattedItems,
            transactionDate: formatDateTimeForInput(transaction.transactionDate),
            batchNumber: transaction.batchNumber || ""
        });

        if (transaction.senderId === warehouseId) {
            setTransactionRole("sender");
            if (transaction.receiver?.site) {
                setSelectedReceiverSite(transaction.receiver.site.id);
                const entities = await fetchEntitiesByTypeAndSite(transaction.receiverType, transaction.receiver.site.id);
                setReceiverOptions(entities);
            }
        } else if (transaction.receiverId === warehouseId) {
            setTransactionRole("receiver");
            if (transaction.sender?.site) {
                setSelectedSenderSite(transaction.sender.site.id);
                const entities = await fetchEntitiesByTypeAndSite(transaction.senderType, transaction.sender.site.id);
                setSenderOptions(entities);
            }
        }
    };

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
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
            return;
        }

        try {
            const data = await itemCategoryService.getChildren();
            const filteredChildren = data.filter(category =>
                category.parentCategory?.id === parentCategoryId
            );
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: filteredChildren
            }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
        }
    };

    const fetchEntitiesByTypeAndSite = async (entityType, siteId) => {
        if (!entityType || !siteId) return [];

        try {
            let response;
            if (entityType === "WAREHOUSE") {
                response = await siteService.getSiteWarehouses(siteId);
            } else if (entityType === "EQUIPMENT") {
                response = await siteService.getSiteEquipment(siteId);
            } else if (entityType === "MERCHANT") {
                response = await siteService.getSiteMerchants(siteId);
            } else {
                console.error(`Unsupported entity type: ${entityType}`);
                return [];
            }

            const data = response.data || response;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Failed to fetch ${entityType} for site ${siteId}:`, error);
            return [];
        }
    };

    const formatDateTimeForInput = (dateTimeString) => {
        if (!dateTimeString) return "";
        const date = new Date(dateTimeString);
        return date.toISOString().slice(0, 16);
    };

    const isStepCompleted = (step) => {
        if (step === 1) {
            // Step 1: Transaction Date, Role, and Batch Number
            return newTransaction.transactionDate && transactionRole && newTransaction.batchNumber;
        } else if (step === 2) {
            // Step 2: Items (at least one item with type and quantity)
            return newTransaction.items.some(item => item.itemType.id && item.quantity);
        } else if (step === 3) {
            // Step 3: Requester Info
            if (transactionRole === "sender") {
                return selectedReceiverSite && newTransaction.receiverType && newTransaction.receiverId;
            } else {
                return selectedSenderSite && newTransaction.senderType && newTransaction.senderId;
            }
        }
        return false;
    };

    const handleNextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleDiscardChanges = () => {
        setShowDiscardDialog(false);
        setIsFormDirty(false);
        setCurrentStep(1);
        onClose();
    };

    const handleCancelDiscard = () => {
        setShowDiscardDialog(false);
    };

    const toggleFilters = (index) => {
        setIsFormDirty(true);
        if (showFilters[index]) {
            const filterElement = document.querySelector(`[data-filter-index="${index}"]`);
            if (filterElement) {
                filterElement.classList.add('collapsing');
                setTimeout(() => {
                    setShowFilters(prev => ({
                        ...prev,
                        [index]: false
                    }));
                }, 300);
            }
        } else {
            setShowFilters(prev => ({
                ...prev,
                [index]: true
            }));
        }
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setIsFormDirty(true);
        setNewTransaction({
            ...newTransaction,
            [name]: value,
        });
    };

    const handleItemChange = (index, field, value) => {
        setIsFormDirty(true);
        const updatedItems = [...newTransaction.items];

        if (field === 'parentCategoryId') {
            updatedItems[index] = {
                ...updatedItems[index],
                parentCategoryId: value,
                itemCategoryId: '',
                itemType: { id: '' }
            };
            if (value) {
                fetchChildCategories(value, index);
            } else {
                setChildCategoriesByItem(prev => ({
                    ...prev,
                    [index]: []
                }));
            }
        } else if (field === 'itemCategoryId') {
            updatedItems[index] = {
                ...updatedItems[index],
                itemCategoryId: value,
                itemType: { id: '' }
            };
        } else if (field === 'itemTypeId') {
            updatedItems[index] = {
                ...updatedItems[index],
                itemType: { id: value }
            };
        } else if (field === 'quantity') {
            if (transactionRole === "sender" && value && updatedItems[index].itemType.id) {
                const warehouseItemsOfType = items.filter(warehouseItem =>
                    warehouseItem.itemStatus === "IN_WAREHOUSE" &&
                    warehouseItem.itemType.id === updatedItems[index].itemType.id
                );

                if (warehouseItemsOfType.length > 0) {
                    const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
                    const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === updatedItems[index].itemType.id);

                    if (aggregatedItem) {
                        const totalAvailableQuantity = aggregatedItem.quantity;
                        const requestedQuantity = parseInt(value);

                        if (requestedQuantity > totalAvailableQuantity) {
                            showSnackbar(`Not enough quantity available for ${aggregatedItem.itemType.name}. Only ${totalAvailableQuantity} items in stock.`, "error");
                            return;
                        }
                    }
                }
            }

            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
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

    const addItem = () => {
        setIsFormDirty(true);
        setNewTransaction({
            ...newTransaction,
            items: [...newTransaction.items, { itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }]
        });
    };

    const removeItem = (index) => {
        if (newTransaction.items.length <= 1) {
            return;
        }

        setIsFormDirty(true);
        const updatedItems = newTransaction.items.filter((_, i) => i !== index);
        setNewTransaction({
            ...newTransaction,
            items: updatedItems
        });

        setChildCategoriesByItem(prev => {
            const newChildCategories = { ...prev };
            delete newChildCategories[index];
            const reindexed = {};
            Object.keys(newChildCategories).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newChildCategories[key];
                } else {
                    reindexed[key] = newChildCategories[key];
                }
            });
            return reindexed;
        });

        setShowFilters(prev => {
            const newShowFilters = { ...prev };
            delete newShowFilters[index];
            const reindexed = {};
            Object.keys(newShowFilters).forEach(key => {
                const oldIndex = parseInt(key);
                if (oldIndex > index) {
                    reindexed[oldIndex - 1] = newShowFilters[key];
                } else {
                    reindexed[key] = newShowFilters[key];
                }
            });
            return reindexed;
        });
    };

    const handleRoleChange = (e) => {
        setIsFormDirty(true);
        setTransactionRole(e.target.value);
    };

    const handleSenderTypeChange = (e) => {
        setIsFormDirty(true);
        setNewTransaction({
            ...newTransaction,
            senderType: e.target.value,
            senderId: "",
        });
    };

    const handleReceiverTypeChange = (e) => {
        setIsFormDirty(true);
        setNewTransaction({
            ...newTransaction,
            receiverType: e.target.value,
            receiverId: "",
        });
    };

    const handleSenderSiteChange = (e) => {
        setIsFormDirty(true);
        setSelectedSenderSite(e.target.value);
        setNewTransaction({
            ...newTransaction,
            senderType: "",
            senderId: "",
        });
    };

    const handleReceiverSiteChange = (e) => {
        setIsFormDirty(true);
        setSelectedReceiverSite(e.target.value);
        setNewTransaction({
            ...newTransaction,
            receiverType: "",
            receiverId: "",
        });
    };

    const aggregateWarehouseItems = (items) => {
        const aggregated = {};

        items.forEach(item => {
            const key = item.itemType?.id;
            if (!key) return;

            if (aggregated[key]) {
                aggregated[key].quantity += item.quantity;
                aggregated[key].individualItems.push(item);
            } else {
                aggregated[key] = {
                    ...item,
                    quantity: item.quantity,
                    individualItems: [item],
                    id: `aggregated_${key}`,
                    isAggregated: true
                };
            }
        });

        return Object.values(aggregated);
    };

    const getFilteredItemTypes = (itemIndex) => {
        const item = newTransaction.items[itemIndex];
        if (!item) return [];

        let baseItemTypes;

        if (transactionRole === "receiver") {
            baseItemTypes = allItemTypes;
        } else {
            const aggregatedItems = aggregateWarehouseItems(
                items.filter(warehouseItem => warehouseItem.itemStatus === "IN_WAREHOUSE")
            );
            baseItemTypes = aggregatedItems.map(aggItem => aggItem.itemType);
        }

        let filteredTypes = baseItemTypes;

        if (item.itemCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.id === item.itemCategoryId
            );
        } else if (item.parentCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === item.parentCategoryId
            );
        }

        return filteredTypes;
    };

    const getAvailableItemTypes = (currentIndex) => {
        const selectedItemTypeIds = newTransaction.items
            .filter((_, idx) => idx !== currentIndex && !!_.itemType.id)
            .map(item => item.itemType.id);

        const filteredTypes = getFilteredItemTypes(currentIndex);

        if (transactionRole === "receiver") {
            return filteredTypes.filter(itemType =>
                !selectedItemTypeIds.includes(itemType.id)
            );
        } else {
            // For sender role - get aggregated warehouse items
            const warehouseItems = items.filter(warehouseItem => warehouseItem.itemStatus === "IN_WAREHOUSE");

            if (warehouseItems.length === 0) {
                console.log("No warehouse items with IN_WAREHOUSE status found");
                return [];
            }

            const aggregatedItems = aggregateWarehouseItems(warehouseItems);
            console.log("Aggregated items:", aggregatedItems);

            // Filter by category filters first
            let filtered = aggregatedItems;
            const item = newTransaction.items[currentIndex];

            if (item.itemCategoryId) {
                filtered = filtered.filter(aggItem =>
                    aggItem.itemType?.itemCategory?.id === item.itemCategoryId
                );
            } else if (item.parentCategoryId) {
                filtered = filtered.filter(aggItem =>
                    aggItem.itemType?.itemCategory?.parentCategory?.id === item.parentCategoryId
                );
            }

            // Filter out already selected items
            filtered = filtered.filter(aggItem =>
                !selectedItemTypeIds.includes(aggItem.itemType.id)
            );

            console.log("Filtered items for sender:", filtered);
            return filtered;
        }
    };

    const renderItemOptions = (currentIndex) => {
        const availableItems = getAvailableItemTypes(currentIndex);
        const currentItem = newTransaction.items[currentIndex];

        if (transactionRole === "receiver") {
            return (
                <>
                    <option value="" disabled>Select Item Type</option>
                    {mode === "update" && currentItem?.itemType?.id && currentItem?.itemType?.name &&
                        !availableItems.find(itemType => itemType.id === currentItem.itemType.id) && (
                            <option value={currentItem.itemType.id}>
                                {currentItem.itemType.name} (current)
                            </option>
                        )}
                    {availableItems.map((itemType) => (
                        <option key={itemType.id} value={itemType.id}>
                            {itemType.name}
                        </option>
                    ))}
                </>
            );
        } else {
            // For sender - availableItems are aggregated items, not just itemTypes
            return (
                <>
                    <option value="" disabled>Select Item Type</option>
                    {mode === "update" && currentItem?.itemType?.id && currentItem?.itemType?.name &&
                        !availableItems.find(aggItem => aggItem.itemType.id === currentItem.itemType.id) && (
                            <option value={currentItem.itemType.id}>
                                {currentItem.itemType.name} (current)
                            </option>
                        )}
                    {availableItems.map((aggregatedItem) => {
                        const itemType = aggregatedItem.itemType;
                        return (
                            <option key={itemType.id} value={itemType.id}>
                                {itemType.name} {itemType.measuringUnit ? `(${itemType.measuringUnit})` : ""} - {aggregatedItem.quantity} available
                            </option>
                        );
                    })}
                </>
            );
        }
    };

    const validateTransactionForm = () => {
        for (const item of newTransaction.items) {
            if (!item.itemType.id || !item.quantity) {
                showSnackbar('Please complete all item fields', 'error');
                return false;
            }

            if (transactionRole === "sender") {
                const warehouseItemsOfType = items.filter(warehouseItem =>
                    warehouseItem.itemStatus === "IN_WAREHOUSE" &&
                    warehouseItem.itemType.id === item.itemType.id
                );

                if (warehouseItemsOfType.length === 0) {
                    showSnackbar('Item not found in the warehouse inventory or not available (IN_WAREHOUSE status)', 'error');
                    return false;
                }

                const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
                const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === item.itemType.id);

                if (!aggregatedItem) {
                    showSnackbar('Item not found in the warehouse inventory', 'error');
                    return false;
                }

                const totalAvailableQuantity = aggregatedItem.quantity;
                const itemTypeName = aggregatedItem.itemType.name;

                if (totalAvailableQuantity < parseInt(item.quantity)) {
                    showSnackbar(`Not enough quantity available for ${itemTypeName}. Only ${totalAvailableQuantity} items in stock.`, 'error');
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmitTransaction = async (e) => {
        e.preventDefault();

        if (!validateTransactionForm()) {
            return;
        }

        let username = "system";
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
            try {
                const userInfo = JSON.parse(userInfoString);
                if (userInfo.username) {
                    username = userInfo.username;
                }
            } catch (error) {
                console.error("Error parsing user info:", error);
            }
        }

        const transactionData = {
            transactionDate: newTransaction.transactionDate,
            senderType: newTransaction.senderType,
            senderId: newTransaction.senderId.toString(),
            receiverType: newTransaction.receiverType,
            receiverId: newTransaction.receiverId.toString(),
            username: username,
            batchNumber: parseInt(newTransaction.batchNumber),
            sentFirst: warehouseId,
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

    useEffect(() => {
        const updateSenderOptions = async () => {
            if (newTransaction.senderType && selectedSenderSite && transactionRole === "receiver") {
                let senderData = await fetchEntitiesByTypeAndSite(newTransaction.senderType, selectedSenderSite);
                if (newTransaction.senderType === "WAREHOUSE") {
                    senderData = senderData.filter((entity) => entity.id !== warehouseId);
                }
                setSenderOptions(senderData);
            } else {
                setSenderOptions([]);
            }
        };
        updateSenderOptions();
    }, [newTransaction.senderType, selectedSenderSite, warehouseId, transactionRole]);

    useEffect(() => {
        const updateReceiverOptions = async () => {
            if (newTransaction.receiverType && selectedReceiverSite && transactionRole === "sender") {
                let receiverData = await fetchEntitiesByTypeAndSite(newTransaction.receiverType, selectedReceiverSite);
                if (newTransaction.receiverType === "WAREHOUSE") {
                    receiverData = receiverData.filter((entity) => entity.id !== warehouseId);
                }
                setReceiverOptions(receiverData);
            } else {
                setReceiverOptions([]);
            }
        };
        updateReceiverOptions();
    }, [newTransaction.receiverType, selectedReceiverSite, warehouseId, transactionRole]);

    useEffect(() => {
        if (transactionRole === "sender") {
            setNewTransaction(prev => ({
                ...prev,
                senderType: "WAREHOUSE",
                senderId: warehouseId,
                receiverType: "",
                receiverId: "",
            }));
            setSelectedSenderSite("");
            if (warehouseData.site?.id) {
                setSelectedReceiverSite(warehouseData.site.id);
            } else {
                setSelectedReceiverSite("");
            }
        } else if (transactionRole === "receiver") {
            setNewTransaction(prev => ({
                ...prev,
                senderType: "",
                senderId: "",
                receiverType: "WAREHOUSE",
                receiverId: warehouseId,
            }));
            if (warehouseData.site?.id) {
                setSelectedSenderSite(warehouseData.site.id);
            } else {
                setSelectedSenderSite("");
            }
            setSelectedReceiverSite("");
        }
    }, [transactionRole, warehouseId, warehouseData.site?.id]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseAttempt();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={handleOverlayClick}>
                <div className="modal-container modal-xl transaction-modal">
                    <div className="modal-header">
                        <h2 className="modal-title">
                            {mode === "create" ? "Create New Transaction" : "Update Transaction"}
                        </h2>
                        <button className="btn-close" onClick={handleCloseAttempt}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
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
                                        {isStepCompleted(step) ? (
                                            <FaCheck className="step-icon" />
                                        ) : (
                                            <span className="step-number">{step}</span>
                                        )}
                                    </div>
                                    <div className="step-label">
                                        {step === 1 && 'Transaction Info'}
                                        {step === 2 && 'Items'}
                                        {step === 3 && 'Requester Info'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-body">
                        <form className="transaction-form-modal-wh" onSubmit={handleSubmitTransaction}>
                            {/* Step 1: Transaction Info */}
                            {currentStep === 1 && (
                                <div className="modal-section-wh">
                                    <h3 className="modal-section-title">Transaction Information</h3>

                                    {/* Warehouse Role Selection */}
                                    <div className="form-group-full-wh">
                                        <label className="form-label">
                                            Warehouse Role <span className="required">*</span>
                                        </label>
                                        <div className="radio-group-trans">
                                            <label className="radio-option-trans">
                                                <input
                                                    type="radio"
                                                    name="warehouseRole"
                                                    value="sender"
                                                    checked={transactionRole === "sender"}
                                                    onChange={handleRoleChange}
                                                />
                                                <span>Sender</span>
                                            </label>
                                            <label className="radio-option-trans">
                                                <input
                                                    type="radio"
                                                    name="warehouseRole"
                                                    value="receiver"
                                                    checked={transactionRole === "receiver"}
                                                    onChange={handleRoleChange}
                                                />
                                                <span>Receiver</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Transaction Date */}
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

                                    {/* Batch Number */}
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

                                </div>
                            )}

                            {/* Step 2: Items */}
                            {currentStep === 2 && (
                                <div className="modal-section-wh">
                                    <div className="section-header">
                                        <h3 className="modal-section-title">Transaction Items</h3>
                                        <button
                                            type="button"
                                            className="btn-add-item"
                                            onClick={addItem}
                                        >
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
                                                        <button
                                                            type="button"
                                                            className="btn-remove-item"
                                                            onClick={() => removeItem(index)}
                                                        >
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
                                                                {parentCategories.map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
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
                                                                {(childCategoriesByItem[index] || []).map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <span className="field-helper-text">
                {!item.parentCategoryId ? (
                    "Select a parent category first"
                ) : (childCategoriesByItem[index] || []).length === 0 ? (
                    "No child categories available"
                ) : (
                    "Further refine your search"
                )}
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
                                                                <option value="" disabled>Select Item Type</option>
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
                                                                        let value = e.target.value.replace(/[^0-9]/g, '');
                                                                        handleItemChange(index, 'quantity', value);
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        let value = e.target.value.replace(/[^0-9]/g, '');
                                                                        if (value === '' || parseInt(value) < 1) {
                                                                            handleItemChange(index, 'quantity', '1');
                                                                        }
                                                                    }}
                                                                    onWheel={(e) => e.target.blur()}
                                                                    required
                                                                />
                                                                {item.itemType.id && (
                                                                    <span className="unit-badge">
                                                                        {(() => {
                                                                            let unit = '';
                                                                            if (transactionRole === "receiver") {
                                                                                const itemType = allItemTypes.find(it => it.id === item.itemType.id);
                                                                                unit = itemType?.measuringUnit || 'units';
                                                                            } else {
                                                                                const warehouseItem = items.find(it => it.itemType.id === item.itemType.id);
                                                                                unit = warehouseItem?.itemType?.measuringUnit || 'units';
                                                                            }
                                                                            return unit;
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

                            {/* Step 3: Details */}
                            {currentStep === 3 && (
                                <div className="modal-section-wh">
                                    <h3 className="modal-section-title">Requester Information</h3>

                                    {/* Batch Number */}


                                    {/* Conditional Forms Based on Role */}
                                    {transactionRole === "sender" ? (
                                        <>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label">Source (Fixed)</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={warehouseData.name}
                                                        disabled
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="receiverSite" className="form-label">
                                                        Destination Site <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="receiverSite"
                                                        className="form-select"
                                                        value={selectedReceiverSite}
                                                        onChange={handleReceiverSiteChange}
                                                        required
                                                    >
                                                        <option value="" disabled>Select Site</option>
                                                        {allSites.map((site) => (
                                                            <option key={site.id} value={site.id}>
                                                                {site.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {selectedReceiverSite && (
                                                <div className="form-group-full-wh">
                                                    <label htmlFor="receiverType" className="form-label">
                                                        Destination Type <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="receiverType"
                                                        name="receiverType"
                                                        className="form-select"
                                                        value={newTransaction.receiverType}
                                                        onChange={handleReceiverTypeChange}
                                                        required
                                                    >
                                                        <option value="" disabled>Select Type</option>
                                                        {entityTypes.map((type) => (
                                                            <option key={type} value={type}>
                                                                {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {selectedReceiverSite && newTransaction.receiverType && (
                                                <div className="form-group-full-wh">
                                                    <label htmlFor="receiverId" className="form-label">
                                                        Select {newTransaction.receiverType.charAt(0).toUpperCase() + newTransaction.receiverType.slice(1).toLowerCase()} <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="receiverId"
                                                        name="receiverId"
                                                        className="form-select"
                                                        value={newTransaction.receiverId}
                                                        onChange={(e) => {
                                                            setIsFormDirty(true);
                                                            setNewTransaction({
                                                                ...newTransaction,
                                                                receiverId: e.target.value
                                                            });
                                                        }}
                                                        required
                                                    >
                                                        <option value="" disabled>Select {newTransaction.receiverType.charAt(0).toUpperCase() + newTransaction.receiverType.slice(1).toLowerCase()}</option>
                                                        {receiverOptions.length > 0 ? (
                                                            receiverOptions.map((entity) => {
                                                                let displayName, entityId;

                                                                if (newTransaction.receiverType === "EQUIPMENT") {
                                                                    displayName = entity ? entity.fullModelName : "No model name available";
                                                                    entityId = entity ? entity.id : entity.id;
                                                                } else {
                                                                    displayName = entity.name;
                                                                    entityId = entity.id;
                                                                }

                                                                return (
                                                                    <option key={entityId} value={entityId}>
                                                                        {displayName}
                                                                    </option>
                                                                );
                                                            })
                                                        ) : (
                                                            <option value="" disabled>No {newTransaction.receiverType.toLowerCase()}s available at this site</option>
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="senderSite" className="form-label">
                                                        Source Site <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="senderSite"
                                                        className="form-select"
                                                        value={selectedSenderSite}
                                                        onChange={handleSenderSiteChange}
                                                        required
                                                    >
                                                        <option value="" disabled>Select Site</option>
                                                        {allSites.map((site) => (
                                                            <option key={site.id} value={site.id}>
                                                                {site.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Destination (Fixed)</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={warehouseData.name}
                                                        disabled
                                                    />
                                                </div>
                                            </div>

                                            {selectedSenderSite && (
                                                <div className="form-group-full-wh">
                                                    <label htmlFor="senderType" className="form-label">
                                                        Source Type <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="senderType"
                                                        name="senderType"
                                                        className="form-select"
                                                        value={newTransaction.senderType}
                                                        onChange={handleSenderTypeChange}
                                                        required
                                                    >
                                                        <option value="" disabled>Select Type</option>
                                                        {entityTypes.map((type) => (
                                                            <option key={type} value={type}>
                                                                {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {selectedSenderSite && newTransaction.senderType && (
                                                <div className="form-group-full-wh">
                                                    <label htmlFor="senderId" className="form-label">
                                                        Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()} <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        id="senderId"
                                                        name="senderId"
                                                        className="form-select"
                                                        value={newTransaction.senderId}
                                                        onChange={(e) => {
                                                            setIsFormDirty(true);
                                                            setNewTransaction({
                                                                ...newTransaction,
                                                                senderId: e.target.value
                                                            });
                                                        }}
                                                        required
                                                    >
                                                        <option value="" disabled>Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()}</option>
                                                        {senderOptions.length > 0 ? (
                                                            senderOptions.map((entity) => {
                                                                let displayName, entityId;

                                                                if (newTransaction.senderType === "EQUIPMENT") {
                                                                    displayName = entity.equipment ? entity.equipment.fullModelName : "No model name available";
                                                                    entityId = entity.equipment ? entity.equipment.id : entity.id;
                                                                } else {
                                                                    displayName = entity.name;
                                                                    entityId = entity.id;
                                                                }

                                                                return (
                                                                    <option key={entityId} value={entityId}>
                                                                        {displayName}
                                                                    </option>
                                                                );
                                                            })
                                                        ) : (
                                                            <option value="" disabled>No {newTransaction.senderType.toLowerCase()}s available at this site</option>
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="modal-footer">
                        <div className="footer-left">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    className="modal-btn-secondary"
                                    onClick={handlePreviousStep}
                                >
                                    Previous
                                </button>
                            )}
                        </div>

                        <div className="footer-right">
                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleNextStep}
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn-success"
                                    onClick={handleSubmitTransaction}
                                >
                                    {mode === "create" ? "Create Transaction" : "Update Transaction"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discard Changes Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDiscardDialog}
                type="warning"
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
                confirmText="Discard Changes"
                cancelText="Continue Editing"
                onConfirm={handleDiscardChanges}
                onCancel={handleCancelDiscard}
                size="medium"
            />
        </>
    );
};

export default TransactionFormModal;