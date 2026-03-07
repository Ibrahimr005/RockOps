import React, { useState } from 'react';
import { FaTasks, FaTimes } from 'react-icons/fa';
import Snackbar from '../../../../components/common/Snackbar/Snackbar.jsx';
import './CreateTaskModal.scss';

const CreateTaskModal = ({ task, users, defaultDate, onSubmit, onClose }) => {
    const isEdit = !!task;

    const formatDateTimeLocal = (date) => {
        const d = date ? new Date(date) : new Date(defaultDate);
        if (!date) d.setHours(12, 0, 0, 0);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const [roleFilter, setRoleFilter] = useState('');

    const filteredUsers = roleFilter
        ? users.filter(u => u.role === roleFilter)
        : users;

    const [form, setForm] = useState({
        title:        task?.title        || '',
        description:  task?.description  || '',
        notes:        task?.notes        || '',
        priority:     task?.priority     || 'MEDIUM',
        dueDate:      formatDateTimeLocal(task?.dueDate),
        assignedToId: task?.assignedTo?.id || '',
    });

    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ show: false, message: '' });

    const showError = (message) => {
        setSnackbar({ show: true, message });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!form.title.trim())       { showError('Title is required');           return; }
        if (!form.description.trim()) { showError('Description is required');     return; }
        if (!form.assignedToId)       { showError('Please select an assignee');   return; }
        if (!form.dueDate)            { showError('Due date is required');         return; }

        setSubmitting(true);
        try {
            await onSubmit({
                title:        form.title.trim(),
                description:  form.description.trim(),
                notes:        form.notes.trim(),
                priority:     form.priority,
                dueDate:      form.dueDate,
                assignedToId: form.assignedToId,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <FaTasks />
                        {isEdit ? 'Edit Task' : 'New Task'}
                    </h2>
                    <button className="btn-close" onClick={onClose} disabled={submitting}>
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    <div className="request-order-form-modal">

                        {/* Title */}
                        <div className="form-group">
                            <label className="form-label">
                                Title <span className="required">*</span>
                            </label>
                            <input
                                className="form-input"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Enter task title"
                                disabled={submitting}
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label">
                                Description <span className="required">*</span>
                            </label>
                            <textarea
                                className="form-textarea"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Describe the task..."
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        {/* Priority + Due Date row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">
                                    Priority <span className="required">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleChange}
                                    disabled={submitting}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Due Date <span className="required">*</span>
                                </label>
                                <input
                                    className="form-input"
                                    type="datetime-local"
                                    name="dueDate"
                                    value={form.dueDate}
                                    onChange={handleChange}
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Assign To */}
                        <div className="form-group">
                            <label className="form-label">
                                Assign To <span className="required">*</span>
                            </label>
                            <select
                                className="form-select"
                                value={roleFilter}
                                onChange={e => { setRoleFilter(e.target.value); setForm(prev => ({ ...prev, assignedToId: '' })); }}
                                disabled={submitting}
                                style={{ marginBottom: '0.5rem' }}
                            >
                                <option value="">All Roles</option>
                                <option value="ADMIN">Admin</option>
                                <option value="SECRETARY">Secretary</option>
                                <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                                <option value="WAREHOUSE_EMPLOYEE">Warehouse Employee</option>
                            </select>
                            <select
                                className="form-select"
                                name="assignedToId"
                                value={form.assignedToId}
                                onChange={handleChange}
                                disabled={submitting}
                            >
                                <option value="">Select a user...</option>
                                {filteredUsers.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-textarea"
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="Any additional notes..."
                                rows={2}
                                disabled={submitting}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        className="modal-btn-secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </div>

            {/* Snackbar inside the modal backdrop so it renders above it */}
            <Snackbar
                type="error"
                message={snackbar.message}
                show={snackbar.show}
                onClose={() => setSnackbar({ show: false, message: '' })}
                duration={3000}
            />
        </div>
    );
};

export default CreateTaskModal;