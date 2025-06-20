import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo, FiTrash2, FiSend } from 'react-icons/fi';
import './ConfirmationDialog.scss';

const ConfirmationDialog = ({
                                isVisible = false,
                                type = 'warning', // 'warning', 'danger', 'success', 'info'
                                title,
                                message,
                                confirmText = 'Confirm',
                                cancelText = 'Cancel',
                                onConfirm,
                                onCancel,
                                isLoading = false,
                                showIcon = true,
                                size = 'medium' // 'small', 'medium', 'large'
                            }) => {
    if (!isVisible) return null;

    // Icon mapping based on type
    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <FiXCircle size={24} />;
            case 'success':
                return <FiCheckCircle size={24} />;
            case 'info':
                return <FiInfo size={24} />;
            case 'delete':
                return <FiTrash2 size={24} />;
            case 'send':
                return <FiSend size={24} />;
            default:
                return <FiAlertTriangle size={24} />;
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel?.();
        }
    };

    // Handle ESC key
    React.useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && isVisible) {
                onCancel?.();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [isVisible, onCancel]);

    return (
        <div
            className="confirmation-dialog-backdrop"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
        >
            <div className={`confirmation-dialog confirmation-dialog--${type} confirmation-dialog--${size}`}>
                {/* Header with Icon and Title */}
                <div className="confirmation-dialog-header">
                    {showIcon && (
                        <div className={`confirmation-dialog-icon confirmation-dialog-icon--${type}`}>
                            {getIcon()}
                        </div>
                    )}
                    {title && (
                        <h3 id="dialog-title" className="confirmation-dialog-title">
                            {title}
                        </h3>
                    )}
                </div>

                {/* Message Content */}
                {message && (
                    <div className="confirmation-dialog-content">
                        <p id="dialog-description" className="confirmation-dialog-message">
                            {message}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="confirmation-dialog-actions">
                    <button
                        type="button"
                        className="btn-secondary confirmation-dialog-cancel"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-primary confirmation-dialog-confirm confirmation-dialog-confirm--${type}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="confirmation-dialog-spinner"></span>
                                Loading...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog;