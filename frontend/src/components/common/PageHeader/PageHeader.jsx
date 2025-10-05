import React from 'react';
import PropTypes from 'prop-types';
import { FiPlus } from 'react-icons/fi';
import './PageHeader.scss';

/**
 * Reusable page header component for consistent styling across all pages
 * @param {Object} props - Component props
 * @param {string} props.title - Main title of the page
 * @param {string} props.subtitle - Subtitle/description of the page
 * @param {React.ReactNode} props.children - Optional additional content (buttons, etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.actionButton - Configuration for action button
 * @param {string} props.actionButton.text - Button text (default: "Add")
 * @param {React.ReactNode} props.actionButton.icon - Button icon (default: FiPlus)
 * @param {Function} props.actionButton.onClick - Click handler for the button
 * @param {boolean} props.actionButton.disabled - Whether button is disabled
 * @param {string} props.actionButton.className - Additional CSS classes for the button
 */
const PageHeader = ({ 
    title, 
    subtitle, 
    children, 
    className = '', 
    actionButton 
}) => {
    return (
        <div className={`global-page-header ${className}`}>
            <h1>
                {title}
                {subtitle && (
                    <p className="employees-header__subtitle">
                        {subtitle}
                    </p>
                )}
            </h1>
            <div className="page-header-actions">
                {actionButton && (
                    <button
                        className={`btn btn-primary ${actionButton.className || ''}`}
                        onClick={actionButton.onClick}
                        disabled={actionButton.disabled}
                    >
                        {actionButton.icon || <FiPlus />}
                        {actionButton.text || 'Add'}
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

PageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
    actionButton: PropTypes.shape({
        text: PropTypes.string,
        icon: PropTypes.node,
        onClick: PropTypes.func,
        disabled: PropTypes.bool,
        className: PropTypes.string
    })
};

export default PageHeader;
