import React from 'react';
import {
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Calendar,
    DollarSign,
    Target,
    AlertTriangle
} from 'lucide-react';

const AttendanceStats = ({ stats, employee }) => {
    if (!stats || !employee) {
        return null;
    }

    const getContractTypeStats = () => {
        switch (employee.jobPosition?.contractType) {
            case 'HOURLY':
                return {
                    primary: {
                        label: 'Total Hours',
                        value: stats.totalHours || 0,
                        unit: 'hrs',
                        icon: Clock,
                        color: 'primary'
                    },
                    secondary: [
                        {
                            label: 'Days Worked',
                            value: stats.daysWorked || 0,
                            unit: 'days',
                            icon: Calendar
                        },
                        {
                            label: 'Overtime Hours',
                            value: stats.totalOvertimeHours || 0,
                            unit: 'hrs',
                            icon: TrendingUp
                        },
                        {
                            label: 'Late Days',
                            value: stats.lateDays || 0,
                            unit: 'days',
                            icon: AlertTriangle
                        },
                        {
                            label: 'Avg Hours/Day',
                            value: stats.averageHoursPerDay || 0,
                            unit: 'hrs',
                            icon: Target
                        }
                    ]
                };

            case 'DAILY':
                return {
                    primary: {
                        label: 'Present Days',
                        value: stats.presentDays || 0,
                        unit: 'days',
                        icon: CheckCircle,
                        color: 'success'
                    },
                    secondary: [
                        {
                            label: 'Absent Days',
                            value: stats.absentDays || 0,
                            unit: 'days',
                            icon: XCircle
                        },
                        {
                            label: 'Leave Days',
                            value: stats.leaveDays || 0,
                            unit: 'days',
                            icon: Calendar
                        },
                        {
                            label: 'Attendance Rate',
                            value: stats.attendancePercentage || 0,
                            unit: '%',
                            icon: Target
                        }
                    ]
                };

            case 'MONTHLY':
                return {
                    primary: {
                        label: 'Attendance Rate',
                        value: stats.attendancePercentage || 0,
                        unit: '%',
                        icon: Target,
                        color: 'success'
                    },
                    secondary: [
                        {
                            label: 'Present Days',
                            value: stats.presentDays || 0,
                            unit: 'days',
                            icon: CheckCircle
                        },
                        {
                            label: 'Absent Days',
                            value: stats.absentDays || 0,
                            unit: 'days',
                            icon: XCircle
                        },
                        {
                            label: 'Late Days',
                            value: stats.lateDays || 0,
                            unit: 'days',
                            icon: AlertTriangle
                        },
                        {
                            label: 'Leave Days',
                            value: stats.leaveDays || 0,
                            unit: 'days',
                            icon: Calendar
                        }
                    ]
                };

            default:
                return { primary: null, secondary: [] };
        }
    };

    const formatValue = (value, unit) => {
        if (typeof value === 'number') {
            if (unit === '%') {
                return `${value.toFixed(1)}%`;
            } else if (unit === 'hrs') {
                return `${value.toFixed(1)}${unit}`;
            } else {
                return `${Math.round(value)}${unit}`;
            }
        }
        return `${value}${unit}`;
    };

    const getAttendanceRateColor = (rate) => {
        if (rate >= 95) return 'success';
        if (rate >= 85) return 'warning';
        return 'danger';
    };

    const contractStats = getContractTypeStats();

    return (
        <div className="rockops-attendance-stats">
            <div className="rockops-attendance-stats-header">
                <div className="rockops-attendance-employee-summary">
                    <img
                        src={employee.photoUrl || '/default-avatar.png'}
                        alt={employee.fullName}
                        className="rockops-attendance-employee-avatar"
                    />
                    <div className="rockops-attendance-employee-info">
                        <h3>{employee.fullName}</h3>
                        <p>{employee.jobPositionName}</p>
                        <span className="rockops-attendance-contract-badge">
                            {employee.jobPosition?.contractType} Contract
                        </span>
                    </div>
                </div>

                <div className="rockops-attendance-period-info">
                    <Calendar size={16} />
                    <span>
                        {stats.startDate && stats.endDate ?
                            `${new Date(stats.startDate).toLocaleDateString()} - ${new Date(stats.endDate).toLocaleDateString()}` :
                            'Current Month'
                        }
                    </span>
                </div>
            </div>

            <div className="rockops-attendance-stats-grid">
                {/* Primary Stat */}
                {contractStats.primary && (
                    <div className={`rockops-attendance-stat-card rockops-attendance-stat-primary rockops-attendance-stat-${contractStats.primary.color || 'primary'}`}>
                        <div className="rockops-attendance-stat-icon">
                            <contractStats.primary.icon size={24} />
                        </div>
                        <div className="rockops-attendance-stat-content">
                            <div className="rockops-attendance-stat-value">
                                {formatValue(contractStats.primary.value, contractStats.primary.unit)}
                            </div>
                            <div className="rockops-attendance-stat-label">
                                {contractStats.primary.label}
                            </div>
                        </div>
                    </div>
                )}

                {/* Secondary Stats */}
                {contractStats.secondary.map((stat, index) => {
                    const IconComponent = stat.icon;
                    let cardClass = '';

                    // Add special styling for certain stats
                    if (stat.label.includes('Attendance Rate')) {
                        cardClass = getAttendanceRateColor(stat.value);
                    } else if (stat.label.includes('Late') && stat.value > 0) {
                        cardClass = 'warning';
                    } else if (stat.label.includes('Absent') && stat.value > 0) {
                        cardClass = 'danger';
                    }

                    return (
                        <div key={index} className={`rockops-attendance-stat-card rockops-attendance-stat-${cardClass}`}>
                            <div className="rockops-attendance-stat-icon">
                                <IconComponent size={20} />
                            </div>
                            <div className="rockops-attendance-stat-content">
                                <div className="rockops-attendance-stat-value">
                                    {formatValue(stat.value, stat.unit)}
                                </div>
                                <div className="rockops-attendance-stat-label">
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Earnings Card (if available) */}
                {stats.totalEarnings && (
                    <div className="rockops-attendance-stat-card rockops-attendance-stat-success">
                        <div className="rockops-attendance-stat-icon">
                            <DollarSign size={20} />
                        </div>
                        <div className="rockops-attendance-stat-content">
                            <div className="rockops-attendance-stat-value">
                                ${stats.totalEarnings.toFixed(2)}
                            </div>
                            <div className="rockops-attendance-stat-label">
                                Total Earnings
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Breakdown (for Monthly contracts) */}
            {stats.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
                <div className="rockops-attendance-status-breakdown">
                    <h4>Status Breakdown</h4>
                    <div className="rockops-attendance-status-grid">
                        {Object.entries(stats.statusCounts).map(([status, count]) => (
                            <div key={status} className={`rockops-attendance-status-item rockops-attendance-status-${status.toLowerCase()}`}>
                                <div className="rockops-attendance-status-count">{count}</div>
                                <div className="rockops-attendance-status-label">{status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Performance Indicators */}
            <div className="performance-indicators">
                {employee.jobPosition?.contractType === 'HOURLY' && stats.averageHoursPerDay && (
                    <div className="performance-item">
                        <div className="indicator-label">Daily Performance</div>
                        <div className="indicator-bar">
                            <div
                                className="indicator-fill"
                                style={{
                                    width: `${Math.min((stats.averageHoursPerDay / 8) * 100, 100)}%`,
                                    backgroundColor: stats.averageHoursPerDay >= 8 ? '#4caf50' : '#ff9800'
                                }}
                            ></div>
                        </div>
                        <div className="indicator-text">
                            {stats.averageHoursPerDay.toFixed(1)} / 8 hrs avg
                        </div>
                    </div>
                )}

                {stats.attendancePercentage !== undefined && (
                    <div className="performance-item">
                        <div className="indicator-label">Attendance Rate</div>
                        <div className="indicator-bar">
                            <div
                                className="indicator-fill"
                                style={{
                                    width: `${stats.attendancePercentage}%`,
                                    backgroundColor: stats.attendancePercentage >= 95 ? '#4caf50' :
                                        stats.attendancePercentage >= 85 ? '#ff9800' : '#f44336'
                                }}
                            ></div>
                        </div>
                        <div className="indicator-text">
                            {stats.attendancePercentage.toFixed(1)}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceStats;