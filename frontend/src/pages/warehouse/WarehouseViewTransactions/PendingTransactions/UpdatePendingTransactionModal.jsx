import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx"; // Import the Snackbar component

const UpdatePendingTransactionModal = ({ transaction, isOpen, onClose, onUpdate, warehouseId }) => {
    const [updatedTransaction, setUpdatedTransaction] = useState(transaction || {});
    const [transactionRole, setTransactionRole] = useState("");
    const [items, setItems] = useState([]);
    const [allSites, setAllSites] = useState([]);
    const [selectedSenderSite, setSelectedSenderSite] = useState("");
    const [selectedReceiverSite, setSelectedReceiverSite] = useState("");
    const [senderOptions, setSenderOptions] = useState([]);
    const [receiverOptions, setReceiverOptions] = useState([]);
    const [entityTypes, setEntityTypes] = useState(["WAREHOUSE", "EQUIPMENT" ]);
    const [warehouseData, setWarehouseData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Snackbar states
    const [snackbar, setSnackbar] = useState({
        isVisible: false,
        type: 'success',
        text: ''
    });

    // Function to show snackbar
    const showSnackbar = (type, text) => {
        setSnackbar({
            isVisible: true,
            type,
            text
        });
    };

    // Function to hide snackbar
    const hideSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            isVisible: false
        }));
    };

    // Initialize the form when the modal opens
    // Initialize the form when the modal opens
    useEffect(() => {
        if (transaction && isOpen) {
            // 🔍 FULL TRANSACTION OBJECT LOG
            console.log("🔍 FULL TRANSACTION OBJECT:", JSON.stringify(transaction, null, 2));

            // 🔍 DEBUG: Log the incoming transaction data
            console.log("🔍 DEBUG - Incoming transaction:", transaction);
            console.log("🔍 DEBUG - Transaction items:", transaction.items);

            // Check the structure of each item
            if (transaction.items && transaction.items.length > 0) {
                transaction.items.forEach((item, index) => {
                    console.log(`🔍 DEBUG - Item ${index}:`, item);
                    console.log(`  - Item Type ID:`, item.itemTypeId);
                    console.log(`  - Item Type Name:`, item.itemTypeName);
                    console.log(`  - Quantity:`, item.quantity);
                });
            }

            // ✅ FIXED: Format items correctly based on actual API structure
            const formattedItems = (transaction.items || []).map(item => ({
                itemType: {
                    id: item.itemTypeId || "",
                    name: item.itemTypeName || "",
                    measuringUnit: "" // Will be filled from warehouse items
                },
                quantity: item.quantity || 1
            }));

            console.log("🔍 DEBUG - Formatted items for form:", formattedItems);

            setUpdatedTransaction({
                ...transaction,
                senderType: transaction.senderType || "",
                senderId: transaction.senderId || "",
                receiverType: transaction.receiverType || "",
                receiverId: transaction.receiverId || "",
                items: formattedItems,
                transactionDate: formatDateTimeForInput(transaction.transactionDate),
                batchNumber: transaction.batchNumber || ""
            });

            // Determine transaction role based on warehouseId
            if (transaction.senderId === warehouseId) {
                setTransactionRole("sender");

                // ✅ NEW: Pre-populate receiver site and type from existing transaction data
                if (transaction.receiver && transaction.receiver.site) {
                    setSelectedReceiverSite(transaction.receiver.site.id);

                    // Fetch receiver options for this site and type
                    fetchEntitiesBySiteAndType(transaction.receiver.site.id, transaction.receiverType).then(entities => {
                        setReceiverOptions(entities);
                    });
                }

            } else if (transaction.receiverId === warehouseId) {
                setTransactionRole("receiver");

                // ✅ NEW: Pre-populate sender site and type from existing transaction data
                if (transaction.sender && transaction.sender.site) {
                    setSelectedSenderSite(transaction.sender.site.id);

                    // Fetch sender options for this site and type
                    fetchEntitiesBySiteAndType(transaction.sender.site.id, transaction.senderType).then(entities => {
                        setSenderOptions(entities);
                    });
                }
            }

            // Fetch dependent data
            fetchWarehouseData();
            fetchAllSites();
        }
    }, [transaction, isOpen, warehouseId]);

    // Fetch site options when transaction loads
    useEffect(() => {
        if (selectedSenderSite && transactionRole === "receiver") {
            fetchEntitiesBySiteAndType(selectedSenderSite, updatedTransaction.senderType)
                .then(entities => {
                    setSenderOptions(entities);
                });
        }
    }, [selectedSenderSite, updatedTransaction.senderType, transactionRole]);

    useEffect(() => {
        if (selectedReceiverSite && transactionRole === "sender") {
            fetchEntitiesBySiteAndType(selectedReceiverSite, updatedTransaction.receiverType)
                .then(entities => {
                    setReceiverOptions(entities);
                });
        }
    }, [selectedReceiverSite, updatedTransaction.receiverType, transactionRole]);

    // Fetch available items when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailableItems();
        }
    }, [isOpen, warehouseId]);

    // Enrich items with details once warehouse items are loaded
    useEffect(() => {
        if (items.length > 0 && updatedTransaction.items && updatedTransaction.items.length > 0) {
            console.log("🔍 DEBUG - Enriching items with warehouse data");
            console.log("Available warehouse items:", items);

            const enrichedItems = updatedTransaction.items.map(transactionItem => {
                const itemTypeId = transactionItem.itemType?.id;

                if (!itemTypeId) return transactionItem;

                // Find matching warehouse item to get full details
                const matchingWarehouseItem = items.find(warehouseItem =>
                    warehouseItem.itemType?.id === itemTypeId
                );

                if (matchingWarehouseItem) {
                    return {
                        ...transactionItem,
                        itemType: {
                            id: itemTypeId,
                            name: matchingWarehouseItem.itemType.name,
                            measuringUnit: matchingWarehouseItem.itemType.measuringUnit || ""
                        }
                    };
                }

                return transactionItem;
            });

            console.log("🔍 DEBUG - Enriched items:", enrichedItems);

            setUpdatedTransaction(prev => ({
                ...prev,
                items: enrichedItems
            }));
        }
    }, [items]);

    // Format date-time for input fields
    const formatDateTimeForInput = (dateTimeString) => {
        if (!dateTimeString) return "";
        const date = new Date(dateTimeString);
        return date.toISOString().slice(0, 16);
    };

    // Fetch entity's site
    const fetchEntitySite = async (entityType, entityId) => {
        if (!entityType || !entityId) return null;
        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/equipment/${entityId}`;
            } else {
                endpoint = `http://localhost:8080/api/v1/${entityType.toLowerCase()}s/${entityId}`;
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.siteId || null;
            }
            return null;
        } catch (error) {
            console.error(`Failed to fetch entity site:`, error);
            return null;
        }
    };

    // Fetch warehouse data
    const fetchWarehouseData = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/warehouses/${warehouseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setWarehouseData(data);
            }
        } catch (error) {
            console.error("Failed to fetch warehouse data:", error);
        }
    };

    // Fetch available items in the warehouse
    const fetchAvailableItems = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/items/warehouse/${warehouseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Failed to fetch warehouse items:", error);
        }
    };

    // Fetch all sites
    const fetchAllSites = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/site`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAllSites(data);
            }
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        }
    };

    // Fetch entities by site and type
    const fetchEntitiesBySiteAndType = async (siteId, entityType) => {
        if (!siteId || !entityType) return [];

        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/site/${siteId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/equipment/site/${siteId}`;
            } else {
                endpoint = `http://localhost:8080/api/v1/${entityType.toLowerCase()}s/site/${siteId}`;
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                let data = await response.json();

                // Filter out the current warehouse from the options
                if (entityType === "WAREHOUSE") {
                    data = data.filter((entity) => entity.id !== warehouseId);
                }

                return data;
            }
            return [];
        } catch (error) {
            console.error(`Failed to fetch ${entityType} entities:`, error);
            return [];
        }
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUpdatedTransaction(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle role change (sender/receiver)
    const handleRoleChange = (e) => {
        const role = e.target.value;
        setTransactionRole(role);

        // Reset dependent values
        if (role === "sender") {
            setSelectedReceiverSite("");
            setUpdatedTransaction(prev => ({
                ...prev,
                receiverType: "",
                receiverId: ""
            }));
        } else {
            setSelectedSenderSite("");
            setUpdatedTransaction(prev => ({
                ...prev,
                senderType: "",
                senderId: ""
            }));
        }
    };

    // Handle sender site change
    const handleSenderSiteChange = (e) => {
        const siteId = e.target.value;
        setSelectedSenderSite(siteId);
        setSenderOptions([]);
        setUpdatedTransaction(prev => ({
            ...prev,
            senderType: "",
            senderId: ""
        }));
    };

    // Handle receiver site change
    const handleReceiverSiteChange = (e) => {
        const siteId = e.target.value;
        setSelectedReceiverSite(siteId);
        setReceiverOptions([]);
        setUpdatedTransaction(prev => ({
            ...prev,
            receiverType: "",
            receiverId: ""
        }));
    };

    // Handle sender type change
    const handleSenderTypeChange = (e) => {
        const senderType = e.target.value;
        setUpdatedTransaction(prev => ({
            ...prev,
            senderType,
            senderId: ""
        }));

        if (selectedSenderSite) {
            fetchEntitiesBySiteAndType(selectedSenderSite, senderType)
                .then(entities => {
                    setSenderOptions(entities);
                });
        }
    };

    // Handle receiver type change
    const handleReceiverTypeChange = (e) => {
        const receiverType = e.target.value;
        setUpdatedTransaction(prev => ({
            ...prev,
            receiverType,
            receiverId: ""
        }));

        if (selectedReceiverSite) {
            fetchEntitiesBySiteAndType(selectedReceiverSite, receiverType)
                .then(entities => {
                    setReceiverOptions(entities);
                });
        }
    };

    // Enhanced handleItemChange with quantity validation
    const handleItemChange = (index, field, value) => {
        const newItems = [...updatedTransaction.items];

        if (field === 'itemTypeId') {
            // Find the item type from available items
            const itemType = items.find(item => item.itemType.id === value)?.itemType || { id: value };
            newItems[index] = {
                ...newItems[index],
                itemType
            };
        } else if (field === 'quantity') {
            // Validate quantity for sender role
            if (transactionRole === "sender" && value && newItems[index].itemType?.id) {
                const warehouseItemsOfType = items.filter(warehouseItem =>
                    warehouseItem.itemStatus === "IN_WAREHOUSE" &&
                    warehouseItem.itemType.id === newItems[index].itemType.id
                );

                if (warehouseItemsOfType.length > 0) {
                    const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
                    const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === newItems[index].itemType.id);

                    if (aggregatedItem) {
                        const totalAvailableQuantity = aggregatedItem.quantity;
                        const requestedQuantity = parseInt(value);

                        if (requestedQuantity > totalAvailableQuantity) {
                            showSnackbar('error', `Not enough quantity available for ${aggregatedItem.itemType.name}. Only ${totalAvailableQuantity} items in stock.`);
                            // Don't update the value if it exceeds available quantity
                            return;
                        }
                    }
                }
            }

            newItems[index] = {
                ...newItems[index],
                [field]: value
            };
        } else {
            newItems[index] = {
                ...newItems[index],
                [field]: value
            };
        }

        setUpdatedTransaction(prev => ({
            ...prev,
            items: newItems
        }));
    };

    // Add new item to transaction
    const addItem = () => {
        setUpdatedTransaction(prev => ({
            ...prev,
            items: [...prev.items, { itemType: { id: "" }, quantity: 1 }]
        }));
    };

    // Remove item from transaction
    const removeItem = (index) => {
        const newItems = [...updatedTransaction.items];
        newItems.splice(index, 1);
        setUpdatedTransaction(prev => ({
            ...prev,
            items: newItems
        }));
    };

    // Call the API to update the transaction
    const updateTransactionAPI = async (transactionData) => {
        try {
            const token = localStorage.getItem("token");
            const username = localStorage.getItem("username") || "system";

            // Format items for API
            const items = transactionData.items.map(item => ({
                itemTypeId: item.itemType.id,
                quantity: parseInt(item.quantity)
            }));

            // Prepare payload
            const payload = {
                senderType: transactionData.senderType,
                senderId: transactionData.senderId,
                receiverType: transactionData.receiverType,
                receiverId: transactionData.receiverId,
                items: items,
                transactionDate: transactionData.transactionDate,
                batchNumber: parseInt(transactionData.batchNumber),
                username: username,
                description: transactionData.description
            };

            console.log("Sending update payload:", payload);

            const response = await fetch(`http://localhost:8080/api/v1/transactions/${transactionData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorData = await response.text();
                    console.log("Server error response:", errorData);
                    errorMessage = errorData || errorMessage;
                } catch (e) {
                    console.log("Could not parse error response");
                }
                throw new Error(errorMessage);
            }

            const responseText = await response.text();
            console.log("Server response:", responseText);

            if (!responseText) {
                throw new Error("Empty response from server");
            }

            return JSON.parse(responseText);
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    };

    // Handle form submission
    const handleUpdateTransaction = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validate items
        for (const item of updatedTransaction.items) {
            if (!item.itemType?.id || !item.quantity) {
                showSnackbar('error', 'Please complete all item fields');
                setIsLoading(false);
                return;
            }

            // Check if the warehouse is the sender and verify inventory
            if (transactionRole === "sender") {
                const warehouseItemsOfType = items.filter(warehouseItem =>
                    warehouseItem.itemStatus === "IN_WAREHOUSE" &&
                    warehouseItem.itemType.id === item.itemType.id
                );

                if (warehouseItemsOfType.length === 0) {
                    showSnackbar('error', 'Item not found in the warehouse inventory or not available (IN_WAREHOUSE status)');
                    setIsLoading(false);
                    return;
                }

                const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
                const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === item.itemType.id);

                if (!aggregatedItem) {
                    showSnackbar('error', 'Item not found in the warehouse inventory');
                    setIsLoading(false);
                    return;
                }

                const totalAvailableQuantity = aggregatedItem.quantity;
                const itemTypeName = aggregatedItem.itemType.name;

                if (totalAvailableQuantity < parseInt(item.quantity)) {
                    showSnackbar('error', `Not enough quantity available for ${itemTypeName}. Only ${totalAvailableQuantity} items in stock.`);
                    setIsLoading(false);
                    return;
                }
            }
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

        try {
            // Prepare data for API
            const transactionData = {
                ...updatedTransaction,
                id: transaction.id,
                status: updatedTransaction.status || transaction.status,
                // Set correct sender/receiver based on role
                senderId: transactionRole === "sender" ? warehouseId : updatedTransaction.senderId,
                senderType: transactionRole === "sender" ? "WAREHOUSE" : updatedTransaction.senderType,
                receiverId: transactionRole === "receiver" ? warehouseId : updatedTransaction.receiverId,
                receiverType: transactionRole === "receiver" ? "WAREHOUSE" : updatedTransaction.receiverType,
                username : username
            };

            // Call the API
            const updatedTransactionResponse = await updateTransactionAPI(transactionData);


            if (onUpdate) {
                console.log("🔄 Calling parent refresh");
                onUpdate();
            }
            onClose();

        } catch (error) {
            showSnackbar('error', error.message || 'Failed to update transaction. Please try again.');
            setError(error.message || "Failed to update transaction");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper function to aggregate warehouse items by item type
    const aggregateWarehouseItems = (items) => {
        const aggregated = {};

        items.forEach(item => {
            const key = item.itemType?.id;
            if (!key) return;

            if (aggregated[key]) {
                // Add quantity and keep track of individual items
                aggregated[key].quantity += item.quantity;
                aggregated[key].individualItems.push(item);
            } else {
                // Create new aggregated entry
                aggregated[key] = {
                    ...item,
                    quantity: item.quantity,
                    individualItems: [item], // Store individual items
                    id: `aggregated_${key}`, // Use a different ID to avoid conflicts
                    isAggregated: true
                };
            }
        });

        return Object.values(aggregated);
    };

    // Get available item types for a specific item dropdown
    const getAvailableItemTypes = (currentIndex) => {
        // Get all selected item type IDs except the current one
        const selectedItemTypeIds = updatedTransaction.items
            .filter((_, idx) => idx !== currentIndex && !!_.itemType.id)
            .map(item => item.itemType.id);

        if (transactionRole === "receiver") {
            // For receiver mode, show unique item types
            const uniqueItemTypes = [];
            const seenItemTypeIds = new Set();

            items.forEach(warehouseItem => {
                const itemTypeId = warehouseItem.itemType.id;
                if (!seenItemTypeIds.has(itemTypeId) && !selectedItemTypeIds.includes(itemTypeId)) {
                    seenItemTypeIds.add(itemTypeId);
                    uniqueItemTypes.push(warehouseItem);
                }
            });

            return uniqueItemTypes;
        } else {
            // For sender mode, use aggregated warehouse items
            const aggregatedItems = aggregateWarehouseItems(
                items.filter(warehouseItem => warehouseItem.itemStatus === "IN_WAREHOUSE")
            );

            return aggregatedItems.filter(aggregatedItem =>
                !selectedItemTypeIds.includes(aggregatedItem.itemType.id)
            );
        }
    };

    // Function to render the item options in the dropdown
    const renderItemOptions = (currentIndex) => {
        const availableItems = getAvailableItemTypes(currentIndex);

        if (transactionRole === "receiver") {
            return availableItems.map((warehouseItem) => (
                <option key={warehouseItem.itemType.id} value={warehouseItem.itemType.id}>
                    {warehouseItem.itemType.name}
                </option>
            ));
        } else {
            return availableItems.map((aggregatedItem) => (
                <option key={aggregatedItem.itemType.id} value={aggregatedItem.itemType.id}>
                    {aggregatedItem.itemType.name} ({aggregatedItem.quantity} available)
                </option>
            ));
        }
    };

    return (
        <div className="modal-backdrop3">
            {/* Snackbar Component */}
            <Snackbar
                type={snackbar.type}
                text={snackbar.text}
                isVisible={snackbar.isVisible}
                onClose={hideSnackbar}
                duration={4000}
            />

            <div className="modal3">
                <div className="modal-header3">
                    <h2>Update Transaction</h2>
                    <button className="btn-close" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form className="form-transaction" onSubmit={handleUpdateTransaction}>
                    {/* Warehouse Role Selection - Full Width */}
                    <div className="form-group3 full-width">
                        <label>Warehouse Role</label>
                        <div className="radio-group">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="warehouseRole"
                                    value="sender"
                                    checked={transactionRole === "sender"}
                                    onChange={handleRoleChange}
                                />
                                Sender
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="warehouseRole"
                                    value="receiver"
                                    checked={transactionRole === "receiver"}
                                    onChange={handleRoleChange}
                                />
                                Receiver
                            </label>
                        </div>
                    </div>

                    {/* Transaction Date - Full Width */}
                    <div className="form-group3 full-width">
                        <label htmlFor="transactionDate">Transaction Date</label>
                        <input
                            type="datetime-local"
                            id="transactionDate"
                            name="transactionDate"
                            value={updatedTransaction.transactionDate}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    {/* Items Section - Full Width */}
                    <div className="form-group3 full-width">
                        <div className="items-section-header">
                            <label>Transaction Items</label>
                            <button
                                type="button"
                                className="add-item-button"
                                onClick={addItem}
                            >
                                Add Another Item
                            </button>
                        </div>

                        {updatedTransaction.items.map((item, index) => (
                            <div key={index} className="transaction-item-container">
                                <div className="transaction-item-header">
                                    <span>Item {index + 1}</span>
                                    {updatedTransaction.items.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-item-button"
                                            onClick={() => removeItem(index)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6l12 12"/>
                                            </svg>
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div className="form-row3">
                                    <div className="form-group3">
                                        <label>Item Type</label>
                                        <select
                                            value={item.itemType?.id || ""}
                                            onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Select Item Type</option>
                                            {/* Show current item type even if not in available list */}
                                            {item.itemType?.id && item.itemType?.name && !getAvailableItemTypes(index).find(availableItem => availableItem.itemType.id === item.itemType.id) && (
                                                <option value={item.itemType.id}>
                                                    {item.itemType.name} (current)
                                                </option>
                                            )}
                                            {renderItemOptions(index)}
                                        </select>
                                    </div>

                                    <div className="form-group3">
                                        <label>Quantity</label>
                                        <div className="ro-quantity-unit-container">
                                            <input
                                                type="text"
                                                inputMode="numeric"
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
                                                required
                                                className="ro-quantity-input"
                                            />
                                            {item.itemType?.id && (
                                                <span className="ro-unit-label">
                                                    {(() => {
                                                        let unit = '';
                                                        const warehouseItem = items.find(it => it.itemType.id === item.itemType.id);
                                                        unit = warehouseItem?.itemType?.measuringUnit || '';
                                                        return unit;
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Batch Number - Full Width */}
                    <div className="form-group3 full-width">
                        <label htmlFor="batchNumber">Batch Number</label>
                        <input
                            type="number"
                            id="batchNumber"
                            name="batchNumber"
                            value={updatedTransaction.batchNumber}
                            onChange={handleInputChange}
                            min="1"
                            placeholder="Enter batch number"
                            required
                        />
                    </div>

                    {/* Description Field - Full Width */}
                    <div className="form-group3 full-width">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={updatedTransaction.description || ''}
                            onChange={handleInputChange}
                            placeholder="Enter transaction description (optional)"
                            rows="3"
                            className="description-textarea"
                        />
                    </div>

                    {/* Conditional based on warehouse role */}
                    {transactionRole === "sender" ? (
                        <>
                            {/* When warehouse is sender */}
                            <div className="form-row3">
                                <div className="form-group3">
                                    <label>Source (Fixed)</label>
                                    <input
                                        type="text"
                                        value={warehouseData.name}
                                        disabled
                                        className="disabled-input"
                                    />
                                </div>

                                {/* Site Selection First */}
                                <div className="form-group3">
                                    <label htmlFor="receiverSite">Destination Site</label>
                                    <select
                                        id="receiverSite"
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

                            {/* Entity Type Selection (only shown after site is selected) */}
                            {selectedReceiverSite && (
                                <div className="form-group3 full-width">
                                    <label htmlFor="receiverType">Destination Type</label>
                                    <select
                                        id="receiverType"
                                        name="receiverType"
                                        value={updatedTransaction.receiverType}
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

                            {/* Entity Selection (only shown after type is selected) */}
                            {selectedReceiverSite && updatedTransaction.receiverType && (
                                <div className="form-group3 full-width">
                                    <label htmlFor="receiverId">
                                        Select {updatedTransaction.receiverType.charAt(0).toUpperCase() + updatedTransaction.receiverType.slice(1).toLowerCase()}
                                    </label>
                                    <select
                                        id="receiverId"
                                        name="receiverId"
                                        value={updatedTransaction.receiverId}
                                        onChange={(e) => setUpdatedTransaction({
                                            ...updatedTransaction,
                                            receiverId: e.target.value
                                        })}
                                        required
                                    >
                                        <option value="" disabled>Select {updatedTransaction.receiverType.charAt(0).toUpperCase() + updatedTransaction.receiverType.slice(1).toLowerCase()}</option>
                                        {receiverOptions.length > 0 ? (
                                            receiverOptions.map((entity) => {
                                                // Handle different entity types appropriately
                                                let displayName, entityId;

                                                if (updatedTransaction.receiverType === "EQUIPMENT") {
                                                    // For equipment, access the nested equipment object
                                                    displayName = entity.equipment ? entity.equipment.fullModelName : "No model name available";
                                                    entityId = entity.equipment ? entity.equipment.id : entity.id;
                                                } else {
                                                    // For other types (WAREHOUSE, MERCHANT, etc.), use entity.name
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
                                            <option value="" disabled>No {updatedTransaction.receiverType.toLowerCase()}s available at this site</option>
                                        )}
                                    </select>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* When warehouse is receiver */}
                            <div className="form-row3">
                                {/* Site Selection First */}
                                <div className="form-group3">
                                    <label htmlFor="senderSite">Source Site</label>
                                    <select
                                        id="senderSite"
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

                                <div className="form-group3">
                                    <label>Destination (Fixed)</label>
                                    <input
                                        type="text"
                                        value={warehouseData.name}
                                        disabled
                                        className="disabled-input"
                                    />
                                </div>
                            </div>

                            {/* Entity Type Selection (only shown after site is selected) */}
                            {selectedSenderSite && (
                                <div className="form-group3 full-width">
                                    <label htmlFor="senderType">Source Type</label>
                                    <select
                                        id="senderType"
                                        name="senderType"
                                        value={updatedTransaction.senderType}
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

                            {/* Entity Selection (only shown after type is selected) */}
                            {selectedSenderSite && updatedTransaction.senderType && (
                                <div className="form-group3 full-width">
                                    <label htmlFor="senderId">
                                        Select {updatedTransaction.senderType.charAt(0).toUpperCase() + updatedTransaction.senderType.slice(1).toLowerCase()}
                                    </label>
                                    <select
                                        id="senderId"
                                        name="senderId"
                                        value={updatedTransaction.senderId}
                                        onChange={(e) => setUpdatedTransaction({
                                            ...updatedTransaction,
                                            senderId: e.target.value
                                        })}
                                        required
                                    >
                                        <option value="" disabled>Select {updatedTransaction.senderType.charAt(0).toUpperCase() + updatedTransaction.senderType.slice(1).toLowerCase()}</option>
                                        {senderOptions.length > 0 ? (
                                            senderOptions.map((entity) => {
                                                // Handle different entity types appropriately
                                                let displayName, entityId;

                                                if (updatedTransaction.senderType === "EQUIPMENT") {
                                                    // For equipment, access the nested equipment object
                                                    displayName = entity.equipment ? entity.equipment.fullModelName : "No model name available";
                                                    entityId = entity.equipment ? entity.equipment.id : entity.id;
                                                } else {
                                                    // For other types (WAREHOUSE, MERCHANT, etc.), use entity.name
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
                                            <option value="" disabled>No {updatedTransaction.senderType.toLowerCase()}s available at this site</option>
                                        )}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    <div className="modal-footer3">
                        <button type="button" className="cancel-button3" onClick={onClose}>Cancel</button>
                        <button
                            type="submit"
                            className="submit-button3"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Updating...
                                </>
                            ) : (
                                "Update Transaction"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdatePendingTransactionModal;