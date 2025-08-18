// frontend/src/components/common/EmployeeSelector/EmployeeSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaUser, FaTimes } from 'react-icons/fa';
import './EmployeeSelector.scss';

const EmployeeSelector = ({
                              employees,
                              selectedEmployee,
                              onSelect,
                              placeholder = "Search employees...",
                              error = null,
                              disabled = false
                          }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState(employees);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setFilteredEmployees(employees);
    }, [employees]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = employees.filter(emp =>
                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.jobPositionName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredEmployees(filtered);
        } else {
            setFilteredEmployees(employees);
        }
    }, [searchTerm, employees]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEmployeeSelect = (employee) => {
        onSelect(employee);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClearSelection = () => {
        onSelect(null);
        setSearchTerm('');
        inputRef.current?.focus();
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    return (
        <div
            className={`employee-selector-component ${error ? 'employee-selector-has-error' : ''} ${disabled ? 'employee-selector-disabled' : ''}`}
            ref={dropdownRef}
        >
            <div className="employee-selector-input" onClick={handleInputClick}>
                {selectedEmployee ? (
                    <div className="employee-selector-selected-employee">
                        <div className="employee-selector-avatar">
                            <FaUser />
                        </div>
                        <div className="employee-selector-details">
                            <span className="employee-selector-name">
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                            </span>
                            <small className="employee-selector-info">
                                {selectedEmployee.jobPositionName} - {selectedEmployee.departmentName}
                            </small>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                className="employee-selector-clear-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearSelection();
                                }}
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="employee-selector-search-container">
                        <FaSearch className="employee-selector-search-icon" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleInputChange}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="employee-selector-search-input"
                        />
                    </div>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="employee-selector-dropdown-menu">
                    {filteredEmployees.length > 0 ? (
                        <div className="employee-selector-list">
                            {filteredEmployees.map(employee => (
                                <div
                                    key={employee.id}
                                    className="employee-selector-option"
                                    onClick={() => handleEmployeeSelect(employee)}
                                >
                                    <div className="employee-selector-option-avatar">
                                        <FaUser />
                                    </div>
                                    <div className="employee-selector-option-details">
                                        <div className="employee-selector-option-name">
                                            {employee.firstName} {employee.lastName}
                                        </div>
                                        <div className="employee-selector-option-info">
                                            <span className="employee-selector-position">{employee.jobPositionName}</span>
                                            <span className="employee-selector-department">{employee.departmentName}</span>
                                        </div>
                                        <div className="employee-selector-option-id">ID: {employee.employeeId}</div>
                                    </div>
                                    <div className="employee-selector-option-salary">
                                        {employee.monthlySalary && (
                                            <span className="employee-selector-salary">
                                                ${employee.monthlySalary.toLocaleString()}/mo
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="employee-selector-no-results">
                            <p className="employee-selector-no-results-text">No employees found</p>
                            {searchTerm && (
                                <small className="employee-selector-no-results-help">Try searching with different keywords</small>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeSelector;