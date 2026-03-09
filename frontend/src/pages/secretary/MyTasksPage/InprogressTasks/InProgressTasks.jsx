import React, { useState } from 'react';
import { FaCheckCircle, FaBan, FaTrash } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './InProgressTasks.scss';

const MAX_DESC_LENGTH = 80;

const ROLE_LABELS = {
    ADMIN:              'Admin',
    SECRETARY:          'Secretary',
    WAREHOUSE_MANAGER:  'Warehouse Manager',
    WAREHOUSE_EMPLOYEE: 'Warehouse Employee',
};

const ROLE_CLASS = {
    ADMIN:              'ip-role--admin',
    SECRETARY:          'ip-role--secretary',
    WAREHOUSE_MANAGER:  'ip-role--manager',
    WAREHOUSE_EMPLOYEE: 'ip-role--employee',
};

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="ip-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="ip-description-cell">{text}</span>;
    return (
        <span className="ip-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button className="ip-read-more-btn" onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}>
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const InProgressTasks = ({ tasks, loading, onStatusUpdate, onDelete, showAssignee = false, showDelete = false, showCancel = false }) => {
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
            await onStatusUpdate(taskId, action === 'complete' ? 'COMPLETED' : 'CANCELLED');
        } finally {
            setUpdatingId(null);
        }
    };

    const isComplete = dialog.action === 'complete';
    const isDelete   = dialog.action === 'delete';

    const getDialogProps = () => {
        if (isDelete)   return { type: 'danger',  title: 'Delete Task?',    message: 'Are you sure you want to permanently delete this task?',             confirmText: 'Delete' };
        if (isComplete) return { type: 'success', title: 'Complete Task?',  message: 'Are you sure you want to mark this task as completed?',              confirmText: 'Complete' };
        return               { type: 'danger',  title: 'Cancel Task?',    message: 'Are you sure you want to cancel this task? This cannot be undone.',   confirmText: 'Cancel Task' };
    };

    const dialogProps = getDialogProps();

    const assigneeColumns = showAssignee ? [
        {
            id: 'assignedToRole', header: 'ROLE', accessor: 'assignedTo', minWidth: '160px',
            render: (row) => {
                const role = row.assignedTo?.role;
                if (!role) return '-';
                return <span className={`ip-role-badge ${ROLE_CLASS[role] || ''}`}>{ROLE_LABELS[role] || role}</span>;
            }
        },
        {
            id: 'assignedTo', header: 'ASSIGNED TO', accessor: 'assignedTo', sortable: true, minWidth: '160px',
            render: (row) => row.assignedTo
                ? <span className="ip-assignee">{row.assignedTo.firstName} {row.assignedTo.lastName}</span>
                : '-'
        },
    ] : [];

    const columns = [
        {
            id: 'title', header: 'TITLE', accessor: 'title', sortable: true, filterable: true, minWidth: '180px',
            render: (row) => <span className="ip-title">{row.title}</span>
        },
        {
            id: 'description', header: 'DESCRIPTION', accessor: 'description', minWidth: '220px',
            render: (row) => <ExpandableDescription text={row.description} />
        },
        {
            id: 'priority', header: 'PRIORITY', accessor: 'priority', sortable: true, filterable: true, minWidth: '120px',
            render: (row) => {
                const map = { LOW: 'ip-badge--low', MEDIUM: 'ip-badge--medium', HIGH: 'ip-badge--high', URGENT: 'ip-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`ip-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
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
                    <span className={`ip-due-date ${isOverdue ? 'ip-due-date--overdue' : ''}`}>
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
                    <div className="ip-status-actions">
                        {!showDelete && (
                            <button className="ip-action-btn ip-action-btn--complete" onClick={(e) => openDialog(row.id, 'complete', e)} disabled={isUpdating} title="Complete">
                                <FaCheckCircle />
                            </button>
                        )}
                        {showCancel && (
                            <button className="ip-action-btn ip-action-btn--cancel" onClick={(e) => openDialog(row.id, 'cancel', e)} disabled={isUpdating} title="Cancel">
                                <FaBan />
                            </button>
                        )}
                        {showDelete && (
                            <button className="ip-action-btn ip-action-btn--delete" onClick={(e) => openDialog(row.id, 'delete', e)} disabled={isUpdating} title="Delete">
                                <FaTrash />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="ip-container">
            <DataTable
                data={tasks || []}
                columns={columns}
                loading={loading}
                emptyMessage="No tasks currently in progress"
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

export default InProgressTasks;