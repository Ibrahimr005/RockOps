import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import './BaseModal.scss';

/**
 * BaseModal - A reusable modal component with proper accessibility and UX patterns
 *
 * Features:
 * - Scroll locking (body overflow hidden)
 * - ESC key to close
 * - Click outside to close (configurable)
 * - Proper accessibility attributes
 * - Size variants
 * - Animation support
 * - Focus trap support
 */
const BaseModal = ({
    isOpen = false,
    onClose,
    title,
    subtitle,
    children,
    size = 'medium',
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEsc = true,
    className = '',
    headerActions = null,
    footer = null,
    isLoading = false,
    preventCloseWhileLoading = true,
    ariaLabelledBy,
    ariaDescribedBy
}) => {
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    // Handle close with loading check
    const handleClose = useCallback(() => {
        if (preventCloseWhileLoading && isLoading) {
            return;
        }
        onClose?.();
    }, [onClose, isLoading, preventCloseWhileLoading]);

    // Handle backdrop click
    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) {
            handleClose();
        }
    }, [closeOnBackdrop, handleClose]);

    // Handle ESC key and scroll lock
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && closeOnEsc) {
                handleClose();
            }
        };

        if (isOpen) {
            // Store currently focused element
            previousActiveElement.current = document.activeElement;

            // Add ESC listener
            document.addEventListener('keydown', handleEscKey);

            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // Focus modal for accessibility
            if (modalRef.current) {
                modalRef.current.focus();
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';

            // Restore focus to previous element
            if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
                previousActiveElement.current.focus();
            }
        };
    }, [isOpen, closeOnEsc, handleClose]);

    // Additional cleanup on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!isOpen) return null;

    const sizeClass = `base-modal--${size}`;
    const loadingClass = isLoading ? 'base-modal--loading' : '';

    return (
        <div
            className="base-modal-backdrop"
            onClick={handleBackdropClick}
            role="presentation"
        >
            <div
                ref={modalRef}
                className={`base-modal ${sizeClass} ${loadingClass} ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy || (title ? 'base-modal-title' : undefined)}
                aria-describedby={ariaDescribedBy}
                tabIndex={-1}
            >
                {/* Header */}
                {(title || showCloseButton || headerActions) && (
                    <div className="base-modal-header">
                        <div className="base-modal-header-content">
                            {title && (
                                <div className="base-modal-title-wrapper">
                                    <h2 id="base-modal-title" className="base-modal-title">
                                        {title}
                                    </h2>
                                    {subtitle && (
                                        <p className="base-modal-subtitle">{subtitle}</p>
                                    )}
                                </div>
                            )}
                            {headerActions && (
                                <div className="base-modal-header-actions">
                                    {headerActions}
                                </div>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                type="button"
                                className="base-modal-close"
                                onClick={handleClose}
                                disabled={preventCloseWhileLoading && isLoading}
                                aria-label="Close modal"
                            >
                                <FiX size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="base-modal-content">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="base-modal-footer">
                        {footer}
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && (
                    <div className="base-modal-loading-overlay">
                        <div className="base-modal-spinner" />
                    </div>
                )}
            </div>
        </div>
    );
};

BaseModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    children: PropTypes.node,
    size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge', 'fullscreen']),
    showCloseButton: PropTypes.bool,
    closeOnBackdrop: PropTypes.bool,
    closeOnEsc: PropTypes.bool,
    className: PropTypes.string,
    headerActions: PropTypes.node,
    footer: PropTypes.node,
    isLoading: PropTypes.bool,
    preventCloseWhileLoading: PropTypes.bool,
    ariaLabelledBy: PropTypes.string,
    ariaDescribedBy: PropTypes.string
};

export default BaseModal;
