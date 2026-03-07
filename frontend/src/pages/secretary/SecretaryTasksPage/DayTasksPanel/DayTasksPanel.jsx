import React, { useState, useRef, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaEllipsisV } from 'react-icons/fa';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './DayTasksPanel.scss';

const PRIORITY_CONFIG = {
    LOW:    { label: 'Low',    cls: 'dtp-badge--low' },
    MEDIUM: { label: 'Medium', cls: 'dtp-badge--medium' },
    HIGH:   { label: 'High',   cls: 'dtp-badge--high' },
    URGENT: { label: 'Urgent', cls: 'dtp-badge--urgent' },
};

const STATUS_CONFIG = {
    PENDING:     { label: 'Pending',     cls: 'dtp-badge--pending' },
    IN_PROGRESS: { label: 'In Progress', cls: 'dtp-badge--inprogress' },
    COMPLETED:   { label: 'Completed',   cls: 'dtp-badge--completed' },
    CANCELLED:   { label: 'Cancelled',   cls: 'dtp-badge--cancelled' },
};

const STATUS_ACTIONS = {
    PENDING:     [{ label: 'Start',    next: 'IN_PROGRESS' }, { label: 'Cancel', next: 'CANCELLED' }],
    IN_PROGRESS: [{ label: 'Complete', next: 'COMPLETED'   }, { label: 'Cancel', next: 'CANCELLED' }],
    COMPLETED:   [],
    CANCELLED:   [],
};

const ACTION_DIALOG = {
    IN_PROGRESS: { type: 'info',    title: 'Start Task?',     message: 'Are you sure you want to mark this task as In Progress?',  confirmText: 'Start' },
    COMPLETED:   { type: 'success', title: 'Complete Task?',  message: 'Are you sure you want to mark this task as completed?',     confirmText: 'Complete' },
    CANCELLED:   { type: 'danger',  title: 'Cancel Task?',    message: 'Are you sure you want to cancel this task? This cannot be undone.', confirmText: 'Cancel Task' },
};

const ThreeDotsMenu = ({ task, onStatusUpdate }) => {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const [pendingAction, setPendingAction] = useState(null); // { next, label }
    const btnRef = useRef(null);
    const wrapperRef = useRef(null);
    const actions = STATUS_ACTIONS[task.status] || [];

    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
        };
        const handleScroll = () => setOpen(false);
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    const handleOpen = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen(p => !p);
    };

    const handleMenuClick = (e, action) => {
        e.stopPropagation();
        setOpen(false);
        setPendingAction(action);
    };

    const handleConfirm = () => {
        if (pendingAction) onStatusUpdate(task.id, pendingAction.next);
        setPendingAction(null);
    };

    if (actions.length === 0) return null;

    const dialog = pendingAction ? ACTION_DIALOG[pendingAction.next] : null;

    return (
        <>
            <div className="dtp__dots-wrapper" ref={wrapperRef}>
                <button
                    ref={btnRef}
                    className="dtp__dots-btn"
                    onClick={handleOpen}
                    title="Update status"
                >
                    <FaEllipsisV />
                </button>
                {open && (
                    <div
                        className="dtp__status-menu"
                        style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
                    >
                        {actions.map(action => (
                            <button
                                key={action.next}
                                className={`dtp__status-menu-item dtp__status-menu-item--${action.next.toLowerCase().replace('_', '')}`}
                                onClick={(e) => handleMenuClick(e, action)}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {dialog && (
                <ConfirmationDialog
                    isVisible={!!pendingAction}
                    type={dialog.type}
                    title={dialog.title}
                    message={dialog.message}
                    confirmText={dialog.confirmText}
                    cancelText="Go Back"
                    onConfirm={handleConfirm}
                    onCancel={() => setPendingAction(null)}
                    onClose={() => setPendingAction(null)}
                />
            )}
        </>
    );
};

const DayTasksPanel = ({ date, tasks, loading, onEdit, onDelete, onNewTask, readOnly = false, showStatusUpdate = false, onStatusUpdate }) => {
    const dateLabel = date.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="dtp">
            {/* Panel Header */}
            <div className="dtp__header">
                <div className="dtp__header-left">
                    <span className="dtp__date-label">{dateLabel}</span>
                    <span className="dtp__count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
                {!readOnly && (
                    <button className="dtp__add-btn" onClick={onNewTask}>
                        <FaPlus /> New Task
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="dtp__list">
                {loading ? (
                    <div className="dtp__empty">Loading...</div>
                ) : tasks.length === 0 ? (
                    <div className="dtp__empty">
                        <span>No tasks for this day</span>
                        {!readOnly && (
                            <button className="dtp__empty-btn" onClick={onNewTask}>
                                <FaPlus /> Create a task
                            </button>
                        )}
                    </div>
                ) : (
                    tasks.map(task => {
                        const priority  = PRIORITY_CONFIG[task.priority] || {};
                        const status    = STATUS_CONFIG[task.status]     || {};
                        const canModify = !readOnly && task.status === 'PENDING';

                        return (
                            <div key={task.id} className="dtp__task-card">
                                <div className="dtp__task-top">
                                    <span className="dtp__task-title">{task.title}</span>

                                    <div className="dtp__task-actions">
                                        {/* Edit/Delete — secretary page only (canModify) */}
                                        {canModify && (
                                            <>
                                                <button
                                                    className="dtp__action-btn dtp__action-btn--edit"
                                                    onClick={() => onEdit(task)}
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="dtp__action-btn dtp__action-btn--delete"
                                                    onClick={() => onDelete(task.id)}
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </>
                                        )}

                                        {/* 3-dot menu — my tasks calendar only */}
                                        {showStatusUpdate && (
                                            <ThreeDotsMenu task={task} onStatusUpdate={onStatusUpdate} />
                                        )}
                                    </div>
                                </div>

                                {task.description && (
                                    <p className="dtp__task-desc">{task.description}</p>
                                )}

                                <div className="dtp__task-meta">
                                    <span className={`dtp-badge ${priority.cls}`}>{priority.label}</span>
                                    <span className={`dtp-badge ${status.cls}`}>{status.label}</span>
                                    {task.assignedTo && (
                                        <span className="dtp__assignee">
                                            {task.assignedTo.firstName} {task.assignedTo.lastName}
                                        </span>
                                    )}
                                </div>

                                {task.notes && (
                                    <p className="dtp__task-notes">{task.notes}</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DayTasksPanel;