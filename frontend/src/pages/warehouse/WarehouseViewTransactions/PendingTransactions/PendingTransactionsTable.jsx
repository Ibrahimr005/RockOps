import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import UpdatePendingTransactionModal from "./UpdatePendingTransactionModal.jsx";
import TransactionViewModal from "../TransactionViewModal.jsx";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import { FaPlus } from 'react-icons/fa';
import "./PendingTransactions.scss"

const PendingTransactionsTable = ({ warehouseId, refreshTrigger }) => {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [viewTransaction, setViewTransaction] = useState(null);

    // Transaction Creation Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [allItemTypes, setAllItemTypes] = useState([]);
    const [senderOptions, setSenderOptions] = useState([]);
    const [receiverOptions, setReceiverOptions] = useState([]);
    const [warehouseData, setWarehouseData] = useState({
        name: "",
        id: "",
    });
    const [transactionRole, setTransactionRole] = useState("sender");
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
    // NEW: Category filtering states
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({}); // Store child categories per item
    const [showFilters, setShowFilters] = useState({}); // Track which items have filters expanded

    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        isOpen: false,
        message: "",
        type: "success"
    });

    // Helper function to show snackbar
    const showSnackbar = (message, type = "success") => {
        setSnackbar({
            isOpen: true,
            message,
            type
        });
    };

    // Helper function to close snackbar
    const closeSnackbar = () => {
        setSnackbar({
            ...snackbar,
            isOpen: false
        });
    };

    // Fetch transactions when component mounts or warehouseId changes
// Update your existing useEffect
    useEffect(() => {
        fetchPendingTransactions();
        fetchItems();
        fetchAllItemTypes();
        fetchWarehouseDetails();
        fetchAllSites();
        fetchParentCategories(); // ADD THIS LINE
    }, [warehouseId, refreshTrigger]);

    // NEW: Toggle filters with animation
    const toggleFilters = (index) => {
        if (showFilters[index]) {
            // If currently showing, start collapse animation
            const filterElement = document.querySelector(`[data-filter-index="${index}"]`);
            if (filterElement) {
                filterElement.classList.add('collapsing');

                // Wait for animation to finish, then hide
                setTimeout(() => {
                    setShowFilters(prev => ({
                        ...prev,
                        [index]: false
                    }));
                }, 300);
            }
        } else {
            // If currently hidden, show immediately
            setShowFilters(prev => ({
                ...prev,
                [index]: true
            }));
        }
    };

    // Update sender options when sender site and type changes
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

    // Update receiver options when receiver site and type changes
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
        if (isCreateModalOpen) {
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
            setSelectedReceiverSite("");
            // Clear category states
            setChildCategoriesByItem({});
            setShowFilters({});
        }
    }, [isCreateModalOpen, warehouseId]);

    // Update transaction data when role changes
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
            setSelectedReceiverSite("");
        } else if (transactionRole === "receiver") {
            setNewTransaction(prev => ({
                ...prev,
                senderType: "",
                senderId: "",
                receiverType: "WAREHOUSE",
                receiverId: warehouseId,
            }));
            setSelectedSenderSite("");
            setSelectedReceiverSite("");
        }
    }, [transactionRole, warehouseId]);

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
            } else {
                console.error("Failed to fetch sites, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        }
    };

    const fetchWarehouseDetails = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`http://localhost:8080/api/v1/warehouses/${warehouseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setWarehouseData({
                name: data.name || "",
                id: data.id || "",
            });
        } catch (error) {
            console.error("Error fetching warehouse details:", error);
        }
    };

    const fetchItems = async () => {
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
            console.error("Failed to fetch item types:", error);
        }
    };

    const fetchAllItemTypes = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/itemTypes`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAllItemTypes(data);
            }
        } catch (error) {
            console.error("Failed to fetch all item types:", error);
        }
    };

    const fetchEntitiesByTypeAndSite = async (entityType, siteId) => {
        if (!entityType || !siteId) return [];

        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/site/${siteId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/v1/site/${siteId}/equipment`;
            } else if (entityType === "MERCHANT") {
                endpoint = `http://localhost:8080/api/v1/merchants/site/${siteId}`;
            } else {
                console.error(`Unsupported entity type: ${entityType}`);
                return [];
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`${entityType} for site ${siteId}:`, data);
                return data;
            } else {
                console.error(`Failed to fetch ${entityType} for site ${siteId}, status:`, response.status);
                return [];
            }
        } catch (error) {
            console.error(`Failed to fetch ${entityType} for site ${siteId}:`, error);
            return [];
        }
    };

    // Function to fetch pending transactions directly from backend
    const fetchPendingTransactions = async () => {
        if (!warehouseId) {
            console.error("Warehouse ID is not available");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            // Fetch all transactions for this warehouse
            const response = await fetch(`http://localhost:8080/api/v1/transactions/warehouse/${warehouseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Filter for only pending transactions where this warehouse is the sentFirst (initiator)
                const pendingData = await Promise.all(
                    data
                        .filter(transaction =>
                            transaction.status === "PENDING" &&
                            (transaction.receiverId === warehouseId || transaction.senderId === warehouseId) &&
                            transaction.sentFirst === warehouseId // Filter for transactions where current warehouse is the initiator
                        )
                        .map(async (transaction) => {
                            const sender = await fetchEntityDetails(transaction.senderType, transaction.senderId);
                            const receiver = await fetchEntityDetails(transaction.receiverType, transaction.receiverId);
                            return {
                                ...transaction,
                                sender,
                                receiver
                            };
                        })
                );
                setPendingTransactions(pendingData);
            } else {
                console.error("Failed to fetch transactions, status:", response.status);
                showSnackbar("Failed to fetch pending transactions", "error");
            }
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            showSnackbar("Error fetching pending transactions", "error");
        } finally {
            setLoading(false);
        }
    };

    // Helper function to fetch entity details
    const fetchEntityDetails = async (entityType, entityId) => {
        if (!entityType || !entityId) return null;

        try {
            const token = localStorage.getItem("token");
            let endpoint;

            // Handle different entity types
            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === "SITE") {
                endpoint = `http://localhost:8080/api/v1/sites/${entityId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment/${entityId}`;
            } else {
                // Fallback for other entity types using lowercase pluralization
                endpoint = `http://localhost:8080/api/v1/${entityType.toLowerCase()}s/${entityId}`;
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                return await response.json();
            } else {
                console.error(`Failed to fetch ${entityType} details, status:`, response.status);
                return null;
            }
        } catch (error) {
            console.error(`Failed to fetch ${entityType} details:`, error);
            return null;
        }
    };

    // Function to handle opening the update modal
    const handleOpenUpdateModal = (transaction) => {
        setSelectedTransaction(transaction);
        setIsUpdateModalOpen(true);
    };

    // Function to handle opening the view modal
    const handleOpenViewModal = (transaction) => {
        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    // Function to handle update transaction
    const handleUpdateTransaction = async () => {
        console.log("🔄 Refreshing transactions after update");
        await fetchPendingTransactions();
        showSnackbar("Transaction successfully updated", "success");
    };

    // Function to close the update modal
    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
        setSelectedTransaction(null);
    };

    // Function to close the view modal
    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewTransaction(null);
    };

    // Handle add button click from DataTable
    const handleAddTransaction = () => {
        setIsCreateModalOpen(true);
    };

    // Handle input change for transaction form
    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setNewTransaction({
            ...newTransaction,
            [name]: value,
        });
    };

