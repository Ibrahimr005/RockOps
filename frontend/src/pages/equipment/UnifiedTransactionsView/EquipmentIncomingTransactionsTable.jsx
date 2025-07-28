import React, { useState, useEffect } from "react";
import "../../warehouse/WarehouseViewTransactions/WarehouseViewTransactions.scss";
import "../../warehouse/WarehouseViewTransactions/IncomingTransactions/AcceptRejectModal.scss";
import TransactionViewModal from "../../warehouse/WarehouseViewTransactions/TransactionViewModal/TransactionViewModal.jsx";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import { useSnackbar } from "../../../contexts/SnackbarContext";
import { inSiteMaintenanceService } from "../../../services/inSiteMaintenanceService";
import { maintenanceTypeService } from "../../../services/maintenanceTypeService";
import { employeeService } from "../../../services/employeeService";
import { equipmentService } from "../../../services/equipmentService";
import { siteService } from "../../../services/siteService";
import { warehouseService } from "../../../services/warehouseService";

const EquipmentIncomingTransactionsTable = ({ equipmentId }) => {
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

    // Maintenance integration states
    const [selectedPurpose, setSelectedPurpose] = useState('CONSUMABLE');
    const [maintenanceOption, setMaintenanceOption] = useState('none');
    const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);
    const [newMaintenanceData, setNewMaintenanceData] = useState({
        technicianId: '',
        maintenanceDate: '',
        maintenanceTypeId: '',
        description: ''
    });
    const [technicians, setTechnicians] = useState([]);
    const [maintenanceTypes, setMaintenanceTypes] = useState([]);

    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Use snackbar hook
    const { showSuccess, showError, showWarning, showInfo } = useSnackbar();

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

    useEffect(() => {
        fetchIncomingTransactions();
    }, [equipmentId]);

    const fetchIncomingTransactions = async () => {
        if (!equipmentId) {
            console.error("Equipment ID is not available");
            return;
        }

        setLoading(true);
        try {
            const response = await equipmentService.getEquipmentTransactions(equipmentId);
            const data = response.data;
            // Filter for only pending transactions where:
            // 1. Status is PENDING
            // 2. Current equipment is involved (as sender or receiver)
            // 3. Current equipment is NOT the entity that initiated the transaction (sentFirst)
            const pendingData = await Promise.all(
                data
                    .filter(transaction =>
                        transaction.status === "PENDING" &&
                        (transaction.receiverId === equipmentId || transaction.senderId === equipmentId) &&
                        transaction.sentFirst !== equipmentId
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
            let response;

            if (entityType === "WAREHOUSE") {
                response = await warehouseService.getById(entityId);
            } else if (entityType === "EQUIPMENT") {
                response = await equipmentService.getEquipmentById(entityId);
            } else if (entityType === "SITE") {
                response = await siteService.getSiteById(entityId);
            } else {
                return null;
            }

            return response.data;
        } catch (error) {
            console.error(`Failed to fetch ${entityType} details:`, error);
            return null;
        }
    };

    const handleAcceptTransaction = (transaction) => {
        setSelectedTransaction(transaction);
        setReceivedQuantities({});
        setItemsNotReceived({});
        setComments("");
        setAcceptError("");
        setProcessingAction(false);
        // Reset maintenance states
        setSelectedPurpose(transaction.purpose || 'CONSUMABLE');
        setMaintenanceOption('none');
        setSelectedMaintenanceId(null);
        setMaintenanceRecords([]);
        setNewMaintenanceData({
            technicianId: '',
            maintenanceDate: formatDateForInput(new Date()),
            maintenanceTypeId: '',
            description: ''
        });
        setIsAcceptModalOpen(true);
    };

    const handleRejectTransaction = (transaction) => {
        setSelectedTransaction(transaction);
        setRejectionReason("");
        setRejectError("");
        setProcessingAction(false);
        setIsRejectModalOpen(true);
    };

    const handleViewTransaction = (transaction) => {
        setViewTransaction(transaction);
        setIsViewModalOpen(true);
    };

    const handleQuantityChange = (itemId, value) => {
        const numericValue = Math.max(0, parseInt(value) || 0);
        setReceivedQuantities(prev => ({
            ...prev,
            [itemId]: numericValue
        }));
    };

    const handleItemNotReceivedChange = (itemId, notReceived) => {
        setItemsNotReceived(prev => ({
            ...prev,
            [itemId]: notReceived
        }));

        if (notReceived) {
            setReceivedQuantities(prev => ({
                ...prev,
                [itemId]: 0
            }));
        }
    };

    // Fetch maintenance records when option selected
    const fetchMaintenanceRecords = async () => {
        setLoadingMaintenance(true);
        showInfo("Loading maintenance records...");
        
        try {
            const response = await inSiteMaintenanceService.getByEquipmentId(equipmentId);
            const pendingRecords = response.data.filter(record => 
                record.status === 'IN_PROGRESS' || record.status === 'SCHEDULED'
            );
            
            setMaintenanceRecords(pendingRecords);
            
            if (pendingRecords.length === 0) {
                showWarning("No pending maintenance records found. You may need to create a new one.");
            } else {
                showSuccess(`Found ${pendingRecords.length} available maintenance record(s).`);
            }
        } catch (error) {
            showError("Failed to load maintenance records.");
            setMaintenanceRecords([]);
        } finally {
            setLoadingMaintenance(false);
        }
    };

    // Fetch technicians and maintenance types
    const fetchMaintenanceData = async () => {
        try {
            const [technicianResponse, maintenanceTypeResponse] = await Promise.all([
                inSiteMaintenanceService.getTechnicians(equipmentId),
                maintenanceTypeService.getAll()
            ]);
            
            setTechnicians(technicianResponse.data || []);
            setMaintenanceTypes(maintenanceTypeResponse.data || []);
        } catch (error) {
            console.error("Failed to fetch maintenance data:", error);
        }
    };

    // Handle purpose change
    const handlePurposeChange = (purpose) => {
        setSelectedPurpose(purpose);
        showInfo(`Transaction purpose set to ${purpose}`);
        
        if (purpose === 'MAINTENANCE') {
            showInfo("Maintenance mode activated. Please select how to handle maintenance record.");
            // Fetch maintenance data when maintenance purpose is selected
            fetchMaintenanceData();
        }
    };

    // Handle maintenance option change
    const handleMaintenanceOptionChange = (option) => {
        setMaintenanceOption(option);
        
        switch (option) {
            case 'existing':
                showInfo("Loading existing maintenance records...");
                fetchMaintenanceRecords();
                break;
            case 'create':
                showInfo("Prepare to create new maintenance record.");
                break;
            case 'none':
                showInfo("Transaction will be accepted without maintenance linking.");
                break;
        }
    };

    // Format date for datetime-local input
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleAcceptSubmit = async () => {
        setProcessingAction(true);
        setAcceptError("");

        // Validation with feedback
        if (selectedPurpose === 'MAINTENANCE' && maintenanceOption === 'existing' && !selectedMaintenanceId) {
            showError("Please select a maintenance record to link.");
            setProcessingAction(false);
            return;
        }
        
        if (selectedPurpose === 'MAINTENANCE' && maintenanceOption === 'create') {
            const requiredFields = ['technicianId', 'maintenanceDate', 'maintenanceTypeId'];
            const missingFields = requiredFields.filter(field => !newMaintenanceData[field]);
            
            if (missingFields.length > 0) {
                showError(`Please complete all required fields: ${missingFields.join(', ')}`);
                setProcessingAction(false);
                return;
            }
        }

        try {
            showInfo("Processing transaction acceptance...");
            
            // Validate quantities
            for (const item of selectedTransaction.items) {
                const isNotReceived = itemsNotReceived[item.id];
                const receivedQty = receivedQuantities[item.id] || 0;

                if (!isNotReceived && receivedQty <= 0) {
                    throw new Error("Please specify valid received quantities for all items or mark them as not received");
                }

                if (!isNotReceived && receivedQty > item.quantity) {
                    throw new Error(`Received quantity cannot exceed requested quantity for ${item.itemTypeName}`);
                }
            }

            const acceptanceData = {
                receivedQuantities,
                comment: comments,
                purpose: selectedPurpose,
                itemsNotReceived
            };

            if (selectedPurpose === 'MAINTENANCE' && maintenanceOption !== 'none') {
                showInfo("Processing maintenance integration...");
                
                if (maintenanceOption === 'existing') {
                    acceptanceData.maintenanceId = selectedMaintenanceId;
                    showInfo("Linking to existing maintenance record...");
                } else if (maintenanceOption === 'create') {
                    acceptanceData.newMaintenanceData = newMaintenanceData;
                    showInfo("Creating new maintenance record...");
                }
            }

            const response = await equipmentService.acceptEquipmentTransaction(equipmentId, selectedTransaction.id, acceptanceData);

            // Success feedback based on what was accomplished
            let successMessage = "Transaction accepted successfully!";
            
            if (selectedPurpose === 'MAINTENANCE') {
                if (maintenanceOption === 'existing') {
                    successMessage += " Transaction linked to existing maintenance record.";
                } else if (maintenanceOption === 'create') {
                    successMessage += " New maintenance record created and linked.";
                }
            }
            
            showSuccess(successMessage);
            setIsAcceptModalOpen(false);
            await fetchIncomingTransactions();
        } catch (error) {
            console.error("Error accepting transaction:", error);
            
            if (error.response?.data?.message) {
                showError(`Failed to accept transaction: ${error.response.data.message}`);
            } else {
                showError("Failed to accept transaction. Please try again.");
            }
            setAcceptError(error.message);
        } finally {
            setProcessingAction(false);
        }
    };

    const handleRejectSubmit = async () => {
        setProcessingAction(true);
        setRejectError("");

        try {
            if (!rejectionReason.trim()) {
                throw new Error("Please provide a reason for rejection");
            }

            const response = await equipmentService.rejectEquipmentTransaction(equipmentId, selectedTransaction.id, { rejectionReason });

            showSnackbar("Transaction rejected successfully", "success");
            setIsRejectModalOpen(false);
            await fetchIncomingTransactions();
        } catch (error) {
            console.error("Error rejecting transaction:", error);
            setRejectError(error.message);
        } finally {
            setProcessingAction(false);
        }
    };

    // Define columns for the transactions table - Match warehouse structure
    const columns = [
        {
            header: 'SENDER',
            accessor: 'sender',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.sender?.name || row.sender?.fullModelName || 'N/A'
        },
        {
            header: 'RECEIVER',
            accessor: 'receiver',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.receiver?.name || row.receiver?.fullModelName || 'N/A'
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
        },
        {
            label: 'Accept',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7"/>
                </svg>
            ),
            className: 'approve',
            onClick: (row) => handleAcceptTransaction(row)
        }
    ];

    return (
        <div className="transaction-table-section">
            <div className="table-header-section">
                <div className="left-section3">
                    <div className="item-count3">{pendingTransactions.length} incoming transactions</div>
                </div>
            </div>

            {/* DataTable Component - Match warehouse structure */}
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
                showExportButton={true}
                exportButtonText="Export Incoming Transactions"
                exportFileName="equipment_incoming_transactions"
                exportAllData={true}
                excludeColumnsFromExport={['actions']}
                customExportHeaders={{
                    'sender.name': 'Sender Name',
                    'sender.type': 'Sender Type',
                    'receiver.name': 'Receiver Name',
                    'receiver.type': 'Receiver Type',
                    'batchNumber': 'Batch Number',
                    'transactionDate': 'Transaction Date'
                }}
                onExportStart={() => showSnackbar("Exporting incoming transactions...", "info")}
                onExportComplete={(result) => showSnackbar(`Exported ${result.rowCount} records to Excel`, "success")}
                onExportError={(error) => showSnackbar("Failed to export incoming transactions", "error")}
            />

            {/* Accept Modal */}
            {isAcceptModalOpen && selectedTransaction && (
                <div className="modal-backdrop">
                    <div className="accept-reject-modal">
                        <div className="modal-header">
                            <h2>Accept Transaction</h2>
                            <button
                                className="btn-close"
                                onClick={() => setIsAcceptModalOpen(false)}
                                disabled={processingAction}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="transaction-info">
                                <div className="info-row">
                                    <span className="label">Batch Number:</span>
                                    <span className="value">{selectedTransaction.batchNumber}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Sender:</span>
                                    <span className="value">{selectedTransaction.sender?.name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Receiver:</span>
                                    <span className="value">{selectedTransaction.receiver?.name}</span>
                                </div>
                            </div>

                            <div className="items-section">
                                <h3>Items</h3>
                                {selectedTransaction.items?.map((item, index) => (
                                    <div key={item.id} className="item-container">
                                        <div className="item-details">
                                            <span className="item-name">{item.itemTypeName}</span>
                                            <span className="item-quantity">Requested: {item.quantity}</span>
                                        </div>

                                        <div className="quantity-controls">
                                            <div className="received-input">
                                                <label>Received:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantity}
                                                    value={receivedQuantities[item.id] || 0}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    disabled={processingAction || itemsNotReceived[item.id]}
                                                />
                                            </div>

                                            <div className="not-received-checkbox">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={itemsNotReceived[item.id] || false}
                                                        onChange={(e) => handleItemNotReceivedChange(item.id, e.target.checked)}
                                                        disabled={processingAction}
                                                    />
                                                    Not received
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Purpose Selection */}
                            <div className="purpose-section">
                                <label>Transaction Purpose:</label>
                                <select
                                    value={selectedPurpose}
                                    onChange={(e) => handlePurposeChange(e.target.value)}
                                    disabled={processingAction}
                                >
                                    <option value="CONSUMABLE">Consumable</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="GENERAL">General</option>
                                </select>
                            </div>

                            {/* Maintenance Integration Section */}
                            {selectedPurpose === 'MAINTENANCE' && (
                                <div className="maintenance-integration-section">
                                    <h4>Maintenance Record</h4>
                                    
                                    <div className="maintenance-options">
                                        <label>
                                            <input 
                                                type="radio" 
                                                value="none" 
                                                checked={maintenanceOption === 'none'}
                                                onChange={(e) => handleMaintenanceOptionChange(e.target.value)}
                                                disabled={processingAction}
                                            />
                                            Accept without linking to maintenance
                                        </label>
                                        
                                        <label>
                                            <input 
                                                type="radio" 
                                                value="existing" 
                                                checked={maintenanceOption === 'existing'}
                                                onChange={(e) => handleMaintenanceOptionChange(e.target.value)}
                                                disabled={processingAction}
                                            />
                                            Link to existing maintenance record
                                        </label>
                                        
                                        <label>
                                            <input 
                                                type="radio" 
                                                value="create" 
                                                checked={maintenanceOption === 'create'}
                                                onChange={(e) => handleMaintenanceOptionChange(e.target.value)}
                                                disabled={processingAction}
                                            />
                                            Create new maintenance record
                                        </label>
                                    </div>

                                    {maintenanceOption === 'existing' && (
                                        <div className="existing-maintenance-section">
                                            {loadingMaintenance ? (
                                                <div>Loading maintenance records...</div>
                                            ) : (
                                                <select 
                                                    value={selectedMaintenanceId || ''} 
                                                    onChange={(e) => {
                                                        setSelectedMaintenanceId(e.target.value);
                                                        if (e.target.value) {
                                                            const selected = maintenanceRecords.find(r => r.id === e.target.value);
                                                            showSuccess(`Selected maintenance: ${selected?.maintenanceType} - ${selected?.technicianName}`);
                                                        }
                                                    }}
                                                    disabled={processingAction}
                                                    required
                                                >
                                                    <option value="">Select maintenance record</option>
                                                    {maintenanceRecords.map(record => (
                                                        <option key={record.id} value={record.id}>
                                                            {record.maintenanceType} - {record.technicianName} ({new Date(record.maintenanceDate).toLocaleDateString()})
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    {maintenanceOption === 'create' && (
                                        <div className="new-maintenance-section">
                                            <div className="form-row">
                                                <select 
                                                    value={newMaintenanceData.technicianId} 
                                                    onChange={(e) => {
                                                        setNewMaintenanceData(prev => ({ ...prev, technicianId: e.target.value }));
                                                        showInfo("Technician selected for new maintenance record.");
                                                    }}
                                                    disabled={processingAction}
                                                    required
                                                >
                                                    <option value="">Select technician</option>
                                                    {technicians.map(tech => (
                                                        <option key={tech.id} value={tech.id}>
                                                            {tech.name || tech.fullName}
                                                        </option>
                                                    ))}
                                                </select>
                                                
                                                <input 
                                                    type="datetime-local" 
                                                    value={newMaintenanceData.maintenanceDate}
                                                    onChange={(e) => {
                                                        setNewMaintenanceData(prev => ({ ...prev, maintenanceDate: e.target.value }));
                                                        showInfo("Maintenance date set.");
                                                    }}
                                                    disabled={processingAction}
                                                    required
                                                />
                                            </div>
                                            
                                            <select 
                                                value={newMaintenanceData.maintenanceTypeId}
                                                onChange={(e) => {
                                                    setNewMaintenanceData(prev => ({ ...prev, maintenanceTypeId: e.target.value }));
                                                    showInfo("Maintenance type selected.");
                                                }}
                                                disabled={processingAction}
                                                required
                                            >
                                                <option value="">Select maintenance type</option>
                                                {maintenanceTypes.map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                            </select>
                                            
                                            <textarea 
                                                value={newMaintenanceData.description}
                                                onChange={(e) => setNewMaintenanceData(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Maintenance description"
                                                disabled={processingAction}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="comments-section">
                                <label>Comments (optional):</label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Enter any additional comments..."
                                    disabled={processingAction}
                                />
                            </div>

                            {acceptError && (
                                <div className="error-message">
                                    {acceptError}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setIsAcceptModalOpen(false)}
                                disabled={processingAction}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleAcceptSubmit}
                                disabled={processingAction}
                            >
                                {processingAction ? "Processing..." : "Accept"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {isRejectModalOpen && selectedTransaction && (
                <div className="modal-backdrop">
                    <div className="accept-reject-modal">
                        <div className="modal-header">
                            <h2>Reject Transaction</h2>
                            <button
                                className="btn-close"
                                onClick={() => setIsRejectModalOpen(false)}
                                disabled={processingAction}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-content">
                            <div className="transaction-info">
                                <div className="info-row">
                                    <span className="label">Batch Number:</span>
                                    <span className="value">{selectedTransaction.batchNumber}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Sender:</span>
                                    <span className="value">{selectedTransaction.sender?.name}</span>
                                </div>
                            </div>

                            <div className="rejection-reason-section">
                                <label>Reason for rejection *:</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Please provide a reason for rejecting this transaction..."
                                    disabled={processingAction}
                                    required
                                />
                            </div>

                            {rejectError && (
                                <div className="error-message">
                                    {rejectError}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setIsRejectModalOpen(false)}
                                disabled={processingAction}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleRejectSubmit}
                                disabled={processingAction}
                            >
                                {processingAction ? "Processing..." : "Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewModalOpen && viewTransaction && (
                <TransactionViewModal
                    transaction={viewTransaction}
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
        </div>
    );
};

export default EquipmentIncomingTransactionsTable; 