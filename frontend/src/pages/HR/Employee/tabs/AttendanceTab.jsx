import React, { useState, useEffect } from 'react';
import { BsCalendarCheck, BsClockHistory, BsPersonCheck, BsClipboardData } from 'react-icons/bs';

import './AttendanceTab.scss';
import {useSnackbar} from "../../../../contexts/SnackbarContext.jsx";
import {attendanceService} from "../../../../services/hr/attendanceService.js";

const AttendanceTab = ({ employee, formatDate }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState({
        daysPresent: 0,
        totalWorkDays: 0,
        punctuality: 0,
        averageHours: 0,
        daysWorked: 0,
        absentDays: 0,
        lateDays: 0,
        leaveDays: 0,
        halfDays: 0,
        earlyOuts: 0,
        totalHours: 0,
        overtimeHours: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [periodType, setPeriodType] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [contractType, setContractType] = useState('MONTHLY');

    const { showError } = useSnackbar();

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

    // Initialize contract type from employee data
    useEffect(() => {
        if (employee?.jobPosition) {
            const jobContractType = employee.jobPosition.contractType || employee.jobPosition.type || 'MONTHLY';
            setContractType(jobContractType.toUpperCase());
        }
    }, [employee]);

    // Update date range when period type or month/year changes
    useEffect(() => {
        updateDateRange();
    }, [periodType, selectedMonth, selectedYear]);

    // Fetch attendance data when employee or date range changes
    useEffect(() => {
        if (employee?.id) {
            fetchAttendanceData();
        }
    }, [employee, dateRange, selectedMonth, selectedYear]);

    const updateDateRange = () => {
        if (periodType === 'month') {
            const startDate = new Date(selectedYear, selectedMonth - 1, 1);
            const endDate = new Date(selectedYear, selectedMonth, 0);
            setDateRange({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
        } else if (periodType === 'week') {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            setDateRange({
                startDate: startOfWeek.toISOString().split('T')[0],
                endDate: endOfWeek.toISOString().split('T')[0]
            });
        }
    };

    const fetchAttendanceData = async () => {
        if (!employee?.id) return;

        try {
            setIsLoading(true);
            setError(null);

            let response;

            if (periodType === 'month') {
                // Use monthly endpoint for better performance
                response = await attendanceService.getEmployeeMonthlyAttendance(
                    employee.id,
                    selectedYear,
                    selectedMonth
                );
            } else {
                // Use date range endpoint for custom periods
                response = await attendanceService.getEmployeeAttendance(
                    employee.id,
                    dateRange.startDate,
                    dateRange.endDate
                );
            }

            const data = response.data;

            if (data && Array.isArray(data)) {
                // Sort by date (newest first)
                const sortedData = [...data].sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                );

                setAttendanceData(sortedData);
                calculateAttendanceStats(sortedData);
            } else {
                setAttendanceData([]);
                resetAttendanceStats();
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch attendance data';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const resetAttendanceStats = () => {
        setAttendanceStats({
            daysPresent: 0,
            totalWorkDays: 0,
            punctuality: 0,
            averageHours: 0,
            daysWorked: 0,
            absentDays: 0,
            lateDays: 0,
            leaveDays: 0,
            halfDays: 0,
            earlyOuts: 0,
            totalHours: 0,
            overtimeHours: 0
        });
    };

    const calculateAttendanceStats = (data) => {
        if (!data || data.length === 0) {
            resetAttendanceStats();
            return;
        }

        const totalDays = data.length;
        const presentDays = data.filter(r => r.status === 'PRESENT').length;
        const absentDays = data.filter(r => r.status === 'ABSENT').length;
        const lateDays = data.filter(r => r.status === 'LATE').length;
        const leaveDays = data.filter(r => r.status === 'ON_LEAVE').length;
        const halfDays = data.filter(r => r.status === 'HALF_DAY').length;
        const earlyOuts = data.filter(r => r.status === 'EARLY_OUT').length;

        let totalHours = 0;
        let overtimeHours = 0;
        let avgHours = 8.0;

        if (contractType === 'HOURLY') {
            const hourlyRecords = data.filter(r => r.hoursWorked != null);
            if (hourlyRecords.length > 0) {
                totalHours = hourlyRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
                overtimeHours = hourlyRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
                avgHours = totalHours / hourlyRecords.length;
            }
        } else if (contractType === 'MONTHLY') {
            const timeRecords = data.filter(r => r.checkIn && r.checkOut);
            if (timeRecords.length > 0) {
                totalHours = timeRecords.reduce((sum, record) => {
                    const hours = calculateHoursFromTimes(record.checkIn, record.checkOut);
                    return sum + hours;
                }, 0);
                avgHours = totalHours / timeRecords.length;
                overtimeHours = timeRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
            }
        } else if (contractType === 'DAILY') {
            const workingDays = presentDays + lateDays + halfDays;
            totalHours = workingDays * 8;
            avgHours = 8.0;
        }

        const workingDays = presentDays + lateDays + halfDays + earlyOuts;

        setAttendanceStats({
            daysPresent: presentDays,
            totalWorkDays: totalDays,
            absentDays: absentDays,
            lateDays: lateDays,
            leaveDays: leaveDays,
            halfDays: halfDays,
            earlyOuts: earlyOuts,
            punctuality: workingDays > 0 ? ((presentDays) / workingDays) * 100 : 0,
            averageHours: avgHours,
            daysWorked: workingDays,
            totalHours: totalHours,
            overtimeHours: overtimeHours
        });
    };

    const handlePeriodChange = (type) => {
        setPeriodType(type);
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(parseInt(e.target.value));
    };

    const handleYearChange = (e) => {
        setSelectedYear(parseInt(e.target.value));
    };

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleApplyCustomRange = () => {
        if (dateRange.startDate && dateRange.endDate) {
            fetchAttendanceData();
        } else {
            showError('Please select both start and end dates');
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '-';

        if (typeof timeString === 'string' && timeString.includes(':')) {
            const parts = timeString.split(':');
            return `${parts[0]}:${parts[1]}`;
        }

        return timeString;
    };

    const calculateHoursFromTimes = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0;

        try {
            const start = new Date(`1970-01-01T${checkIn}`);
            const end = new Date(`1970-01-01T${checkOut}`);

            let diffHours = (end - start) / (1000 * 60 * 60);

            if (diffHours < 0) {
                diffHours += 24;
            }

            return Math.round(diffHours * 100) / 100;
        } catch (error) {
            console.error('Error calculating hours:', error);
            return 0;
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'PRESENT': { class: 'present', text: 'Present', icon: '✓' },
            'ABSENT': { class: 'absent', text: 'Absent', icon: '✗' },
            'LATE': { class: 'late', text: 'Late', icon: '⏰' },
            'HALF_DAY': { class: 'half-day', text: 'Half Day', icon: '◐' },
            'ON_LEAVE': { class: 'leave', text: 'On Leave', icon: '📋' },
            'EARLY_OUT': { class: 'early-out', text: 'Early Out', icon: '⏰' },
            'OFF': { class: 'off', text: 'Off', icon: '🏠' }
        };

        const config = statusConfig[status] || { class: 'unknown', text: status || 'Unknown', icon: '?' };

        return (
            <span className={`attendance-tab-status-badge ${config.class}`}>
                <span className="status-icon">{config.icon}</span>
                <span className="status-text">{config.text}</span>
            </span>
        );
    };

    const calculateAttendancePercentage = () => {
        if (attendanceStats.totalWorkDays === 0) return 0;
        return ((attendanceStats.daysWorked / attendanceStats.totalWorkDays) * 100).toFixed(1);
    };

    const calculatePunctualityPercentage = () => {
        if (attendanceStats.daysWorked === 0) return 0;
        return (((attendanceStats.daysPresent) / attendanceStats.daysWorked) * 100).toFixed(1);
    };

    const getTodayAttendanceRecords = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        return attendanceData.filter(record => {
            const recordDate = record.date.split('T')[0];
            return recordDate === todayStr;
        });
    };

    const renderAttendanceTable = (records = attendanceData.slice(0, 5)) => {
        if (records.length === 0) {
            return (
                <div className="attendance-tab-no-records">
                    <p>No attendance records found for the selected period.</p>
                </div>
            );
        }

        if (contractType === 'HOURLY') {
            return (
                <table className="attendance-tab-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Hours Worked</th>
                        <th>Expected</th>
                        <th>Overtime</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => (
                        <tr key={`${record.date}-${index}`}>
                            <td>{formatDate ? formatDate(record.date) : new Date(record.date).toLocaleDateString()}</td>
                            <td>{getStatusBadge(record.status)}</td>
                            <td>{formatTime(record.checkIn)}</td>
                            <td>{formatTime(record.checkOut)}</td>
                            <td className="attendance-tab-hours-cell">
                                {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                            </td>
                            <td className="attendance-tab-hours-cell">
                                {record.expectedHours ? `${record.expectedHours}h` : '-'}
                            </td>
                            <td className="attendance-tab-overtime-cell">
                                {record.overtimeHours ? `${record.overtimeHours}h` : '-'}
                            </td>
                            <td className="attendance-tab-notes-cell">{record.notes || '-'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            );
        } else if (contractType === 'MONTHLY') {
            return (
                <table className="attendance-tab-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Working Hours</th>
                        <th>Overtime</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const date = new Date(record.date);
                        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const workingHours = calculateHoursFromTimes(record.checkIn, record.checkOut);

                        return (
                            <tr key={`${record.date}-${index}`}>
                                <td>{formatDate ? formatDate(record.date) : date.toLocaleDateString()}</td>
                                <td>{dayOfWeek}</td>
                                <td>{getStatusBadge(record.status)}</td>
                                <td>{formatTime(record.checkIn)}</td>
                                <td>{formatTime(record.checkOut)}</td>
                                <td className="attendance-tab-hours-cell">
                                    {workingHours > 0 ? `${workingHours}h` : '-'}
                                </td>
                                <td className="attendance-tab-overtime-cell">
                                    {record.overtimeHours ? `${record.overtimeHours}h` : '-'}
                                </td>
                                <td className="attendance-tab-notes-cell">{record.notes || '-'}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            );
        } else {
            return (
                <table className="attendance-tab-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Day Type</th>
                        <th>Leave Type</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((record, index) => {
                        const date = new Date(record.date);
                        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

                        return (
                            <tr key={`${record.date}-${index}`}>
                                <td>{formatDate ? formatDate(record.date) : date.toLocaleDateString()}</td>
                                <td>{dayOfWeek}</td>
                                <td>{getStatusBadge(record.status)}</td>
                                <td>{record.dayType || 'WORKING_DAY'}</td>
                                <td>{record.leaveType || '-'}</td>
                                <td className="attendance-tab-notes-cell">{record.notes || '-'}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            );
        }
    };

    const renderAttendanceMetrics = () => {
        return (
            <div className="attendance-tab-metrics">
                <div className="attendance-tab-metric-card">
                    <div className="attendance-tab-metric-icon">
                        <BsCalendarCheck />
                    </div>
                    <div className="attendance-tab-metric-content">
                        <div className="attendance-tab-metric-title">Attendance</div>
                        <div className="attendance-tab-metric-value">{calculateAttendancePercentage()}%</div>
                        <div className="attendance-tab-metric-details">
                            <span>{attendanceStats.daysWorked} of {attendanceStats.totalWorkDays} days</span>
                            <small>Present: {attendanceStats.daysPresent} | Absent: {attendanceStats.absentDays}</small>
                        </div>
                    </div>
                </div>

                <div className="attendance-tab-metric-card">
                    <div className="attendance-tab-metric-icon">
                        <BsClockHistory />
                    </div>
                    <div className="attendance-tab-metric-content">
                        <div className="attendance-tab-metric-title">Punctuality</div>
                        <div className="attendance-tab-metric-value">{calculatePunctualityPercentage()}%</div>
                        <div className="attendance-tab-metric-details">
                            <span>{attendanceStats.lateDays} late days</span>
                            {attendanceStats.earlyOuts > 0 && (
                                <small>Early outs: {attendanceStats.earlyOuts}</small>
                            )}
                        </div>
                    </div>
                </div>

                {(contractType === 'HOURLY' || contractType === 'MONTHLY') ? (
                    <div className="attendance-tab-metric-card">
                        <div className="attendance-tab-metric-icon">
                            <BsClipboardData />
                        </div>
                        <div className="attendance-tab-metric-content">
                            <div className="attendance-tab-metric-title">Working Hours</div>
                            <div className="attendance-tab-metric-value">{attendanceStats.averageHours.toFixed(1)}h</div>
                            <div className="attendance-tab-metric-details">
                                <span>Avg. per day</span>
                                <small>Total: {attendanceStats.totalHours.toFixed(1)}h</small>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="attendance-tab-metric-card">
                        <div className="attendance-tab-metric-icon">
                            <BsPersonCheck />
                        </div>
                        <div className="attendance-tab-metric-content">
                            <div className="attendance-tab-metric-title">Leave Days</div>
                            <div className="attendance-tab-metric-value">{attendanceStats.leaveDays}</div>
                            <div className="attendance-tab-metric-details">
                                <span>This period</span>
                                {attendanceStats.halfDays > 0 && (
                                    <small>Half days: {attendanceStats.halfDays}</small>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {attendanceStats.overtimeHours > 0 && (
                    <div className="attendance-tab-metric-card attendance-tab-overtime-card">
                        <div className="attendance-tab-metric-icon">
                            <BsClockHistory />
                        </div>
                        <div className="attendance-tab-metric-content">
                            <div className="attendance-tab-metric-title">Overtime</div>
                            <div className="attendance-tab-metric-value">{attendanceStats.overtimeHours.toFixed(1)}h</div>
                            <div className="attendance-tab-metric-details">
                                <span>Extra hours</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const todayRecords = getTodayAttendanceRecords();

    if (!employee) {
        return (
            <div className="attendance-tab">
                <div className="attendance-tab-no-employee">
                    <p>No employee data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="attendance-tab">
            <div className="attendance-tab-header">
                <h3>Attendance Records</h3>
                <div className="attendance-tab-contract-info">
                    <span className="attendance-tab-contract-label">Contract:</span>
                    <span className="attendance-tab-contract-value">{contractType.replace('_', ' ')}</span>
                    {employee.jobPosition?.startTime && employee.jobPosition?.endTime && (
                        <span className="attendance-tab-schedule-info">
                            Schedule: {formatTime(employee.jobPosition.startTime)} - {formatTime(employee.jobPosition.endTime)}
                        </span>
                    )}
                </div>
            </div>

            <div className="attendance-tab-period-selector">
                <div className="attendance-tab-period-tabs">
                    <button
                        className={`attendance-tab-period-tab ${periodType === 'month' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('month')}
                    >
                        Monthly
                    </button>
                    <button
                        className={`attendance-tab-period-tab ${periodType === 'week' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('week')}
                    >
                        Weekly
                    </button>
                    <button
                        className={`attendance-tab-period-tab ${periodType === 'custom' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('custom')}
                    >
                        Custom Range
                    </button>
                </div>

                <div className="attendance-tab-period-options">
                    {periodType === 'month' && (
                        <div className="attendance-tab-month-selector">
                            <div className="attendance-tab-form-group">
                                <select value={selectedMonth} onChange={handleMonthChange}>
                                    {months.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="attendance-tab-form-group">
                                <select value={selectedYear} onChange={handleYearChange}>
                                    {years.map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {periodType === 'custom' && (
                        <div className="attendance-tab-date-range-selector">
                            <div className="attendance-tab-form-group">
                                <label>From:</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={dateRange.startDate}
                                    onChange={handleDateRangeChange}
                                    max={dateRange.endDate}
                                />
                            </div>
                            <div className="attendance-tab-form-group">
                                <label>To:</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={dateRange.endDate}
                                    onChange={handleDateRangeChange}
                                    min={dateRange.startDate}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <button
                                className="attendance-tab-apply-btn"
                                onClick={handleApplyCustomRange}
                                disabled={!dateRange.startDate || !dateRange.endDate}
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="attendance-tab-loading-container">
                    <div className="loader"></div>
                    <p>Loading attendance data...</p>
                </div>
            ) : error ? (
                <div className="attendance-tab-error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchAttendanceData}>Try Again</button>
                </div>
            ) : (
                <>
                    {renderAttendanceMetrics()}

                    {todayRecords.length > 0 && (
                        <div className="attendance-tab-today-attendance">
                            <h4>Today's Attendance</h4>
                            <div className="attendance-tab-table-container">
                                {renderAttendanceTable(todayRecords)}
                            </div>
                        </div>
                    )}

                    <div className="attendance-tab-details">
                        <h4>Recent Attendance</h4>
                        <div className="attendance-tab-table-container">
                            {renderAttendanceTable()}
                        </div>
                        {attendanceData.length > 5 && (
                            <div className="attendance-tab-table-footer">
                                <small>Showing {Math.min(5, attendanceData.length)} of {attendanceData.length} records</small>
                            </div>
                        )}
                    </div>

                    <div className="attendance-tab-view-all-link">
                        <a href={`/attendance/${employee.id}`} target="_blank" rel="noopener noreferrer">
                            View Complete Attendance History →
                        </a>
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceTab;