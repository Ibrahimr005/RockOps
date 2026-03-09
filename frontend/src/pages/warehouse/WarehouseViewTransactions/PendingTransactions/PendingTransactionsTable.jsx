import React, { useState, useEffect } from "react";
import "../WarehouseViewTransactions.scss";
import TransactionFormModal from "./TransactionFormModal/TransactionFormModal.jsx";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import { FaPlus } from 'react-icons/fa';
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog";
import "./PendingTransactions.scss"
import { transactionService } from '../../../../services/transaction/transactionService.js';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { itemService } from '../../../../services/warehouse/itemService';
import { itemTypeService } from '../../../../services/warehouse/itemTypeService';
import { siteService } from '../../../../services/siteService';
import { equipmentService } from '../../../../services/equipmentService';
import { useNavigate } from 'react-router-dom';

const PendingTransactionsTable = ({ warehouseId, refreshTrigger, onCountUpdate, onTransactionUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const navigate = useNavigate();

    // Transaction Modal State
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Data states
    const [items, setItems] = useState([]);
    const [allItemTypes, setAllItemTypes] = useState([]);
    const [warehouseData, setWarehouseData] = useState({ name: "", id: "" });

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ isOpen: false, message: "", type: "success" });

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        transactionId: null,
        isDeleting: false
    });

    const showSnackbar = (message, type = "success") => {
        setSnackbar({ isOpen: true, message, type });
    };

    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        fetchPendingTransactions();
        fetchItems();
        fetchAllItemTypes();
        fetchWarehouseDetails();
    }, [warehouseId, refreshTrigger]);

    useEffect(() => {
        if (onCountUpdate) onCountUpdate(pendingTransactions.length);
    }, [pendingTransactions.length, onCountUpdate]);

    const fetchWarehouseDetails = async () => {
        try {
            const response = await warehouseService.getById(warehouseId);
            const data = response.data || response;
            setWarehouseData({ name: data.name || "", id: data.id || "", site: data.site || null });
        } catch (error) {
            console.error("Error fetching warehouse details:", error);
        }
    };

    const fetchItems = async () => {
        try {
            const response = await itemService.getItemsByWarehouse(warehouseId);
            const data = response.data || response;
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch items:", error);
            setItems([]);
        }
    };

    const fetchAllItemTypes = async () => {
        try {
            const response = await itemTypeService.getAll();
            const data = response.data || response;
            setAllItemTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch item types:", error);
            setAllItemTypes([]);
        }
    };

    const fetchPendingTransactions = async () => {
        if (!warehouseId) return;

        setLoading(true);
        try {
            const data = await transactionService.getTransactionsForWarehouse(warehouseId);

            // Warehouse is always the sender now, so pending transactions
            // are those sent by this warehouse that haven't been accepted/rejected yet
            const filteredTransactions = data.filter(transaction =>
                transaction.status === "PENDING" &&
                transaction.senderId === warehouseId
            );

            if (filteredTransactions.length === 0) {
                setPendingTransactions([]);
                return;
            }

            // Collect unique entity IDs to avoid duplicate fetches
            const entityMap = new Map();
            filteredTransactions.forEach(transaction => {
                const senderKey = `${transaction.senderType}-${transaction.senderId}`;
                const receiverKey = `${transaction.receiverType}-${transaction.receiverId}`;
                if (!entityMap.has(senderKey)) entityMap.set(senderKey, { type: transaction.senderType, id: transaction.senderId });
                if (!entityMap.has(receiverKey)) entityMap.set(receiverKey, { type: transaction.receiverType, id: transaction.receiverId });
            });

            const entityResults = await Promise.all(
                Array.from(entityMap.entries()).map(async ([key, entity]) => {
                    try {
                        const details = await fetchEntityDetails(entity.type, entity.id);
                        return [key, details];
                    } catch {
                        return [key, null];
                    }
                })
            );
            const entityCache = new Map(entityResults);

            const pendingData = filteredTransactions.map(transaction => ({
                ...transaction,
                sender: entityCache.get(`${transaction.senderType}-${transaction.senderId}`),
                receiver: entityCache.get(`${transaction.receiverType}-${transaction.receiverId}`)
            }));

            setPendingTransactions(pendingData);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            showSnackbar("Error fetching pending transactions", "error");
        } finally {
            setLoading(false);
        }
    };

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
                return null;
            }
            return response.data || response;
        } catch {
            return null;
        }
    };

    const handleOpenViewModal = (transaction) => {
        navigate(`/warehouses/${warehouseId}/transactions/${transaction.id}`);
    };

    const handleAddTransaction = () => {
        setModalMode("create");
        setSelectedTransaction(null);
        setIsTransactionModalOpen(true);
    };

    const handleUpdateTransaction = (transaction) => {
        setModalMode("update");
        setSelectedTransaction(transaction);
        setIsTransactionModalOpen(true);
    };

    const handleCloseTransactionModal = () => {
        setIsTransactionModalOpen(false);
        setSelectedTransaction(null);
        setModalMode("create");
    };

    const handleSubmitTransaction = async (transactionData, mode, transactionId) => {
        try {
            if (mode === "create") {
                await transactionService.create(transactionData);
                showSnackbar('Transaction created successfully!', 'success');
            } else {
                await transactionService.update(transactionId, transactionData);
                showSnackbar('Transaction updated successfully!', 'success');
            }
            await fetchPendingTransactions();
            if (onTransactionUpdate) onTransactionUpdate();
        } catch (error) {
            console.error(`Error ${mode === "create" ? "creating" : "updating"} transaction:`, error);
            showSnackbar(`Failed to ${mode} transaction. Please check your connection.`, 'error');
            throw error;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const columns = [
        {
            header: 'SENDER',
            accessor: 'sender',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.sender?.name || row.sender?.fullModelName || "N/A"
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => {
                if (row.receiverType === 'LOSS') return 'Loss/Disposal';
                return row.receiver?.name || row.receiver?.fullModelName || "N/A";
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

    const filterableColumns = [
        { header: 'ITEMS', accessor: 'items', filterType: 'number' },
        { header: 'SENDER', accessor: 'sender', filterType: 'text' },
        { header: 'RECEIVER', accessor: 'receiver', filterType: 'text' },
        { header: 'BATCH NUMBER', accessor: 'batchNumber', filterType: 'number' },
        { header: 'TRANSACTION DATE', accessor: 'transactionDate', filterType: 'text' },
        { header: 'CREATED AT', accessor: 'createdAt', filterType: 'text' },
        { header: 'CREATED BY', accessor: 'addedBy', filterType: 'text' }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            ),
            className: 'edit',
            onClick: (row) => handleUpdateTransaction(row)
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            ),
            className: 'delete',
            onClick: (row) => handleDeleteTransaction(row.id)
        }
    ];

    const handleDeleteTransaction = (transactionId) => {
        setConfirmDialog({ isVisible: true, transactionId, isDeleting: false });
    };

    const handleConfirmDelete = async () => {
        setConfirmDialog(prev => ({ ...prev, isDeleting: true }));
        try {
            await transactionService.delete(confirmDialog.transactionId);
            showSnackbar('Transaction deleted successfully!', 'success');
            await fetchPendingTransactions();
            setConfirmDialog({ isVisible: false, transactionId: null, isDeleting: false });
            if (onTransactionUpdate) onTransactionUpdate();
        } catch (error) {
            console.error('Delete transaction error:', error);
            showSnackbar('An error occurred while deleting the transaction.', 'error');
            setConfirmDialog(prev => ({ ...prev, isDeleting: false }));
        }
    };

    const handleCancelDelete = () => {
        setConfirmDialog({ isVisible: false, transactionId: null, isDeleting: false });
    };

    return (
        <div className="transaction-table-section">
            <DataTable
                data={pendingTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="No pending transactions — transactions you send will appear here until the receiver validates them"
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
                onRowClick={handleOpenViewModal}
            />

            <TransactionFormModal
                isOpen={isTransactionModalOpen}
                onClose={handleCloseTransactionModal}
                mode={modalMode}
                transaction={selectedTransaction}
                warehouseId={warehouseId}
                warehouseData={warehouseData}
                items={items}
                allItemTypes={allItemTypes}
                onSubmit={handleSubmitTransaction}
                showSnackbar={showSnackbar}
            />

            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type="delete"
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone and will revert any inventory changes."
                confirmText="Delete Transaction"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                isLoading={confirmDialog.isDeleting}
                size="large"
            />

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