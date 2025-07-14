import React, { useState, useEffect } from 'react';
import { FaHistory, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from "../../../../contexts/AuthContext";
import DataTable from '../../../../components/common/DataTable/DataTable';
import './AuditTrail.css';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";

const AuditTrail = () => {
    const [auditRecords, setAuditRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useSnackbar();
    const { currentUser } = useAuth();

    // Entity types from your backend
    const entityTypes = ['JOURNAL_ENTRY', 'ACCOUNTING_PERIOD', 'INVOICE', 'PAYMENT', 'ASSET'];

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const formatDateTime = (dateTime) => {
        if (!dateTime) return '';

        const date = new Date(dateTime);

        // Check if date is valid
        if (isNaN(date.getTime())) return dateTime;

        // Format as: Jul 9, 2025, 1:32:40 PM
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/audit-logs', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();

            // Add this debugging line
            console.log('Audit logs data:', data.content || data);

            setAuditRecords(data.content || data);
            showSuccess('Audit logs fetched successfully');
        } catch (err) {
            showError('Error: ' + err.message);
            console.error("Error fetching audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    // Custom export formatter for timestamp to ensure proper Excel formatting
    const exportDateFormatter = (value) => {
        if (!value) return '';

        const date = new Date(value);

        // Check if date is valid
        if (isNaN(date.getTime())) return value;

        // For Excel export, use a clear format: YYYY-MM-DD HH:MM:SS
        return date.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    };

    const columns = [
        {
            id: 'timestamp',
            header: 'Date & Time',
            accessor: 'timestamp', // Keep using original timestamp for sorting
            sortable: true,
            width: '200px',
            render: (row, value) => formatDateTime(value), // Use render instead of cell
            exportFormatter: exportDateFormatter // Custom formatter for export
        },
        {
            id: 'user',
            header: 'User',
            accessor: 'username',
            sortable: true,
            width: '150px'
        },
        {
            id: 'entityType',
            header: 'Entity Type',
            accessor: 'entityType',
            sortable: true,
            width: '150px'
        },
        {
            id: 'action',
            header: 'Action',
            accessor: 'action',
            sortable: true,
            width: '120px',
            cell: (row) => (
                <span className={`action-badge ${row.action.toLowerCase()}`}>
                    {row.action}
                </span>
            )
        },
        // Uncomment if you want to include details in the table
        // {
        //     id: 'details',
        //     header: 'Details',
        //     accessor: 'details',
        //     sortable: true,
        //     minWidth: '300px'
        // }
    ];

    const filterableColumns = [
        {
            accessor: 'entityType',
            header: 'Entity Type',
            filterType: 'select'
        },
        {
            accessor: 'action',
            header: 'Action',
            filterType: 'select'
        },
        {
            accessor: 'username',
            header: 'User',
            filterType: 'text'
        }
    ];

    // Export event handlers
    const handleExportStart = () => {
        console.log('Export started...');
    };

    const handleExportComplete = (exportInfo) => {
        showSuccess(`Audit logs exported successfully! ${exportInfo.rowCount} records exported to ${exportInfo.filename}`);
    };

    const handleExportError = (error) => {
        showError('Failed to export audit logs: ' + error.message);
    };

    return (
        <div className="audit-trail-container">


            <DataTable
                data={auditRecords}
                columns={columns}
                loading={loading}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultSortField="timestamp" // Sort by the timestamp field
                defaultSortDirection="desc"
                tableTitle="Audit Trail"
                emptyMessage="No audit records found"
                // Export configuration
                showExportButton={true}
                exportButtonText="Export to Excel"
                exportFileName="audit_logs"
                exportAllData={false} // Export filtered/sorted data
                customExportHeaders={{
                    timestamp: 'Date & Time',
                    username: 'User',
                    entityType: 'Entity Type',
                    action: 'Action'
                }}
                onExportStart={handleExportStart}
                onExportComplete={handleExportComplete}
                onExportError={handleExportError}
                // Pagination
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultItemsPerPage={25}
            />
        </div>
    );
};

export default AuditTrail;