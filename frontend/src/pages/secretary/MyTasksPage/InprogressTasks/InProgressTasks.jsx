import React, { useState } from 'react';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './InProgressTasks.scss';

const MAX_DESC_LENGTH = 80;

const ExpandableDescription = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <span className="ip-notes">—</span>;
    if (text.length <= MAX_DESC_LENGTH) return <span className="ip-description-cell">{text}</span>;
    return (
        <span className="ip-description-cell">
            {expanded ? text : `${text.slice(0, MAX_DESC_LENGTH)}...`}
            <button
                className="ip-read-more-btn"
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
            >
                {expanded ? ' Less' : ' More'}
            </button>
        </span>
    );
};

const InProgressTasks = ({ tasks, loading, onStatusUpdate }) => {
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
            await onStatusUpdate(taskId, action === 'complete' ? 'COMPLETED' : 'CANCELLED');
        } finally {
            setUpdatingId(null);
        }
    };

    const isComplete = dialog.action === 'complete';

    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => <span className="ip-title">{row.title}</span>
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
                const map = { LOW: 'ip-badge--low', MEDIUM: 'ip-badge--medium', HIGH: 'ip-badge--high', URGENT: 'ip-badge--urgent' };
                const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
                return <span className={`ip-badge ${map[row.priority] || ''}`}>{labels[row.priority] || row.priority}</span>;
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
                    <span className={`ip-due-date ${isOverdue ? 'ip-due-date--overdue' : ''}`}>
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
                    <div className="ip-status-actions">
                        <button
                            className="ip-status-btn ip-status-btn--completed"
                            onClick={(e) => openDialog(row.id, 'complete', e)}
                            disabled={isUpdating}
                        >
                            {isUpdating ? '...' : 'Complete'}
                        </button>
                        <button
                            className="ip-status-btn ip-status-btn--cancelled"
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
        <div className="ip-container">
            <DataTable
                data={tasks || []}
                columns={columns}
                loading={loading}
                emptyMessage="No tasks currently in progress"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
            />

            <ConfirmationDialog
                isVisible={dialog.visible}
                type={isComplete ? 'success' : 'danger'}
                title={isComplete ? 'Complete Task?' : 'Cancel Task?'}
                message={isComplete
                    ? 'Are you sure you want to mark this task as completed?'
                    : 'Are you sure you want to cancel this task? This action cannot be undone.'
                }
                confirmText={isComplete ? 'Complete' : 'Cancel Task'}
                cancelText="Go Back"
                onConfirm={handleConfirm}
                onCancel={closeDialog}
                onClose={closeDialog}
            />
        </div>
    );
};

export default InProgressTasks;