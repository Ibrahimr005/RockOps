// InSiteMaintenanceLog.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import './InSiteMaintenanceLog.scss';
import MaintenanceTransactionModal from '../MaintenanceTransactionModal/MaintenanceTransactionModal';
import MaintenanceAddModal from '../MaintenanceAddModal/MaintenanceAddModal';
import DataTable from '../../../components/common/DataTable/DataTable.jsx';

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

    const { showSuccess, showError, showInfo, showWarning, hideSnackbar } = useSnackbar();

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    const fetchMaintenanceRecords = async () => {
        try {
            setLoading(true);
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
        } catch (err) {
            console.error('Error fetching maintenance records:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Expose fetchMaintenanceRecords to parent component
    useImperativeHandle(ref, () => ({
        refreshLogs: fetchMaintenanceRecords
    }));

    useEffect(() => {
        if (equipmentId) {
            fetchMaintenanceRecords();
        }
    }, [equipmentId]);

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
        setSelectedMaintenanceId(record.id);
        setSelectedBatchNumber(record.batchNumber || null);
        setIsMaintenanceTransactionModalOpen(true);
    };

    // Close maintenance transaction modal
    const handleCloseTransactionModal = () => {
        setIsMaintenanceTransactionModalOpen(false);
        setSelectedMaintenanceId(null);
        setSelectedBatchNumber(null);
    };

    // Refresh after transaction added
    const handleTransactionAdded = () => {
        fetchMaintenanceRecords();
        handleCloseTransactionModal();
    };

    const handleRowClick = (row) => {
        // Handle row click logic here
        console.log('Row clicked:', row);
    };

    const handleEditMaintenance = (row) => {
        setEditingMaintenance(row);
        setIsEditModalOpen(true);
    };

    const handleDeleteMaintenance = async (row) => {
        // Custom message with buttons
        const message = `Are you sure you want to delete this maintenance record?`;

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
                        await inSiteMaintenanceService.delete(equipmentId, row.id);
                        fetchMaintenanceRecords(); // Refresh the list
                        showSuccess('Maintenance record deleted successfully!');
                    } catch (error) {
                        console.error('Error deleting maintenance record:', error);
                        showError('Failed to delete maintenance record. Please try again.');
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
    };

    const handleMaintenanceUpdated = () => {
        fetchMaintenanceRecords();
        handleCloseEditModal();
    };

    // Define columns without the manual Actions column
    const columns = [
        { header: 'Technician', accessor: 'technicianName' },
        { header: 'Date', accessor: 'maintenanceDate', body: (rowData) => formatDate(rowData.maintenanceDate) },
        { header: 'Type', accessor: 'maintenanceType' },
        { header: 'Description', accessor: 'description', body: (rowData) => rowData.description?.length > 50 ? `${rowData.description.substring(0, 50)}...` : rowData.description },
        { header: 'Status', accessor: 'status', body: (rowData) => <span className={`r4m-status-badge r4m-${rowData.status.toLowerCase()}`}>{rowData.status}</span> },
        { header: 'Related Transactions', accessor: 'transactionCount', body: (rowData) => rowData.transactionCount > 0 ? <button className="r4m-view-transactions-button" onClick={() => handleViewTransactions(rowData)}>{rowData.transactionCount} transaction{rowData.transactionCount !== 1 ? 's' : ''}</button> : <span className="r4m-no-transactions">None</span> }
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
                        emptyStateMessage="No maintenance records found."
                    />
                ) }
            </div>

            {showAddButton && permissions.canCreate && (
                <button className="r4m-add-maintenance-button" onClick={onAddMaintenanceClick}>
                    <svg className="r4m-plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            )}

            {/* Maintenance Transaction Modal */}
            {isMaintenanceTransactionModalOpen && (
                <MaintenanceTransactionModal
                    isOpen={isMaintenanceTransactionModalOpen}
                    onClose={handleCloseTransactionModal}
                    equipmentId={equipmentId}
                    maintenanceId={selectedMaintenanceId}
                    initialBatchNumber={selectedBatchNumber}
                    onTransactionAdded={handleTransactionAdded}
                />
            )}

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