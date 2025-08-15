import React from 'react';
import { FiUser, FiClock, FiDollarSign, FiCalendar, FiInfo } from 'react-icons/fi';

const PositionOverview = ({ position }) => {
    const formatTimeRange = (startTime, endTime) => {
        if (!startTime || !endTime) return null;

        const formatTime = (time) => {
            if (!time) return '';
            if (time.includes(':')) {
                const parts = time.split(':');
                return `${parts[0]}:${parts[1]}`;
            }
            return time;
        };

        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);
        return `${formattedStart} - ${formattedEnd}`;
    };

    const calculateWorkingHours = (startTime, endTime) => {
        if (!startTime || !endTime) return null;

        try {
            const start = new Date(`1970-01-01T${startTime}`);
            const end = new Date(`1970-01-01T${endTime}`);
            let diffHours = (end - start) / (1000 * 60 * 60);

            if (diffHours < 0) {
                diffHours += 24;
            }

            return Math.round(diffHours * 100) / 100;
        } catch (error) {
            return null;
        }
    };

    const formatExperienceLevel = (experienceLevel) => {
        if (!experienceLevel) return 'N/A';
        return experienceLevel.replace('_', ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatSalary = (position) => {
        if (!position) return 'N/A';

        const contractType = position.contractType || position.type;
        const salary = position.calculatedMonthlySalary || position.monthlyBaseSalary || position.baseSalary;

        switch (contractType) {
            case 'HOURLY':
                const hourlyRate = position.hourlyRate;
                return hourlyRate ? `$${Number(hourlyRate).toLocaleString()}/hr` : 'N/A';
            case 'DAILY':
                const dailyRate = position.dailyRate;
                return dailyRate ? `$${Number(dailyRate).toLocaleString()}/day` : 'N/A';
            case 'MONTHLY':
            default:
                return salary ? `$${Number(salary).toLocaleString()}/month` : 'N/A';
        }
    };

    const getWorkingScheduleInfo = (position) => {
        if (!position) return null;

        const contractType = position.contractType || position.type;

        switch (contractType) {
            case 'HOURLY':
                return {
                    type: 'hourly',
                    daysPerWeek: position.workingDaysPerWeek,
                    hoursPerShift: position.hoursPerShift,
                    overtimeMultiplier: position.overtimeMultiplier,
                    trackBreaks: position.trackBreaks,
                    breakDuration: position.breakDurationMinutes
                };
            case 'DAILY':
                return {
                    type: 'daily',
                    daysPerMonth: position.workingDaysPerMonth,
                    includesWeekends: position.includesWeekends
                };
            case 'MONTHLY':
                const timeRange = formatTimeRange(position.startTime, position.endTime);
                const workingHours = calculateWorkingHours(position.startTime, position.endTime) || position.workingHours;
                return {
                    type: 'monthly',
                    timeRange,
                    workingHours,
                    monthlyDays: position.workingDaysPerMonth,
                    shifts: position.shifts,
                    vacations: position.vacations
                };
            default:
                return null;
        }
    };

    const scheduleInfo = getWorkingScheduleInfo(position);

    return (
        <div className="position-overview">
            {/* Basic Information Card */}
            <div className="position-overview-card">
                <div className="card-header">
                    <h3><FiUser /> Basic Information</h3>
                </div>
                <div className="card-content">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Position Name</label>
                            <span>{position.positionName}</span>
                        </div>
                        <div className="info-item">
                            <label>Department</label>
                            <span>{position.department || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <label>Parent Position</label>
                            <span>{position.parentPosition || 'Root'}</span>
                        </div>
                        <div className="info-item">
                            <label>Experience Level</label>
                            <span>{formatExperienceLevel(position.experienceLevel)}</span>
                        </div>
                        <div className="info-item">
                            <label>Contract Type</label>
                            <span className="status-badge info">
                                {position.contractType ? position.contractType.replace('_', ' ') : 'N/A'}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Reporting To</label>
                            <span>{position.head || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <label>Probation Period</label>
                            <span>{position.probationPeriod} days</span>
                        </div>
                        <div className="info-item">
                            <label>Status</label>
                            <span className={`status-badge ${position.active ? 'active' : 'inactive'}`}>
                                {position.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Salary Information Card */}
            <div className="position-overview-card">
                <div className="card-header">
                    <h3><FiDollarSign /> Salary Information</h3>
                </div>
                <div className="card-content">
                    <div className="salary-grid">
                        <div className="salary-item primary">
                            <label>Base Salary</label>
                            <span className="salary-value">{formatSalary(position)}</span>
                        </div>
                        {position.calculatedDailySalary && (
                            <div className="salary-item">
                                <label>Daily Rate</label>
                                <span className="salary-value">
                                    ${Number(position.calculatedDailySalary).toLocaleString()}/day
                                </span>
                            </div>
                        )}
                        {position.calculatedMonthlySalary && (
                            <div className="salary-item">
                                <label>Monthly Salary</label>
                                <span className="salary-value">
                                    ${Number(position.calculatedMonthlySalary).toLocaleString()}/month
                                </span>
                            </div>
                        )}
                        {position.contractType === 'HOURLY' && position.overtimeMultiplier && (
                            <div className="salary-item">
                                <label>Overtime Multiplier</label>
                                <span className="salary-value">{position.overtimeMultiplier}x</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Working Schedule Card */}
            {scheduleInfo && (
                <div className="position-overview-card">
                    <div className="card-header">
                        <h3><FiClock /> Working Schedule</h3>
                    </div>
                    <div className="card-content">
                        <div className="schedule-grid">
                            {scheduleInfo.type === 'hourly' && (
                                <>
                                    <div className="schedule-item">
                                        <label>Working Days per Week</label>
                                        <span>{scheduleInfo.daysPerWeek || 'N/A'}</span>
                                    </div>
                                    <div className="schedule-item">
                                        <label>Hours per Shift</label>
                                        <span>{scheduleInfo.hoursPerShift || 'N/A'}h</span>
                                    </div>
                                    <div className="schedule-item">
                                        <label>Track Breaks</label>
                                        <span>{scheduleInfo.trackBreaks ? 'Yes' : 'No'}</span>
                                    </div>
                                    {scheduleInfo.trackBreaks && (
                                        <div className="schedule-item">
                                            <label>Break Duration</label>
                                            <span>{scheduleInfo.breakDuration || 'N/A'} minutes</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {scheduleInfo.type === 'daily' && (
                                <>
                                    <div className="schedule-item">
                                        <label>Working Days per Month</label>
                                        <span>{scheduleInfo.daysPerMonth || 'N/A'}</span>
                                    </div>
                                    <div className="schedule-item">
                                        <label>Includes Weekends</label>
                                        <span>{scheduleInfo.includesWeekends ? 'Yes' : 'No'}</span>
                                    </div>
                                </>
                            )}

                            {scheduleInfo.type === 'monthly' && (
                                <>
                                    {scheduleInfo.timeRange && (
                                        <div className="schedule-item highlighted">
                                            <label>Working Hours</label>
                                            <span className="time-range">
                                                <FiClock className="time-icon" />
                                                {scheduleInfo.timeRange}
                                            </span>
                                        </div>
                                    )}
                                    <div className="schedule-item">
                                        <label>Hours per Day</label>
                                        <span>{scheduleInfo.workingHours || 'N/A'}h</span>
                                    </div>
                                    <div className="schedule-item">
                                        <label>Working Days per Month</label>
                                        <span>{scheduleInfo.monthlyDays || 'N/A'}</span>
                                    </div>
                                    <div className="schedule-item">
                                        <label>Shift Type</label>
                                        <span>{scheduleInfo.shifts || 'N/A'}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Additional Information Card */}
            {(scheduleInfo?.vacations || position.description) && (
                <div className="position-overview-card">
                    <div className="card-header">
                        <h3><FiInfo /> Additional Information</h3>
                    </div>
                    <div className="card-content">
                        <div className="additional-info">
                            {scheduleInfo?.vacations && (
                                <div className="info-item">
                                    <label>Vacation Policy</label>
                                    <span>{scheduleInfo.vacations}</span>
                                </div>
                            )}
                            {position.description && (
                                <div className="info-item">
                                    <label>Description</label>
                                    <span>{position.description}</span>
                                </div>
                            )}
                            <div className="info-item">
                                <label>Created Date</label>
                                <span>
                                    {position.createdAt ?
                                        new Date(position.createdAt).toLocaleDateString() :
                                        'N/A'
                                    }
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Last Updated</label>
                                <span>
                                    {position.updatedAt ?
                                        new Date(position.updatedAt).toLocaleDateString() :
                                        'N/A'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PositionOverview;