import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import { FaPlus } from 'react-icons/fa';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { equipmentService } from '../../../services/equipmentService';
import { transactionService } from '../../../services/transactionService';
import { consumableService } from '../../../services/consumableService';
import './EquipmentConsumablesInventory.scss';
import DataTable from '../../../components/common/DataTable/DataTable';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import EquipmentConsumablesHistoryModal from "./EquipmentConsumablesHistoryModal.jsx";
import TransactionViewModal from "../../warehouse/WarehouseViewTransactions/TransactionViewModal/TransactionViewModal.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";

const EquipmentConsumablesInventory = forwardRef(({equipmentId, onAddClick}, ref) => {

    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('current');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedConsumable, setSelectedConsumable] = useState(null);
    const [consumableHistory, setConsumableHistory] = useState([]);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [resolutionHistory, setResolutionHistory] = useState([]);
    const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
    const [resolutionData, setResolutionData] = useState({
        resolutionType: "",
        notes: "",
        transactionId: "",
        correctedQuantity: ""
    });

    const { showInfo } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // Snackbar states
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

    // Function to fetch transaction details and show in TransactionViewModal
    const showTransactionDetails = async (consumable) => {
        if (!consumable.transactionId) {
            showSnackbar("No transaction associated with this item", "warning");
            return;
        }

        try {
            const response = await transactionService.getById(consumable.transactionId);
            setSelectedTransaction(response.data);
            setIsTransactionModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch transaction details:", error);
            showSnackbar("Failed to fetch transaction details", "error");
        }
    };

    // Function to fetch resolution history
    const fetchResolutionHistory = async () => {
        if (!equipmentId) return;
        
        try {
            const response = await consumableService.getResolutionHistory(equipmentId);
            setResolutionHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch resolution history:", error);
        }
    };

    // Function to open resolution modal
    const openResolutionModal = (consumable) => {
        setSelectedConsumable(consumable);
        setResolutionData({
            resolutionType: "",
            notes: "",
            transactionId: consumable.transactionId || "",
            correctedQuantity: ""
        });
        setIsResolutionModalOpen(true);
    };

    // Function to handle resolution form input changes
    const handleResolutionInputChange = (e) => {
        const { name, value } = e.target;
        setResolutionData({
            ...resolutionData,
            [name]: value,
        });
    };

    // Function to submit resolution
    const handleResolutionSubmit = async (e) => {
        e.preventDefault();

        if (!selectedConsumable) return;

        try {
            const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
            const resolution = {
                consumableId: selectedConsumable.id,
                resolutionType: resolutionData.resolutionType,
                notes: resolutionData.notes,
                transactionId: resolutionData.transactionId,
                resolvedBy: userInfo?.username || "system",
                ...(resolutionData.resolutionType === 'COUNTING_ERROR' && resolutionData.correctedQuantity && {
                    correctedQuantity: parseInt(resolutionData.correctedQuantity)
                })
            };

            await consumableService.resolveDiscrepancy(resolution);
            fetchConsumables();
            fetchResolutionHistory(); // Also refresh resolution history
            fetchOverReceivedCount(); // Refresh count for badge
            setIsResolutionModalOpen(false);
            showSnackbar("Discrepancy resolved successfully", "success");
        } catch (error) {
            console.error("Failed to resolve consumable:", error);
            showSnackbar("Failed to resolve discrepancy", "error");
        }
    };

    const fetchConsumables = async () => {
        try {
            setLoading(true);
            // Fetch data based on active tab for better performance and real-time updates
            let response;
            if (activeTab === 'resolutionHistory') {
                response = await equipmentService.getEquipmentConsumablesByCategory(equipmentId, 'resolved');
            } else if (activeTab === 'overReceived') {
                response = await equipmentService.getEquipmentConsumablesByCategory(equipmentId, 'surplus');
            } else {
                response = await equipmentService.getEquipmentConsumablesByCategory(equipmentId, 'current');
            }
            
            setConsumables(response.data);
            console.log(`Consumables data for ${activeTab}:`, response.data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching consumables inventory:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchConsumableHistory = async (consumableId) => {
        try {
            console.log("🔍 Fetching consumable history for ID:", consumableId);
            const response = await consumableService.getConsumableHistory(consumableId);
            console.log("✅ Fetched consumable history:", response.data);
            setConsumableHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch consumable history:", error);
            showSnackbar("Failed to fetch consumable history", "error");
        }
    };

    const showConsumableHistory = async (consumable) => {
        setSelectedConsumable(consumable);
        await fetchConsumableHistory(consumable.id);
        setIsHistoryModalOpen(true);
    };

    // Expose fetchConsumables to parent component
    useImperativeHandle(ref, () => ({
        fetchConsumables,
        refreshLogs: fetchConsumables  // Alias for backward compatibility
    }));

    useEffect(() => {
        if (equipmentId) {
            fetchConsumables();
            fetchOverReceivedCount(); // Always fetch count for badge
            if (activeTab === 'resolutionHistory') {
                fetchResolutionHistory();
            }
        }
    }, [equipmentId, activeTab]);

    // Filter consumables based on search term only (tab filtering is now done server-side)
    const filteredConsumables = consumables.filter(item => {
        // Apply search filter
        const matchesSearch = !searchTerm ||
            (item.itemTypeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.itemTypeCategory?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Get count for overReceived badge indicator from current data
    const [overReceivedCount, setOverReceivedCount] = useState(0);

    const fetchOverReceivedCount = async () => {
        try {
            const response = await equipmentService.getEquipmentConsumablesByCategory(equipmentId, 'surplus');
            setOverReceivedCount(response.data.length);
        } catch (error) {
            console.error('Error fetching overreceived count:', error);
        }
    };

    // Helper functions for resolution history
    const getResolutionTypeLabel = (resolutionType) => {
        switch (resolutionType) {
            case 'ACKNOWLEDGE_LOSS':
                return 'Acknowledge Loss';
            case 'FOUND_ITEMS':
                return 'Items Found';
            case 'REPORT_THEFT':
                return 'Report Theft';
            case 'ACCEPT_SURPLUS':
                return 'Accept Surplus';
            case 'COUNTING_ERROR':
                return 'Counting Error';
            case 'RETURN_TO_SENDER':
                return 'Return to Sender';
            default:
                return resolutionType;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Define columns for the data table
    const columns = [
        {header: 'Item Name', accessor: 'itemTypeName'},
        {header: 'Category', accessor: 'itemTypeCategory'},
        {
            header: 'Quantity',
            accessor: 'quantity',
            render: (row, value) => (
                <span
                    className={`quantity-value ${activeTab === 'overReceived' ? 'over-received' : value <= 5 ? 'low-stock' : ''}`}>
                    {value}
                </span>
            )
        },
        {
            header: 'Unit',
            accessor: 'unit'},

        {
            header: 'Last Updated',
            accessor: 'lastUpdated',
            render: (row, value) => value ? new Date(value).toLocaleDateString() : "N/A"
        },
        // Show History column only for current inventory tab
        ...(activeTab === 'current' ? [{
            header: 'History',
            accessor: 'history',
            render: (row) => (
                <button
                    className="rockops-table__action-button view"
                    title="View History"
                    onClick={() => showConsumableHistory(row)}
                >

                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>

                </button>
            )
        }] : []),
        // Show Transaction column only for surplus items tab
        ...(activeTab === 'overReceived' ? [{
            header: 'Transaction',
            accessor: 'transaction',
            render: (row) => (
                <button
                    className="btn-primary--ghost"
                    title="View Transaction"
                    onClick={() => showTransactionDetails(row)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            )
        }] : []),
        // Show Actions column only for surplus items tab with edit permissions
        ...(activeTab === 'overReceived' && permissions.canEdit ? [{
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <button
                    className="btn-primary--warning"
                    title="Resolve Surplus"
                    onClick={() => openResolutionModal(row)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Resolve
                </button>
            )
        }] : [])
    ];

    // Define columns for resolution history table
    const historyColumns = [
        {
            accessor: 'consumable.itemType.itemCategory.name',
            header: 'CATEGORY',
            width: '210px',
            render: (row) => (
                <span className="category-tag">
                    {row.consumable?.itemType?.itemCategory?.name || "No Category"}
                </span>
            )
        },
        {
            accessor: 'consumable.itemType.name',
            header: 'ITEM',
            width: '210px',
            render: (row) => row.consumable?.itemType?.name || "N/A"
        },
        {
            accessor: 'originalQuantity',
            header: 'QUANTITY',
            width: '210px'
        },
        {
            accessor: 'consumable.transaction.batchNumber',
            header: 'BATCH #',
            width: '210px',
            render: (row) => (
                <span className="batch-number">
                    {row.consumable?.transaction?.batchNumber || 'N/A'}
                </span>
            )
        },
        {
            accessor: 'resolutionType',
            header: 'RESOLUTION',
            width: '180px',
            render: (row) => (
                <div className="resolution-type-cell">
                    <span className={`resolution-badge ${row.resolutionType?.toLowerCase().replace('_', '-')}`}>
                        {getResolutionTypeLabel(row.resolutionType)}
                    </span>
                    {row.resolutionType === 'COUNTING_ERROR' && row.correctedQuantity && (
                        <div className="corrected-quantity-info">
                            Corrected: {row.correctedQuantity}
                        </div>
                    )}
                    {!row.fullyResolved && (
                        <div className="unresolved-indicator">
                            Still Unresolved
                        </div>
                    )}
                </div>
            )
        },
        {
            accessor: 'resolvedBy',
            header: 'RESOLVED BY',
            width: '210px',
            render: (row) => row.resolvedBy || "System"
        },
        {
            accessor: 'resolvedAt',
            header: 'RESOLVED AT',
            width: '250px',
            render: (row) => (
                <span className="date-cell">
                    {formatDate(row.resolvedAt)}
                </span>
            )
        }
    ];

    // Define filterable columns - these should match the column objects
    const filterableColumns = [
        {header: 'Item Name', accessor: 'itemTypeName'},
        {header: 'Category', accessor: 'itemTypeCategory'},
        {header: 'Quantity', accessor: 'quantity'},
        {header: 'Unit', accessor: 'unit'},
        {header: 'Batch Number', accessor: 'batchNumber'},
        {header: 'Last Updated', accessor: 'lastUpdated'}
    ];

    return (
        <div className="consumables-inventory">

            {/* Inventory Tabs */}
            <div className="inventory-tabs">
                <button
                    className={`inventory-tab ${activeTab === 'current' ? 'active' : ''}`}
                    onClick={() => handleTabChange('current')}
                >
                    Consumed Material
                    <span className="inventory-tab-count">{consumables.filter(c => (!c.status || c.status === 'REGULAR' || c.status === 'IN_WAREHOUSE' || c.status === 'CONSUMED') && !c.resolved).length}</span>
                </button>
                <button
                    className={`inventory-tab ${activeTab === 'overReceived' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overReceived')}
                >
                    Surplus Items
                    {overReceivedCount > 0 && (
                        <span className="tab-badge">
                            {overReceivedCount}
                        </span>
                    )}
                </button>
                <button
                    className={`inventory-tab ${activeTab === 'resolutionHistory' ? 'active' : ''}`}
                    onClick={() => handleTabChange('resolutionHistory')}
                >
                    Resolution History
                    <span className="inventory-tab-count">{consumables.filter(c => c.resolved).length}</span>
                </button>
            </div>

            {/* Info cards for different tabs */}
            {activeTab === 'overReceived' && (
                <div className="resolution-info-card">
                    <div className="resolution-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="resolution-info-content">
                        <h3>Inventory Surplus</h3>
                        <p>
                            Items in this section represent surpluses (more received than expected).
                            These items need to be reconciled and properly added to your inventory.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'resolutionHistory' && (
                <div className="resolution-info-card">
                    <div className="resolution-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="resolution-info-content">
                        <h3>Resolution History</h3>
                        <p>
                            This section shows the complete history of all resolved consumable discrepancies. Each entry includes details about the original issue, the resolution action taken, and who resolved it.
                        </p>
                    </div>
                </div>
            )}

            <div className="inventory-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading consumables inventory...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>Error loading consumables: {error}</p>
                    </div>
                ) : (
                    activeTab === 'resolutionHistory' ? (
                        <DataTable
                            data={resolutionHistory}
                            columns={historyColumns}
                            loading={loading}
                            tableTitle="Resolution History"
                            showSearch={true}
                            showFilters={true}
                            filterableColumns={[
                                { accessor: 'consumable.itemType.name', header: 'Item' },
                                { accessor: 'consumable.itemType.itemCategory.name', header: 'Category' },
                                { accessor: 'resolutionType', header: 'Resolution Type' },
                                { accessor: 'resolvedBy', header: 'Resolved By' }
                            ]}
                            itemsPerPageOptions={[5, 10, 15, 20]}
                            defaultItemsPerPage={10}
                            emptyMessage="No resolution history found"
                            className="resolution-history-table"
                            showExportButton={true}
                            exportButtonText="Export Resolution History"
                            exportFileName="equipment_resolution_history"
                            exportAllData={true}
                            customExportHeaders={{
                                'consumable.itemType.name': 'Item Name',
                                'consumable.itemType.itemCategory.name': 'Category',
                                'resolutionType': 'Resolution Type',
                                'resolvedBy': 'Resolved By',
                                'resolvedAt': 'Resolved Date',
                                'notes': 'Notes'
                            }}
                            onExportStart={() => showSnackbar("Exporting resolution history...", "info")}
                            onExportComplete={(result) => showSnackbar(`Exported ${result.rowCount} records to Excel`, "success")}
                            onExportError={(error) => showSnackbar("Failed to export resolution history", "error")}
                        />
                    ) : (
                        <DataTable
                            data={filteredConsumables}
                            columns={columns}
                            loading={loading}
                            tableTitle={`${activeTab === 'current' ? 'Consumed Material' : 'Surplus Items'}`}
                            showSearch={true}
                            showFilters={true}
                            filterableColumns={filterableColumns}
                            itemsPerPageOptions={[5, 10, 15, 20]}
                            defaultItemsPerPage={5}
                            emptyMessage="No consumables found"
                            showAddButton={permissions.canCreate && activeTab === 'current'}
                            addButtonText="Add Consumable"
                            addButtonIcon={<FaPlus />}
                            onAddClick={onAddClick}
                            showExportButton={true}
                            exportButtonText={`Export ${activeTab === 'current' ? 'Consumables' : 'Surplus Items'}`}
                            exportFileName={`equipment_${activeTab === 'current' ? 'consumables' : 'surplus_items'}`}
                            exportAllData={true}
                            customExportHeaders={{
                                'itemTypeName': 'Item Name',
                                'itemTypeCategory': 'Category',
                                'quantity': 'Quantity',
                                'unit': 'Unit',
                                'status': 'Status',
                                'batchNumber': 'Batch Number',
                                'transactionDate': 'Transaction Date',
                                'lastUpdated': 'Last Updated'
                            }}
                            onExportStart={() => showSnackbar(`Exporting ${activeTab === 'current' ? 'consumables' : 'surplus items'}...`, "info")}
                            onExportComplete={(result) => showSnackbar(`Exported ${result.rowCount} records to Excel`, "success")}
                            onExportError={(error) => showSnackbar(`Failed to export ${activeTab === 'current' ? 'consumables' : 'surplus items'}`, "error")}
                        />
                    )
                )}
            </div>

            {/* History Modal */}
            <EquipmentConsumablesHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                consumableHistory={consumableHistory}
                itemDetails={selectedConsumable}
            />

            {/* Transaction Modal */}
            <TransactionViewModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransaction}
            />

            {/* Resolution Modal */}
            {isResolutionModalOpen && selectedConsumable && (
                <div className="resolution-modal-backdrop">
                    <div className="resolution-modal">
                        <div className="resolution-modal-header">
                            <h2>Resolve Consumable Discrepancy</h2>
                            <button
                                className="btn-close"
                                onClick={() => setIsResolutionModalOpen(false)}
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="resolution-modal-body">
                            <div className="resolution-item-details">
                                <div className="resolution-detail">
                                    <span className="resolution-label">Item:</span>
                                    <span className="resolution-value">{selectedConsumable.itemTypeName}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Quantity:</span>
                                    <span className="resolution-value">{selectedConsumable.quantity} {selectedConsumable.unit || ''}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Status:</span>
                                    <span className="resolution-value">{selectedConsumable.status === 'OVERRECEIVED' ? 'Surplus' : selectedConsumable.status}</span>
                                </div>

                                <div className="resolution-detail">
                                    <span className="resolution-label">Batch Number:</span>
                                    <span className="resolution-value">{selectedConsumable.batchNumber || 'N/A'}</span>
                                </div>
                            </div>

                            <form onSubmit={handleResolutionSubmit} className="resolution-form">
                                <div className="resolution-form-group">
                                    <label htmlFor="resolutionType">Resolution Type</label>
                                    <select
                                        id="resolutionType"
                                        name="resolutionType"
                                        value={resolutionData.resolutionType}
                                        onChange={handleResolutionInputChange}
                                        required
                                    >
                                        <option value="">Select Resolution Type</option>
                                        {selectedConsumable.status === 'MISSING' ? (
                                            <>
                                                <option value="ACKNOWLEDGE_LOSS">Acknowledge Loss</option>
                                                <option value="FOUND_ITEMS">Items Found</option>
                                                <option value="REPORT_THEFT">Report Theft</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="ACCEPT_SURPLUS">Accept Surplus</option>
                                                <option value="COUNTING_ERROR">Counting Error</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div className="resolution-form-group">
                                    <label htmlFor="notes">Resolution Notes</label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        value={resolutionData.notes}
                                        onChange={handleResolutionInputChange}
                                        placeholder="Provide details about this resolution"
                                        rows={4}
                                        required
                                    />
                                </div>

                                {resolutionData.resolutionType === 'COUNTING_ERROR' && (
                                    <div className="resolution-form-group">
                                        <label htmlFor="correctedQuantity">Corrected Quantity*</label>
                                        <input
                                            type="number"
                                            id="correctedQuantity"
                                            name="correctedQuantity"
                                            value={resolutionData.correctedQuantity}
                                            onChange={handleResolutionInputChange}
                                            placeholder="Enter the actual quantity received"
                                            min="0"
                                            required
                                        />
                                        <small className="help-text">
                                            Enter the actual quantity you received for this item
                                        </small>
                                    </div>
                                )}

                                <div className="resolution-confirmation">
                                    <p className="resolution-confirmation-text">
                                        {resolutionData.resolutionType === 'ACKNOWLEDGE_LOSS' &&
                                            "You are confirming that these items are lost and will be removed from inventory."}
                                        {resolutionData.resolutionType === 'FOUND_ITEMS' &&
                                            "You are confirming items were found and will be returned to regular inventory."}
                                        {resolutionData.resolutionType === 'REPORT_THEFT' &&
                                            "You are reporting theft. This will be logged and items will be written off."}
                                        {resolutionData.resolutionType === 'ACCEPT_SURPLUS' &&
                                            "You are accepting the surplus items. They will be marked as resolved."}
                                        {resolutionData.resolutionType === 'COUNTING_ERROR' &&
                                            "You are correcting the received quantity. The system will validate against the original transaction."}
                                    </p>
                                </div>

                                <div className="resolution-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-primary--outline"
                                        onClick={() => setIsResolutionModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={
                                            !resolutionData.resolutionType || 
                                            !resolutionData.notes ||
                                            (resolutionData.resolutionType === 'COUNTING_ERROR' && !resolutionData.correctedQuantity)
                                        }
                                    >
                                        Resolve Discrepancy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Snackbar */}
            <Snackbar
                isVisible={showNotification}
                message={notificationMessage}
                type={notificationType}
                onClose={closeSnackbar}
            />
        </div>
    );
});

export default EquipmentConsumablesInventory;