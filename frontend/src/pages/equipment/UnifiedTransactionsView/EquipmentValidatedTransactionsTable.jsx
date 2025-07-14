import React, { useState, useEffect } from "react";
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import TransactionViewModal from "../../warehouse/WarehouseViewTransactions/TransactionViewModal.jsx";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar/Snackbar.jsx";

const EquipmentValidatedTransactionsTable = ({ equipmentId }) => {
    const [loading, setLoading] = useState(false);
    const [validatedTransactions, setValidatedTransactions] = useState([]);
    const [modalInfo, setModalInfo] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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

    useEffect(() => {
        fetchValidatedTransactions();
    }, [equipmentId]);

    const fetchValidatedTransactions = async () => {
        if (!equipmentId) return;
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/equipment/${equipmentId}/transactions`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Filter for validated transactions (ACCEPTED or REJECTED)
                const validatedData = await Promise.all(
                    data
                        .filter(transaction => 
                            (transaction.status === "ACCEPTED" || transaction.status === "REJECTED") &&
                            (transaction.receiverId === equipmentId || transaction.senderId === equipmentId)
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
                setValidatedTransactions(validatedData);
            } else {
                console.error("Failed to fetch validated transactions, status:", response.status);
                showSnackbar("Failed to fetch validated transactions", "error");
            }
        } catch (error) {
            console.error("Failed to fetch validated transactions:", error);
            showSnackbar("Failed to fetch validated transactions", "error");
        } finally {
            setLoading(false);
        }
    };

    const processEntityData = (entityType, entityData) => {
        if (!entityData) return { name: 'Unknown', id: null };

        return {
            id: entityData.id,
            name: entityData.name || entityData.fullModelName || 'Unknown',
            type: entityType
        };
    };

    const fetchEntityDetails = async (entityType, entityId) => {
        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/${entityId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment/${entityId}`;
            } else if (entityType === "SITE") {
                endpoint = `http://localhost:8080/api/v1/sites/${entityId}`;
            } else {
                return null;
            }

            const response = await fetch(endpoint, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                console.error(`Failed to fetch ${entityType} details, status:`, response.status);
                return null;
            }
        } catch (error) {
            console.error(`Failed to fetch ${entityType} details:`, error);
            return null;
        }
    };

    const handleViewTransaction = (transaction) => {
        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewTransaction(null);
    };

    // Define columns for the validated transactions table - Match warehouse structure
    const columns = [
        {
            header: 'SENDER',
            accessor: 'sender',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.sender?.name || 'N/A'
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.receiver?.name || 'N/A'
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
            render: (row) => row.transactionDate ? new Date(row.transactionDate).toLocaleDateString('en-GB') : 'N/A'
        },
        {
            header: 'STATUS',
            accessor: 'status',
            sortable: true,
            width: '200px',
            minWidth: '120px',
            render: (row) => (
                <div className="status-container">
                    <span className={`status-badge3 ${row.status?.toLowerCase() || 'unknown'}`}>
                        {row.status || 'UNKNOWN'}
                    </span>
                </div>
            )
        }
    ];

    // Filterable columns for DataTable - Match warehouse structure
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

    // Actions array for DataTable - Match warehouse structure
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
            onClick: (row) => handleViewTransaction(row)
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">
                <div className="left-section3">
                    <div className="item-count3">{validatedTransactions.length} validated transactions</div>
                </div>
            </div>

            {/* DataTable Component - Match warehouse structure */}
            <DataTable
                data={validatedTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="There are no accepted or rejected transactions for this equipment"
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
                    hideItemQuantities={true}
                />
            )}
        </div>
    );
};

export default EquipmentValidatedTransactionsTable; 