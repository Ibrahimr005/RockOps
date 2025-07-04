import React, { useState, useEffect } from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";

const ResolutionHistory = ({ warehouseId, showSnackbar }) => {
    const [resolutionHistory, setResolutionHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Fetch resolution history
    const fetchResolutionHistory = async () => {
        if (!warehouseId) {
            console.error("Warehouse ID is not available");
            return;
        }
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:8080/api/v1/items/resolution-history/warehouse/${warehouseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setResolutionHistory(data);
            } else {
                console.error("Failed to fetch resolution history, status:", response.status);
            }
        } catch (error) {
            console.error("Failed to fetch resolution history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Initialize data
    useEffect(() => {
        fetchResolutionHistory();
    }, [warehouseId]);

    const getResolutionTypeLabel = (resolutionType) => {
        switch (resolutionType) {
            case 'ACKNOWLEDGE_LOSS':
                return 'Acknowledge Loss';
            case 'FOUND_ITEMS':
                return 'Items Found';
            case 'ACCEPT_SURPLUS':
                return 'Accept Surplus';
            case 'COUNTING_ERROR':
                return 'Counting Error';
            default:
                return resolutionType;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Table columns for resolution history
    const historyColumns = [
        {
            accessor: 'item.itemType.itemCategory.name',
            header: 'CATEGORY',
            width: '210px',
            render: (row) => (
                <span className="category-tag">
          {row.item?.itemType?.itemCategory?.name || "No Category"}
        </span>
            )
        },
        {
            accessor: 'item.itemType.name',
            header: 'ITEM',
            width: '210px'
        },
        {
            accessor: 'originalQuantity',
            header: 'QUANTITY',
            width: '210px'
        },
        {
            accessor: 'item.transaction.batchNumber',
            header: 'BATCH #',
            width: '210px',
            render: (row) => (
                <span className="batch-number">
          {row.item?.transaction?.batchNumber || row.item?.batchNumber || 'N/A'}
        </span>
            )
        },
        {
            accessor: 'resolutionType',
            header: 'RESOLUTION',
            width: '180px',
            render: (row) => (
                <span className={`resolution-badge ${row.resolutionType?.toLowerCase().replace('_', '-')}`}>
          {getResolutionTypeLabel(row.resolutionType)}
        </span>
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

    return (
        <>
            {/* Resolution history info card */}
            <div className="resolution-info-card">
                <div className="resolution-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="resolution-info-content">
                    <h3>Resolution History</h3>
                    <p>
                        This tab shows the complete history of all resolved inventory discrepancies. Each entry includes details about the original issue, the resolution action taken, and who resolved it.
                    </p>
                </div>
            </div>

            {/* DataTable */}
            <DataTable
                data={resolutionHistory}
                columns={historyColumns}
                loading={historyLoading}
                tableTitle=""
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showSearch={true}
                showFilters={true}
                filterableColumns={[
                    { accessor: 'item.itemType.name', header: 'Item' },
                    { accessor: 'item.itemType.itemCategory.name', header: 'Category' },
                    { accessor: 'resolutionType', header: 'Resolution Type' },
                    { accessor: 'resolvedBy', header: 'Resolved By' }
                ]}
                actions={[]} // No actions for resolution history
                className="resolution-history-table"
            />
        </>
    );
};

export default ResolutionHistory;