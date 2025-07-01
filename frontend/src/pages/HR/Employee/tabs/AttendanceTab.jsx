import React, { useState, useEffect } from 'react';
import { BsCalendarCheck, BsClockHistory, BsPersonCheck, BsClipboardData } from 'react-icons/bs';
import './AttendanceTab.scss';

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
        leaveDays: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [periodType, setPeriodType] = useState('month'); // 'month', 'week', 'custom'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [attendanceType, setAttendanceType] = useState('FULL_TIME'); // Default to FULL_TIME

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

    useEffect(() => {
        // Set job type from employee data if available
        if (employee && employee.jobPosition && employee.jobPosition.type) {
            setAttendanceType(employee.jobPosition.type.toUpperCase());
        }
    }, [employee]);

    useEffect(() => {
        // Update date range when period type or month/year changes
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
    }, [periodType, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchAttendanceData();
    }, [employee, dateRange]);

    const fetchAttendanceData = async () => {
        if (!employee || !employee.id) return;

        try {
            setIsLoading(true);
            setError(null);

            const { startDate, endDate } = dateRange;

            // Fetch attendance data for the employee
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8080/api/v1/attendance/employee/${employee.id}/monthly?year=${selectedYear}&month=${selectedMonth}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            // Process the attendance data
            if (data && Array.isArray(data)) {
                // Sort by date (newest first)
                const sortedData = [...data].sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                );

                setAttendanceData(sortedData);

                // Calculate statistics
                const totalDays = sortedData.length;
                const presentDays = sortedData.filter(r => r.status === 'PRESENT').length;
                const absentDays = sortedData.filter(r => r.status === 'ABSENT').length;
                const lateDays = sortedData.filter(r => r.status === 'LATE').length;
                const leaveDays = sortedData.filter(r => r.status === 'ON_LEAVE').length;

                // Calculate average hours for hourly employees
                let avgHours = 8.0; // Default for full-time

                if (attendanceType === 'HOURLY') {
                    const hourlyRecords = sortedData.filter(r => r.startTime && r.endTime);
                    if (hourlyRecords.length > 0) {
                        const totalHours = hourlyRecords.reduce((sum, record) => {
                            const start = new Date(`2000-01-01T${record.startTime}`);
                            const end = new Date(`2000-01-01T${record.endTime}`);
                            const diffHours = (end - start) / (1000 * 60 * 60);
                            return sum + diffHours;
                        }, 0);

                        avgHours = totalHours / hourlyRecords.length;
                    }
                }

                setAttendanceStats({
                    daysPresent: presentDays,
                    totalWorkDays: totalDays,
                    absentDays: absentDays,
                    lateDays: lateDays,
                    leaveDays: leaveDays,
                    punctuality: presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 0,
                    averageHours: avgHours,
                    daysWorked: presentDays + lateDays
                });
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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

    // Format time for display (either from string or null)
    const formatTime = (timeString) => {
        if (!timeString) return '-';

        // If time string is in format "HH:MM:SS"
        if (timeString.split(':').length === 3) {
            return timeString.substring(0, 5);
        }

        return timeString;
    };

    // Get status badge based on status
    const getStatusBadge = (status) => {
        let badgeClass = '';
        let statusText = status || 'Unknown';

        switch (status) {
            case 'PRESENT':
                badgeClass = 'present';
                statusText = 'Present';
                break;
            case 'ABSENT':
                badgeClass = 'absent';
                statusText = 'Absent';
                break;
            case 'LATE':
                badgeClass = 'late';
                statusText = 'Late';
                break;
            case 'HALF_DAY':
                badgeClass = 'half-day';
                statusText = 'Half Day';
                break;
            case 'ON_LEAVE':
                badgeClass = 'leave';
                statusText = 'On Leave';
                break;
            default:
                badgeClass = 'unknown';
                break;
        }

        return <span className={`status-badge ${badgeClass}`}>{statusText}</span>;
    };

    // Calculate percentage for attendance
    const calculateAttendancePercentage = () => {
        if (attendanceStats.totalWorkDays === 0) return 0;
        return ((attendanceStats.daysPresent / attendanceStats.totalWorkDays) * 100).toFixed(1);
    };

    // Calculate percentage for punctuality
    const calculatePunctualityPercentage = () => {
        if (attendanceStats.daysPresent + attendanceStats.lateDays === 0) return 0;
        return (((attendanceStats.daysPresent) / (attendanceStats.daysPresent + attendanceStats.lateDays)) * 100).toFixed(1);
    };

    // Render different attendance records based on job type
    const renderAttendanceTable = () => {
        if (attendanceData.length === 0) {
            return (
                <div className="no-records">
                    <p>No attendance records found for the selected period.</p>
                </div>
            );
        }

        // Find the record closest to today
        const today = new Date();
        let mostRecentRecord = attendanceData.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.date) - today);
            const currDiff = Math.abs(new Date(curr.date) - today);
            return currDiff < prevDiff ? curr : prev;
        }, attendanceData[0]);
        const recordsToShow = [mostRecentRecord];

        if (attendanceType === 'HOURLY') {
            return (
                <table className="attendance-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Hours</th>
                        <th>Overtime</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recordsToShow.map((record, index) => (
                        <tr key={index}>
                            <td>{formatDate ? formatDate(record.date) : new Date(record.date).toLocaleDateString()}</td>
                            <td>{formatTime(record.startTime)}</td>
                            <td>{formatTime(record.endTime)}</td>
                            <td>
                                {record.startTime && record.endTime ?
                                    calculateHours(record.startTime, record.endTime) :
                                    '-'}
                            </td>
                            <td>{record.overtimeHours ? `${record.overtimeHours}h` : '-'}</td>
                            <td>{record.notes || '-'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            );
        } else if (attendanceType === 'DAILY') {
            return (
                <table className="attendance-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recordsToShow.map((record, index) => (
                        <tr key={index}>
                            <td>{formatDate ? formatDate(record.date) : new Date(record.date).toLocaleDateString()}</td>
                            <td>{getStatusBadge(record.status)}</td>
                            <td>{record.notes || '-'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            );
        } else {
            // Default for FULL_TIME
            return (
                <table className="attendance-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recordsToShow.map((record, index) => {
                        const date = new Date(record.date);
                        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

                        return (
                            <tr key={index}>
                                <td>{formatDate ? formatDate(record.date) : date.toLocaleDateString()}</td>
                                <td>{dayOfWeek}</td>
                                <td>{getStatusBadge(record.status)}</td>
                                <td>{record.notes || '-'}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            );
        }
    };

    // Helper function to calculate hours between two time strings
    const calculateHours = (startTime, endTime) => {
        const startParts = startTime.split(':').map(Number);
        const endParts = endTime.split(':').map(Number);

        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];

        // Calculate difference in minutes
        let diffMinutes = endMinutes - startMinutes;

        // If end time is earlier than start time, assume it spans to the next day
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }

        // Convert to hours with one decimal place
        return (diffMinutes / 60).toFixed(1) + 'h';
    };

    // Render the attendance metrics
    const renderAttendanceMetrics = () => {
        return (
            <div className="attendance-metrics">
                <div className="metric-card">
                    <div className="metric-icon">
                        <BsCalendarCheck />
                    </div>
                    <div className="metric-content">
                        <div className="metric-title">Attendance</div>
                        <div className="metric-value">{calculateAttendancePercentage()}%</div>
                        <div className="metric-details">
                            <span>{attendanceStats.daysPresent} of {attendanceStats.totalWorkDays} days</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">
                        <BsClockHistory />
                    </div>
                    <div className="metric-content">
                        <div className="metric-title">Punctuality</div>
                        <div className="metric-value">{calculatePunctualityPercentage()}%</div>
                        <div className="metric-details">
                            <span>{attendanceStats.lateDays} late days</span>
                        </div>
                    </div>
                </div>

                {attendanceType === 'HOURLY' ? (
                    <div className="metric-card">
                        <div className="metric-icon">
                            <BsClipboardData />
                        </div>
                        <div className="metric-content">
                            <div className="metric-title">Hours</div>
                            <div className="metric-value">{attendanceStats.averageHours.toFixed(1)}h</div>
                            <div className="metric-details">
                                <span>Avg. per day</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="metric-card">
                        <div className="metric-icon">
                            <BsPersonCheck />
                        </div>
                        <div className="metric-content">
                            <div className="metric-title">Leaves</div>
                            <div className="metric-value">{attendanceStats.leaveDays}</div>
                            <div className="metric-details">
                                <span>Days this period</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="attendance-tab">
            <div className="attendance-header">
                <h3>Attendance Records</h3>
                <div className="employee-type">
                    <span className="type-label">Contract:</span>
                    <span className="type-value">{attendanceType.replace('_', ' ')}</span>
                </div>
            </div>

            <div className="period-selector">
                <div className="period-tabs">
                    <button
                        className={`period-tab ${periodType === 'month' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('month')}
                    >
                        Monthly
                    </button>
                    <button
                        className={`period-tab ${periodType === 'week' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('week')}
                    >
                        Weekly
                    </button>
                    <button
                        className={`period-tab ${periodType === 'custom' ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('custom')}
                    >
                        Custom Range
                    </button>
                </div>

                <div className="period-options">
                    {periodType === 'month' && (
                        <div className="month-selector">
                            <div className="form-group">
                                <select value={selectedMonth} onChange={handleMonthChange}>
                                    {months.map(month => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
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
                        <div className="date-range-selector">
                            <div className="form-group">
                                <label>From:</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={dateRange.startDate}
                                    onChange={handleDateRangeChange}
                                    max={dateRange.endDate}
                                />
                            </div>
                            <div className="form-group">
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
                                className="apply-btn"
                                onClick={fetchAttendanceData}
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="loader"></div>
                    <p>Loading attendance data...</p>
                </div>
            ) : error ? (
                <div className="error-container">
                    <p>Error: {error}</p>
                    <button onClick={fetchAttendanceData}>Try Again</button>
                </div>
            ) : (
                <>
                    {renderAttendanceMetrics()}

                    <div className="attendance-details">
                        <h4>Recent Attendance</h4>
                        <div className="table-container">
                            {renderAttendanceTable()}
                        </div>
                    </div>

                    <div className="view-all-link">
                        <a href={`/attendance/${employee.id}`} target="_blank" rel="noopener noreferrer">
                            View Complete Attendance History
                        </a>
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceTab;