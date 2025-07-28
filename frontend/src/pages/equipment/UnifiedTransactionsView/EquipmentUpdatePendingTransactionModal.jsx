import React, { useState, useEffect } from "react";
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import { equipmentService } from "../../../services/equipmentService";
import { siteService } from "../../../services/siteService";

const EquipmentUpdatePendingTransactionModal = ({ transaction, isOpen, onClose, onUpdate, equipmentId }) => {
    const [updatedTransaction, setUpdatedTransaction] = useState(transaction || {});
    const [transactionRole, setTransactionRole] = useState("");
    const [items, setItems] = useState([]);
    const [allSites, setAllSites] = useState([]);
    const [selectedSenderSite, setSelectedSenderSite] = useState("");
    const [selectedReceiverSite, setSelectedReceiverSite] = useState("");
    const [senderOptions, setSenderOptions] = useState([]);
    const [receiverOptions, setReceiverOptions] = useState([]);
    const [entityTypes, setEntityTypes] = useState(["WAREHOUSE", "EQUIPMENT"]);
    const [equipmentData, setEquipmentData] = useState({});
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
    useEffect(() => {
        if (transaction && isOpen) {
            console.log("🔍 FULL TRANSACTION OBJECT:", JSON.stringify(transaction, null, 2));

            // Format items correctly based on actual API structure
            const formattedItems = (transaction.items || []).map(item => ({
                itemType: {
                    id: item.itemTypeId || "",
                    name: item.itemTypeName || "",
                    measuringUnit: ""
                },
                quantity: item.quantity || 1
            }));

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

            // Determine transaction role based on equipmentId
            if (transaction.senderId === equipmentId) {
                setTransactionRole("sender");
            } else if (transaction.receiverId === equipmentId) {
                setTransactionRole("receiver");
            }

            // Set site selections based on existing data
            setSelectedSenderSite(transaction.senderSiteId || "");
            setSelectedReceiverSite(transaction.receiverSiteId || "");
        }
    }, [transaction, isOpen, equipmentId]);

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchEquipmentData();
            fetchAllSites();
            fetchItems();
        }
    }, [isOpen, equipmentId]);

    const formatDateTimeForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    };

    const fetchEquipmentData = async () => {
        try {
            const response = await equipmentService.getEquipmentById(equipmentId);
            setEquipmentData(response.data);
        } catch (error) {
            console.error("Failed to fetch equipment data:", error);
        }
    };

    const fetchAllSites = async () => {
        try {
            const response = await siteService.getAllSites();
            setAllSites(response.data);
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        }
    };

    const fetchItems = async () => {
        try {
            const response = await equipmentService.getEquipmentItems(equipmentId);
            setItems(response.data);
        } catch (error) {
            console.error("Failed to fetch items:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUpdatedTransaction(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...updatedTransaction.items];
        if (field === 'itemType') {
            newItems[index].itemType = { id: value, name: "", measuringUnit: "" };
        } else {
            newItems[index][field] = value;
        }
        setUpdatedTransaction(prev => ({
            ...prev,
            items: newItems
        }));
    };

    const addItem = () => {
        setUpdatedTransaction(prev => ({
            ...prev,
            items: [...prev.items, { itemType: { id: "", name: "", measuringUnit: "" }, quantity: 1 }]
        }));
    };

    const removeItem = (index) => {
        setUpdatedTransaction(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
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

            // Prepare data for API
            const transactionData = {
                ...updatedTransaction,
                id: transaction.id,
                status: updatedTransaction.status || transaction.status,
                senderId: transactionRole === "sender" ? equipmentId : updatedTransaction.senderId,
                senderType: transactionRole === "sender" ? "EQUIPMENT" : updatedTransaction.senderType,
                receiverId: transactionRole === "receiver" ? equipmentId : updatedTransaction.receiverId,
                receiverType: transactionRole === "receiver" ? "EQUIPMENT" : updatedTransaction.receiverType,
                username: username
            };

            const response = await equipmentService.updateEquipmentTransaction(equipmentId, transaction.id, transactionData);

            showSnackbar('success', 'Transaction updated successfully!');
            if (onUpdate) {
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

    return (
        <div className="modal-backdrop">
            <div className="flat-modal large-modal">
                <Snackbar
                    type={snackbar.type}
                    text={snackbar.text}
                    isVisible={snackbar.isVisible}
                    onClose={hideSnackbar}
                    duration={4000}
                />

                <div className="flat-modal-header">
                    <h2>Update Transaction</h2>
                    <button
                        className="btn-close"
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="flat-modal-content">
                    <form onSubmit={handleSubmit} className="update-transaction-form">
                        {/* Transaction Details */}
                        <div className="form-section">
                            <h3>Transaction Details</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Transaction Date</label>
                                    <input
                                        type="datetime-local"
                                        name="transactionDate"
                                        value={updatedTransaction.transactionDate || ""}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Batch Number</label>
                                    <input
                                        type="number"
                                        name="batchNumber"
                                        value={updatedTransaction.batchNumber || ""}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="form-section">
                            <h3>Items</h3>
                            {updatedTransaction.items?.map((item, index) => (
                                <div key={index} className="item-row">
                                    <div className="form-group">
                                        <label>Item Type</label>
                                        <select
                                            value={item.itemType?.id || ""}
                                            onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                                            disabled={isLoading}
                                            required
                                        >
                                            <option value="">Select Item Type</option>
                                            {items.map(itemType => (
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
                                            value={item.quantity || 1}
                                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-remove"
                                        onClick={() => removeItem(index)}
                                        disabled={isLoading || updatedTransaction.items.length === 1}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={addItem}
                                disabled={isLoading}
                            >
                                Add Item
                            </button>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="flat-modal-footer">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? "Updating..." : "Update Transaction"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EquipmentUpdatePendingTransactionModal; 