import React, { useState, useEffect } from "react";
import "./WarehouseViewTransactions.scss";
import "./AcceptRejectModal.scss";
import TransactionViewModal from "./PendingTransactions/TransactionViewModal.jsx"; // Add this import
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";

const IncomingTransactionsTable = ({ warehouseId }) => {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false); // Add this state
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [viewTransaction, setViewTransaction] = useState(null); // Add this state
    const [receivedQuantities, setReceivedQuantities] = useState({});
    const [itemsNotReceived, setItemsNotReceived] = useState({}); // NEW: Track items not received
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

    // Fetch transactions when component mounts or warehouseId changes
    useEffect(() => {
        fetchPendingTransactions();
    }, [warehouseId]);

    // Function to fetch pending transactions directly from backend
    const fetchPendingTransactions = async () => {
        if (!warehouseId) {
            console.error("Warehouse ID is not available");
            return;
        }
        setLoading(true);
        try {
            // Fetch all transactions for this warehouse
            const token = localStorage.getItem('token');

            const response = await fetch(`http://localhost:8080/api/v1/transactions/warehouse/${warehouseId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Filter for only pending transactions where:
                // 1. Status is PENDING
                // 2. Current warehouse is involved (as sender or receiver)
                // 3. Current warehouse is NOT the entity that initiated the transaction (sentFirst)
                const pendingData = await Promise.all(
                    data
                        .filter(transaction =>
                            transaction.status === "PENDING" &&
                            (transaction.receiverId === warehouseId || transaction.senderId === warehouseId) &&
                            transaction.sentFirst !== warehouseId // Filter transactions where warehouse is not the initiator
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
            } else {
                console.error("Failed to fetch transactions, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to process entity data for consistent display
    const processEntityData = (entityType, entityData) => {
        if (!entityData) return null;

        switch (entityType) {
            case "EQUIPMENT":
                // Handle equipment data structure
                return {
                    id: entityData.equipment?.id || entityData.id,
                    name: entityData.name || entityData.equipment?.fullModelName ||
                        `${entityData.equipment?.brand || ''} ${entityData.equipment?.type || ''} ${entityData.equipment?.serialNumber || ''}`.trim(),
                    type: "EQUIPMENT"
                };
            case "WAREHOUSE":
                // Handle warehouse data structure
                return {
                    id: entityData.id,
                    name: entityData.name,
                    type: "WAREHOUSE"
                };
            case "SITE":
                // Handle site data structure
                return {
                    id: entityData.id,
                    name: entityData.name,
                    type: "SITE"
                };
            default:
                // Default handling
                return {
                    id: entityData.id,
                    name: entityData.name || "Unknown",
                    type: entityType
                };
        }
    };

    // Helper function to fetch entity details
    const fetchEntityDetails = async (entityType, entityId) => {
        if (!entityType || !entityId) return null;

        try {
            const token = localStorage.getItem('token');

            let endpoint = '';
            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === "SITE") {
                endpoint = `http://localhost:8080/api/v1/site/${entityId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment/${entityId}`;
            } else {
                endpoint = `http://localhost:8080/${entityType.toLowerCase()}/${entityId}`;
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
                initialQuantities[index] = ""; // Start with empty values
                initialNotReceived[index] = false; // Start with all items as received
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

    // NEW: Handle item not received checkbox change
    const handleItemNotReceivedChange = (index, notReceived) => {
        setItemsNotReceived(prev => ({
            ...prev,
            [index]: notReceived
        }));

        // If item is marked as not received, clear the quantity
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

        // Validate inputs: either quantity is valid or item is marked as not received
        const hasInvalidInputs = selectedTransaction.items.some((item, index) => {
            const quantity = receivedQuantities[index];
            const notReceived = itemsNotReceived[index];

            // If not marked as "not received", must have a valid quantity
            if (!notReceived) {
                return isNaN(quantity) || quantity === "" || parseInt(quantity) < 0;
            }
            return false; // If marked as not received, it's valid
        });

        if (hasInvalidInputs) {
            setAcceptError("Please enter valid quantities for all items or mark them as not received");
            setProcessingAction(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

            let username = "system"; // Default fallback
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

            // Format the received quantities for the API
            const receivedItems = selectedTransaction.items.map((item, index) => ({
                transactionItemId: item.id,
                receivedQuantity: itemsNotReceived[index] ? 0 : parseInt(receivedQuantities[index]), // 0 if not received
                itemNotReceived: itemsNotReceived[index] || false // NEW: Include not received flag
            }));

            const response = await fetch(`http://localhost:8080/api/v1/transactions/${selectedTransaction.id}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receivedItems: receivedItems,
                    username: username,
                    acceptanceComment: comments
                }),
            });

            if (response.ok) {
                // Successfully accepted transaction
                fetchPendingTransactions(); // Refresh data
                setIsAcceptModalOpen(false);
                showSnackbar("Transaction Accepted Successfully", "success");
            } else {
                // Try to get error details from the response
                let errorMessage = "Failed to accept transaction";
                try {
                    const errorData = await response.text();
                    errorMessage = errorData || errorMessage;
                } catch (e) {
                    console.error("Error parsing error response:", e);
                }
                setAcceptError(errorMessage);
                showSnackbar("Failed to accept transaction", "error");
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

    // Actions array for DataTable - Updated with View button
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
                <div className="left-section3">
                    <h2 className="transaction-section-title">Incoming Transactions</h2>
                    <div className="item-count3">{pendingTransactions.length} incoming transactions</div>
                </div>
            </div>

            <div className="section-description">
                (Transactions waiting for your approval)
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
                    hideItemQuantities={true}
                />
            )}

            {/* Modal for accepting transaction with multiple items */}
            {isAcceptModalOpen && selectedTransaction && (
                <div className="modal-backdrop">
                    <div className="flat-modal">
                        {/* Header */}
                        <div className="flat-modal-header">
                            <h2>Accept Transaction</h2>
                            <button
                                className="close-modal-btn"
                                onClick={() => setIsAcceptModalOpen(false)}
                                disabled={processingAction}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flat-modal-content">
                            {/* Transaction Info */}
                            <div className="transaction-info-section">
                                <div className="info-row">
                                    <div className="info-col">
                                        <div className="info-label">Batch Number</div>
                                        <div className="info-value">{selectedTransaction.batchNumber || "N/A"}</div>
                                    </div>
                                    <div className="info-col">
                                        <div className="info-label">Transaction Date</div>
                                        <div className="info-value">
                                            {selectedTransaction.transactionDate
                                                ? new Date(selectedTransaction.transactionDate).toLocaleDateString("en-GB")
                                                : "N/A"}
                                        </div>
                                    </div>
                                </div>

                                <div className="info-row">
                                    <div className="info-col">
                                        <div className="info-label">Sender</div>
                                        <div className="info-value">{getEntityDisplayName(selectedTransaction.sender, selectedTransaction.senderType)}</div>
                                    </div>
                                    <div className="info-col">
                                        <div className="info-label">Receiver</div>
                                        <div className="info-value">{getEntityDisplayName(selectedTransaction.receiver, selectedTransaction.receiverType)}</div>
                                    </div>
                                </div>

                                <div className="info-row">
                                    <div className="info-col">
                                        <div className="info-label">Created At</div>
                                        <div className="info-value">
                                            {selectedTransaction.createdAt
                                                ? new Date(selectedTransaction.createdAt).toLocaleString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : "N/A"}
                                        </div>
                                    </div>
                                    <div className="info-col">
                                        <div className="info-label">Added By</div>
                                        <div className="info-value">{selectedTransaction.addedBy || "N/A"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Items */}
                            <div className="items-section">
                                <h3>Transaction Items</h3>

                                {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                                    selectedTransaction.items.map((item, index) => (
                                        <div className="item-container" key={index}>
                                            <div className="item-details">
                                                <div className="item-name-block">
                                                    <span className="item-number">{index + 1}.</span>
                                                    <div className="item-name-wrapper">
                                                        <div className="item-name">
                                                            {item.itemType?.name || "Unknown Item"}
                                                            {item.itemType?.measuringUnit && (
                                                                <span className="item-unit"> ({item.itemType.measuringUnit})</span>
                                                            )}
                                                        </div>
                                                        <div className="item-category">{item.itemType?.itemCategory?.name || ""}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quantity Section */}
                                            <div className="quantity-section">
                                                <div className="quantity-label">
                                                    Sent/Received Quantity {!itemsNotReceived[index] && <span className="required-mark">*</span>}
                                                    {item.itemType?.measuringUnit && (
                                                        <span className="quantity-unit"> ({item.itemType.measuringUnit})</span>
                                                    )}
                                                </div>

                                                <div className={`quantity-controls ${itemsNotReceived[index] ? 'disabled' : ''}`}>
                                                    <button
                                                        type="button"
                                                        className="decrement-btn"
                                                        onClick={() => {
                                                            const current = parseInt(receivedQuantities[index]) || 0;
                                                            handleItemQuantityChange(index, Math.max(0, current - 1));
                                                        }}
                                                        disabled={processingAction || itemsNotReceived[index] || (parseInt(receivedQuantities[index]) || 0) <= 0}
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={itemsNotReceived[index] ? "" : (receivedQuantities[index] || "")}
                                                        onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                                        placeholder={itemsNotReceived[index] ? "Not received" : "Enter quantity"}
                                                        required={!itemsNotReceived[index]}
                                                        disabled={processingAction || itemsNotReceived[index]}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="increment-btn"
                                                        onClick={() => {
                                                            const current = parseInt(receivedQuantities[index]) || 0;
                                                            handleItemQuantityChange(index, current + 1);
                                                        }}
                                                        disabled={processingAction || itemsNotReceived[index]}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Checkbox below the quantity controls */}
                                                <div className="item-not-received-section">
                                                    <label className="item-not-received-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={itemsNotReceived[index] || false}
                                                            onChange={(e) => handleItemNotReceivedChange(index, e.target.checked)}
                                                            disabled={processingAction}
                                                        />
                                                        <span className="checkbox-label">Item not sent/received</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-items-message">No items found in this transaction</div>
                                )}
                            </div>

                            {/* Comments */}
                            <div className="comments-section">
                                <div className="comments-label">
                                    Comments <span className="optional-text">(optional)</span>
                                </div>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Enter any additional comments about this transaction..."
                                    disabled={processingAction}
                                />
                            </div>

                            {/* Error message */}
                            {acceptError && (
                                <div className="error-message">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{acceptError}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="accept-button"
                                onClick={handleAcceptTransaction}
                                disabled={processingAction || selectedTransaction.items?.some((_, index) => {
                                    // If item is marked as not received, it's valid
                                    if (itemsNotReceived[index]) return false;
                                    // If not marked as not received, must have valid quantity
                                    return receivedQuantities[index] === undefined ||
                                        receivedQuantities[index] === "" ||
                                        parseInt(receivedQuantities[index]) < 0;
                                })}
                            >
                                {processingAction ? "Processing..." : (
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

            {/* Snackbar Component - Replace old notifications */}
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