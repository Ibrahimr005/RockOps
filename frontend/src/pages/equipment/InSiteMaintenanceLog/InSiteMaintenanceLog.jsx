// InSiteMaintenanceLog.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FaEdit, FaTrash, FaEye, FaPlus } from 'react-icons/fa';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import './InSiteMaintenanceLog.scss';
import MaintenanceTransactionModal from '../MaintenanceTransactionModal/MaintenanceTransactionModal';
import MaintenanceAddModal from '../MaintenanceAddModal/MaintenanceAddModal';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import TransactionViewModal from '../../warehouse/WarehouseViewTransactions/TransactionViewModal/TransactionViewModal.jsx';

const InSiteMaintenanceLog = forwardRef(({ equipmentId, onAddMaintenanceClick, onAddTransactionClick, showAddButton = true, showHeader = true }, ref) => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMaintenanceTransactionModalOpen, setIsMaintenanceTransactionModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
    const [selectedBatchNumber, setSelectedBatchNumber] = useState(null);
    const [editingMaintenance, setEditingMaintenance] = useState(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const { showSuccess, showError, showInfo, showWarning, hideSnackbar } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    const fetchMaintenanceRecords = async () => {
        try {
            setLoading(true);
            showInfo("Loading maintenance records...");
            const response = await inSiteMaintenanceService.getByEquipmentId(equipmentId);

            // Transform data for display
            const transformedData = await Promise.all(
                response.data.map(async (record) => {
                    // Get transaction info
                    const transactionCount = record.relatedTransactions?.length || 0;
                    
                    // Extract maintenance type name from the MaintenanceType object
                    const maintenanceTypeName = record.maintenanceType?.name || record.maintenanceType || 'N/A';

                    return {
                        id: record.id,
                        technicianName: record.technician ? `${record.technician.firstName} ${record.technician.lastName}` : "N/A",
                        technicianId: record.technician?.id || null,
                        maintenanceDate: record.maintenanceDate,
                        maintenanceType: maintenanceTypeName,
                        maintenanceTypeId: record.maintenanceType?.id || null,
                        description: record.description,
                        status: record.status,
                        batchNumber: record.batchNumber,
                        transactionCount: transactionCount,
                        relatedTransactions: record.relatedTransactions || []
                    };
                })
            );

            setMaintenanceRecords(transformedData);
            setLoading(false);
            showSuccess(`Successfully loaded ${transformedData.length} maintenance record${transformedData.length !== 1 ? 's' : ''}`);
        } catch (err) {
            console.error('Error fetching maintenance records:', err);
            setError(err.message);
            setLoading(false);
            showError('Failed to load maintenance records. Please try again.');
        }
    };

    // Expose fetchMaintenanceRecords to parent component
    useImperativeHandle(ref, () => ({
        refreshLogs: fetchMaintenanceRecords
    }));

    useEffect(() => {
        if (equipmentId) {
            showInfo("Initializing maintenance log...");
            fetchMaintenanceRecords();
        }
    }, [equipmentId]);

    // Handle search functionality with feedback
    const handleSearch = (term) => {
        setSearchTerm(term);
        if (term.trim()) {
            const filteredCount = maintenanceRecords.filter(record =>
                (record.technicianName?.toLowerCase() || '').includes(term.toLowerCase()) ||
                (record.maintenanceType?.toLowerCase() || '').includes(term.toLowerCase()) ||
                (record.description?.toLowerCase() || '').includes(term.toLowerCase()) ||
                (record.status?.toLowerCase() || '').includes(term.toLowerCase())
            ).length;
            
            if (filteredCount === 0) {
                showWarning(`No maintenance records found matching "${term}"`);
            } else {
                showInfo(`Found ${filteredCount} maintenance record${filteredCount !== 1 ? 's' : ''} matching "${term}"`);
            }
        }
    };

    // Filter maintenance records based on search term
    const filteredRecords = searchTerm
        ? maintenanceRecords.filter(record =>
            (record.technicianName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (record.maintenanceType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (record.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (record.status?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
        : maintenanceRecords;

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";

        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // View transactions details
    const handleViewTransactions = (record) => {
        if (record.transactionCount === 0) {
            showInfo("No transactions linked to this maintenance record.");
            return;
        }

        // Format transaction details for display
        const transactionDetails = record.relatedTransactions.map(t =>
            `Transaction ID: ${t.id}\nBatch Number: ${t.batchNumber}\nStatus: ${t.status}\nItems: ${t.items?.length || 0}`
        ).join('\n\n');

        showInfo(`Maintenance: ${record.maintenanceType}\n\nLinked Transactions:\n${transactionDetails}`);
    };

    // Handle adding transaction to maintenance
    const handleAddTransactionToMaintenance = (record) => {
        try {
            setSelectedMaintenanceId(record.id);
            setSelectedBatchNumber(record.batchNumber || null);
            setIsMaintenanceTransactionModalOpen(true);
            showInfo("Opening transaction creation modal...");
        } catch (error) {
            showError("Failed to open transaction creation modal");
            console.error("Error opening transaction modal:", error);
        }
    };

    // Close maintenance transaction modal
    const handleCloseMaintenanceTransactionModal = () => {
        setIsMaintenanceTransactionModalOpen(false);
        setSelectedMaintenanceId(null);
        setSelectedBatchNumber(null);
        showInfo("Transaction creation modal closed");
    };

    // Refresh after transaction added
    const handleTransactionAdded = () => {
        showSuccess("Transaction added successfully! Refreshing maintenance records...");
        fetchMaintenanceRecords();
        handleCloseMaintenanceTransactionModal();
    };

    const handleRowClick = (row) => {
        // Handle row click logic here
        console.log('Row clicked:', row);
        showInfo(`Selected maintenance record: ${row.maintenanceType} by ${row.technicianName}`);
    };

    const handleEditMaintenance = (row) => {
        try {
            setEditingMaintenance(row);
            setIsEditModalOpen(true);
            showInfo(`Opening edit modal for maintenance: ${row.maintenanceType}`);
        } catch (error) {
            showError("Failed to open edit maintenance modal");
            console.error("Error opening edit modal:", error);
        }
    };

    const handleDeleteMaintenance = async (row) => {
        // Custom message with buttons
        const message = `Are you sure you want to delete the maintenance record "${row.maintenanceType}" performed by ${row.technicianName}? This action cannot be undone.`;

        // Show persistent confirmation warning that won't auto-hide
        showWarning(message, 0, true);

        // Create action buttons in the DOM
        setTimeout(() => {
            const snackbar = document.querySelector('.global-notification');
            if (snackbar) {
                // Create and append action buttons container
                const actionContainer = document.createElement('div');
                actionContainer.className = 'snackbar-actions';

                // Yes button
                const yesButton = document.createElement('button');
                yesButton.innerText = 'YES';
                yesButton.className = 'snackbar-action-button confirm';
                yesButton.onclick = async () => {
                    try {
                        showInfo('Deleting maintenance record...');
                        await inSiteMaintenanceService.delete(equipmentId, row.id);
                        fetchMaintenanceRecords(); // Refresh the list
                        showSuccess(`Maintenance record "${row.maintenanceType}" deleted successfully!`);
                    } catch (error) {
                        console.error('Error deleting maintenance record:', error);
                        showError(`Failed to delete maintenance record "${row.maintenanceType}". Please try again.`);
                    }
                    hideSnackbar();
                };

                // No button
                const noButton = document.createElement('button');
                noButton.innerText = 'NO';
                noButton.className = 'snackbar-action-button cancel';
                noButton.onclick = () => {
                    hideSnackbar();
                };

                actionContainer.appendChild(yesButton);
                actionContainer.appendChild(noButton);
                snackbar.appendChild(actionContainer);
            }
        }, 100);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingMaintenance(null);
        showInfo("Edit modal closed");
    };

    const handleMaintenanceUpdated = () => {
        showSuccess("Maintenance record updated successfully! Refreshing list...");
        fetchMaintenanceRecords();
        handleCloseEditModal();
    };

    // View individual transaction details
    const handleViewTransaction = (transaction) => {
        try {
            // Enrich transaction data for better display
            const enrichedTransaction = {
                ...transaction,
                // Add computed sender/receiver names if not present
                senderName: transaction.senderName || getEntityDisplayName(transaction.senderType, transaction.senderId),
                receiverName: transaction.receiverName || getEntityDisplayName(transaction.receiverType, transaction.receiverId),
                // Enrich items with proper item type names
                items: transaction.items?.map(item => ({
                    ...item,
                    itemTypeName: item.itemTypeName || item.itemType?.name || "Unknown Item",
                    itemCategory: item.itemCategory || item.itemType?.category || "Unknown Category"
                })) || []
            };
            
            setSelectedTransaction(enrichedTransaction);
            setIsTransactionModalOpen(true);
            showInfo(`Opening transaction details for batch #${transaction.batchNumber || 'N/A'}`);
        } catch (error) {
            showError("Failed to open transaction details");
            console.error("Error opening transaction modal:", error);
        }
    };

    // Helper function to get entity display name
    const getEntityDisplayName = (entityType, entityId) => {
        // For now, return a simplified display name
        // In a full implementation, you might want to fetch entity details
        switch (entityType) {
            case 'WAREHOUSE':
                return 'Warehouse';
            case 'EQUIPMENT':
                return 'Equipment';
            case 'EMPLOYEE':
                return 'Employee';
            default:
                return 'Unknown Entity';
        }
    };

    // Close transaction view modal
    const handleCloseTransactionModal = () => {
        setIsTransactionModalOpen(false);
        setSelectedTransaction(null);
        showInfo("Transaction details closed");
    };

    // Define columns without the manual Actions column
    const columns = [
        { header: 'Technician', accessor: 'technicianName' },
        { header: 'Date', accessor: 'maintenanceDate', render: (rowData) => formatDate(rowData.maintenanceDate) },
        { header: 'Type', accessor: 'maintenanceType' },
        { header: 'Description', accessor: 'description', render: (rowData) => rowData.description?.length > 50 ? `${rowData.description.substring(0, 50)}...` : rowData.description },
        { header: 'Status', accessor: 'status', render: (rowData) => <span className={`r4m-status-badge r4m-${rowData.status.toLowerCase()}`}>{rowData.status}</span> },
        { 
            header: 'Transaction', 
            accessor: 'transaction', 
            render: (rowData) => {
                if (!rowData.relatedTransactions || rowData.relatedTransactions.length === 0) {
                    return (
                        <span 
                            className="r4m-no-transactions"
                            title="No transactions linked to this maintenance record"
                        >
                            None
                        </span>
                    );
                }
                
                // Show buttons for each transaction
                return (
                    <div className="r4m-transaction-buttons">
                        {rowData.relatedTransactions.map((transaction, index) => (
                            <button
                                key={transaction.id || index}
                                className="r4m-transaction-eye-button"
                                title={`View Transaction ${transaction.batchNumber || 'Details'} - Status: ${transaction.status || 'Unknown'}`}
                                onClick={() => handleViewTransaction(transaction)}
                            >
                                <FaEye />
                            </button>
                        ))}
                    </div>
                );
            }
        }
    ];

    // Define actions using DataTable's actions prop with proper styling
    const actions = permissions.canEdit || permissions.canDelete ? [
        ...(permissions.canEdit ? [{
            label: 'Edit',
            icon: <FaEdit />,
            onClick: (row) => handleEditMaintenance(row),
            className: 'primary'
        }] : []),
        ...(permissions.canDelete ? [{
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => handleDeleteMaintenance(row),
            className: 'danger'
        }] : [])
    ] : [];

    // Define filterable columns - these should match the column objects
    const filterableColumns = [
        { header: 'Technician', accessor: 'technicianName' },
        { header: 'Type', accessor: 'maintenanceType' },
        { header: 'Status', accessor: 'status' }
    ];

    return (
        <div className="r4m-maintenance-log-container">


            <div className="r4m-maintenance-content">
                {loading ? (
                    <div className="r4m-loading-state">
                        <div className="r4m-loading-spinner"></div>
                        <p>Loading maintenance records...</p>
                    </div>
                ) : error ? (
                    <div className="r4m-error-state">
                        <p>Error loading maintenance records: {error}</p>
                    </div>
                ) : (
                    <DataTable
                        data={filteredRecords}
                        columns={columns}
                        actions={actions}
                        onRowClick={handleRowClick}
                        loading={loading}
                        tableTitle="Maintenance Records"
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={filterableColumns}
                        emptyMessage={
                            searchTerm 
                                ? `No maintenance records found matching "${searchTerm}". Try different search terms or clear the search to see all records.`
                                : "No maintenance records found. Create your first maintenance record using the Add button."
                        }
                        showAddButton={showAddButton && permissions.canCreate}
                        addButtonText="Add Maintenance"
                        addButtonIcon={<FaPlus />}
                        onAddClick={() => {
                            showInfo("Opening maintenance creation form...");
                            onAddMaintenanceClick();
                        }}
                    />
                ) }
            </div>

            {/* Maintenance Transaction Modal */}
            {isMaintenanceTransactionModalOpen && (
                            <MaintenanceTransactionModal
                isOpen={isMaintenanceTransactionModalOpen}
                onClose={handleCloseMaintenanceTransactionModal}
                equipmentId={equipmentId}
                maintenanceId={selectedMaintenanceId}
                initialBatchNumber={selectedBatchNumber}
                onTransactionAdded={handleTransactionAdded}
            />
            )}

            {/* Transaction View Modal */}
            <TransactionViewModal
                isOpen={isTransactionModalOpen}
                onClose={handleCloseTransactionModal}
                transaction={selectedTransaction}
            />

            {/* Edit Maintenance Modal */}
            {isEditModalOpen && editingMaintenance && (
                <MaintenanceAddModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    equipmentId={equipmentId}
                    onMaintenanceAdded={handleMaintenanceUpdated}
                    editingMaintenance={editingMaintenance}
                />
            )}
        </div>
    );
});

export default InSiteMaintenanceLog;