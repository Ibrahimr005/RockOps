import React, { useState } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './PendingTasks.scss';

const MAX_DESC_LENGTH = 80;

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="pt-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="pt-description-cell">{text}</span>;
    return (
        <span className="pt-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button
                className="pt-read-more-btn"
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
            >
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const PendingTasks = ({ tasks, loading, onStatusUpdate }) => {
    const [updatingId, setUpdatingId] = useState(null);
    const [dialog, setDialog] = useState({ visible: false, taskId: null, action: null });

    const openDialog = (taskId, action, e) => {
        e.stopPropagation();
        setDialog({ visible: true, taskId, action });
    };

    const closeDialog = () => setDialog({ visible: false, taskId: null, action: null });

    const handleConfirm = async () => {
        const { taskId, action } = dialog;
        closeDialog();
        setUpdatingId(taskId);
        try {
            await onStatusUpdate(taskId, action === 'start' ? 'IN_PROGRESS' : 'CANCELLED');
        } finally {
            setUpdatingId(null);
        }
    };

    const isStart = dialog.action === 'start';

    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => <span className="pt-title">{row.title}</span>
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
                const map = { LOW: 'pt-badge--low', MEDIUM: 'pt-badge--medium', HIGH: 'pt-badge--high', URGENT: 'pt-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`pt-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
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
            id: 'actions',
            header: 'UPDATE STATUS',
            minWidth: '220px',
            render: (row) => {
                const isUpdating = updatingId === row.id;
                return (
                    <div className="pt-status-actions">
                        <button
                            className="pt-status-btn pt-status-btn--inprogress"
                            onClick={(e) => openDialog(row.id, 'start', e)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? '...' : 'Start'}
                        </button>
                        <button
                            className="pt-status-btn pt-status-btn--cancelled"
                            onClick={(e) => openDialog(row.id, 'cancel', e)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? '...' : 'Cancel'}
                        </button>
                    </div>
                );
            }
        }
    ];

    const filterableColumns = [
        { header: 'Title',    accessor: 'title',    filterType: 'text' },
        { header: 'Priority', accessor: 'priority', filterType: 'select' },
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
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
            />

            <ConfirmationDialog
                isVisible={dialog.visible}
                type={isStart ? 'info' : 'danger'}
                title={isStart ? 'Start Task?' : 'Cancel Task?'}
                message={isStart
                    ? 'Are you sure you want to mark this task as In Progress?'
                    : 'Are you sure you want to cancel this task? This action cannot be undone.'
                }
                confirmText={isStart ? 'Start' : 'Cancel Task'}
                cancelText="Go Back"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                onClose={closeDialog}
            />
        </div>
    );
};

export default PendingTasks;