// Enhanced handleItemChange with category filtering
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...newTransaction.items];

        if (field === 'parentCategoryId') {
            // Reset child category and item type when parent changes
            updatedItems[index] = {
                ...updatedItems[index],
                parentCategoryId: value,
                itemCategoryId: '',
                itemType: { id: '' }
            };
            // Fetch child categories for this item
            if (value) {
                fetchChildCategories(value, index);
            } else {
                setChildCategoriesByItem(prev => ({
                    ...prev,
                    [index]: []
                }));
            }
        } else if (field === 'itemCategoryId') {
            // Reset item type when child category changes
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
            // Your existing quantity validation logic here
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
        setNewTransaction({
            ...newTransaction,
            items: [...newTransaction.items, { itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }]
        });
    };

    const removeItem = (index) => {
        if (newTransaction.items.length <= 1) {
            return;
        }

        const updatedItems = newTransaction.items.filter((_, i) => i !== index);
        setNewTransaction({
            ...newTransaction,
            items: updatedItems
        });

        // Clean up child categories and filter states for removed item
        setChildCategoriesByItem(prev => {
            const newChildCategories = { ...prev };
            delete newChildCategories[index];
            // Reindex remaining items
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

        // Clean up filter states
        setShowFilters(prev => {
            const newShowFilters = { ...prev };
            delete newShowFilters[index];
            // Reindex remaining items
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

    const handleSenderTypeChange = (e) => {
        setNewTransaction({
            ...newTransaction,
            senderType: e.target.value,
            senderId: "",
        });
    };

    const handleReceiverTypeChange = (e) => {
        setNewTransaction({
            ...newTransaction,
            receiverType: e.target.value,
            receiverId: "",
        });
    };

    const handleSenderSiteChange = (e) => {
        setSelectedSenderSite(e.target.value);
        setNewTransaction({
            ...newTransaction,
            senderType: "",
            senderId: "",
        });
    };

    const handleReceiverSiteChange = (e) => {
        setSelectedReceiverSite(e.target.value);
        setNewTransaction({
            ...newTransaction,
            receiverType: "",
            receiverId: "",
        });
    };

    const handleRoleChange = (e) => {
        setTransactionRole(e.target.value);
    };

    // NEW: Get filtered item types for a specific item
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

        // Apply category filtering
        let filteredTypes = baseItemTypes;

        // If child category is selected, filter by child category (most specific)
        if (item.itemCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.id === item.itemCategoryId
            );
        }
        // If only parent category is selected, show all item types under that parent
        else if (item.parentCategoryId) {
            filteredTypes = filteredTypes.filter(itemType =>
                itemType.itemCategory?.parentCategory?.id === item.parentCategoryId
            );
        }

        return filteredTypes;
    };

// Update your existing getAvailableItemTypes function
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
            const aggregatedItems = aggregateWarehouseItems(
                items.filter(warehouseItem => warehouseItem.itemStatus === "IN_WAREHOUSE")
            );

            return aggregatedItems.filter(aggregatedItem =>
                !selectedItemTypeIds.includes(aggregatedItem.itemType.id) &&
                filteredTypes.some(ft => ft.id === aggregatedItem.itemType.id)
            );
        }
    };

    const renderItemOptions = (currentIndex) => {
        const availableItems = getAvailableItemTypes(currentIndex);

        if (transactionRole === "receiver") {
            return availableItems.map((itemType) => (
                <option key={itemType.id} value={itemType.id}>
                    {itemType.name}
                </option>
            ));

        } else {
            return availableItems.map((aggregatedItem) => (
                <option key={aggregatedItem.itemType.id} value={aggregatedItem.itemType.id}>
                    {aggregatedItem.itemType.name} {aggregatedItem.itemType.measuringUnit ? `(${aggregatedItem.itemType.measuringUnit})` : ""} ({aggregatedItem.quantity} available)
                </option>
            ));
        }
    };

    const handleCreateTransaction = async (e) => {
        e.preventDefault();

        // Validate items
        for (const item of newTransaction.items) {
            if (!item.itemType.id || !item.quantity) {
                showSnackbar('Please complete all item fields', 'error');
                return;
            }

            // Check if the warehouse is the sender and verify inventory
            if (transactionRole === "sender") {
                const warehouseItemsOfType = items.filter(warehouseItem =>
                    warehouseItem.itemStatus === "IN_WAREHOUSE" &&
                    warehouseItem.itemType.id === item.itemType.id
                );

                if (warehouseItemsOfType.length === 0) {
                    showSnackbar('Item not found in the warehouse inventory or not available (IN_WAREHOUSE status)', 'error');
                    return;
                }

                const aggregatedItems = aggregateWarehouseItems(warehouseItemsOfType);
                const aggregatedItem = aggregatedItems.find(aggItem => aggItem.itemType.id === item.itemType.id);

                if (!aggregatedItem) {
                    showSnackbar('Item not found in the warehouse inventory', 'error');
                    return;
                }

                const totalAvailableQuantity = aggregatedItem.quantity;
                const itemTypeName = aggregatedItem.itemType.name;

                if (totalAvailableQuantity < parseInt(item.quantity)) {
                    showSnackbar(`Not enough quantity available for ${itemTypeName}. Only ${totalAvailableQuantity} items in stock.`, 'error');
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

        console.log("Creating transaction:", JSON.stringify(transactionData));

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/transactions/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(transactionData),
            });

            if (response.ok) {
                await fetchPendingTransactions();
                setIsCreateModalOpen(false);
                showSnackbar('Transaction created successfully!', 'success');
            } else {
                const errorText = await response.text();
                console.error("Failed to create transaction:", response.status, errorText);
                showSnackbar('Failed to create transaction. Please try again.', 'error');
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            showSnackbar('Failed to create transaction. Please check your connection.', 'error');
        }
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

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // Define table columns for DataTable
    const columns = [
        {
            header: 'SENDER',
            accessor: 'sender',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => {
                if (!row.sender) return "N/A";
                return row.sender.name || row.sender.fullModelName || row.sender.equipment?.fullModelName || "N/A";
            }
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => {
                if (!row.receiver) return "N/A";
                return row.receiver.name || row.receiver.fullModelName || row.receiver.equipment?.fullModelName || "N/A";
            }
        },
        {
            header: 'BATCH NUMBER',
            accessor: 'batchNumber',
            sortable: true,
            width: '200px',
            minWidth: '120px',
            render: (row) => row.batchNumber || "N/A"
        },
        {
            header: 'TRANSACTION DATE',
            accessor: 'transactionDate',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => formatDate(row.transactionDate)
        }
    ];
    // NEW: Fetch parent categories
    const fetchParentCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/itemCategories/parents', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load parent categories');
            }

            const data = await response.json();
            setParentCategories(data);
        } catch (error) {
            console.error('Error fetching parent categories:', error);
        }
    };

