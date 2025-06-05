import React, { useState, useEffect } from 'react';
import './Snackbar.scss';

/**
 * Snackbar component for displaying Snackbar messages
 * @param {Object} props - Component props
 * @param {string} props.type - Snackbar type: 'success', 'error', 'info', 'warning'
 * @param {string} props.message - Snackbar message text
 * @param {boolean} props.show - Whether to show the Snackbar
 * @param {function} props.onClose - Function to call when Snackbar should close
 * @param {number} props.duration - Duration to show Snackbar in ms (default: 3000)
 * @param {boolean} props.persistent - Whether the snackbar should stay open until manually closed
 * @param {Object} props.actions - Optional action buttons configuration
 * @param {Array} props.actions.buttons - Array of button configurations
 * @param {string} props.actions.buttons[].label - Button label
 * @param {string} props.actions.buttons[].type - Button type ('confirm' or 'cancel')
 * @param {function} props.actions.buttons[].onClick - Button click handler
 */
const Snackbar = ({ 
    type = 'success', 
    message, 
    show, 
    onClose, 
    duration = 3000, 
    persistent = false,
    actions = null 
}) => {
    const [visible, setVisible] = useState(false);
    const [animationState, setAnimationState] = useState('hidden');

    // Animation timings (in ms)
    const slideInDuration = 165;
    const animationDuration = 535; // Should match CSS transition time exactly

    useEffect(() => {
        if (show) {
            // First make it visible
            setVisible(true);

            // Then trigger the slide-in animation after a brief delay
            setTimeout(() => {
                setAnimationState('slide-in');
            }, slideInDuration);

            // Start hiding after 'duration' ms (only if not persistent and no actions)
            if (!persistent && !actions) {
                const hideTimer = setTimeout(() => {
                    // Trigger slide-out animation
                    setAnimationState('slide-out');

                    // Remove from DOM after animation completes
                    const removeTimer = setTimeout(() => {
                        setVisible(false);
                        if (onClose) onClose();
                    }, animationDuration);

                    return () => clearTimeout(removeTimer);
                }, duration);

                return () => clearTimeout(hideTimer);
            }
        } else {
            // If show changes to false
            setAnimationState('slide-out');

            const timer = setTimeout(() => {
                setVisible(false);
            }, animationDuration);

            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose, persistent, actions]);

    // Manual close handler for persistent snackbars
    const handleManualClose = () => {
        setAnimationState('slide-out');
        setTimeout(() => {
            setVisible(false);
            if (onClose) onClose();
        }, animationDuration);
    };

    // Don't render anything if not visible
    if (!visible) return null;

    // Define icons for different Snackbar types
    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <path d="M22 4L12 14.01l-3-3"/>
                    </svg>
                );
            case 'error':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                );
            case 'info':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Check if message contains line breaks to determine layout
    const hasMultipleLines = typeof message === 'string' && message.includes('\n');

    return (
        <div className={`snackbar ${type}-snackbar ${animationState} ${persistent ? 'persistent' : ''} ${hasMultipleLines ? 'multi-line' : ''}`}>
            <div className="snackbar-icon">
                {getIcon()}
            </div>
            <div className="snackbar-content">
                {hasMultipleLines ? (
                    <pre className="snackbar-message">{message}</pre>
                ) : (
                    <span className="snackbar-message">{message}</span>
                )}
                {actions && actions.buttons && (
                    <div className="snackbar-actions">
                        {actions.buttons.map((button, index) => (
                            <button
                                key={index}
                                className={`snackbar-action-button ${button.type || 'default'}`}
                                onClick={() => {
                                    if (button.onClick) button.onClick();
                                    if (!button.preventClose) handleManualClose();
                                }}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {persistent && !actions && (
                <button 
                    className="snackbar-close-button" 
                    onClick={handleManualClose}
                    aria-label="Close notification"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default Snackbar;