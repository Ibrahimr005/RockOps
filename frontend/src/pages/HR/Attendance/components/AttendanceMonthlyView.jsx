import React, { useState, useCallback } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import AttendanceCell from './AttendanceCell';
// import './AttendanceMonthlyView.scss';

const AttendanceMonthlyView = ({ monthlyData, onAttendanceUpdate, loading, month, year }) => {
    const [expandedEmployees, setExpandedEmployees] = useState(new Set());

    // Get days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Get day abbreviations for header
    const getDayAbbr = (day) => {
        const date = new Date(year, month - 1, day);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    };

    const toggleEmployeeExpand = (employeeId) => {
        setExpandedEmployees(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const getAttendanceForDay = (employee, day) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return employee.dailyAttendance.find(att => att.date === dateStr);
    };

    const renderEmployeeRow = (employee) => {
        const isExpanded = expandedEmployees.has(employee.employeeId);

        return (
            <div key={employee.employeeId} className="employee-attendance-row">
                <div className="employee-info-cell">
                    <button
                        className="expand-toggle"
                        onClick={() => toggleEmployeeExpand(employee.employeeId)}
                    >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                    <img
                        src={employee.employeePhoto || '/api/placeholder/32/32'}
                        alt={employee.employeeName}
                        className="employee-avatar"
                    />
                    <div className="employee-details">
                        <div className="employee-name">{employee.employeeName}</div>
                        <div className="employee-meta">
                            <span className="position">{employee.jobPosition}</span>
                            <span className="separator">•</span>
                            <span className={`contract-type ${employee.contractType?.toLowerCase()}`}>
                                {employee.contractType}
                            </span>
                        </div>
                    </div>
                    <div className="employee-stats">
                        <div className="stat">
                            <span className="stat-label">Present:</span>
                            <span className="stat-value">{employee.presentDays}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Absent:</span>
                            <span className="stat-value">{employee.absentDays}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Leave:</span>
                            <span className="stat-value">{employee.leaveDays}</span>
                        </div>
                        {employee.contractType !== 'DAILY' && (
                            <div className="stat">
                                <span className="stat-label">Hours:</span>
                                <span className="stat-value">{employee.totalHours?.toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="attendance-cells">
                    {monthDays.map(day => {
                        const attendance = getAttendanceForDay(employee, day);
                        return (
                            <AttendanceCell
                                key={day}
                                day={day}
                                attendance={attendance}
                                contractType={employee.contractType}
                                onUpdate={(updates) => {
                                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    onAttendanceUpdate(employee.employeeId, dateStr, updates);
                                }}
                                isExpanded={isExpanded}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="attendance-monthly-view">
            <div className="attendance-grid">
                <div className="attendance-header">
                    <div className="employee-info-header">Employee</div>
                    <div className="days-header">
                        {monthDays.map(day => (
                            <div key={day} className={`day-header ${getDayAbbr(day) === 'Sun' || getDayAbbr(day) === 'Sat' ? 'weekend' : ''}`}>
                                <div className="day-number">{day}</div>
                                <div className="day-name">{getDayAbbr(day)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="attendance-body">
                    {monthlyData.map(employee => renderEmployeeRow(employee))}
                </div>
            </div>

            {/* Legend */}
            <div className="attendance-legend">
                <div className="legend-item">
                    <span className="legend-color present"></span>
                    <span>Present</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color absent"></span>
                    <span>Absent</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color off"></span>
                    <span>Off Day</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color leave"></span>
                    <span>On Leave</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color late"></span>
                    <span>Late</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color half-day"></span>
                    <span>Half Day</span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceMonthlyView;