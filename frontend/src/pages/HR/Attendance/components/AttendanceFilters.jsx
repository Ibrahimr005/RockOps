import React, { useState, useEffect } from 'react';
import { Filter, Calendar, User, Building, Briefcase, RefreshCw } from 'lucide-react';

const AttendanceFilters = ({
                               filters,
                               setFilters,
                               employees,
                               selectedDate,
                               setSelectedDate
                           }) => {
    const [departments, setDepartments] = useState([]);
    const [sites, setSites] = useState([]);
    const [contractTypes] = useState(['HOURLY', 'DAILY', 'MONTHLY']);

    useEffect(() => {
        // Extract unique departments and sites from employees
        const uniqueDepartments = [...new Set(
            employees
                .filter(emp => emp.department?.name)
                .map(emp => ({
                    id: emp.department?.id || emp.department?.name,
                    name: emp.department?.name
                }))
        )].filter((dept, index, self) => 
            index === self.findIndex(d => d.id === dept.id)
        );

        const uniqueSites = [...new Set(
            employees
                .filter(emp => emp.site?.name)
                .map(emp => ({
                    id: emp.site?.id || emp.site?.name,
                    name: emp.site?.name
                }))
        )].filter((site, index, self) => 
            index === self.findIndex(s => s.id === site.id)
        );

        setDepartments(uniqueDepartments);
        setSites(uniqueSites);
    }, [employees]);

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const handleDateChange = (e) => {
        const newDate = new Date(e.target.value);
        setSelectedDate(newDate);
    };

    const resetFilters = () => {
        setFilters({
            employeeId: '',
            department: '',
            site: '',
            status: '',
            contractType: ''
        });
    };

    const getMonthRange = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        return {
            start: firstDay.toLocaleDateString(),
            end: lastDay.toLocaleDateString()
        };
    };

    return (
        <div className="rockops-attendance-filters">
            <div className="rockops-attendance-filters-header">
                <h3>
                    <Filter size={20} />
                    Filters
                </h3>
                <button
                    className="rockops-btn rockops-btn-tertiary rockops-attendance-reset-btn"
                    onClick={resetFilters}
                    title="Reset all filters"
                >
                    <RefreshCw size={16} />
                    Reset
                </button>
            </div>

            <div className="rockops-attendance-filters-grid">
                {/* Date Selection */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="date-filter">
                        <Calendar size={16} />
                        Date
                    </label>
                    <input
                        id="date-filter"
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="rockops-attendance-filter-input"
                    />
                    <div className="rockops-attendance-date-info">
                        Month: {getMonthRange().start} - {getMonthRange().end}
                    </div>
                </div>

                {/* Employee Selection */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="employee-filter">
                        <User size={16} />
                        Employee
                    </label>
                    <select
                        id="employee-filter"
                        value={filters.employeeId}
                        onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                        className="rockops-attendance-filter-select"
                    >
                        <option value="">All Employees</option>
                        {employees.map(employee => (
                            <option key={employee.id} value={employee.id}>
                                {employee.fullName} - {employee.jobPosition?.name || 'Unknown Position'}
                            </option>
                        ))}
                    </select>
                    {filters.employeeId && (
                        <div className="rockops-attendance-filter-info">
                            Showing individual calendar view
                        </div>
                    )}
                </div>

                {/* Department Filter */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="department-filter">
                        <Briefcase size={16} />
                        Department
                    </label>
                    <select
                        id="department-filter"
                        value={filters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        className="rockops-attendance-filter-select"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Site Filter */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="site-filter">
                        <Building size={16} />
                        Site
                    </label>
                    <select
                        id="site-filter"
                        value={filters.site}
                        onChange={(e) => handleFilterChange('site', e.target.value)}
                        className="rockops-attendance-filter-select"
                    >
                        <option value="">All Sites</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Contract Type Filter */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="contract-type-filter">
                        <Briefcase size={16} />
                        Contract Type
                    </label>
                    <select
                        id="contract-type-filter"
                        value={filters.contractType}
                        onChange={(e) => handleFilterChange('contractType', e.target.value)}
                        className="rockops-attendance-filter-select"
                    >
                        <option value="">All Contract Types</option>
                        {contractTypes.map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="rockops-attendance-filter-group">
                    <label htmlFor="status-filter">
                        Status
                    </label>
                    <select
                        id="status-filter"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="rockops-attendance-filter-select"
                    >
                        <option value="">All Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="checkedin">Checked In</option>
                        <option value="leave">On Leave</option>
                        <option value="holiday">Holiday</option>
                    </select>
                </div>
            </div>

            {/* Active Filters Summary */}
            {Object.values(filters).some(value => value !== '') && (
                <div className="rockops-attendance-active-filters">
                    <h4>Active Filters:</h4>
                    <div className="rockops-attendance-filter-tags">
                        {filters.employeeId && (
                            <span className="rockops-attendance-filter-tag">
                                Employee: {employees.find(emp => emp.id === filters.employeeId)?.fullName}
                                <button onClick={() => handleFilterChange('employeeId', '')}>×</button>
                            </span>
                        )}
                        {filters.department && (
                            <span className="rockops-attendance-filter-tag">
                                Department: {departments.find(dept => dept.id === filters.department)?.name}
                                <button onClick={() => handleFilterChange('department', '')}>×</button>
                            </span>
                        )}
                        {filters.site && (
                            <span className="rockops-attendance-filter-tag">
                                Site: {sites.find(site => site.id === filters.site)?.name}
                                <button onClick={() => handleFilterChange('site', '')}>×</button>
                            </span>
                        )}
                        {filters.contractType && (
                            <span className="rockops-attendance-filter-tag">
                                Contract: {filters.contractType}
                                <button onClick={() => handleFilterChange('contractType', '')}>×</button>
                            </span>
                        )}
                        {filters.status && (
                            <span className="rockops-attendance-filter-tag">
                                Status: {filters.status}
                                <button onClick={() => handleFilterChange('status', '')}>×</button>
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Filter Buttons */}
            <div className="quick-filters">
                <h4>Quick Filters:</h4>
                <div className="quick-filter-buttons">
                    <button
                        className={`quick-filter-btn ${filters.status === 'present' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('status', filters.status === 'present' ? '' : 'present')}
                    >
                        Present Only
                    </button>
                    <button
                        className={`quick-filter-btn ${filters.status === 'absent' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('status', filters.status === 'absent' ? '' : 'absent')}
                    >
                        Absent Only
                    </button>
                    <button
                        className={`quick-filter-btn ${filters.status === 'late' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('status', filters.status === 'late' ? '' : 'late')}
                    >
                        Late Only
                    </button>
                    <button
                        className={`quick-filter-btn ${filters.contractType === 'HOURLY' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('contractType', filters.contractType === 'HOURLY' ? '' : 'HOURLY')}
                    >
                        Hourly Workers
                    </button>
                    <button
                        className={`quick-filter-btn ${filters.contractType === 'DAILY' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('contractType', filters.contractType === 'DAILY' ? '' : 'DAILY')}
                    >
                        Daily Workers
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceFilters;