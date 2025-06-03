import React, { useState, useEffect } from 'react';

const Snackbar = ({
                      type = 'success',
                      text,
                      duration = 3000, // How long the snackbar stays visible
                      isVisible = false,
                      onClose
                  }) => {
    const [visible, setVisible] = useState(false);
    const [animationState, setAnimationState] = useState('hidden');

    // Animation timings (in ms)
    const slideInDuration = 165;
    const animationDuration = 535; // Should match CSS transition time exactly

    useEffect(() => {
        if (isVisible) {
            // First make it visible
            setVisible(true);

            // Then trigger the slide-in animation after a brief delay
            setTimeout(() => {
                setAnimationState('slide-in');
            }, slideInDuration);

            // Start hiding after 'duration' ms
            const hideTimer = setTimeout(() => {
                // Trigger slide-out animation
                setAnimationState('slide-out');

                // Remove from DOM after animation completes
                const removeTimer = setTimeout(() => {
                    setVisible(false);
                    if (onClose) onClose();
                }, animationDuration);

                return () => clearTimeout(removeTimer);
            }, duration); // This is the time the snackbar stays visible before hiding

            return () => clearTimeout(hideTimer);
        } else {
            // If isVisible changes to false
            setAnimationState('slide-out');

            const timer = setTimeout(() => {
                setVisible(false);
            }, animationDuration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, duration]); // ← FIXED: Removed onClose from dependencies

    // Don't render anything if not visible
    if (!visible) return null;

    return (
        <div className={`snackbar ${type}-snackbar ${animationState}`}>
            {type === 'success' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            )}
            <span>{text}</span>

            <style jsx>{`
                .snackbar {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-100px);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    z-index: 1100;
                    opacity: 0;
                    transition: transform 0.535s ease, opacity 0.535s ease; /* Match this to the animationDuration value */
                }

                .snackbar.slide-in {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }

                .snackbar.slide-out {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }

                .snackbar svg {
                    width: 20px;
                    height: 20px;
                }

                .success-snackbar {
                    background-color: #ecfdf5; /* Light green background */
                    border-left: 4px solid #4ade80;
                }

                .success-snackbar svg {
                    color: #16a34a;
                }

                .success-snackbar span {
                    color: #065f46; /* Darker green text */
                }

                .error-snackbar {
                    background-color: #fef2f2; /* Light red background */
                    border-left: 4px solid #f87171;
                }

                .error-snackbar svg {
                    color: #dc2626;
                }

                .error-snackbar span {
                    color: #991b1b; /* Darker red text */
                }

                .snackbar span {
                    font-size: 14px;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default Snackbar;