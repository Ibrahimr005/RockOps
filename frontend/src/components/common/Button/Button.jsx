// ========================================
// FILE: Button.jsx
// Unified Button Component with all variants
// ========================================

import React, { forwardRef } from 'react';
import { FaSpinner } from 'react-icons/fa';
import './Button.scss';

/**
 * Unified Button Component
 *
 * @param {string} variant - 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost' | 'link'
 * @param {boolean} outline - Render as outline variant
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} loading - Show loading spinner
 * @param {string} loadingText - Text shown while loading (defaults to children)
 * @param {boolean} disabled - Disable the button
 * @param {boolean} iconOnly - Square padding for icon-only buttons
 * @param {boolean} block - Full width button
 * @param {string} type - 'button' | 'submit' | 'reset'
 * @param {string} className - Additional CSS classes
 * @param {React.ReactNode} children - Button content
 */
const Button = forwardRef(({
    variant = 'primary',
    outline = false,
    size,
    loading = false,
    loadingText,
    disabled = false,
    iconOnly = false,
    block = false,
    type = 'button',
    className = '',
    children,
    ...rest
}, ref) => {
    const getButtonClass = () => {
        const classes = ['btn'];

        // Variant + style
        if (variant === 'ghost') {
            classes.push('btn-ghost');
        } else if (variant === 'link') {
            classes.push('btn-link');
        } else if (outline) {
            classes.push(`btn-${variant}-outline`);
        } else {
            classes.push(`btn-${variant}`);
        }

        // Size
        if (size === 'sm') classes.push('btn-sm');
        if (size === 'lg') classes.push('btn-lg');
        if (size === 'xl') classes.push('btn-xl');

        // Modifiers
        if (iconOnly) classes.push('btn-icon-only');
        if (block) classes.push('btn-block');
        if (loading) classes.push('btn-loading');

        // Custom classes
        if (className) classes.push(className);

        return classes.join(' ');
    };

    const renderContent = () => {
        if (loading) {
            return (
                <>
                    <FaSpinner className="btn-spinner" />
                    <span>{loadingText || children}</span>
                </>
            );
        }
        return children;
    };

    return (
        <button
            ref={ref}
            type={type}
            className={getButtonClass()}
            disabled={disabled || loading}
            {...rest}
        >
            {renderContent()}
        </button>
    );
});

Button.displayName = 'Button';

/**
 * IconButton - Circular icon-only button (close, actions, etc.)
 *
 * @param {string} variant - 'default' | 'primary' | 'danger' | 'success'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {React.ReactNode} icon - Icon element
 */
const IconButton = forwardRef(({
    variant = 'default',
    size = 'md',
    icon,
    className = '',
    ...rest
}, ref) => {
    const classes = [
        'icon-btn',
        `icon-btn--${variant}`,
        `icon-btn--${size}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            ref={ref}
            type="button"
            className={classes}
            {...rest}
        >
            {icon}
        </button>
    );
});

IconButton.displayName = 'IconButton';

/**
 * CloseButton - Standardized modal/dialog close button
 *
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
const CloseButton = forwardRef(({
    size = 'md',
    className = '',
    ...rest
}, ref) => {
    const classes = [
        'close-btn',
        `close-btn--${size}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            ref={ref}
            type="button"
            className={classes}
            aria-label="Close"
            {...rest}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    );
});

CloseButton.displayName = 'CloseButton';

/**
 * ButtonGroup - Container for grouped buttons
 */
const ButtonGroup = ({ children, className = '', ...rest }) => (
    <div className={`btn-group ${className}`} {...rest}>
        {children}
    </div>
);

ButtonGroup.displayName = 'ButtonGroup';

export { Button as default, Button, IconButton, CloseButton, ButtonGroup };
