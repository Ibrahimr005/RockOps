import React from 'react';
import PropTypes from 'prop-types';
import { FiFilter } from 'react-icons/fi';
import './SubPageHeader.scss';

const SubPageHeader = ({
                           title,
                           subtitle,
                           children,
                           className = '',
                           filterButton // New prop for filter functionality
                       }) => {
    return (
        <div className={`sub-page-header ${className}`}>
            <div className="sub-page-header-title-section">
                <div className="sub-page-header-indicator"></div>
                <div className="sub-page-header-text">
                    <h3>{title}</h3>
                    {subtitle && (
                        <p className="sub-page-header-subtitle">{subtitle}</p>
                    )}
                </div>
            </div>
            <div className="sub-page-header-actions">
                {filterButton && (
                    <button
                        className={`page-header__filter-btn ${filterButton.isActive ? 'page-header__filter-btn--active' : ''}`}
                        onClick={filterButton.onClick}
                        disabled={filterButton.disabled}
                    >
                        <FiFilter />
                        {filterButton.activeCount > 0 && (
                            <span className="page-header__filter-count">
                                {filterButton.activeCount}
                            </span>
                        )}
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

SubPageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
    filterButton: PropTypes.shape({
        onClick: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        activeCount: PropTypes.number,
        disabled: PropTypes.bool
    })
};

export default SubPageHeader;