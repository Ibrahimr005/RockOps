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

    // Enhanced handlers that ensure body overflow is reset
    const handleCancel = () => {
        document.body.style.overflow = 'unset'; // Reset overflow immediately
        onCancel?.();
    };

    const handleConfirm = () => {
        document.body.style.overflow = 'unset'; // Reset overflow immediately
        onConfirm?.();
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    // Handle ESC key and manage body overflow
    React.useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && isVisible) {
                handleCancel();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        } else {
            // Ensure overflow is reset when dialog becomes invisible
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset'; // Always reset on cleanup
        };
    }, [isVisible]);

    // Additional effect to ensure body overflow is reset when component unmounts
    React.useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-primary2 confirmation-dialog-confirm confirmation-dialog-confirm--${type}`}
                        onClick={handleConfirm}
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