import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../WarehouseViewTransactions.scss";
import "./AcceptRejectModal.scss";
import AcceptTransactionModal from "./AcceptTransactionModal.jsx";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from "../../../../components/common/ConfirmationDialog/ConfirmationDialog";
import { transactionService } from '../../../../services/transaction/transactionService.js';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { siteService } from '../../../../services/siteService';
import { equipmentService } from '../../../../services/equipmentService';

const IncomingTransactionsTable = ({
                                       warehouseId,
                                       refreshTrigger,
                                       onCountUpdate,
                                       onTransactionUpdate
                                   }) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);

    // Modal state
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Reject dialog state
    const [rejectDialog, setRejectDialog] = useState({
        isVisible: false,
        transactionId: null,
        isRejecting: false
    });

    // Snackbar state
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const showSnackbar = (message, type = "success") => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // ─── Data Fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        fetchPendingTransactions();
    }, [warehouseId, refreshTrigger]);

    useEffect(() => {
        if (onCountUpdate) onCountUpdate(pendingTransactions.length, pendingTransactions);
    }, [pendingTransactions.length, onCountUpdate]);

    const fetchPendingTransactions = async () => {
        if (!warehouseId) return;

        setLoading(true);
        try {
            const data = await transactionService.getTransactionsForWarehouse(warehouseId);

            const filteredTransactions = data.filter(transaction =>
                transaction.status === "PENDING" &&
                transaction.receiverId === warehouseId
            );

            if (filteredTransactions.length === 0) {
                setPendingTransactions([]);
                return;
            }

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
                sender: processEntityData(transaction.senderType, entityCache.get(`${transaction.senderType}-${transaction.senderId}`)),
                receiver: processEntityData(transaction.receiverType, entityCache.get(`${transaction.receiverType}-${transaction.receiverId}`))
            }));

            setPendingTransactions(pendingData);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            showSnackbar("Error fetching incoming transactions", "error");
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
                return { id: entityData.id, name: entityData.name, type: "WAREHOUSE" };
            case "SITE":
                return { id: entityData.id, name: entityData.name, type: "SITE" };
            default:
                return { id: entityData.id, name: entityData.name || "Unknown", type: entityType };
        }
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleRowClick = (transaction) => {
        navigate(`/warehouses/${warehouseId}/transactions/${transaction.id}`);
    };

    const handleOpenAcceptModal = (transaction) => {
        setSelectedTransaction(transaction);
        setIsAcceptModalOpen(true);
    };

    const handleOpenRejectDialog = (transactionId) => {
        setRejectDialog({ isVisible: true, transactionId, isRejecting: false });
    };

    const handleConfirmReject = async () => {
        setRejectDialog(prev => ({ ...prev, isRejecting: true }));
        try {
            let username = "system";
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                if (userInfo.username) username = userInfo.username;
            } catch { /* ignore */ }

            await transactionService.reject(rejectDialog.transactionId, { username });
            showSnackbar("Transaction rejected successfully", "success");
            setRejectDialog({ isVisible: false, transactionId: null, isRejecting: false });
            fetchPendingTransactions();
            if (onTransactionUpdate) onTransactionUpdate();
        } catch (error) {
            console.error("Reject transaction error:", error);
            showSnackbar("Failed to reject transaction. Please try again.", "error");
            setRejectDialog(prev => ({ ...prev, isRejecting: false }));
        }
    };

    const handleAcceptSuccess = () => {
        fetchPendingTransactions();
        if (onTransactionUpdate) onTransactionUpdate();
    };

    // ─── Formatters ───────────────────────────────────────────────────────────

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getEntityDisplayName = (entity) => entity?.name || "N/A";

    // ─── Table Config ─────────────────────────────────────────────────────────

    const columns = [
        {
            header: 'SENDER',
            accessor: 'sender',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => getEntityDisplayName(row.sender)
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => getEntityDisplayName(row.receiver)
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
        { header: 'SENDER', accessor: 'sender', filterType: 'text' },
        { header: 'RECEIVER', accessor: 'receiver', filterType: 'text' },
        { header: 'BATCH NUMBER', accessor: 'batchNumber', filterType: 'number' },
        { header: 'TRANSACTION DATE', accessor: 'transactionDate', filterType: 'text' }
    ];

    const actions = [
        {
            label: 'Accept',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7"/>
                </svg>
            ),
            className: 'approve',
            onClick: (row) => handleOpenAcceptModal(row)
        },
        {
            label: 'Reject',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            ),
            className: 'delete',
            onClick: (row) => handleOpenRejectDialog(row.id)
        }
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="transaction-table-section">
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
                onRowClick={handleRowClick}
            />

            {/* Accept Modal */}
            <AcceptTransactionModal
                isOpen={isAcceptModalOpen}
                onClose={() => setIsAcceptModalOpen(false)}
                transaction={selectedTransaction}
                warehouseId={warehouseId}
                onSuccess={handleAcceptSuccess}
                showSnackbar={showSnackbar}
                transactionService={transactionService}
            />

            {/* Reject Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={rejectDialog.isVisible}
                type="warning"
                title="Reject Transaction"
                message="Are you sure you want to reject this transaction? The sender's inventory will be restored."
                confirmText="Reject Transaction"
                cancelText="Cancel"
                onConfirm={handleConfirmReject}
                onCancel={() => setRejectDialog({ isVisible: false, transactionId: null, isRejecting: false })}
                isLoading={rejectDialog.isRejecting}
                size="large"
            />

            {/* Snackbar */}
            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default IncomingTransactionsTable;