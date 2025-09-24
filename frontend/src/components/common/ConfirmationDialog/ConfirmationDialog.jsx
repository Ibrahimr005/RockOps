import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo, FiTrash2, FiSend, FiX } from 'react-icons/fi';
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
                                onClose = null, // NEW: Add onClose prop
                                isLoading = false,
                                showIcon = true,
                                size = 'large', // 'small', 'medium', 'large'
                                // New props for input functionality
                                showInput = false,
                                inputLabel = '',
                                inputPlaceholder = '',
                                inputRequired = false,
                                inputValue = '',
                                onInputChange = null
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
        // Check if input is required and empty
        if (showInput && inputRequired && !inputValue.trim()) {
            return; // Don't proceed if required input is empty
        }

        document.body.style.overflow = 'unset'; // Reset overflow immediately

        // Pass input value to confirm handler if input is shown
        if (showInput) {
            onConfirm?.(inputValue);
        } else {
            onConfirm?.();
        }
    };

    // NEW: Handle X button click separately
    const handleClose = () => {
        document.body.style.overflow = 'unset';
        if (onClose) {
            onClose(); // Use onClose if provided
        } else {
            handleCancel(); // Fall back to handleCancel if no onClose provided
        }
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
            <div className={`confirmation-dialog confirmation-dialog--${type} confirmation-dialog--${size} ${showInput ? 'confirmation-dialog--with-input' : ''}`}>
                {/* X Close Button */}
                <button
                    className="confirmation-dialog-close"
                    onClick={handleClose} // CHANGED: Use handleClose instead of handleCancel
                    disabled={isLoading}
                    aria-label="Close dialog"
                >
                    <FiX size={20} />
                </button>

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

                {/* Input Field */}
                {showInput && (
                    <div className="confirmation-dialog-input-section">
                        {inputLabel && (
                            <label className="confirmation-dialog-input-label">
                                {inputLabel}
                                {inputRequired && <span className="required-asterisk">*</span>}
                            </label>
                        )}
                        <textarea
                            className={`confirmation-dialog-input ${inputRequired && !inputValue.trim() ? 'error' : ''}`}
                            placeholder={inputPlaceholder}
                            value={inputValue}
                            onChange={(e) => onInputChange?.(e.target.value)}
                            rows={3}
                            disabled={isLoading}
                        />

                    </div>
                )}

                {/* Action Buttons */}
                <div className="confirmation-dialog-actions">
                    <button
                        type="button"
                        className="btn-secondary2 confirmation-dialog-cancel"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-primary2 confirmation-dialog-confirm confirmation-dialog-confirm--${type}`}
                        onClick={handleConfirm}
                        disabled={isLoading || (showInput && inputRequired && !inputValue.trim())}
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