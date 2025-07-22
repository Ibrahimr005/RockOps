import React, { useState, useEffect } from 'react';
import { FaHistory, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from "../../../../contexts/AuthContext";
import DataTable from '../../../../components/common/DataTable/DataTable';
import './AuditTrail.css';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';


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

            console.log('=== DEBUGGING AUDIT LOGS ===');

            const response = await financeService.auditLogs.getAll();

            console.log('Raw response:', response);
            console.log('Response type:', typeof response);
            console.log('Is response array?', Array.isArray(response));

            // Extract the actual data from the response
            let data;
            if (response.data) {
                // If it's an Axios response, get the data property
                data = response.data;
            } else {
                // If it's already the data
                data = response;
            }

            console.log('Extracted data:', data);
            console.log('Data type:', typeof data);

            // Handle different response structures
            let auditArray = [];

            if (Array.isArray(data)) {
                auditArray = data;
            } else if (data && Array.isArray(data.content)) {
                // Paginated response with content array
                auditArray = data.content;
            } else if (data && Array.isArray(data.data)) {
                // Response wrapped in data property
                auditArray = data.data;
            } else if (data && typeof data === 'object') {
                // Check if the object has any array properties
                const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));
                if (arrayKeys.length > 0) {
                    auditArray = data[arrayKeys[0]]; // Use the first array found
                }
                console.log('Object keys:', Object.keys(data));
                console.log('Found array keys:', arrayKeys);
            }

            console.log('Final audit array:', auditArray);
            console.log('Final array length:', auditArray.length);

            setAuditRecords(auditArray);
            showSuccess('Audit logs fetched successfully');
        } catch (err) {
            console.error('=== ERROR FETCHING AUDIT LOGS ===');
            console.error('Error:', err);
            showError('Error: ' + err.message);
            setAuditRecords([]); // Set empty array on error
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