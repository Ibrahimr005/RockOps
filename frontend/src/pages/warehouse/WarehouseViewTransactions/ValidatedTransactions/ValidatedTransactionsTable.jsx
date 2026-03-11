import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../WarehouseViewTransactions.scss";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../../components/common/Snackbar/Snackbar.jsx";
import { transactionService } from '../../../../services/transaction/transactionService.js';
import { warehouseService } from '../../../../services/warehouse/warehouseService';
import { siteService } from '../../../../services/siteService';
import { equipmentService } from '../../../../services/equipmentService';

const ValidatedTransactionsTable = ({
                                        warehouseId,
                                        refreshTrigger,
                                        onCountUpdate,
                                        onTransactionUpdate
                                    }) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [validatedTransactions, setValidatedTransactions] = useState([]);

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ isOpen: false, message: "", type: "success" });

    const showSnackbar = (message, type = "success") => {
        setSnackbar({ isOpen: true, message, type });
    };

    // ─── Data Fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        fetchValidatedTransactions();
    }, [warehouseId, refreshTrigger]);

    useEffect(() => {
        if (onCountUpdate) onCountUpdate(validatedTransactions.length, validatedTransactions);
    }, [validatedTransactions.length, onCountUpdate]);

    const fetchValidatedTransactions = async () => {
        if (!warehouseId) return;
        setLoading(true);

        try {
            const data = await transactionService.getTransactionsForWarehouse(warehouseId);

            const filteredTransactions = data.filter(tx =>
                (tx.status === "ACCEPTED" || tx.status === "REJECTED" || tx.status === "RESOLVING" || tx.status === "RESOLVED") &&
                (tx.senderId === warehouseId || tx.receiverId === warehouseId)
            );

            if (filteredTransactions.length === 0) {
                setValidatedTransactions([]);
                return;
            }

            // Deduplicate entity fetches
            const entityMap = new Map();
            filteredTransactions.forEach(tx => {
                const senderKey = `${tx.senderType}-${tx.senderId}`;
                const receiverKey = `${tx.receiverType}-${tx.receiverId}`;
                if (!entityMap.has(senderKey)) entityMap.set(senderKey, { type: tx.senderType, id: tx.senderId });
                if (!entityMap.has(receiverKey)) entityMap.set(receiverKey, { type: tx.receiverType, id: tx.receiverId });
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

            const validatedData = filteredTransactions.map(tx => ({
                ...tx,
                sender: processEntityData(tx.senderType, entityCache.get(`${tx.senderType}-${tx.senderId}`)),
                receiver: processEntityData(tx.receiverType, entityCache.get(`${tx.receiverType}-${tx.receiverId}`)),
            }));

            setValidatedTransactions(validatedData);
        } catch (err) {
            console.error("Error fetching validated transactions:", err);
            showSnackbar("Error fetching validated transactions", "error");
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
        if (entityType === "LOSS") {
            return { id: "00000000-0000-0000-0000-000000000000", name: "Loss/Disposal", type: "LOSS" };
        }
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
            render: (row) => getEntityDisplayName(row.sender),
            exportFormatter: (value, row) => getEntityDisplayName(row.sender)
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => getEntityDisplayName(row.receiver),
            exportFormatter: (value, row) => getEntityDisplayName(row.receiver)
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
            render: (row) => formatDate(row.transactionDate),
            exportFormatter: (value, row) => formatDate(row.transactionDate)
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
            ),
            exportFormatter: (value) => value
        }
    ];

    const filterableColumns = [
        { header: 'SENDER', accessor: 'sender', filterType: 'text' },
        { header: 'RECEIVER', accessor: 'receiver', filterType: 'text' },
        { header: 'BATCH NUMBER', accessor: 'batchNumber', filterType: 'number' },
        { header: 'TRANSACTION DATE', accessor: 'transactionDate', filterType: 'text' },
        { header: 'STATUS', accessor: 'status', filterType: 'select' }
    ];

    const handleExportStart = () => showSnackbar("Starting export...", "info");
    const handleExportComplete = (exportInfo) =>
        showSnackbar(`Successfully exported ${exportInfo.rowCount} transactions to ${exportInfo.filename}`, "success");
    const handleExportError = () =>
        showSnackbar("Failed to export data. Please try again.", "error");

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="transaction-table-section">
            <DataTable
                data={validatedTransactions}
                columns={columns}
                loading={loading}
                emptyMessage="There are no accepted or rejected transactions for this warehouse"
                actions={[]}
                className="validated-transactions-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="150px"
                showExportButton={true}
                exportButtonText="Export Transactions"
                exportFileName="validated_transactions"
                exportAllData={false}
                excludeColumnsFromExport={[]}
                customExportHeaders={{
                    'sender': 'Sender',
                    'receiver': 'Receiver',
                    'batchNumber': 'Batch Number',
                    'transactionDate': 'Transaction Date',
                    'status': 'Status'
                }}
                onExportStart={handleExportStart}
                onExportComplete={handleExportComplete}
                onExportError={handleExportError}
                onRowClick={handleRowClick}
            />

            <Snackbar
                isOpen={snackbar.isOpen}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar(prev => ({ ...prev, isOpen: false }))}
                duration={3000}
                position="bottom-right"
            />
        </div>
    );
};

export default ValidatedTransactionsTable;