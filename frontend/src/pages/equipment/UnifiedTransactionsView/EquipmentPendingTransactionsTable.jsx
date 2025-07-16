import React, { useState, useEffect } from "react";
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import EquipmentUpdatePendingTransactionModal from "./EquipmentUpdatePendingTransactionModal.jsx";
import TransactionViewModal from "../../warehouse/WarehouseViewTransactions/TransactionViewModal/TransactionViewModal.jsx";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar/Snackbar.jsx";
import { FaPlus } from 'react-icons/fa';
import "../../warehouse/WarehouseViewTransactions/PendingTransactions/PendingTransactions.scss"

const EquipmentPendingTransactionsTable = ({ equipmentId, refreshTrigger }) => {
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
    const [equipmentData, setEquipmentData] = useState({
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
        senderType: "EQUIPMENT",
        senderId: equipmentId,
        receiverType: "",
        receiverId: "",
        batchNumber: "",
    });

    const entityTypes = ["WAREHOUSE", "EQUIPMENT"];
    // Category filtering states
    const [parentCategories, setParentCategories] = useState([]);
    const [childCategoriesByItem, setChildCategoriesByItem] = useState({});
    const [showFilters, setShowFilters] = useState({});

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

    // Fetch transactions when component mounts or equipmentId changes
    useEffect(() => {
        fetchPendingTransactions();
        fetchItems();
        fetchAllItemTypes();
        fetchEquipmentDetails();
        fetchAllSites();
        fetchParentCategories();
    }, [equipmentId, refreshTrigger]);

    // Toggle filters with animation
    const toggleFilters = (index) => {
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

    // Update sender options when sender site and type changes
    useEffect(() => {
        const updateSenderOptions = async () => {
            if (newTransaction.senderType && selectedSenderSite && transactionRole === "receiver") {
                let senderData = await fetchEntitiesByTypeAndSite(newTransaction.senderType, selectedSenderSite);

                if (newTransaction.senderType === "EQUIPMENT") {
                    senderData = senderData.filter((entity) => entity.id !== equipmentId);
                }

                setSenderOptions(senderData);
            } else {
                setSenderOptions([]);
            }
        };

        updateSenderOptions();
    }, [newTransaction.senderType, selectedSenderSite, equipmentId, transactionRole]);

    // Update receiver options when receiver site and type changes
    useEffect(() => {
        const updateReceiverOptions = async () => {
            if (newTransaction.receiverType && selectedReceiverSite && transactionRole === "sender") {
                let receiverData = await fetchEntitiesByTypeAndSite(newTransaction.receiverType, selectedReceiverSite);

                if (newTransaction.receiverType === "EQUIPMENT") {
                    receiverData = receiverData.filter((entity) => entity.id !== equipmentId);
                }

                setReceiverOptions(receiverData);
            } else {
                setReceiverOptions([]);
            }
        };

        updateReceiverOptions();
    }, [newTransaction.receiverType, selectedReceiverSite, equipmentId, transactionRole]);

    useEffect(() => {
        if (isCreateModalOpen) {
            setTransactionRole("sender");
            setNewTransaction({
                transactionDate: "",
                items: [{ itemType: { id: "" }, quantity: "1", parentCategoryId: "", itemCategoryId: "" }],
                senderType: "EQUIPMENT",
                senderId: equipmentId,
                receiverType: "",
                receiverId: "",
                batchNumber: "",
            });
            setSelectedSenderSite("");
            setSelectedReceiverSite("");
            setChildCategoriesByItem({});
            setShowFilters({});
        }
    }, [isCreateModalOpen, equipmentId]);

    // Update transaction data when role changes
    useEffect(() => {
        if (transactionRole === "sender") {
            setNewTransaction(prev => ({
                ...prev,
                senderType: "EQUIPMENT",
                senderId: equipmentId,
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
                receiverType: "EQUIPMENT",
                receiverId: equipmentId,
            }));
            setSelectedSenderSite("");
            setSelectedReceiverSite("");
        }
    }, [transactionRole, equipmentId]);

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

    const fetchEquipmentDetails = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/equipment/${equipmentId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setEquipmentData(data);
            } else {
                console.error("Failed to fetch equipment details, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch equipment details:", error);
        }
    };

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/equipment/${equipmentId}/items`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setItems(data);
            } else {
                console.error("Failed to fetch items, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch items:", error);
        }
    };

    const fetchAllItemTypes = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/item-types`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAllItemTypes(data);
            } else {
                console.error("Failed to fetch item types, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch item types:", error);
        }
    };

    const fetchEntitiesByTypeAndSite = async (entityType, siteId) => {
        try {
            const token = localStorage.getItem("token");
            let endpoint;

            if (entityType === "WAREHOUSE") {
                endpoint = `http://localhost:8080/api/v1/warehouses/site/${siteId}`;
            } else if (entityType === "EQUIPMENT") {
                endpoint = `http://localhost:8080/api/equipment/site/${siteId}`;
            } else {
                return [];
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
                console.error(`Failed to fetch ${entityType} by site, status:`, response.status);
                return [];
            }
        } catch (error) {
            console.error(`Failed to fetch ${entityType} by site:`, error);
            return [];
        }
    };

    const fetchPendingTransactions = async () => {
        if (!equipmentId) {
            console.error("Equipment ID is not available");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/equipment/${equipmentId}/transactions`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const pendingData = await Promise.all(
                    data
                        .filter(transaction =>
                            transaction.status === "PENDING" &&
                            (transaction.receiverId === equipmentId || transaction.senderId === equipmentId) &&
                            transaction.sentFirst === equipmentId
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
            showSnackbar("Failed to fetch pending transactions", "error");
        } finally {
            setLoading(false);
        }
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

    const handleOpenUpdateModal = (transaction) => {
        setSelectedTransaction(transaction);
        setIsUpdateModalOpen(true);
    };

    const handleOpenViewModal = (transaction) => {
        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    const handleUpdateTransaction = async () => {
        await fetchPendingTransactions();
    };

    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
        setSelectedTransaction(null);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setViewTransaction(null);
    };

    const handleAddTransaction = () => {
        setIsCreateModalOpen(true);
    };

    const fetchParentCategories = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/item-categories/parent`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setParentCategories(data);
            } else {
                console.error("Failed to fetch parent categories, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch parent categories:", error);
        }
    };

    // Define columns for the transactions table - Match warehouse structure exactly
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
            render: (row) => row.transactionDate ? new Date(row.transactionDate).toLocaleDateString('en-GB') : 'N/A'
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
        }
    ];

    // Actions array for DataTable - Using the DataTable's action button system like warehouse
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
                    <div className="item-count3">{pendingTransactions.length} pending transactions</div>
                </div>
            </div>

            {/* DataTable Component with Add Button - Match warehouse structure */}
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
                <EquipmentUpdatePendingTransactionModal
                    transaction={selectedTransaction}
                    isOpen={isUpdateModalOpen}
                    onClose={handleCloseUpdateModal}
                    onUpdate={handleUpdateTransaction}
                    equipmentId={equipmentId}
                />
            )}
        </div>
    );
};

export default EquipmentPendingTransactionsTable; 