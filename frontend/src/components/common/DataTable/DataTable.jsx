import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaFilter, FaEllipsisV, FaPlus, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './DataTable.scss';

const DataTable = ({
                       data = [],
                       columns = [],
                       itemsPerPageOptions = [5, 10, 15, 20],
                       defaultItemsPerPage = 10,
                       defaultSortField = null,
                       defaultSortDirection = 'asc',
                       onRowClick = null,
                       loading = false,
                       tableTitle = '',
                       showSearch = true,
                       showFilters = true,
                       filterableColumns = [],
                       customFilters = [],
                       className = '',
                       actions = [], // Array of action objects
                       actionsColumnWidth = '120px', // Default width for actions column
                       emptyMessage = 'No data available', // Custom empty message
                       // Add button props
                       showAddButton = false,
                       addButtonText = 'Add New',
                       addButtonIcon = <FaPlus />,
                       onAddClick = null,
                       addButtonProps = {},
                       // Empty value handling props
                       emptyValueText = 'N/A',
                       emptyValuesByColumn = {},
                       // NEW Excel export props
                       showExportButton = false, // Whether to show the export button
                       exportButtonText = 'Export Excel', // Text for the export button
                       exportButtonIcon = <FaFileExcel />, // Icon for the export button
                       exportFileName = 'table_data', // Default filename (without extension)
                       exportButtonProps = {}, // Additional props for the export button
                       exportAllData = false, // If true, exports all data; if false, exports only filtered/sorted data
                       excludeColumnsFromExport = [], // Array of column accessors to exclude from export
                       customExportHeaders = {}, // Object mapping column accessors to custom export headers
                       onExportStart = null, // Callback when export starts
                       onExportComplete = null, // Callback when export completes
                       onExportError = null, // Callback when export fails
                   }) => {
    // States for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

    // States for sorting
    const [sortField, setSortField] = useState(defaultSortField);
    const [sortDirection, setSortDirection] = useState(defaultSortDirection);

    // States for filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({});
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // Track which row's actions menu is open
    const [activeActionRow, setActiveActionRow] = useState(null);

    // Export loading state
    const [isExporting, setIsExporting] = useState(false);

    // Table refs for consistency
    const tableRef = useRef(null);
    const wrapperRef = useRef(null);

    // Include action column if configured
    const allColumns = actions.length > 0
        ? [...columns, {
            id: 'actions',
            header: 'ACTIONS',
            accessor: 'actions',
            width: actionsColumnWidth,
            minWidth: actionsColumnWidth,
            sortable: false,
            filterable: false
        }]
        : columns;

    // Reset current page when data, search term, or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters, data]);

    // Close actions menu when clicking outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (activeActionRow !== null && !e.target.closest('.rockops-table__actions')) {
                setActiveActionRow(null);
            }
        };

        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, [activeActionRow]);

    // Helper function to check if a value is empty/null/undefined
    const isEmpty = (value) => {
        return value === null ||
            value === undefined ||
            value === '' ||
            (typeof value === 'string' && value.trim() === '') ||
            (typeof value === 'number' && isNaN(value));
    };

    // Helper function to get fallback text for empty values
    const getEmptyValueText = (columnAccessor) => {
        // Check if there's a custom empty text for this specific column
        if (emptyValuesByColumn[columnAccessor]) {
            return emptyValuesByColumn[columnAccessor];
        }

        // Use the general fallback text for all columns
        return emptyValueText;
    };

    // Helper function to get nested object values
    function getValue(obj, path) {
        if (!path) return obj;

        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value === null || value === undefined) return '';
            value = value[key];
        }

        return value;
    }

    // Helper function to get display value (with empty value handling)
    const getDisplayValue = (obj, path, columnAccessor) => {
        const value = getValue(obj, path);

        if (isEmpty(value)) {
            return getEmptyValueText(columnAccessor);
        }

        return value;
    };

    // Helper function to get export value (raw value for Excel)
    const getExportValue = (obj, path, column) => {
        const value = getValue(obj, path);

        // For export, we might want to handle empty values differently
        if (isEmpty(value)) {
            return ''; // Empty string for Excel instead of "N/A"
        }

        // If the column has a custom export formatter, use it
        if (column.exportFormatter) {
            return column.exportFormatter(value, obj);
        }

        // For dates, ensure proper formatting
        if (value instanceof Date) {
            return value.toISOString().split('T')[0]; // YYYY-MM-DD format
        }

        return value;
    };

    // Apply search filter
    const searchFiltered = useMemo(() => {
        if (!searchTerm.trim()) return data;

        return data.filter(item => {
            return columns.some(column => {
                if (!column.accessor || column.excludeFromSearch) return false;
                const value = getValue(item, column.accessor);

                // Skip empty values in search unless the search term matches the empty value text
                if (isEmpty(value)) {
                    const emptyText = getEmptyValueText(column.accessor);
                    return emptyText.toLowerCase().includes(searchTerm.toLowerCase());
                }

                return String(value).toLowerCase().includes(searchTerm.toLowerCase());
            });
        });
    }, [data, searchTerm, columns, emptyValueText, emptyValuesByColumn]);

    // Apply column filters
    const filtered = useMemo(() => {
        if (Object.keys(filters).length === 0) return searchFiltered;

        return searchFiltered.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                if (!filterValue) return true;

                const itemValue = getValue(item, key);

                // Handle different filter types
                if (Array.isArray(filterValue)) {
                    // Multi-select filter
                    if (filterValue.length === 0) return true;

                    if (isEmpty(itemValue)) {
                        const emptyText = getEmptyValueText(key);
                        return filterValue.includes(emptyText);
                    }

                    return filterValue.includes(String(itemValue));
                } else if (typeof filterValue === 'object' && filterValue !== null) {
                    // Range filter
                    const { min, max } = filterValue;
                    const numValue = Number(itemValue);
                    return (min === null || numValue >= min) && (max === null || numValue <= max);
                } else {
                    // Simple text filter
                    if (isEmpty(itemValue)) {
                        const emptyText = getEmptyValueText(key);
                        return emptyText.toLowerCase().includes(String(filterValue).toLowerCase());
                    }

                    return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                }
            });
        });
    }, [searchFiltered, filters, emptyValueText, emptyValuesByColumn]);

    // Apply sorting
    const sortedData = useMemo(() => {
        if (!sortField) return filtered;

        return [...filtered].sort((a, b) => {
            const aValue = getValue(a, sortField);
            const bValue = getValue(b, sortField);

            // Handle null or undefined values - empty values go to the end
            if (isEmpty(aValue) && isEmpty(bValue)) return 0;
            if (isEmpty(aValue)) return sortDirection === 'asc' ? 1 : -1;
            if (isEmpty(bValue)) return sortDirection === 'asc' ? -1 : 1;

            // Compare based on value type
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Default string comparison
            return sortDirection === 'asc'
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });
    }, [filtered, sortField, sortDirection, emptyValueText, emptyValuesByColumn]);

    // Calculate pagination
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    // Calculate total pages
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    // Handle sorting
    const handleSort = (accessor) => {
        if (sortField === accessor) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(accessor);
            setSortDirection('asc');
        }
    };

    // Handle filter change
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle page change
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Toggle actions menu for a row
    const toggleActionsMenu = (e, rowIndex) => {
        e.stopPropagation(); // Prevent row click
        setActiveActionRow(activeActionRow === rowIndex ? null : rowIndex);
    };

    // Handle action click
    const handleActionClick = (e, action, row) => {
        e.stopPropagation(); // Prevent row click
        setActiveActionRow(null); // Close actions menu

        if (action.onClick) {
            action.onClick(row);
        }
    };

    // Handle add button click
    const handleAddButtonClick = () => {
        if (onAddClick) {
            onAddClick();
        }
    };

    // NEW: Handle Excel export
    const handleExportToExcel = async () => {
        if (isExporting) return;

        setIsExporting(true);

        try {
            // Trigger start callback
            if (onExportStart) {
                onExportStart();
            }

            // Determine which data to export
            const dataToExport = exportAllData ? data : sortedData;

            // Filter columns to exclude from export
            const exportableColumns = columns.filter(column =>
                !excludeColumnsFromExport.includes(column.accessor) &&
                column.accessor !== 'actions' // Never export actions column
            );

            // Create headers
            const headers = exportableColumns.map(column => {
                // Use custom export header if provided, otherwise use display header
                return customExportHeaders[column.accessor] || column.header;
            });

            // Create data rows
            const rows = dataToExport.map(item => {
                return exportableColumns.map(column => {
                    return getExportValue(item, column.accessor, column);
                });
            });

            // Combine headers and data
            const worksheetData = [headers, ...rows];

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

            // Set column widths based on content
            const colWidths = exportableColumns.map(column => {
                const headerLength = (customExportHeaders[column.accessor] || column.header).length;
                const maxDataLength = Math.max(
                    ...dataToExport.map(item => {
                        const value = getExportValue(item, column.accessor, column);
                        return String(value).length;
                    })
                );
                return { width: Math.max(headerLength, maxDataLength, 10) };
            });

            worksheet['!cols'] = colWidths;

            // Add worksheet to workbook
            const sheetName = tableTitle || 'Data';
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `${exportFileName}_${timestamp}.xlsx`;

            // Write and download the file
            XLSX.writeFile(workbook, filename);

            // Trigger complete callback
            if (onExportComplete) {
                onExportComplete({
                    filename,
                    rowCount: dataToExport.length,
                    columnCount: exportableColumns.length
                });
            }

        } catch (error) {
            console.error('Export error:', error);

            // Trigger error callback
            if (onExportError) {
                onExportError(error);
            } else {
                // Default error handling
                alert('Failed to export data. Please try again.');
            }
        } finally {
            setIsExporting(false);
        }
    };

    // Get filter options for a column (including empty value text)
    const getFilterOptions = (columnAccessor) => {
        const values = data.map(row => {
            const value = getValue(row, columnAccessor);
            return isEmpty(value) ? getEmptyValueText(columnAccessor) : value;
        }).filter(val => val != null);

        return [...new Set(values)].sort();
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({});
        setSearchTerm('');
    };

    // Clear individual filter
    const clearFilter = (columnAccessor) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[columnAccessor];
            return newFilters;
        });
    };

    // Get active filters count
    const activeFiltersCount = Object.values(filters).filter(val => val && val !== '').length + (searchTerm ? 1 : 0);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= Math.min(5, totalPages); i++) {
                    pageNumbers.push(i);
                }
                if (totalPages > 5) {
                    pageNumbers.push('...');
                    pageNumbers.push(totalPages);
                }
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1);
                if (totalPages > 5) {
                    pageNumbers.push('...');
                }
                for (let i = Math.max(totalPages - 4, 2); i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }

        return pageNumbers;
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedData.length);

    return (
        <div className={`rockops-table__container ${className}`}>
            <div className="rockops-table__header-container">
                <div className="rockops-table__header-left">
                    {tableTitle && <h3 className="rockops-table__title">{tableTitle}</h3>}
                </div>

                <div className="rockops-table__header-center">
                    <div className="rockops-table__controls">
                        {showSearch && (
                            <div className="rockops-table__search">
                                <FaSearch className="rockops-table__search-icon" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..."
                                    className="rockops-table__search-input"
                                />
                            </div>
                        )}

                        {showFilters && filterableColumns.length > 0 && (
                            <button
                                className={`rockops-table__filter-btn ${showFilterPanel ? 'rockops-table__filter-btn--active' : ''}`}
                                onClick={() => {
                                    if (showFilterPanel) {
                                        // Reset filters when closing the panel
                                        clearFilters();
                                    }
                                    setShowFilterPanel(!showFilterPanel);
                                }}
                            >
                                <FaFilter />
                                <span>Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className="rockops-table__filter-count">{activeFiltersCount}</span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="rockops-table__header-right">
                    {/* Export Button */}
                    {showExportButton && (
                        <button
                            className={`btn-secondary rockops-table__export-btn ${exportButtonProps.className || ''}`}
                            onClick={handleExportToExcel}
                            disabled={isExporting || data.length === 0}
                            type="button"
                            {...exportButtonProps}
                        >
                            {isExporting ? (
                                <>
                                    <div className="rockops-table__export-spinner"></div>
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    {exportButtonIcon}
                                    <span>{exportButtonText}</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Add Button */}
                    {showAddButton && onAddClick && (
                        <button
                            className={`btn-primary rockops-table__add-btn ${addButtonProps.className || ''}`}
                            onClick={handleAddButtonClick}
                            type="button"
                            {...addButtonProps}
                        >
                            {addButtonIcon}
                            <span>{addButtonText}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Panel - Professional Design */}
            {showFilters && showFilterPanel && (
                <div className="rockops-table__filter-panel">
                    <div className="rockops-table__filter-header">
                        <h4>
                            <FaFilter />
                            Filter Options
                        </h4>
                        <div className="filter-actions">
                            {activeFiltersCount > 0 && (
                                <span className="filter-stats">
                                    {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            <button
                                className="filter-collapse-btn"
                                onClick={() => {
                                    // Reset filters when closing via collapse button
                                    clearFilters();
                                    setShowFilterPanel(false);
                                }}
                                title="Close and reset filters"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="18,15 12,9 6,15"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="rockops-table__filter-list">
                        {filterableColumns.map((column, index) => (
                            <div
                                key={index}
                                className={`rockops-table__filter-item ${filters[column.accessor] ? 'has-filter' : ''}`}
                            >
                                <label>{column.header}</label>
                                <div className="filter-input-wrapper">
                                    {column.filterType === 'select' ? (
                                        <select
                                            value={filters[column.accessor] || ''}
                                            onChange={(e) => handleFilterChange(column.accessor, e.target.value)}
                                        >
                                            <option value="">All {column.header}</option>
                                            {getFilterOptions(column.accessor).map(option => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <>
                                            <input
                                                type={column.filterType === 'number' ? 'number' : 'text'}
                                                placeholder={`Search ${column.header.toLowerCase()}...`}
                                                value={filters[column.accessor] || ''}
                                                onChange={(e) => handleFilterChange(column.accessor, e.target.value)}
                                            />
                                            {filters[column.accessor] && (
                                                <button
                                                    className="clear-filter-btn"
                                                    onClick={() => clearFilter(column.accessor)}
                                                    title="Clear filter"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {customFilters.map((filter, index) => (
                            <div key={`custom-${index}`} className="rockops-table__filter-item">
                                <label>{filter.label}</label>
                                <div className="filter-input-wrapper">
                                    {filter.component}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rockops-table__filter-actions">
                        <div className="filter-stats">
                            {sortedData.length} of {data.length} results
                            {activeFiltersCount > 0 && ` with ${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied`}
                        </div>

                        <div className="filter-buttons">
                            <button
                                className="rockops-table__btn rockops-table__btn--secondary"
                                onClick={clearFilters}
                                disabled={activeFiltersCount === 0}
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Wrapper - Always full-width */}
            <div ref={wrapperRef} className="rockops-table__wrapper full-width">
                {loading ? (
                    <div className="rockops-table__loading">
                        <div className="rockops-table__spinner"></div>
                        <p>Loading data...</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <table ref={tableRef} className="rockops-table">
                            <thead className="rockops-table__header">
                            <tr>
                                {columns.map((column, index) => (
                                    <th
                                        key={index}
                                        className={`rockops-table__th ${
                                            column.sortable !== false ? 'rockops-table__th--sortable' : ''
                                        } ${
                                            sortField === column.accessor ? `sorted-${sortDirection}` : ''
                                        }`}
                                        style={{
                                            textAlign: column.align || 'left',
                                            minWidth: column.minWidth || 'auto'
                                        }}
                                        data-flex-weight={column.flexWeight || 1}
                                        onClick={() => column.sortable !== false ? handleSort(column.accessor) : null}
                                    >
                                        <div className="rockops-table__th-content">
                                            <span>{column.header}</span>
                                            {column.sortable !== false && (
                                                <span className="rockops-table__sort-icon">
                                                    {sortField === column.accessor ? (
                                                        sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                                                    ) : (
                                                        <FaSort />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}

                                {/* Actions column if actions array is provided */}
                                {actions.length > 0 && (
                                    <th
                                        className="rockops-table__th rockops-table__th--actions"
                                        style={{
                                            textAlign: 'left',
                                            minWidth: actionsColumnWidth
                                        }}
                                        data-flex-weight={1}
                                    >
                                        <div className="rockops-table__th-content">
                                            <span>Actions</span>
                                        </div>
                                    </th>
                                )}
                            </tr>
                            </thead>

                            <tbody style={{ position: 'relative' }}>
                            {paginatedData.length === 0 ? (
                                <>
                                    <tr style={{ height: '200px' }}>
                                        {allColumns.map((_, index) => (
                                            <td key={index} style={{ border: 'none', padding: 0 }}></td>
                                        ))}
                                    </tr>
                                    {/* Empty State Overlay - Positioned absolutely over the tbody */}
                                    <div className="rockops-table__empty-overlay">
                                        <div className="rockops-table__empty">
                                            <p>{activeFiltersCount > 0 ? 'No results match your filters' : emptyMessage}</p>
                                            {activeFiltersCount > 0 && (
                                                <button className="rockops-table__btn rockops-table__btn--secondary" onClick={clearFilters}>
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                paginatedData.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className={`rockops-table__row ${onRowClick ? 'rockops-table__row--clickable' : ''}`}
                                        onClick={() => onRowClick && onRowClick(row)}
                                    >
                                        {columns.map((column, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className={`rockops-table__cell ${column.className || ''} ${isEmpty(getValue(row, column.accessor)) ? 'rockops-table__cell--empty' : ''}`}
                                                style={{
                                                    textAlign: column.align || 'left',
                                                    minWidth: column.minWidth || 'auto',
                                                    ...(column.cellStyle ? column.cellStyle(row, getValue(row, column.accessor)) : {})
                                                }}
                                                data-flex-weight={column.flexWeight || 1}
                                            >
                                                {column.render ? (
                                                    column.render(row, getValue(row, column.accessor))
                                                ) : (
                                                    getDisplayValue(row, column.accessor, column.accessor)
                                                )}
                                            </td>
                                        ))}

                                        {/* Actions column */}
                                        {actions.length > 0 && (
                                            <td
                                                className="rockops-table__cell rockops-table__cell--actions"
                                                style={{
                                                    textAlign: 'left',
                                                    minWidth: actionsColumnWidth
                                                }}
                                                data-flex-weight={1}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {actions.length > 2 ? (
                                                    // Dropdown menu for 3+ actions
                                                    <div className="rockops-table__actions">
                                                        <button
                                                            className="rockops-table__action-toggle"
                                                            onClick={(e) => toggleActionsMenu(e, rowIndex)}
                                                            aria-label="Toggle actions menu"
                                                        >
                                                            <FaEllipsisV />
                                                        </button>

                                                        {activeActionRow === rowIndex && (
                                                            <div className="rockops-table__actions-dropdown">
                                                                {actions.map((action, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        className={`rockops-table__action-item ${action.className || ''}`}
                                                                        onClick={(e) => handleActionClick(e, action, row)}
                                                                        disabled={action.isDisabled ? action.isDisabled(row) : false}
                                                                    >
                                                                        {action.icon && <span className="rockops-table__action-icon">{action.icon}</span>}
                                                                        <span>{action.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // Inline buttons for 1-2 actions
                                                    <div className="rockops-table__actions-inline">
                                                        {actions.map((action, idx) => (
                                                            <button
                                                                key={idx}
                                                                className={`rockops-table__action-button ${action.className || ''}`}
                                                                onClick={(e) => handleActionClick(e, action, row)}
                                                                disabled={action.isDisabled ? action.isDisabled(row) : false}
                                                                aria-label={action.label}
                                                                title={action.label}
                                                            >
                                                                {action.icon}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer with items per page and pagination */}
            <div className="rockops-table__footer">
                <div className="rockops-table__footer-left">
                    <div className="rockops-table__items-per-page">
                        <span>Items per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            {itemsPerPageOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="rockops-table__footer-right">
                    {/* Pagination */}
                    {sortedData.length > itemsPerPage && (
                        <div className="rockops-table__pagination-controls">
                            <button
                                className="rockops-table__pagination-btn"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>

                            <div className="rockops-table__pagination-numbers">
                                {getPageNumbers().map((pageNum, index) => (
                                    pageNum === '...' ? (
                                        <span key={`ellipsis-${index}`} className="rockops-table__pagination-btn rockops-table__pagination-btn--ellipsis">...</span>
                                    ) : (
                                        <button
                                            key={pageNum}
                                            className={`rockops-table__pagination-btn ${currentPage === pageNum ? 'rockops-table__pagination-btn--active' : ''}`}
                                            onClick={() => goToPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                ))}
                            </div>

                            <button
                                className="rockops-table__pagination-btn"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataTable;