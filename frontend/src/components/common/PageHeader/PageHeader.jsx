import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiFilter, FiCheck, FiChevronUp } from 'react-icons/fi';
import './PageHeader.scss';

const PageHeader = ({
                        title,
                        subtitle,
                        children,
                        className = '',
                        actionButton,
                        filterConfig
                    }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleToggleFilter = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleCheckboxChange = (itemId) => {
        if (filterConfig?.onFilterChange) {
            const currentSelected = filterConfig.selectedItems || [];
            const newSelected = currentSelected.includes(itemId)
                ? currentSelected.filter(id => id !== itemId)
                : [...currentSelected, itemId];
            filterConfig.onFilterChange(newSelected);
        }
    };

    const handleSelectAll = () => {
        if (filterConfig?.onFilterChange && filterConfig?.items) {
            const allIds = filterConfig.items.map(item => item.id);
            filterConfig.onFilterChange(allIds);
        }
    };

    const handleClearAll = () => {
        if (filterConfig?.onFilterChange) {
            filterConfig.onFilterChange([]);
        }
    };

    const selectedCount = filterConfig?.selectedItems?.length || 0;
    const totalCount = filterConfig?.items?.length || 0;
    const hasActiveFilters = selectedCount > 0 && selectedCount < totalCount;

    return (
        <>
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
                    {filterConfig && (
                        <button
                            className={`page-header__filter-btn ${isFilterOpen ? 'page-header__filter-btn--active' : ''}`}
                            onClick={handleToggleFilter}
                            disabled={filterConfig.disabled}
                        >
                            <FiFilter />
                            {hasActiveFilters && (
                                <span className="page-header__filter-count">
                                    {selectedCount}
                                </span>
                            )}
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

            {/* Filter Panel - Card Design */}
            {filterConfig && isFilterOpen && (
                <div className="page-header__filter-panel">
                    <div className="page-header__filter-header">
                        <h4>
                            <FiFilter size={16} />
                            {filterConfig.label || 'Filters'}
                        </h4>
                        <div className="filter-actions">
                            <button
                                type="button"
                                className="filter-reset-btn"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                className="filter-reset-btn"
                                onClick={handleClearAll}
                                disabled={selectedCount === 0}
                            >
                                Clear All
                            </button>
                            <button
                                className={`filter-collapse-btn ${!isFilterOpen ? 'collapsed' : ''}`}
                                onClick={handleToggleFilter}
                            >
                                <FiChevronUp />
                            </button>
                        </div>
                    </div>
                    <div className="page-header__filter-list">
                        {filterConfig.items?.length > 0 ? (
                            filterConfig.items.map((item) => (
                                <div key={item.id} className="page-header__filter-item">
                                    <label className="filter-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={filterConfig.selectedItems?.includes(item.id) || false}
                                            onChange={() => handleCheckboxChange(item.id)}
                                        />
                                        <span className="filter-checkbox-custom">
                                            <FiCheck size={12} />
                                        </span>
                                        <span className="filter-checkbox-text">{item.name}</span>
                                    </label>
                                </div>
                            ))
                        ) : (
                            <div className="page-header__filter-empty">
                                No items available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
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
    filterConfig: PropTypes.shape({
        label: PropTypes.string,
        items: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            name: PropTypes.string.isRequired
        })),
        selectedItems: PropTypes.array,
        onFilterChange: PropTypes.func.isRequired,
        disabled: PropTypes.bool
    })
};

export default PageHeader;