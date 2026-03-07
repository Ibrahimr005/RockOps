import React, { useState } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import './CompletedTasks.scss';

const MAX_DESC_LENGTH = 80;

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="ct-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="ct-description-cell">{text}</span>;
    return (
        <span className="ct-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button
                className="ct-read-more-btn"
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
            >
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const CompletedTasks = ({ tasks, loading }) => {
    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => <span className="ct-title">{row.title}</span>
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
                const map = { LOW: 'ct-badge--low', MEDIUM: 'ct-badge--medium', HIGH: 'ct-badge--high', URGENT: 'ct-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`ct-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
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
            header: 'COMPLETED AT',
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
        <div className="ct-container">
            <DataTable
                data={tasks || []}
                columns={columns}
                loading={loading}
                emptyMessage="No completed tasks yet"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
            />
        </div>
    );
};

export default CompletedTasks;