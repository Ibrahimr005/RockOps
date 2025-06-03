import React, { useState, useEffect, useMemo } from 'react';
import {
    LogIn,
    LogOut,
    Calendar,
    Users,
    Clock,
    Zap,
    ChevronDown,
    ChevronUp,
    Search,
    RefreshCw,
    Filter
} from 'lucide-react';
import { employeeService } from '../../../../services/employeeService';

const QuickActionPanel = ({
                              onQuickCheckIn,
                              onQuickCheckOut,
                              onBulkAction,
                              selectedDate,
                              loading
                          }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByContractType, setFilterByContractType] = useState('');
    const [employees, setEmployees] = useState([]);
    const [employeesByContract, setEmployeesByContract] = useState({
        HOURLY: [],
        DAILY: [],
        MONTHLY: []
    });
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [error, setError] = useState(null);

    // Fetch employees when component mounts or when expanded
    useEffect(() => {
        if (isExpanded && employees.length === 0) {
            fetchEmployees();
        }
    }, [isExpanded]);

    const fetchEmployees = async () => {
        try {
            setLoadingEmployees(true);
            setError(null);

            // Use the optimized grouped endpoint for better performance
            const response = await employeeService.getGroupedByContractType();
            const groupedData = response.data;

            // Flatten the grouped data for the employees array
            const allEmployees = Object.values(groupedData).flat();
            setEmployees(allEmployees);

            // Set the grouped data directly
            setEmployeesByContract({
                HOURLY: groupedData.HOURLY || [],
                DAILY: groupedData.DAILY || [],
                MONTHLY: groupedData.MONTHLY || []
            });
        } catch (error) {
            console.error('Error fetching employees:', error);
            setError('Failed to load employees. Please try again.');

            // Fallback to empty state
            setEmployees([]);
            setEmployeesByContract({
                HOURLY: [],
                DAILY: [],
                MONTHLY: []
            });
        } finally {
            setLoadingEmployees(false);
        }
    };

    const refreshEmployees = async () => {
        // Clear cache and refetch
        employeeService.cache.clear();
        await fetchEmployees();
    };

    // Filter employees based on search and contract type
    const filteredEmployees = useMemo(() => {
        return employees.filter(employee => {
            // Filter by search term
            const matchesSearch = !searchTerm ||
                employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                employee.jobPositionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                employee.siteName?.toLowerCase().includes(searchTerm.toLowerCase());

            // Filter by contract type
            const matchesContract = !filterByContractType ||
                employee.contractType === filterByContractType;

            // Only show active employees
            const isActive = employee.status === 'ACTIVE';

            return matchesSearch && matchesContract && isActive;
        });
    }, [employees, searchTerm, filterByContractType]);

    // Get filtered employees by contract type
    const filteredEmployeesByContract = useMemo(() => {
        const filtered = {
            HOURLY: [],
            DAILY: [],
            MONTHLY: []
        };

        filteredEmployees.forEach(employee => {
            const contractType = employee.contractType || 'MONTHLY';
            if (filtered[contractType]) {
                filtered[contractType].push(employee);
            }
        });

        return filtered;
    }, [filteredEmployees]);

    const handleEmployeeSelect = (employeeId, checked) => {
        setSelectedEmployees(prev =>
            checked
                ? [...prev, employeeId]
                : prev.filter(id => id !== employeeId)
        );
    };

    const handleSelectAll = (contractType) => {
        const employeeIds = filteredEmployeesByContract[contractType].map(emp => emp.id);
        setSelectedEmployees(prev => [...new Set([...prev, ...employeeIds])]);
    };

    const handleClearSelection = () => {
        setSelectedEmployees([]);
    };

    const handleBulkCheckIn = async () => {
        if (selectedEmployees.length === 0) return;

        try {
            await onBulkAction('checkIn', selectedEmployees);
            setSelectedEmployees([]);
        } catch (error) {
            console.error('Bulk check-in failed:', error);
        }
    };

    const handleGenerateMonthlyAttendance = async () => {
        const monthlyEmployeeIds = filteredEmployeesByContract.MONTHLY.map(emp => emp.id);
        if (monthlyEmployeeIds.length === 0) {
            return;
        }

        try {
            await onBulkAction('generateMonthly', monthlyEmployeeIds);
        } catch (error) {
            console.error('Monthly generation failed:', error);
        }
    };

    const QuickActionCard = ({ employee, contractType }) => {
        const isSelected = selectedEmployees.includes(employee.id);
        const canCheckIn = contractType === 'HOURLY' && employee.status === 'ACTIVE';

        return (
            <div className={`quick-action-card ${isSelected ? 'selected' : ''}`}>
                <div className="employee-quick-info">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleEmployeeSelect(employee.id, e.target.checked)}
                        className="employee-checkbox"
                    />
                    <img
                        src={employee.photoUrl || '/default-avatar.png'}
                        alt={employee.fullName}
                        className="employee-quick-avatar"
                        onError={(e) => {
                            e.target.src = '/default-avatar.png';
                        }}
                    />
                    <div className="employee-quick-details">
                        <span className="employee-quick-name">{employee.fullName}</span>
                        <span className="employee-quick-position">
                            {employee.jobPositionName} • {contractType}
                        </span>
                        <span className="employee-quick-site">
                            {employee.siteName}
                        </span>
                    </div>
                </div>

                {canCheckIn && (
                    <div className="employee-quick-actions">
                        <button
                            onClick={() => onQuickCheckIn(employee.id)}
                            disabled={loading}
                            className="quick-action-btn check-in"
                            title={`Check in ${employee.fullName}`}
                        >
                            <LogIn size={16} />
                        </button>
                        <button
                            onClick={() => onQuickCheckOut(employee.id)}
                            disabled={loading}
                            className="quick-action-btn check-out"
                            title={`Check out ${employee.fullName}`}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const ContractTypeSection = ({ contractType, employees, title }) => {
        if (employees.length === 0) return null;

        return (
            <div className="contract-group">
                <h4 className="contract-group-title">
                    {title} ({employees.length})
                    <button
                        onClick={() => handleSelectAll(contractType)}
                        className="select-all-btn"
                        title={`Select all ${title.toLowerCase()}`}
                    >
                        <Users size={14} />
                        Select All
                    </button>
                </h4>
                <div className="employee-cards">
                    {employees.map(employee => (
                        <QuickActionCard
                            key={employee.id}
                            employee={employee}
                            contractType={contractType}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="quick-action-panel">
            <div className="quick-action-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="quick-action-title">
                    <Zap size={20} />
                    <h3>Quick Actions</h3>
                    <span className="employee-count">
                        ({filteredEmployees.length} employees)
                    </span>
                    {error && (
                        <span className="error-indicator" title={error}>
                            ⚠️
                        </span>
                    )}
                </div>
                <div className="quick-action-header-actions">
                    {isExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                refreshEmployees();
                            }}
                            disabled={loadingEmployees}
                            className="refresh-btn"
                            title="Refresh employee data"
                        >
                            <RefreshCw size={16} className={loadingEmployees ? 'spinning' : ''} />
                        </button>
                    )}
                    <button className="expand-toggle">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="quick-action-content">
                    {loadingEmployees ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading employees...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p className="error-message">{error}</p>
                            <button onClick={fetchEmployees} className="retry-btn">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Search and Filters */}
                            <div className="quick-action-filters">
                                <div className="search-box">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search employees, positions, or sites..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                </div>

                                <div className="filter-box">
                                    <Filter size={16} />
                                    <select
                                        value={filterByContractType}
                                        onChange={(e) => setFilterByContractType(e.target.value)}
                                        className="contract-filter"
                                    >
                                        <option value="">All Contract Types</option>
                                        <option value="HOURLY">Hourly ({employeesByContract.HOURLY.length})</option>
                                        <option value="DAILY">Daily ({employeesByContract.DAILY.length})</option>
                                        <option value="MONTHLY">Monthly ({employeesByContract.MONTHLY.length})</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bulk Action Controls */}
                            {selectedEmployees.length > 0 && (
                                <div className="bulk-action-controls">
                                    <div className="selection-info">
                                        <span>{selectedEmployees.length} employee(s) selected</span>
                                        <button onClick={handleClearSelection} className="clear-selection">
                                            Clear Selection
                                        </button>
                                    </div>
                                    <div className="bulk-actions">
                                        <button
                                            onClick={handleBulkCheckIn}
                                            disabled={loading}
                                            className="bulk-action-btn primary"
                                        >
                                            <LogIn size={16} />
                                            Bulk Check In ({selectedEmployees.length})
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Action Buttons */}
                            <div className="quick-action-buttons">
                                {filteredEmployeesByContract.MONTHLY.length > 0 && (
                                    <button
                                        onClick={handleGenerateMonthlyAttendance}
                                        disabled={loading}
                                        className="quick-action-btn monthly-generate"
                                    >
                                        <Calendar size={16} />
                                        Generate Monthly Attendance ({filteredEmployeesByContract.MONTHLY.length})
                                    </button>
                                )}
                            </div>

                            {/* Employee Sections by Contract Type */}
                            <div className="employee-grid">
                                <ContractTypeSection
                                    contractType="HOURLY"
                                    employees={filteredEmployeesByContract.HOURLY}
                                    title="Hourly Employees"
                                />
                                <ContractTypeSection
                                    contractType="DAILY"
                                    employees={filteredEmployeesByContract.DAILY}
                                    title="Daily Employees"
                                />
                                <ContractTypeSection
                                    contractType="MONTHLY"
                                    employees={filteredEmployeesByContract.MONTHLY}
                                    title="Monthly Employees"
                                />
                            </div>

                            {filteredEmployees.length === 0 && !loadingEmployees && (
                                <div className="no-employees">
                                    <Users size={48} />
                                    <p>No active employees found</p>
                                    {(searchTerm || filterByContractType) && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilterByContractType('');
                                            }}
                                            className="clear-filters-btn"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuickActionPanel;