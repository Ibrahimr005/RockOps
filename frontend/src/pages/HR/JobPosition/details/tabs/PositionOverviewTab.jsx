import React from 'react';
import {
    FiUsers,
    FiTrendingUp,
    FiDollarSign,
    FiCheckCircle,
    FiAlertTriangle,
    FiTarget
} from 'react-icons/fi';

const PositionOverviewTab = ({
                                 position,
                                 positionData,
                                 formatCurrency,
                                 getContractTypeDisplay
                             }) => {
    const { employees, promotionStats, salaryStats, validation } = positionData;

    const getStatusIcon = (active) => {
        return active ? <FiCheckCircle /> : <FiAlertTriangle />;
    };

    const formatTimeRange = (startTime, endTime) => {
        if (!startTime || !endTime) return null;
        return `${startTime} - ${endTime}`;
    };

    return (
        <div className="overview-tab">
            {/* Position Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-icon">
                        <FiUsers />
                    </div>
                    <div className="card-content">
                        <h3>{employees.length}</h3>
                        <p>Current Employees</p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon">
                        <FiTrendingUp />
                    </div>
                    <div className="card-content">
                        <h3>{promotionStats.promotionsFromCount || 0}</h3>
                        <p>Career Progressions</p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon">
                        <FiDollarSign />
                    </div>
                    <div className="card-content">
                        <h3>{formatCurrency(salaryStats.calculatedMonthlySalary || salaryStats.baseSalary)}</h3>
                        <p>Base Salary</p>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="card-icon">
                        {getStatusIcon(position.active)}
                    </div>
                    <div className="card-content">
                        <h3>{position.active ? 'Active' : 'Inactive'}</h3>
                        <p>Position Status</p>
                    </div>
                </div>
            </div>

            {/* Position Details Grid */}
            <div className="details-grid">
                <div className="details-section">
                    <h3>Basic Information</h3>
                    <div className="detail-item">
                        <span className="label">Position Name:</span>
                        <span className="value">{position.positionName}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Department:</span>
                        <span className="value">{position.department?.name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Reports To:</span>
                        <span className="value">{position.head || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Experience Level:</span>
                        <span className="value">{position.experienceLevel || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Probation Period:</span>
                        <span className="value">{position.probationPeriod ? `${position.probationPeriod} months` : 'N/A'}</span>
                    </div>
                </div>

                <div className="details-section">
                    <h3>Contract & Salary</h3>
                    <div className="detail-item">
                        <span className="label">Contract Type:</span>
                        <span className="value">{getContractTypeDisplay(position.contractType)}</span>
                    </div>

                    {/* Contract-specific details */}
                    {position.contractType === 'HOURLY' && (
                        <>
                            <div className="detail-item">
                                <span className="label">Hourly Rate:</span>
                                <span className="value">{formatCurrency(position.hourlyRate)}/hr</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Hours per Shift:</span>
                                <span className="value">{position.hoursPerShift}h</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Working Days/Week:</span>
                                <span className="value">{position.workingDaysPerWeek} days</span>
                            </div>
                            {position.overtimeMultiplier && (
                                <div className="detail-item">
                                    <span className="label">Overtime Multiplier:</span>
                                    <span className="value">{position.overtimeMultiplier}x</span>
                                </div>
                            )}
                        </>
                    )}

                    {position.contractType === 'DAILY' && (
                        <>
                            <div className="detail-item">
                                <span className="label">Daily Rate:</span>
                                <span className="value">{formatCurrency(position.dailyRate)}/day</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Working Days/Month:</span>
                                <span className="value">{position.workingDaysPerMonth} days</span>
                            </div>
                            {position.includesWeekends && (
                                <div className="detail-item">
                                    <span className="label">Includes Weekends:</span>
                                    <span className="value">Yes</span>
                                </div>
                            )}
                        </>
                    )}

                    {position.contractType === 'MONTHLY' && (
                        <>
                            <div className="detail-item">
                                <span className="label">Monthly Salary:</span>
                                <span className="value">{formatCurrency(position.monthlyBaseSalary)}/month</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Working Hours:</span>
                                <span className="value">
                                    {formatTimeRange(position.startTime, position.endTime) ||
                                        (position.workingHours ? `${position.workingHours}h/day` : 'N/A')}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Working Days/Month:</span>
                                <span className="value">{position.workingDaysPerMonth} days</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Validation Issues */}
            {validation.issues && validation.issues.length > 0 && (
                <div className="validation-section">
                    <h3>Configuration Issues</h3>
                    <div className="issues-list">
                        {validation.issues.map((issue, index) => (
                            <div key={index} className="issue-item">
                                <FiAlertTriangle className="issue-icon" />
                                <span>{issue}</span>
                            </div>
                        ))}
                    </div>
                    {validation.recommendations && validation.recommendations.length > 0 && (
                        <div className="recommendations">
                            <h4>Recommendations:</h4>
                            {validation.recommendations.map((rec, index) => (
                                <div key={index} className="recommendation-item">
                                    <FiTarget className="rec-icon" />
                                    <span>{rec}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PositionOverviewTab;