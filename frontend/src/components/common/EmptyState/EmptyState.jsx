import React from 'react';
import PropTypes from 'prop-types';
import { FiInbox } from 'react-icons/fi';
import './EmptyState.scss';

/**
 * EmptyState Component
 *
 * A reusable empty/placeholder state for when no data is available.
 * Based on the pattern used in DeductionManagement (.no-employee-selected).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon to display (default: FiInbox)
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Supporting description text
 * @param {React.ReactNode} props.action - Optional action button/element
 * @param {string} props.className - Optional additional CSS class
 */
const EmptyState = ({
    icon,
    title = 'No data available',
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`empty-state ${className}`}>
            <div className="empty-state-icon">
                {icon || <FiInbox />}
            </div>
            <h4 className="empty-state-title">{title}</h4>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && (
                <div className="empty-state-action">
                    {action}
                </div>
            )}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.string,
    description: PropTypes.string,
    action: PropTypes.node,
    className: PropTypes.string,
};

export default EmptyState;