// NEW: Fetch child categories for a specific parent
    const fetchChildCategories = async (parentCategoryId, itemIndex) => {
        if (!parentCategoryId) {
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/v1/itemCategories/children/${parentCategoryId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load child categories');
            }

            const data = await response.json();
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: data
            }));
        } catch (error) {
            console.error('Error fetching child categories:', error);
            setChildCategoriesByItem(prev => ({
                ...prev,
                [itemIndex]: []
            }));
        }
    };

    // Filterable columns for DataTable
    const filterableColumns = [
        {
            header: 'ITEMS',
            accessor: 'items',
            filterType: 'number'
        },
        {
            header: 'SENDER',
            accessor: 'sender',
            filterType: 'text'
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            filterType: 'text'
        },
        {
            header: 'BATCH NUMBER',
            accessor: 'batchNumber',
            filterType: 'number'
        },
        {
            header: 'TRANSACTION DATE',
            accessor: 'transactionDate',
            filterType: 'text'
        },
        {
            header: 'CREATED AT',
            accessor: 'createdAt',
            filterType: 'text'
        },
        {
            header: 'CREATED BY',
            accessor: 'addedBy',
            filterType: 'text'
        }
    ];

    // Actions array for DataTable - Using the DataTable's action button system
    const actions = [
        {
            label: 'View',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            className: 'view',
            onClick: (row) => handleOpenViewModal(row)
        },
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            className: 'edit',
            onClick: (row) => handleOpenUpdateModal(row)
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            ),
            className: 'delete',
            //onClick: (row) => onDelete(row.id)
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">
                <div className="left-section3">
                    <div className="item-count3">{pendingTransactions.length} pending transactions</div>
                </div>
            </div>

            {/* DataTable Component with Add Button */}
            <DataTable
                data={pendingTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="You haven't created any transactions that are waiting for approval"
                actions={actions}
                className="pending-transactions-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="150px"
                showAddButton={true}
                addButtonText="Add Transaction"
                addButtonIcon={<FaPlus />}
                onAddClick={handleAddTransaction}
            />

            {/* View Transaction Modal - Show quantities for pending transactions since they can be edited */}
            {isViewModalOpen && viewTransaction && (
                <TransactionViewModal
                    transaction={viewTransaction}
                    isOpen={isViewModalOpen}
                    onClose={handleCloseViewModal}
                    hideItemQuantities={false}
                />
            )}

            {/* Update Transaction Modal */}
            {isUpdateModalOpen && selectedTransaction && (
                <UpdatePendingTransactionModal
                    transaction={selectedTransaction}
                    isOpen={isUpdateModalOpen}
                    onClose={handleCloseUpdateModal}
                    onUpdate={handleUpdateTransaction}
                    warehouseId={warehouseId}
                />
            )}

            {/* Modal for Creating Transaction */}
            {isCreateModalOpen && (
                <div className="modal-backdrop3">
                    <div className="modal3">
                        <div className="modal-header3">
                            <h2>Create New Transaction</h2>
                            <button className="btn-close" onClick={() => setIsCreateModalOpen(false)}>

                            </button>
                        </div>

                        <form className="form-transaction" onSubmit={handleCreateTransaction}>
                            {/* Warehouse Role Selection - Full Width */}
                            <div className="form-group3 full-width">
                                <label>Warehouse Role <span style={{ color: 'red' }}>*</span></label>
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
                                <label htmlFor="transactionDate">Transaction Date <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="datetime-local"
                                    id="transactionDate"
                                    name="transactionDate"
                                    value={newTransaction.transactionDate}
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

                                {newTransaction.items.map((item, index) => (
                                    <div key={index} className="transaction-item-container">
                                        <div className="transaction-item-header">
                                            <span>Item {index + 1}</span>
                                            <div className="transaction-item-header-actions">
                                                <button
                                                    type="button"
                                                    className={`transaction-filter-toggle ${showFilters[index] ? 'active' : ''}`}
                                                    onClick={() => toggleFilters(index)}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                    </svg>
                                                    {showFilters[index] ? 'Hide Filters' : 'Filter Categories'}
                                                </button>
                                                {newTransaction.items.length > 1 && (
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
                                        </div>

                                        {/* COLLAPSIBLE FILTERS */}
                                        {showFilters[index] && (
                                            <div
                                                className="transaction-collapsible-filters"
                                                data-filter-index={index}
                                            >
                                                <div className="transaction-filters-header">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z"/>
                                                    </svg>
                                                    <h4>Category Filters</h4>
                                                </div>

                                                <div className="transaction-filters-content">
                                                    <div className="form-group3">
                                                        <label>Parent Category</label>
                                                        <select
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
                                                        <span className="form-helper-text">
                            Choose a parent category to filter item types
                        </span>
                                                    </div>

                                                    <div className="form-group3">
                                                        <label>Child Category</label>
                                                        <select
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
                                                        <span className="form-helper-text">
                            {!item.parentCategoryId ? (
                                "Select a parent category first"
                            ) : (childCategoriesByItem[index] || []).length === 0 ? (
                                "No child categories found for the selected parent category"
                            ) : (
                                "Optional - leave empty to show all from parent"
                            )}
                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-row3">
                                            <div className="form-group3">
                                                <label>Item Type <span style={{ color: 'red' }}>*</span></label>
                                                <select
                                                    value={item.itemType.id}
                                                    onChange={(e) => handleItemChange(index, 'itemTypeId', e.target.value)}
                                                    required
                                                >
                                                    <option value="" disabled>Select Item Type</option>
                                                    {renderItemOptions(index)}
                                                </select>
                                            </div>

                                            <div className="form-group3">
                                                <label>Quantity <span style={{ color: 'red' }}>*</span></label>
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
                                                    {item.itemType.id && (
                                                        <span className="ro-unit-label">
                            {(() => {
                                let unit = '';
                                if (transactionRole === "receiver") {
                                    const itemType = allItemTypes.find(it => it.id === item.itemType.id);
                                    unit = itemType?.measuringUnit || '';
                                } else {
                                    const warehouseItem = items.find(it => it.itemType.id === item.itemType.id);
                                    unit = warehouseItem?.itemType?.measuringUnit || '';
                                }
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
                                <label htmlFor="batchNumber">Batch Number <span style={{ color: 'red' }}>*</span></label>
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

                                        <div className="form-group3">
                                            <label htmlFor="receiverSite">Destination Site <span style={{ color: 'red' }}>*</span></label>
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
                                            <label htmlFor="receiverType">Destination Type <span style={{ color: 'red' }}>*</span></label>
                                            <select
                                                id="receiverType"
                                                name="receiverType"
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

                                    {/* Entity Selection (only shown after type is selected) */}
                                    {selectedReceiverSite && newTransaction.receiverType && (
                                        <div className="form-group3 full-width">
                                            <label htmlFor="receiverId">
                                                Select {newTransaction.receiverType.charAt(0).toUpperCase() + newTransaction.receiverType.slice(1).toLowerCase()} <span style={{ color: 'red' }}>*</span>
                                            </label>
                                            <select
                                                id="receiverId"
                                                name="receiverId"
                                                value={newTransaction.receiverId}
                                                onChange={(e) => setNewTransaction({
                                                    ...newTransaction,
                                                    receiverId: e.target.value
                                                })}
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
                                    {/* When warehouse is receiver */}
                                    <div className="form-row3">
                                        <div className="form-group3">
                                            <label htmlFor="senderSite">Source Site <span style={{ color: 'red' }}>*</span></label>
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
                                            <label htmlFor="senderType">Source Type <span style={{ color: 'red' }}>*</span></label>
                                            <select
                                                id="senderType"
                                                name="senderType"
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

                                    {/* Entity Selection (only shown after type is selected) */}
                                    {selectedSenderSite && newTransaction.senderType && (
                                        <div className="form-group3 full-width">
                                            <label htmlFor="senderId">
                                                Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()} <span style={{ color: 'red' }}>*</span>
                                            </label>
                                            <select
                                                id="senderId"
                                                name="senderId"
                                                value={newTransaction.senderId}
                                                onChange={(e) => setNewTransaction({
                                                    ...newTransaction,
                                                    senderId: e.target.value
                                                })}
                                                required
                                            >
                                                <option value="" disabled>Select {newTransaction.senderType.charAt(0).toUpperCase() + newTransaction.senderType.slice(1).toLowerCase()}</option>
                                                {senderOptions.length > 0 ? (
                                                    senderOptions.map((entity) => {
                                                        let displayName, entityId;

                                                        if (newTransaction.senderType === "EQUIPMENT") {
                                                            displayName = entity.equipment ? entity.equipment.fullModelName : "No model name available";
                                                            entityId = entity.equipment ? entity.equipment.id : entity.id;
                                                        } else{
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

                            <div className="modal-footer3">
                                <button type="submit" className="btn-primary">Create Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Snackbar
                show={snackbar.isOpen}
                message={snackbar.message}
                type={snackbar.type}
                onClose={closeSnackbar}
                duration={3000}
            />
        </div>
    );
};

export default PendingTransactionsTable;