import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './CompletedTasks.scss';

const MAX_DESC_LENGTH = 80;

const ROLE_LABELS = {
    ADMIN:              'Admin',
    SECRETARY:          'Secretary',
    WAREHOUSE_MANAGER:  'Warehouse Manager',
    WAREHOUSE_EMPLOYEE: 'Warehouse Employee',
};

const ROLE_CLASS = {
    ADMIN:              'ct-role--admin',
    SECRETARY:          'ct-role--secretary',
    WAREHOUSE_MANAGER:  'ct-role--manager',
    WAREHOUSE_EMPLOYEE: 'ct-role--employee',
};

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="ct-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="ct-description-cell">{text}</span>;
    return (
        <span className="ct-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button className="ct-read-more-btn" onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}>
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const CompletedTasks = ({ tasks, loading, onDelete, showAssignee = false, showDelete = false }) => {
    const [dialog, setDialog] = useState({ visible: false, taskId: null });

    const openDialog = (taskId, e) => { e.stopPropagation(); setDialog({ visible: true, taskId }); };
    const closeDialog = () => setDialog({ visible: false, taskId: null });

    const handleConfirm = async () => {
        const { taskId } = dialog;
        closeDialog();
        await onDelete(taskId);
    };

    const assigneeColumns = showAssignee ? [
        {
            id: 'assignedToRole', header: 'ROLE', accessor: 'assignedTo', minWidth: '160px',
            render: (row) => {
                const role = row.assignedTo?.role;
                if (!role) return '-';
                return <span className={`ct-role-badge ${ROLE_CLASS[role] || ''}`}>{ROLE_LABELS[role] || role}</span>;
            }
        },
        {
            id: 'assignedTo', header: 'ASSIGNED TO', accessor: 'assignedTo', sortable: true, minWidth: '160px',
            render: (row) => row.assignedTo
                ? <span className="ct-assignee">{row.assignedTo.firstName} {row.assignedTo.lastName}</span>
                : '-'
        },
    ] : [];

    const deleteColumn = showDelete ? [{
        id: 'actions', header: 'ACTIONS', minWidth: '80px',
        render: (row) => (
            <button className="ct-action-btn ct-action-btn--delete" onClick={(e) => openDialog(row.id, e)} title="Delete">
                <FaTrash />
            </button>
        )
    }] : [];

    const columns = [
        {
            id: 'title', header: 'TITLE', accessor: 'title', sortable: true, filterable: true, minWidth: '180px',
            render: (row) => <span className="ct-title">{row.title}</span>
        },
        {
            id: 'description', header: 'DESCRIPTION', accessor: 'description', minWidth: '220px',
            render: (row) => <ExpandableDescription text={row.description} />
        },
        {
            id: 'priority', header: 'PRIORITY', accessor: 'priority', sortable: true, filterable: true, minWidth: '120px',
            render: (row) => {
                const map = { LOW: 'ct-badge--low', MEDIUM: 'ct-badge--medium', HIGH: 'ct-badge--high', URGENT: 'ct-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`ct-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
            }
        },
        {
            id: 'assignedBy', header: 'ASSIGNED BY', accessor: 'assignedBy', sortable: true, minWidth: '160px',
            render: (row) => row.assignedBy ? `${row.assignedBy.firstName} ${row.assignedBy.lastName}` : '-'
        },
        ...assigneeColumns,
        {
            id: 'dueDate', header: 'DUE DATE', accessor: 'dueDate', sortable: true, minWidth: '150px',
            render: (row) => {
                if (!row.dueDate) return '-';
                const due = new Date(row.dueDate);
                const isOverdue = due < new Date();
                return (
                    <span className={`ct-due-date ${isOverdue ? 'ct-due-date--overdue' : ''}`}>
                        {due.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                );
            }
        },
        {
            id: 'updatedAt', header: 'COMPLETED AT', accessor: 'updatedAt', sortable: true, minWidth: '160px',
            render: (row) => row.updatedAt
                ? new Date(row.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : '-'
        },
        ...deleteColumn,
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
                filterableColumns={[
                    { header: 'Title', accessor: 'title', filterType: 'text' },
                    { header: 'Priority', accessor: 'priority', filterType: 'select' },
                ]}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
            />
            <ConfirmationDialog
                isVisible={dialog.visible}
                type="danger"
                title="Delete Task?"
                message="Are you sure you want to permanently delete this task?"
                confirmText="Delete"
                cancelText="Go Back"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                onClose={closeDialog}
            />
        </div>
    );
};

export default CompletedTasks;