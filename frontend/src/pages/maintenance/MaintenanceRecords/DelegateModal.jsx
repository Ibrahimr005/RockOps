import React, { useState, useEffect } from 'react';
import { FaTimes, FaUserCheck } from 'react-icons/fa';
import maintenanceService from '../../../services/maintenanceService.js';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog';
import '../../../styles/primary-button.scss';
import '../../../styles/close-modal-button.scss';
import '../../../styles/cancel-modal-button.scss';
import '../../../styles/modal-styles.scss';
import './MaintenanceRecordModal.scss';

const DelegateModal = ({ isOpen, onClose, onSubmit, record }) => {
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [maintenanceUsers, setMaintenanceUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            loadMaintenanceUsers();
            setSelectedUserId(record?.responsibleUserId || '');
            setError('');
        }
    }, [isOpen, record]);

    const loadMaintenanceUsers = async () => {
        try {
            const response = await maintenanceService.getMaintenanceTeamUsers();
            setMaintenanceUsers(response.data || []);
        } catch (error) {
            console.error('Error loading maintenance users:', error);
            setError('Failed to load users');
        }
    };

    const handleCloseAttempt = () => {
        if (isFormDirty) {
            setShowDiscardDialog(true);
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedUserId) {
            setError('Please select a user to delegate to');
            return;
        }

        if (selectedUserId === record?.responsibleUserId) {
            setError('Please select a different user');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSubmit(record.id, selectedUserId);
            onClose();
        } catch (err) {
            setError('Failed to delegate. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop">
                <div className="modal-container modal-md" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="modal-header">
                        <h2 className="modal-title">
                            <FaUserCheck /> Delegate Maintenance Record
                        </h2>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleCloseAttempt}
                            disabled={loading}
                        >
                            <FaTimes />
                        </button>
                    </div>

                {/* Body */}
                <div className="modal-body">
                    <form onSubmit={handleSubmit} id="delegate-form">
                        <div className="form-section">
                            <div className="form-group">
                                <label><strong>Equipment:</strong></label>
                                <p>{record?.equipmentName}</p>
                            </div>

                            <div className="form-group">
                                <label><strong>Current Responsible:</strong></label>
                                <p>{record?.currentResponsiblePerson || 'Not assigned'}</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="delegateUserId">
                                    Delegate To <span className="required">*</span>
                                </label>
                                <select
                                    id="delegateUserId"
                                    value={selectedUserId}
                                    onChange={(e) => {
                                        setIsFormDirty(true);
                                        setSelectedUserId(e.target.value);
                                        setError('');
                                    }}
                                    disabled={loading}
                                    className={error ? 'error' : ''}
                                >
                                    <option value="">Select User</option>
                                    {maintenanceUsers.map(user => (
                                        <option
                                            key={user.id}
                                            value={user.id}
                                            disabled={user.id === record?.responsibleUserId}
                                        >
                                            {user.firstName} {user.lastName} - {user.role?.replace(/_/g, ' ')}
                                            {user.id === record?.responsibleUserId ? ' (Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {error && <span className="error-message">{error}</span>}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        type="button"
                        className="cancel-modal-button"
                        onClick={handleCloseAttempt}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="delegate-form"
                        className="primary-button"
                        disabled={loading || !selectedUserId}
                    >
                        {loading ? 'Delegating...' : 'Delegate'}
                    </button>
                </div>
            </div>
        </div>
        <ConfirmationDialog
            isVisible={showDiscardDialog}
            type="warning"
            title="Discard Changes?"
            message="You have unsaved changes. Are you sure you want to close this form? All your changes will be lost."
            confirmText="Discard Changes"
            cancelText="Continue Editing"
            onConfirm={() => { setShowDiscardDialog(false); setIsFormDirty(false); onClose(); }}
            onCancel={() => setShowDiscardDialog(false)}
            size="medium"
        />
        </>
    );
};

export default DelegateModal;
