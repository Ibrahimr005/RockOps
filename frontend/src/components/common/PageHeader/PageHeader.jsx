import React from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiFilter } from 'react-icons/fi';
import './PageHeader.scss';

const PageHeader = ({
                        title,
                        subtitle,
                        children,
                        className = '',
                        actionButton,
                        filterButton // New prop for filter functionality
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
                {filterButton && (
                    <button
                        className={`btn-primary`}
                        onClick={filterButton.onClick}
                        disabled={filterButton.disabled}
                    >
                        <FiFilter />
                        {/* Remove the <span>Filters</span> */}
                    </button>
                )}
                {actionButton && (
                    <button
                        className={`btn-primary ${actionButton.className || ''}`}
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
    }),
    filterButton: PropTypes.shape({
        onClick: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        activeCount: PropTypes.number,
        disabled: PropTypes.bool
    })
};

export default PageHeader;