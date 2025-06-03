import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import { equipmentService } from '../../../services/equipmentService';
import { transactionService } from '../../../services/transactionService';
import './EquipmentConsumablesInventory.scss';
import DataTable from '../../../components/common/DataTable/DataTable';

const EquipmentConsumablesInventory = forwardRef(({equipmentId, onAddClick}, ref) => {

    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('current');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const { showInfo } = useSnackbar();

    // Function to fetch transaction details and show in snackbar
    const showTransactionDetails = async (transactionId, batchNumber) => {
        if (!batchNumber) {
            showInfo(`Batch #N/A - No batch number available`, 4000);
            return;
        }

        try {
            const response = await transactionService.getByBatchNumber(batchNumber);
            const transaction = response.data;
            console.log(transaction);

            // Format transaction details in a more readable, structured way
            const details = `TRANSACTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Batch Number: ${batchNumber}

📊 Status: ${transaction.status || 'N/A'}

📅 Date: ${transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : 'N/A'}

📤 From: ${transaction.senderName || 'N/A'}

📥 To: ${transaction.receiverName || 'N/A'}

📋 Items: ${transaction.items?.length || 0} item(s)

👤 Added by: ${transaction.addedBy || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Click the ✕ button to close`;

            // Use persistent snackbar so it stays until manually closed
            showInfo(details, 0, true);
        } catch (error) {
            console.error('Error fetching transaction details:', error);
            showInfo(`Batch #${batchNumber} - Unable to fetch transaction details`, 4000);
        }
    };

    const fetchConsumables = async () => {
        try {
            setLoading(true);
            const response = await equipmentService.getEquipmentConsumables(equipmentId);
            setConsumables(response.data);
            console.log("Consumables data:", response.data);

            // Log unique statuses for debugging
            const uniqueStatuses = [...new Set(response.data.map(c => c.status))];
            console.log("Available statuses:", uniqueStatuses);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching consumables inventory:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Expose fetchConsumables to parent component
    useImperativeHandle(ref, () => ({
        fetchConsumables,
        refreshLogs: fetchConsumables  // Alias for backward compatibility
    }));

    useEffect(() => {
        if (equipmentId) {
            fetchConsumables();
        }
    }, [equipmentId, activeTab]);

    // Filter consumables based on search term and active tab
    const filteredConsumables = consumables.filter(item => {
        // First apply search filter
        const matchesSearch = !searchTerm ||
            (item.itemTypeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.itemTypeCategory?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Then apply tab filter
        switch (activeTab) {
            case 'current':
                return !item.status || item.status === 'REGULAR' || item.status === 'IN_WAREHOUSE' || item.status === 'CONSUMED';
            case 'overReceived':
                return item.status === 'OVERRECEIVED';
            default:
                return true;
        }
    });

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredConsumables.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredConsumables.length / itemsPerPage);

    // Page change handler
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Items per page change handler
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset to first page when changing tabs
    };

    // Get count for overReceived badge indicator
    const overReceivedCount = consumables.filter(item => item.status === 'OVERRECEIVED').length;

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
        {header: 'Unit', accessor: 'unit'},
        {
            header: 'Batch Number',
            accessor: 'batchNumber',
            render: (row, value) => (
                <button
                    className="info-button"
                    title="Show Transaction Details"
                    onClick={() => showTransactionDetails(row.transactionId, value)}
                >
                    {value || 'N/A'}
                </button>
            )
        },
        {
            header: 'Last Updated',
            accessor: 'lastUpdated',
            render: (row, value) => value ? new Date(value).toLocaleDateString() : "N/A"
        },
        ...(activeTab === 'overReceived' ? [{
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <button
                    className="resolve-button"
                    title="Add to Inventory"
                    onClick={() => {/* Add logic to move to regular inventory */
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Add to Inventory
                </button>
            )
        }] : [])
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

            {/* Inventory Tabs - Removed under-received tab */}
            <div className="inventory-tabs">
                <button
                    className={`inventory-tab ${activeTab === 'current' ? 'active' : ''}`}
                    onClick={() => handleTabChange('current')}
                >
                    Current Inventory
                    <span className="inventory-tab-count">{consumables.length}</span>
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
            </div>

            {/* Resolution info card - only show for overReceived tab */}
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
                    <DataTable
                        data={currentItems}
                        columns={columns}
                        loading={loading}
                        tableTitle={`${activeTab === 'current' ? 'Current Inventory' : 'Surplus Items'}`}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={filterableColumns}
                    />
                )}
            </div>

            {filteredConsumables.length > 0 && (
                <div className="pagination-controls">
                    <div className="items-per-page">
                        <label>Items per page:</label>
                        <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <div className="pagination">
                        <button
                            className="page-button"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            ⟪
                        </button>
                        <button
                            className="page-button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            ⟨
                        </button>

                        <div className="page-info">
                            Page {currentPage} of {totalPages}
                        </div>

                        <button
                            className="page-button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            ⟩
                        </button>
                        <button
                            className="page-button"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            ⟫
                        </button>
                    </div>
                </div>
            )}
            <button className="add-button2" onClick={onAddClick}>
                <svg className="plus-icon2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            </button>
        </div>
    );
});

export default EquipmentConsumablesInventory;