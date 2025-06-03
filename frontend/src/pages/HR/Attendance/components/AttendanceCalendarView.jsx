import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Coffee, Plane } from 'lucide-react';

const AttendanceCalendarView = ({
                                    selectedDate,
                                    setSelectedDate,
                                    attendanceData,
                                    selectedEmployee,
                                    onEditAttendance,
                                    onQuickCheckIn,
                                    onQuickCheckOut
                                }) => {
    const [calendarDays, setCalendarDays] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(selectedDate);

    useEffect(() => {
        generateCalendarDays();
    }, [currentMonth, attendanceData, selectedEmployee]);

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Get first day of month and calculate offset
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

        const days = [];
        let currentDate = new Date(startDate);

        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const dayInfo = {
                date: new Date(currentDate),
                isCurrentMonth: currentDate.getMonth() === month,
                isToday: isToday(currentDate),
                isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
                attendanceRecord: getAttendanceForDate(currentDate),
                workingStatus: getWorkingStatus(currentDate)
            };

            days.push(dayInfo);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        setCalendarDays(days);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const getAttendanceForDate = (date) => {
        if (!attendanceData || !Array.isArray(attendanceData)) return null;

        return attendanceData.find(record => {
            const recordDate = new Date(record.date);
            return recordDate.toDateString() === date.toDateString();
        });
    };

    const getWorkingStatus = (date) => {
        if (!selectedEmployee || !selectedEmployee.jobPosition) {
            return 'unknown';
        }

        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const jobPosition = selectedEmployee.jobPosition;

        // Determine if it's a working day based on contract type and job settings
        switch (jobPosition.contractType) {
            case 'HOURLY':
                // Assume Monday-Friday for hourly workers (can be configurable)
                const workingDaysPerWeek = jobPosition.workingDaysPerWeek || 5;
                if (workingDaysPerWeek === 5) {
                    return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'working' : 'dayoff';
                } else if (workingDaysPerWeek === 6) {
                    return (dayOfWeek >= 1 && dayOfWeek <= 6) ? 'working' : 'dayoff';
                }
                return dayOfWeek === 0 ? 'dayoff' : 'working';

            case 'DAILY':
                // Check if weekends are included
                if (jobPosition.includesWeekends) {
                    return 'working';
                }
                return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'working' : 'dayoff';

            case 'MONTHLY':
                // Assume Monday-Friday for monthly workers
                return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'working' : 'dayoff';

            default:
                return 'working';
        }
    };

    const getAttendanceStatus = (dayInfo) => {
        const { attendanceRecord, workingStatus, date } = dayInfo;

        if (workingStatus === 'dayoff') {
            return 'dayoff';
        }

        if (!attendanceRecord) {
            // No record for a working day = absent
            if (workingStatus === 'working' && date <= new Date()) {
                return 'absent';
            }
            return 'nodata';
        }

        // Check if on leave
        if (attendanceRecord.isLeave || attendanceRecord.status === 'ON_LEAVE') {
            return 'leave';
        }

        // Determine status based on contract type
        switch (attendanceRecord.contractType) {
            case 'HOURLY':
                if (attendanceRecord.checkInTime && !attendanceRecord.checkOutTime) {
                    return 'checkedin';
                }
                if (attendanceRecord.checkInTime && attendanceRecord.checkOutTime) {
                    return attendanceRecord.isLate ? 'late' : 'present';
                }
                return 'absent';

            case 'DAILY':
                return attendanceRecord.dailyStatus === 'PRESENT' ? 'present' : 'absent';

            case 'MONTHLY':
                return attendanceRecord.status === 'PRESENT' ? 'present' : 'absent';

            default:
                return 'unknown';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present':
                return <CheckCircle className="status-icon present" size={16} />;
            case 'absent':
                return <XCircle className="status-icon absent" size={16} />;
            case 'late':
                return <Clock className="status-icon late" size={16} />;
            case 'checkedin':
                return <Clock className="status-icon checkedin" size={16} />;
            case 'leave':
                return <Plane className="status-icon leave" size={16} />;
            case 'dayoff':
                return <Coffee className="status-icon dayoff" size={16} />;
            default:
                return null;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'present': return 'Present';
            case 'absent': return 'Absent';
            case 'late': return 'Late';
            case 'checkedin': return 'Checked In';
            case 'leave': return 'On Leave';
            case 'dayoff': return 'Day Off';
            case 'nodata': return '';
            default: return '';
        }
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentMonth(newDate);
        setSelectedDate(newDate);
    };

    const handleDayClick = (dayInfo) => {
        if (dayInfo.workingStatus === 'working' && selectedEmployee) {
            if (dayInfo.attendanceRecord) {
                onEditAttendance(dayInfo.attendanceRecord);
            } else {
                // Create new attendance record
                onEditAttendance({
                    employeeId: selectedEmployee.id,
                    date: dayInfo.date.toISOString().split('T')[0],
                    contractType: selectedEmployee.jobPosition?.contractType || 'MONTHLY'
                });
            }
        }
    };

    const formatMonth = (date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (!selectedEmployee) {
        return (
            <div className="rockops-attendance-calendar-placeholder">
                <div className="rockops-attendance-placeholder-content">
                    <Clock size={48} className="rockops-attendance-placeholder-icon" />
                    <h3>Select an Employee</h3>
                    <p>Choose an employee from the filters to view their attendance calendar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rockops-attendance-calendar">
            {/* Calendar Header */}
            <div className="rockops-attendance-calendar-header">
                <div className="rockops-attendance-month-navigation">
                    <button
                        className="rockops-attendance-nav-btn"
                        onClick={() => navigateMonth(-1)}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <h2 className="rockops-attendance-month-title">{formatMonth(currentMonth)}</h2>

                    <button
                        className="rockops-attendance-nav-btn"
                        onClick={() => navigateMonth(1)}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="rockops-attendance-employee-info">
                    <img
                        src={selectedEmployee.photoUrl || '/default-avatar.png'}
                        alt={selectedEmployee.fullName}
                        className="rockops-attendance-employee-avatar"
                    />
                    <div className="rockops-attendance-employee-details">
                        <h3>{selectedEmployee.fullName}</h3>
                        <p>{selectedEmployee.jobPositionName} • {selectedEmployee.jobPosition?.contractType}</p>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="rockops-attendance-calendar-grid">
                <div className="rockops-attendance-week-header">
                    {weekDays.map(day => (
                        <div key={day} className="rockops-attendance-week-day-header">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="rockops-attendance-calendar-days">
                    {calendarDays.map((dayInfo, index) => {
                        const status = getAttendanceStatus(dayInfo);
                        const statusIcon = getStatusIcon(status);
                        const statusText = getStatusText(status);

                        return (
                            <div
                                key={index}
                                className={`rockops-attendance-calendar-day ${!dayInfo.isCurrentMonth ? 'rockops-attendance-other-month' : ''} ${dayInfo.isToday ? 'rockops-attendance-today' : ''} ${dayInfo.workingStatus === 'working' ? 'rockops-attendance-clickable' : ''} rockops-attendance-${status}`}
                                onClick={() => handleDayClick(dayInfo)}
                            >
                                <div className="rockops-attendance-day-number">
                                    {dayInfo.date.getDate()}
                                </div>
                                <div className="rockops-attendance-day-content">
                                    {statusIcon && (
                                        <div className="rockops-attendance-status-indicator">
                                            {statusIcon}
                                            <span className="rockops-attendance-status-text">{statusText}</span>
                                        </div>
                                    )}
                                    {dayInfo.attendanceRecord && (
                                        <div className="rockops-attendance-attendance-details">
                                            {dayInfo.attendanceRecord.checkInTime && (
                                                <div className="rockops-attendance-time-info">
                                                    <span className="rockops-attendance-check-time">
                                                        In: {dayInfo.attendanceRecord.checkInTime}
                                                    </span>
                                                    {dayInfo.attendanceRecord.checkOutTime && (
                                                        <span className="rockops-attendance-check-time">
                                                            Out: {dayInfo.attendanceRecord.checkOutTime}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {dayInfo.attendanceRecord.hoursWorked && (
                                                <div className="rockops-attendance-hours-worked">
                                                    {dayInfo.attendanceRecord.hoursWorked}h
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Calendar Legend */}
            <div className="rockops-attendance-calendar-legend">
                <h4>Status Legend</h4>
                <div className="rockops-attendance-legend-items">
                    <div className="rockops-attendance-legend-item">
                        <CheckCircle className="status-icon present" size={16} />
                        <span>Present</span>
                    </div>
                    <div className="rockops-attendance-legend-item">
                        <XCircle className="status-icon absent" size={16} />
                        <span>Absent</span>
                    </div>
                    <div className="rockops-attendance-legend-item">
                        <Clock className="status-icon late" size={16} />
                        <span>Late</span>
                    </div>
                    <div className="rockops-attendance-legend-item">
                        <Clock className="status-icon checkedin" size={16} />
                        <span>Checked In</span>
                    </div>
                    <div className="rockops-attendance-legend-item">
                        <Plane className="status-icon leave" size={16} />
                        <span>On Leave</span>
                    </div>
                    <div className="rockops-attendance-legend-item">
                        <Coffee className="status-icon dayoff" size={16} />
                        <span>Day Off</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendarView;