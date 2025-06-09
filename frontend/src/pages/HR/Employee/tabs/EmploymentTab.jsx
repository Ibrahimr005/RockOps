import React from 'react';

const EmploymentTab = ({ employee, formatDate, getPosition, getDepartment, getSiteName }) => {
    const getContractTypeDisplay = () => {
        if (!employee.jobPosition?.contractType) return 'Not specified';
        return employee.jobPosition.contractType.replace(/_/g, ' ');
    };

    const getWorkingHoursDisplay = () => {
        if (!employee.jobPosition) return 'Standard hours';
        
        switch (employee.jobPosition.contractType) {
            case 'HOURLY':
                return `${employee.jobPosition.hoursPerShift} hours per shift, ${employee.jobPosition.workingDaysPerWeek} days per week`;
            case 'DAILY':
                return `${employee.jobPosition.workingDaysPerMonth} days per month`;
            case 'MONTHLY':
                return `${employee.jobPosition.workingHours || 'Standard'} hours per month`;
            default:
                return 'Standard hours';
        }
    };

    return (
        <div className="employment-info tab-panel">
            <h3>Employment Information</h3>

            <div className="info-grid">
                <div className="info-group">
                    <div className="info-item">
                        <label>Position</label>
                        <p>{getPosition()}</p>
                    </div>
                    <div className="info-item">
                        <label>Department</label>
                        <p>{getDepartment()}</p>
                    </div>
                    <div className="info-item">
                        <label>Contract Type</label>
                        <p>{getContractTypeDisplay()}</p>
                    </div>
                    <div className="info-item">
                        <label>Status</label>
                        <p className={`status-badge ${employee.status?.toLowerCase() || 'active'}`}>
                            {employee.status || 'Active'}
                        </p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Site</label>
                        <p>{getSiteName()}</p>
                    </div>
                    <div className="info-item">
                        <label>Hire Date</label>
                        <p>{formatDate(employee.hireDate)}</p>
                    </div>
                    <div className="info-item">
                        <label>Manager</label>
                        <p>{employee.managerName || 'Not assigned'}</p>
                    </div>
                    <div className="info-item">
                        <label>Experience Level</label>
                        <p>{employee.jobPosition?.experienceLevel || 'Not specified'}</p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Working Hours</label>
                        <p>{getWorkingHoursDisplay()}</p>
                    </div>
                    <div className="info-item">
                        <label>Employee ID</label>
                        <p>{employee.id || 'N/A'}</p>
                    </div>
                    {employee.jobPosition?.contractType === 'HOURLY' && (
                        <div className="info-item">
                            <label>Hourly Rate</label>
                            <p>${employee.jobPosition.hourlyRate?.toFixed(2) || 'N/A'}</p>
                        </div>
                    )}
                    {employee.jobPosition?.contractType === 'DAILY' && (
                        <div className="info-item">
                            <label>Daily Rate</label>
                            <p>${employee.jobPosition.dailyRate?.toFixed(2) || 'N/A'}</p>
                        </div>
                    )}
                    {employee.jobPosition?.contractType === 'MONTHLY' && (
                        <div className="info-item">
                            <label>Monthly Base Salary</label>
                            <p>${employee.jobPosition.monthlyBaseSalary?.toFixed(2) || 'N/A'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmploymentTab;