import React, { useState, useEffect } from 'react';
import { FaHistory, FaFileExport, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { useAuth } from "../../../../Contexts/AuthContext";
import DataTable from '../../../../components/common/DataTable/DataTable';
import './AuditTrail.css';

const AuditTrail = () => {
    const [auditRecords, setAuditRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();

    // Entity types from your backend
    const entityTypes = ['JOURNAL_ENTRY', 'ACCOUNTING_PERIOD', 'INVOICE', 'PAYMENT', 'ASSET'];

    useEffect(() => {
        fetchAuditLogs();
    }, []);

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
            setAuditRecords(data.content || data);
            setError(null);
        } catch (err) {
            setError('Error: ' + err.message);
            console.error("Error fetching audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/v1/audit-logs/export', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            setError('Error: ' + err.message);
            console.error("Error exporting audit logs:", err);
        }
    };

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString();
    };

    const columns = [
        {
            id: 'timestamp',
            header: 'Date & Time',
            accessor: 'timestamp',
            sortable: true,
            width: '180px',
            cell: (row) => formatDateTime(row.timestamp)
        },
        {
            id: 'user',
            header: 'User',
            accessor: 'userName',
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
        {
            id: 'details',
            header: 'Details',
            accessor: 'details',
            sortable: true,
            minWidth: '300px'
        }
    ];

    const filterableColumns = [
        {
            accessor: 'entityType',
            type: 'select',
            options: entityTypes
        },
        {
            accessor: 'action',
            type: 'select',
            options: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT']
        },
        {
            accessor: 'timestamp',
            type: 'dateRange'
        }
    ];

    return (
        <div className="audit-trail-container">
            <div className="at-header">
                <h2>Audit Trail</h2>
                <button className="btn-secondary" onClick={handleExport}>
                    <FaFileExport /> Export to Excel
                </button>
            </div>

            {error && <div className="error-container">{error}</div>}

            <DataTable
                data={auditRecords}
                columns={columns}
                loading={loading}
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultSortField="timestamp"
                defaultSortDirection="desc"
                tableTitle="Audit Trail"
                emptyMessage="No audit records found"
            />
        </div>
    );
};

export default AuditTrail;