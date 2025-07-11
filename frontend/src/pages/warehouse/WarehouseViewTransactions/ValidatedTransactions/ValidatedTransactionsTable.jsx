import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import TransactionViewModal from "../TransactionViewModal/TransactionViewModal.jsx"; // Add this import
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";

const ValidatedTransactionsTable = ({ warehouseId, refreshTrigger, onCountUpdate, onTransactionUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [validatedTransactions, setValidatedTransactions] = useState([]);
    const [modalInfo, setModalInfo] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false); // Add this state
    const [viewTransaction, setViewTransaction] = useState(null); // Add this state

    // Snackbar state for potential future use
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

    useEffect(() => {
        fetchValidatedTransactions();
    }, [warehouseId]);

    const fetchValidatedTransactions = async () => {
        if (!warehouseId) return;
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/transactions/warehouse/${warehouseId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const validatedData = await Promise.all(
                    data
                        .filter(tx =>
                            (tx.status === "ACCEPTED" || tx.status === "REJECTED" || tx.status === "RESOLVING" || tx.status === "RESOLVED") &&
                            (tx.senderId === warehouseId || tx.receiverId === warehouseId)
                        )
                        .map(async (tx) => {
                            const sender = await fetchEntityDetails(tx.senderType, tx.senderId);
                            const receiver = await fetchEntityDetails(tx.receiverType, tx.receiverId);

                            // Process entity data for consistent display
                            const processedSender = processEntityData(tx.senderType, sender);
                            const processedReceiver = processEntityData(tx.receiverType, receiver);

                            // Preserve all original transaction data and only add processed sender/receiver
                            return {
                                ...tx, // Keep all original transaction properties
                                sender: processedSender,
                                receiver: processedReceiver,
                                // Explicitly preserve important properties that might be getting lost
                                items: tx.items || [],
                                quantity: tx.quantity,
                                receivedQuantity: tx.receivedQuantity,
                                sentFirst: tx.sentFirst,
                                senderId: tx.senderId,
                                receiverId: tx.receiverId
                            };
                        })
                );

                // Debug: Log the processed data to see what's being passed to the modal
                console.log('Validated transactions data:', validatedData);
                setValidatedTransactions(validatedData);
            } else {
                showSnackbar("Failed to fetch validated transactions", "error");
            }
        } catch (err) {
            console.error("Error fetching validated transactions:", err);
            showSnackbar("Error fetching validated transactions", "error");
        } finally {
            setLoading(false);
        }
    };

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

    const fetchEntityDetails = async (entityType, entityId) => {
        if (!entityType || !entityId) return null;
        try {
            const token = localStorage.getItem("token");
            let endpoint;
            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === "SITE") {
                endpoint = `http://localhost:8080/api/v1/sites/${entityId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment/${entityId}`;
            } else {
                endpoint = `http://localhost:8080/api/${entityType.toLowerCase()}/${entityId}`;
            }

            const response = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            return response.ok ? await response.json() : null;
        } catch {
            return null;
        }
    };

    // ADD THIS - Report count to parent
    useEffect(() => {
        if (onCountUpdate) {
            onCountUpdate(validatedTransactions.length);
        }
    }, [validatedTransactions.length, onCountUpdate]);

// ADD THIS - Listen to refreshTrigger changes
    useEffect(() => {
        fetchValidatedTransactions();
    }, [refreshTrigger]);

    const handleInfoClick = (event, transaction) => {
        event.stopPropagation();

        // Set modal info based on transaction status
        if (transaction.status === "REJECTED" && transaction.rejectionReason) {
            setModalInfo({
                title: "Rejection Reason",
                content: transaction.rejectionReason,
                transaction: transaction
            });
        } else if (transaction.status === "ACCEPTED" && transaction.acceptanceComment) {
            setModalInfo({
                title: "Acceptance Comments",
                content: transaction.acceptanceComment,
                transaction: transaction
            });
        }
    };

    // Function to handle opening the view modal
    const handleOpenViewModal = (transaction) => {
        // Debug: Log the transaction data being passed to the modal
        console.log('Opening modal with transaction:', transaction);
        console.log('Current warehouse ID:', warehouseId);
        console.log('Transaction senderId:', transaction.senderId);
        console.log('Transaction sentFirst:', transaction.sentFirst);
        console.log('Transaction items:', transaction.items);

        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    // Function to close the view modal
    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewTransaction(null);
    };

    const closeModal = () => {
        setModalInfo(null);
    };

    // Close modal when clicking outside of it
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
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

    // Helper function to get entity display name
    const getEntityDisplayName = (entity, entityType) => {
        if (!entity) return "N/A";
        return entity.name || entity.equipment?.fullModelName || "N/A";
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
        },

        {
            header: 'STATUS',
            accessor: 'status',
            sortable: true,
            width: '200px',
            minWidth: '120px',
            render: (row) => (
                <div className="status-container">
                    <span className={`status-badge3 ${row.status.toLowerCase()}`}>
                        {row.status}
                    </span>


                </div>
            )
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
        },

        {
            header: 'STATUS',
            accessor: 'status',
            filterType: 'select'
        }
    ];

    // Actions array for DataTable - Add View button
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
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">
                <div className="left-section3">

                    <div className="item-count3">{validatedTransactions.length} validated transactions</div>
                </div>
            </div>



            {/* DataTable Component */}
            <DataTable
                data={validatedTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="There are no accepted or rejected transactions for this warehouse"
                actions={actions}
                className="validated-transactions-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="150px"
            />

            {/* View Transaction Modal */}
            {isViewModalOpen && viewTransaction && (
                <TransactionViewModal
                    transaction={viewTransaction}
                    isOpen={isViewModalOpen}
                    onClose={handleCloseViewModal}
                    hideItemQuantities={false}
                    currentWarehouseId={warehouseId} // Add this line
                />
            )}

            {/* Modal for comments/reasons */}
            {modalInfo && (
                <div className="modal-backdrop" onClick={handleOverlayClick}>
                    <div className="comment-modal">
                        <div className="comment-modal-header">
                            <h3>{modalInfo.title}</h3>
                            <button className="close-modal-btn" onClick={closeModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="comment-modal-content">
                            <div className="transaction-summary">
                                <div className="summary-row">
                                    <span className="label">Transaction:</span>
                                    <span className="value">Batch #{modalInfo.transaction.batchNumber}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="label">From:</span>
                                    <span className="value">{modalInfo.transaction.sender?.name || "N/A"}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="label">To:</span>
                                    <span className="value">{modalInfo.transaction.receiver?.name || "N/A"}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="label">Date:</span>
                                    <span className="value">
                                        {modalInfo.transaction.transactionDate
                                            ? new Date(modalInfo.transaction.transactionDate).toLocaleDateString('en-GB')
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span className="label">Status:</span>
                                    <span className={`value status-${modalInfo.transaction.status.toLowerCase()}`}>
                                        {modalInfo.transaction.status}
                                    </span>
                                </div>
                            </div>

                            <div className="comment-content">
                                <h4>{modalInfo.title}:</h4>
                                <p>{modalInfo.content || "No comments provided."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar Component */}
            <Snackbar
                isOpen={snackbar.isOpen}
                message={snackbar.message}
                type={snackbar.type}
                onClose={closeSnackbar}
                duration={3000}
                position="bottom-right"
            />
        </div>
    );
};

export default ValidatedTransactionsTable;