import React, { useState } from 'react';
import { FaPlay, FaBan, FaTrash } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './PendingTasks.scss';

const MAX_DESC_LENGTH = 80;

const ROLE_LABELS = {
    ADMIN:              'Admin',
    SECRETARY:          'Secretary',
    WAREHOUSE_MANAGER:  'Warehouse Manager',
    WAREHOUSE_EMPLOYEE: 'Warehouse Employee',
};

const ROLE_CLASS = {
    ADMIN:              'pt-role--admin',
    SECRETARY:          'pt-role--secretary',
    WAREHOUSE_MANAGER:  'pt-role--manager',
    WAREHOUSE_EMPLOYEE: 'pt-role--employee',
};

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="pt-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="pt-description-cell">{text}</span>;
    return (
        <span className="pt-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button className="pt-read-more-btn" onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}>
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const PendingTasks = ({ tasks, loading, onStatusUpdate, onDelete, showAssignee = false, showDelete = false, showCancel = false }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const [dialog, setDialog] = useState({ visible: false, taskId: null, action: null });

    const openDialog = (taskId, action, e) => { e.stopPropagation(); setDialog({ visible: true, taskId, action }); };
    const closeDialog = () => setDialog({ visible: false, taskId: null, action: null });

    const handleConfirm = async () => {
        const { taskId, action } = dialog;
        closeDialog();
        if (action === 'delete') {
            await onDelete(taskId);
            return;
        }
        setUpdatingId(taskId);
        try {
            await onStatusUpdate(taskId, action === 'start' ? 'IN_PROGRESS' : 'CANCELLED');
        } finally {
            setUpdatingId(null);
        }
    };

    const isStart  = dialog.action === 'start';
    const isDelete = dialog.action === 'delete';

    const getDialogProps = () => {
        if (isDelete) return { type: 'danger',  title: 'Delete Task?',  message: 'Are you sure you want to permanently delete this task?', confirmText: 'Delete' };
        if (isStart)  return { type: 'info',    title: 'Start Task?',   message: 'Are you sure you want to mark this task as In Progress?', confirmText: 'Start' };
        return             { type: 'danger',  title: 'Cancel Task?', message: 'Are you sure you want to cancel this task? This cannot be undone.', confirmText: 'Cancel Task' };
    };

    const dialogProps = getDialogProps();

    const assigneeColumns = showAssignee ? [
        {
            id: 'assignedToRole', header: 'ROLE', accessor: 'assignedTo', minWidth: '160px',
            render: (row) => {
                const role = row.assignedTo?.role;
                if (!role) return '-';
                return <span className={`pt-role-badge ${ROLE_CLASS[role] || ''}`}>{ROLE_LABELS[role] || role}</span>;
            }
        },
        {
            id: 'assignedTo', header: 'ASSIGNED TO', accessor: 'assignedTo', sortable: true, minWidth: '160px',
            render: (row) => row.assignedTo
                ? <span className="pt-assignee">{row.assignedTo.firstName} {row.assignedTo.lastName}</span>
                : '-'
        },
    ] : [];

    const columns = [
        {
            id: 'title', header: 'TITLE', accessor: 'title', sortable: true, filterable: true, minWidth: '180px',
            render: (row) => <span className="pt-title">{row.title}</span>
        },
        {
            id: 'description', header: 'DESCRIPTION', accessor: 'description', minWidth: '220px',
            render: (row) => <ExpandableDescription text={row.description} />
        },
        {
            id: 'priority', header: 'PRIORITY', accessor: 'priority', sortable: true, filterable: true, minWidth: '120px',
            render: (row) => {
                const map = { LOW: 'pt-badge--low', MEDIUM: 'pt-badge--medium', HIGH: 'pt-badge--high', URGENT: 'pt-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`pt-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
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
                    <span className={`pt-due-date ${isOverdue ? 'pt-due-date--overdue' : ''}`}>
                        {due.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                );
            }
        },
        {
            id: 'actions', header: 'ACTIONS', minWidth: showDelete ? '160px' : '100px',
            render: (row) => {
                const isUpdating = updatingId === row.id;
                return (
                    <div className="pt-status-actions">
                        {!showDelete && (
                            <button className="pt-action-btn pt-action-btn--start" onClick={(e) => openDialog(row.id, 'start', e)} disabled={isUpdating} title="Start">
                                <FaPlay />
                            </button>
                        )}
                        {showCancel && (
                            <button className="pt-action-btn pt-action-btn--cancel" onClick={(e) => openDialog(row.id, 'cancel', e)} disabled={isUpdating} title="Cancel">
                                <FaBan />
                            </button>
                        )}
                        {showDelete && (
                            <button className="pt-action-btn pt-action-btn--delete" onClick={(e) => openDialog(row.id, 'delete', e)} disabled={isUpdating} title="Delete">
                                <FaTrash />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="pt-container">
            <DataTable
                data={tasks || []}
                columns={columns}
                loading={loading}
                emptyMessage="No pending tasks — you're all caught up!"
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
                type={dialogProps.type}
                title={dialogProps.title}
                message={dialogProps.message}
                confirmText={dialogProps.confirmText}
                cancelText="Go Back"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                onClose={closeDialog}
            />
        </div>
    );
};

export default PendingTasks;