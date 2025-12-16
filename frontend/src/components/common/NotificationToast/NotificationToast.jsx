import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './NotificationToast.scss';

const NotificationToast = ({
    id,
    type = 'info',
    title,
    message,
    duration = 5000,
    action,
    avatar,
    timestamp,
    persistent = false,
    onClose,
    pauseOnHover = true
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(100);
    const navigate = useNavigate();

    useEffect(() => {
        // Trigger entrance animation
        setTimeout(() => setIsVisible(true), 10);

        if (persistent) return;

        let startTime = Date.now();
        let remainingTime = duration;
        let animationFrameId;

        const updateProgress = () => {
            if (isPaused) {
                startTime = Date.now();
                animationFrameId = requestAnimationFrame(updateProgress);
                return;
            }

            const elapsed = Date.now() - startTime;
            const newProgress = Math.max(0, ((remainingTime - elapsed) / duration) * 100);
            setProgress(newProgress);

            if (newProgress > 0) {
                animationFrameId = requestAnimationFrame(updateProgress);
            } else {
                handleClose();
            }
        };

        animationFrameId = requestAnimationFrame(updateProgress);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPaused, persistent, duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            if (onClose) onClose(id);
        }, 300); // Match exit animation duration
    };

    const handleAction = () => {
        if (action && action.onClick) {
            action.onClick();
            handleClose();
        }
    };

    const getIcon = () => {
        switch (type.toLowerCase()) {
            case 'success':
                return <FaCheckCircle className="toast-icon" />;
            case 'error':
                return <FaTimesCircle className="toast-icon" />;
            case 'warning':
                return <FaExclamationTriangle className="toast-icon" />;
            case 'info':
            default:
                return <FaInfoCircle className="toast-icon" />;
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        return date.toLocaleDateString();
    };

    return (
        <div
            className={`notification-toast notification-toast--${type.toLowerCase()} ${isVisible ? 'notification-toast--visible' : ''}`}
            onMouseEnter={() => pauseOnHover && setIsPaused(true)}
            onMouseLeave={() => pauseOnHover && setIsPaused(false)}
            role="alert"
            aria-live="polite"
        >
            <div className="notification-toast__content">
                <div className="notification-toast__icon-wrapper">
                    {avatar ? (
                        <img src={avatar} alt="User" className="notification-toast__avatar" />
                    ) : (
                        getIcon()
                    )}
                </div>

                <div className="notification-toast__text">
                    <div className="notification-toast__header">
                        <h4 className="notification-toast__title">{title}</h4>
                        {timestamp && (
                            <span className="notification-toast__timestamp">
                                {formatTimestamp(timestamp)}
                            </span>
                        )}
                    </div>
                    <p className="notification-toast__message">{message}</p>

                    {action && (
                        <button
                            className="notification-toast__action"
                            onClick={handleAction}
                        >
                            {action.label}
                        </button>
                    )}
                </div>

                <button
                    className="notification-toast__close"
                    onClick={handleClose}
                    aria-label="Close notification"
                >
                    <FaTimes />
                </button>
            </div>

            {!persistent && (
                <div
                    className="notification-toast__progress"
                    style={{ width: `${progress}%` }}
                />
            )}
        </div>
    );
};

export default NotificationToast;
