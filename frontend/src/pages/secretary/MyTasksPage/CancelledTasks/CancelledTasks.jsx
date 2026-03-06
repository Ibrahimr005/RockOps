import React, { useState } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './CancelledTasks.scss';

const MAX_DESC_LENGTH = 80;

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="can-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="can-description-cell">{text}</span>;
    return (
        <span className="can-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button
                className="can-read-more-btn"
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
            >
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const CancelledTasks = ({ tasks, loading }) => {
    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => <span className="can-title">{row.title}</span>
        },
        {
            id: 'description',
            header: 'DESCRIPTION',
            accessor: 'description',
            minWidth: '220px',
            render: (row) => <ExpandableDescription text={row.description} />
        },
        {
            id: 'priority',
            header: 'PRIORITY',
            accessor: 'priority',
            sortable: true,
            filterable: true,
            minWidth: '120px',
            render: (row) => {
                const map = { LOW: 'can-badge--low', MEDIUM: 'can-badge--medium', HIGH: 'can-badge--high', URGENT: 'can-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`can-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
            }
        },
        {
            id: 'assignedBy',
            header: 'ASSIGNED BY',
            accessor: 'assignedBy',
            sortable: true,
            filterable: true,
            minWidth: '160px',
            render: (row) => row.assignedBy ? `${row.assignedBy.firstName} ${row.assignedBy.lastName}` : '-'
        },
        {
            id: 'dueDate',
            header: 'DUE DATE',
            accessor: 'dueDate',
            sortable: true,
            minWidth: '150px',
            render: (row) => row.dueDate
                ? new Date(row.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : '-'
        },
        {
            id: 'updatedAt',
            header: 'CANCELLED AT',
            accessor: 'updatedAt',
            sortable: true,
            minWidth: '160px',
            render: (row) => row.updatedAt
                ? new Date(row.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : '-'
        },
    ];

    const filterableColumns = [
        { header: 'Title',    accessor: 'title',    filterType: 'text' },
        { header: 'Priority', accessor: 'priority', filterType: 'select' },
    ];

    return (
        <div className="can-container">
            <DataTable
                data={tasks || []}
                columns={columns}
                loading={loading}
                emptyMessage="No cancelled tasks"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
            />
        </div>
    );
};

export default CancelledTasks;