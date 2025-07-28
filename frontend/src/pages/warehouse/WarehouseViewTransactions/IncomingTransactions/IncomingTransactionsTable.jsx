import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import "./AcceptRejectModal.scss";
import TransactionViewModal from "../TransactionViewModal/TransactionViewModal.jsx";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import { transactionService } from '../../../../services/transaction/transactionService.js';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { itemCategoryService } from '../../../../services/warehouse/itemCategoryService';
import { siteService } from '../../../../services/siteService';
import { equipmentService } from '../../../../services/equipmentService';

const IncomingTransactionsTable = ({
                                       warehouseId,
                                       refreshTrigger,
                                       onCountUpdate,
                                       lastSeenTimestamp,  // Add this line
                                       onTransactionUpdate
                                   }) => {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [viewTransaction, setViewTransaction] = useState(null);
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [itemsNotReceived, setItemsNotReceived] = useState({});
    const [rejectionReason, setRejectionReason] = useState("");
    const [comments, setComments] = useState("");
    const [acceptError, setAcceptError] = useState("");
    const [rejectError, setRejectError] = useState("");
    const [processingAction, setProcessingAction] = useState(false);

    // Replace old notification states with snackbar state
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Helper function to show snackbar
    const showSnackbar = (message, type = "success") => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Helper function to close snackbar
    const closeSnackbar = () => {
        setShowNotification(false);
    };

    // Helper function to get item display name - Fixed for your data structure
    const getItemDisplayName = (item) => {
        // Your items have itemTypeName directly, not nested in itemType object
        return item?.itemTypeName || item?.name || item?.itemName || `Item ${item?.id || 'Unknown'}`;
    };

    // Helper function to get measuring unit
    const getItemMeasuringUnit = (item) => {
        // You might need to add measuringUnit to your backend response
        // For now, return null since it's not in your current data structure
        return item?.itemUnit || item?.itemType?.measuringUnit || null;
    };

    // Helper function to get item category
    const getItemCategory = (item) => {
        // Your items have itemCategory directly as a string
        return item?.itemCategory || item?.category || item?.itemType?.itemCategory?.name || "";
    };

    // Fetch transactions when component mounts or warehouseId changes
    useEffect(() => {
        fetchPendingTransactions();
    }, [warehouseId]);

    useEffect(() => {
        fetchPendingTransactions();
    }, [refreshTrigger]);

    useEffect(() => {
        if (onCountUpdate) {
            onCountUpdate(pendingTransactions.length, pendingTransactions);
        }
    }, [pendingTransactions.length, onCountUpdate]);

    // Function to fetch pending transactions directly from backend
    const fetchPendingTransactions = async () => {
        if (!warehouseId) {
            console.error("Warehouse ID is not available");
            return;
        }
        setLoading(true);
        try {
            const data = await transactionService.getTransactionsForWarehouse(warehouseId);

            // Filter for only pending transactions where:
            // 1. Status is PENDING
            // 2. Current warehouse is involved (as sender or receiver)
            // 3. Current warehouse is NOT the entity that initiated the transaction (sentFirst)
            const pendingData = await Promise.all(
                data
                    .filter(transaction =>
                        transaction.status === "PENDING" &&
                        (transaction.receiverId === warehouseId || transaction.senderId === warehouseId) &&
                        transaction.sentFirst !== warehouseId
                    )
                    .map(async (transaction) => {
                        const sender = await fetchEntityDetails(transaction.senderType, transaction.senderId);
                        const receiver = await fetchEntityDetails(transaction.receiverType, transaction.receiverId);

                        // Process entity data for consistent display
                        const processedSender = processEntityData(transaction.senderType, sender);
                        const processedReceiver = processEntityData(transaction.receiverType, receiver);

                        return {
                            ...transaction,
                            sender: processedSender,
                            receiver: processedReceiver
                        };
                    })
            );
            setPendingTransactions(pendingData);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAcceptModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isAcceptModalOpen]);

    // Helper function to process entity data for consistent display
    const processEntityData = (entityType, entityData) => {
        if (!entityData) return null;

        switch (entityType) {
            case "EQUIPMENT":
                return {
                    id: entityData.equipment?.id || entityData.id,
                    name: entityData.name || entityData.equipment?.fullModelName ||
                        `${entityData.equipment?.brand || ''} ${entityData.equipment?.type || ''} ${entityData.equipment?.serialNumber || ''}`.trim(),
                    type: "EQUIPMENT"
                };
            case "WAREHOUSE":
                return {
                    id: entityData.id,
                    name: entityData.name,
                    type: "WAREHOUSE"
                };
            case "SITE":
                return {
                    id: entityData.id,
                    name: entityData.name,
                    type: "SITE"
                };
            default:
                return {
                    id: entityData.id,
                    name: entityData.name || "Unknown",
                    type: entityType
                };
        }
    };

    // Helper function to fetch entity details
// Helper function to fetch entity details
    const fetchEntityDetails = async (entityType, entityId) => {
        if (!entityType || !entityId) return null;

        try {
            let response;
            if (entityType === "WAREHOUSE") {
                response = await warehouseService.getById(entityId);
            } else if (entityType === "SITE") {
                response = await siteService.getById(entityId);
            } else if (entityType === "EQUIPMENT") {
                response = await equipmentService.getEquipmentById(entityId);
            } else {
                console.error(`Unsupported entity type: ${entityType}`);
                return null;
            }

            // Extract data from the response (this handles both response.data and direct response)
            return response.data || response;
        } catch (error) {
            console.error(`Failed to fetch ${entityType} details:`, error);
            return null;
        }
    };

    // Function to open accept modal
    const openAcceptModal = (transaction) => {
        setSelectedTransaction(transaction);
        setComments("");
        setAcceptError("");

        // Initialize received quantities and not received flags
        if (transaction.items && transaction.items.length > 0) {
            const initialQuantities = {};
            const initialNotReceived = {};
            transaction.items.forEach((item, index) => {
                initialQuantities[index] = "";
                initialNotReceived[index] = false;
            });
            setReceivedQuantities(initialQuantities);
            setItemsNotReceived(initialNotReceived);
        }

        setIsAcceptModalOpen(true);
    };

    // Function to open reject modal
    const openRejectModal = (transaction) => {
        setSelectedTransaction(transaction);
        setRejectionReason("");
        setRejectError("");
        setIsRejectModalOpen(true);
    };

    // Function to handle opening the view modal
    const handleOpenViewModal = (transaction) => {
        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    // Function to close the view modal
    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewTransaction(null);
    };

    // Handle item quantity change
    const handleItemQuantityChange = (index, value) => {
        setReceivedQuantities(prev => ({
            ...prev,
            [index]: value
        }));
    };

    // Handle item not received checkbox change
    const handleItemNotReceivedChange = (index, notReceived) => {
        setItemsNotReceived(prev => ({
            ...prev,
            [index]: notReceived
        }));

        if (notReceived) {
            setReceivedQuantities(prev => ({
                ...prev,
                [index]: ""
            }));
        }
    };

    // Function to accept transaction
    const handleAcceptTransaction = async (e) => {
        e.preventDefault();
        setProcessingAction(true);
        setAcceptError("");

        // Validate inputs
        const hasInvalidInputs = selectedTransaction.items.some((item, index) => {
            const quantity = receivedQuantities[index];
            const notReceived = itemsNotReceived[index];

            if (!notReceived) {
                return isNaN(quantity) || quantity === "" || parseInt(quantity) < 0;
            }
            return false;
        });

        if (hasInvalidInputs) {
            setAcceptError("Please enter valid quantities for all items or mark them as not received");
            setProcessingAction(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

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

            const receivedItems = selectedTransaction.items.map((item, index) => ({
                transactionItemId: item.id,
                receivedQuantity: itemsNotReceived[index] ? 0 : parseInt(receivedQuantities[index]),
                itemNotReceived: itemsNotReceived[index] || false
            }));

            await transactionService.accept(selectedTransaction.id, {
                receivedItems: receivedItems,
                username: username,
                acceptanceComment: comments
            });

            fetchPendingTransactions();
            setIsAcceptModalOpen(false);
            showSnackbar("Transaction Accepted Successfully", "success");

            if (onTransactionUpdate) {
                onTransactionUpdate();

            } else {
                let errorMessage = "Failed to accept transaction";
                let snackbarMessage = "Failed to accept transaction";

                try {
                    const errorData = await response.text();
                    console.log("Error response:", errorData);
                    console.log("Response status:", response.status);

                    // Check if we have any error data
                    if (errorData && errorData.trim()) {
                        console.log("Checking if includes 'No available items':", errorData.includes("No available items in warehouse for:"));

                        // ✅ Check for specific "No available items" error
                        if (errorData.includes("No available items in warehouse for:")) {
                            const match = errorData.match(/No available items in warehouse for:\s*([^\s,]+)/);
                            console.log("Regex match result:", match);
                            const itemName = match ? match[1] : "this item";
                            console.log("Extracted item name:", itemName);

                            errorMessage = `Insufficient inventory for ${itemName}`;
                            snackbarMessage = `You don't have enough ${itemName} in your warehouse`;
                        } else if (errorData.includes("IllegalArgumentException")) {
                            errorMessage = errorData.replace("java.lang.IllegalArgumentException: ", "");
                            snackbarMessage = errorMessage;
                        } else {
                            errorMessage = errorData;
                            snackbarMessage = errorData;
                        }
                    } else {
                        // ✅ Handle empty response based on status code
                        if (response.status === 500) {
                            errorMessage = "Server error occurred";
                            snackbarMessage = "Please check if you have sufficient inventory";
                        } else if (response.status === 400) {
                            errorMessage = "Invalid request";
                            snackbarMessage = "Invalid request - please check your input";
                        } else {
                            errorMessage = `Server error (${response.status})`;
                            snackbarMessage = `Server error (${response.status})`;
                        }
                    }
                } catch (e) {
                    console.error("Error parsing error response:", e);
                    // ✅ Better fallback for parse errors
                    if (response.status === 500) {
                        errorMessage = "Server error occurred";
                        snackbarMessage = "Please check if you have sufficient inventory";
                    }
                }

                setAcceptError(errorMessage);
                showSnackbar(snackbarMessage, "error");
                console.error("Failed to accept transaction:", errorMessage);
            }
        } catch (error) {
            setAcceptError("Network error. Please try again.");
            showSnackbar("Network error. Please try again.", "error");
            console.error("Error accepting transaction:", error);
        } finally {
            setProcessingAction(false);
        }
    };

    // Helper function to format entity name for display
    const getEntityDisplayName = (entity, entityType) => {
        if (!entity) return "N/A";
        return entity.name || "N/A";
    };

    // Format date helper functions
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
            render: (row) => getEntityDisplayName(row.sender, row.senderType)
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => getEntityDisplayName(row.receiver, row.receiverType)
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

    // Filterable columns for DataTable
    const filterableColumns = [
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
        }
    ];

    // Actions array for DataTable
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
            label: 'Accept',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7"/>
                </svg>
            ),
            className: 'approve',
            onClick: (row) => openAcceptModal(row)
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">

            </div>

            {/* DataTable Component */}
            <DataTable
                data={pendingTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="There are no transactions waiting for your approval"
                actions={actions}
                className="incoming-transactions-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="200px"
            />

            {/* View Transaction Modal */}
            {isViewModalOpen && viewTransaction && (
                <TransactionViewModal
                    transaction={viewTransaction}
                    isOpen={isViewModalOpen}
                    onClose={handleCloseViewModal}
                    hideItemQuantities={false}
                    currentWarehouseId={warehouseId}
                />
            )}

            {/* Modern Accept Transaction Modal */}
            {isAcceptModalOpen && selectedTransaction && (
                <div className="accept-transaction-modal-overlay" onClick={() => !processingAction && setIsAcceptModalOpen(false)}>
                    <div className="accept-transaction-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="accept-transaction-modal-header">
                            <div className="accept-transaction-modal-header-content">
                                <h2 className="accept-transaction-modal-title">Accept Transaction</h2>

                            </div>
                            <button
                                className="btn-close"
                                onClick={() => setIsAcceptModalOpen(false)}
                                disabled={processingAction}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="accept-transaction-modal-content">
                            {/* Transaction Overview */}
                            <div className="accept-transaction-content-section">
                                <h3 className="accept-transaction-section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 11H1v3h8v3l8-5-8-5v3z"/>
                                        <path d="M20 4v7a2 2 0 01-2 2H6"/>
                                    </svg>
                                    Transaction Overview
                                </h3>
                                <div className="accept-transaction-overview-grid">
                                    <div className="accept-transaction-overview-item">
                                        <div className="accept-transaction-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                <polyline points="14,2 14,8 20,8"/>
                                                <line x1="16" y1="13" x2="8" y2="13"/>
                                                <line x1="16" y1="17" x2="8" y2="17"/>
                                                <polyline points="10,9 9,9 8,9"/>
                                            </svg>
                                        </div>
                                        <div className="accept-transaction-overview-content">
                                            <span className="accept-transaction-label">Batch Number</span>
                                            <span className="accept-transaction-value">#{selectedTransaction.batchNumber || "N/A"}</span>
                                        </div>
                                    </div>

                                    <div className="accept-transaction-overview-item">
                                        <div className="accept-transaction-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                        </div>
                                        <div className="accept-transaction-overview-content">
                                            <span className="accept-transaction-label">Transaction Date</span>
                                            <span className="accept-transaction-value">{formatDate(selectedTransaction.transactionDate)}</span>
                                        </div>
                                    </div>

                                    <div className="accept-transaction-overview-item">
                                        <div className="accept-transaction-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <div className="accept-transaction-overview-content">
                                            <span className="accept-transaction-label">From</span>
                                            <span className="accept-transaction-value">{getEntityDisplayName(selectedTransaction.sender, selectedTransaction.senderType)}</span>
                                        </div>
                                    </div>

                                    <div className="accept-transaction-overview-item">
                                        <div className="accept-transaction-overview-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                        <div className="accept-transaction-overview-content">
                                            <span className="accept-transaction-label">To</span>
                                            <span className="accept-transaction-value">{getEntityDisplayName(selectedTransaction.receiver, selectedTransaction.receiverType)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Items */}
                            <div className="accept-transaction-content-section">
                                <h3 className="accept-transaction-section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                                    </svg>
                                    {/* Dynamic title based on transaction type */}
                                    {selectedTransaction.receiverId === warehouseId ? (
                                        "Items & Received Quantities"
                                    ) : (
                                        "Items & Sent Quantities"
                                    )}
                                </h3>

                                {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                                    <div className="accept-transaction-items-grid">
                                        {selectedTransaction.items.map((item, index) => (
                                            <div key={index} className="accept-transaction-item-card">
                                                <div className="accept-transaction-item-header">
                                                    <div className="accept-transaction-item-icon-container">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                                                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                        </svg>
                                                    </div>
                                                    <div className="accept-transaction-item-info">
                                                        <div className="accept-transaction-item-name">{getItemDisplayName(item)}</div>
                                                        <div className="accept-transaction-item-category">{getItemCategory(item)}</div>
                                                        {/* Show different info based on transaction type */}

                                                    </div>
                                                </div>

                                                <div className="accept-transaction-quantity-section">
                                                    {/* Dynamic label based on transaction type */}
                                                    <div className="accept-transaction-quantity-label">
                                                        {selectedTransaction.receiverId === warehouseId ? (
                                                            // This warehouse is receiving
                                                            <>Received Quantity {!itemsNotReceived[index] && <span className="required-asterisk">*</span>}</>
                                                        ) : (
                                                            // This warehouse is sending
                                                            <>Sent Quantity {!itemsNotReceived[index] && <span className="required-asterisk">*</span>}</>
                                                        )}
                                                    </div>

                                                    <div className={`accept-transaction-quantity-controls ${itemsNotReceived[index] ? 'disabled' : ''}`}>
                                                        <button
                                                            type="button"
                                                            className="accept-transaction-quantity-btn decrement"
                                                            onClick={() => {
                                                                const current = parseInt(receivedQuantities[index]) || 0;
                                                                handleItemQuantityChange(index, Math.max(0, current - 1));
                                                            }}
                                                            disabled={processingAction || itemsNotReceived[index] || (parseInt(receivedQuantities[index]) || 0) <= 0}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M5 12h14"/>
                                                            </svg>
                                                        </button>

                                                        <input
                                                            type="number"
                                                            className="accept-transaction-quantity-input"
                                                            value={itemsNotReceived[index] ? "" : (receivedQuantities[index] || "")}
                                                            onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                                            placeholder={itemsNotReceived[index] ? "Not processed" : "0"}
                                                            min="0"
                                                            disabled={processingAction || itemsNotReceived[index]}
                                                        />

                                                        <button
                                                            type="button"
                                                            className="accept-transaction-quantity-btn increment"
                                                            onClick={() => {
                                                                const current = parseInt(receivedQuantities[index]) || 0;
                                                                handleItemQuantityChange(index, current + 1);
                                                            }}
                                                            disabled={processingAction || itemsNotReceived[index]}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M12 5v14M5 12h14"/>
                                                            </svg>
                                                        </button>

                                                        <span className="accept-transaction-unit-label">
                                                            {getItemMeasuringUnit(item) || 'units'}
                                                        </span>
                                                    </div>

                                                    <div className="accept-transaction-not-received-section">
                                                        <label className="accept-transaction-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={itemsNotReceived[index] || false}
                                                                onChange={(e) => handleItemNotReceivedChange(index, e.target.checked)}
                                                                disabled={processingAction}
                                                            />
                                                            <span className="accept-transaction-checkmark"></span>
                                                            {/* Dynamic checkbox text based on transaction type */}
                                                            <span className="accept-transaction-checkbox-text">
                                                                {selectedTransaction.receiverId === warehouseId ? (
                                                                    "Item not received"
                                                                ) : (
                                                                    "Item not sent"
                                                                )}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="accept-transaction-empty-state">
                                        <div className="accept-transaction-empty-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M8 12h8"/>
                                            </svg>
                                        </div>
                                        <div className="accept-transaction-empty-content">
                                            <p className="accept-transaction-empty-title">No items found</p>
                                            <p className="accept-transaction-empty-description">This transaction doesn't contain any items.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Comments Section */}
                            <div className="accept-transaction-content-section">
                                <h3 className="accept-transaction-section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                                    </svg>
                                    Comments
                                </h3>
                                <div className="accept-transaction-comments-container">
                                    <textarea
                                        className="accept-transaction-comments-textarea"
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder={selectedTransaction.receiverId === warehouseId ?
                                            "Add any comments about receiving these items (optional)..." :
                                            "Add any comments about sending these items (optional)..."
                                        }
                                        disabled={processingAction}
                                        rows={4}
                                    />
                                </div>
                            </div>

                            {/* Error Section */}
                            {acceptError && (
                                <div className="accept-transaction-error-section">
                                    <div className="accept-transaction-error-container">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{acceptError}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="accept-transaction-modal-footer">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setIsAcceptModalOpen(false)}
                                disabled={processingAction}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleAcceptTransaction}
                                // disabled={processingAction || selectedTransaction.items?.some((_, index) => {
                                //     if (itemsNotReceived[index]) return false;
                                //     return receivedQuantities[index] === undefined ||
                                //         receivedQuantities[index] === "" ||
                                //         parseInt(receivedQuantities[index]) < 0;
                                // })}
                            >
                                {processingAction ? (
                                    <>
                                        <svg className="accept-transaction-loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                        Accept Transaction
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar Component */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={closeSnackbar}
                duration={3000}
            />
        </div>
    );
};

export default IncomingTransactionsTable;