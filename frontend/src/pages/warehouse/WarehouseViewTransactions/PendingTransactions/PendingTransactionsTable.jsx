import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import UpdatePendingTransactionModal from "../UpdatePendingTransactionModal.jsx";
import TransactionViewModal from "./TransactionViewModal.jsx";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";

const PendingTransactionsTable = ({ warehouseId }) => {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [viewTransaction, setViewTransaction] = useState(null);

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
    const handleUpdateTransaction = async (updatedData) => {
        try {
            const token = localStorage.getItem("token");

            // Create a proper request body
            const requestBody = {
                ...updatedData,
                // Ensure we send the IDs, not entire object references
                items: updatedData.items.map(item => ({
                    id: item.id, // Include ID if it exists
                    itemType: {
                        id: item.itemType.id
                    },
                    quantity: parseInt(item.quantity)
                }))
            };

            const response = await fetch(`http://localhost:8080/api/v1/transactions/${updatedData.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                // Refresh the transactions list
                await fetchPendingTransactions();

                // Show success snackbar
                showSnackbar("Transaction successfully updated", "success");
                return true;
            } else {
                const errorData = await response.json();
                showSnackbar("Failed to update transaction", "error");
                throw new Error(errorData.message || "Failed to update transaction");
            }
        } catch (error) {
            console.error("Error updating transaction:", error);
            showSnackbar("Error updating transaction", "error");
            throw error;
        }
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
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">
                <div className="left-section3">
                    <h2 className="transaction-section-title">Pending Transactions</h2>
                    <div className="item-count3">{pendingTransactions.length} pending transactions</div>
                </div>
            </div>

            <div className="section-description">
                (Transactions you've initiated that are waiting for approval)
            </div>

            {/* DataTable Component */}
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

            {/* Snackbar Component */}
            <Snackbar
                isOpen={snackbar.isOpen}
                message={snackbar.message}
                type={snackbar.type}
                onClose={closeSnackbar}
                duration={3000}
            />
        </div>
    );
};

export default PendingTransactionsTable;