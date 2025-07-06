import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './ConfirmationDialog.scss';

const ConfirmationDialog = ({
    isOpen,
    title = "Confirm Action",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = false,
    loading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirmation-dialog-overlay">
            <div className="confirmation-dialog">
                <div className="confirmation-dialog-header">
                    <div className="confirmation-dialog-icon">
                        <FaExclamationTriangle />
                    </div>
                    <h3>{title}</h3>
                    <button 
                        className="confirmation-dialog-close"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        <FaTimes />
                    </button>
                </div>
                
                <div className="confirmation-dialog-body">
                    <p>{message}</p>
                </div>
                
                <div className="confirmation-dialog-actions">
                    <button
                        className="confirmation-dialog-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirmation-dialog-confirm ${isDestructive ? 'destructive' : ''}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog; 