import React, { useState, useEffect } from 'react';
import { salaryIncreaseService } from '../../../../services/hr/salaryIncreaseService.js';

const CompensationTab = ({ employee, formatCurrency }) => {
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (employee?.id) {
            setLoadingHistory(true);
            salaryIncreaseService.getEmployeeHistory(employee.id)
                .then(res => setSalaryHistory(res.data || []))
                .catch(() => setSalaryHistory([]))
                .finally(() => setLoadingHistory(false));
        }
    }, [employee?.id]);
    // Helper function to get the appropriate base salary
    const getBaseSalary = () => {
        if (employee.baseSalaryOverride) {
            return employee.baseSalaryOverride;
        }
        if (employee.jobPosition?.monthlyBaseSalary) {
            return employee.jobPosition.monthlyBaseSalary;
        }
        if (employee.jobPosition?.baseSalary) {
            return employee.jobPosition.baseSalary;
        }
        return 0;
    };

    // Helper function to get monthly salary
    const getMonthlySalary = () => {
        if (employee.monthlySalary) {
            return employee.monthlySalary;
        }
        return getBaseSalary() * (employee.salaryMultiplier || 1);
    };

    // Helper function to get annual salary
    const getAnnualSalary = () => {
        return getMonthlySalary() * 12;
    };

    return (
        <div className="compensation-info tab-panel">
            {/*<h3>Compensation Details</h3>*/}

            <div className="salary-overview">
                <div className="salary-card">
                    <div className="salary-title">Base Monthly Salary</div>
                    <div className="salary-amount">
                        {formatCurrency(getMonthlySalary())}
                    </div>
                </div>
                <div className="salary-card">
                    <div className="salary-title">Annual Salary</div>
                    <div className="salary-amount">
                        {formatCurrency(getAnnualSalary())}
                    </div>
                </div>
                <div className="salary-card">
                    <div className="salary-title">Base Position Salary</div>
                    <div className="salary-amount">
                        {formatCurrency(getBaseSalary())}
                    </div>
                </div>
            </div>

            <div className="info-grid">
                <div className="info-group">
                    <div className="info-item">
                        <label>Base Salary Override</label>
                        <p>{employee.baseSalaryOverride ? formatCurrency(employee.baseSalaryOverride) : 'Not applied'}</p>
                    </div>
                    <div className="info-item">
                        <label>Contract Type</label>
                        <p>{employee.contractType || employee.jobPosition?.contractType || 'Not specified'}</p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Probation Period</label>
                        <p>{employee.jobPosition?.probationPeriod ? `${employee.jobPosition.probationPeriod} days` : 'Not specified'}</p>
                    </div>
                    <div className="info-item">
                        <label>Working Days</label>
                        <p>{employee.jobPosition?.workingDays ? `${employee.jobPosition.workingDays} days/week` : 'Standard'}</p>
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-item">
                        <label>Shifts</label>
                        <p>{employee.jobPosition?.shifts || 'Standard'}</p>
                    </div>
                    <div className="info-item">
                        <label>Vacations</label>
                        <p>{employee.jobPosition?.vacations || 'Per company policy'}</p>
                    </div>
                </div>
            </div>

            <div className="salary-history">
                <h4>Salary History</h4>
                {loadingHistory ? (
                    <p className="info-text">Loading salary history...</p>
                ) : salaryHistory.length > 0 ? (
                    <table className="compensation-history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Previous</th>
                                <th>New</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaryHistory.map(record => (
                                <tr key={record.id}>
                                    <td>{record.effectiveDate ? new Date(record.effectiveDate).toLocaleDateString() : new Date(record.createdAt).toLocaleDateString()}</td>
                                    <td>{record.changeType?.replace('_', ' ')}</td>
                                    <td>{formatCurrency(record.previousSalary)}</td>
                                    <td style={{ fontWeight: '600', color: 'var(--color-success)' }}>{formatCurrency(record.newSalary)}</td>
                                    <td>{record.changeReason?.length > 50 ? record.changeReason.substring(0, 50) + '...' : record.changeReason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="info-text">
                        No salary changes recorded.
                        This employee's compensation is based on the {employee.jobPosition?.positionName || 'current'} position
                        {employee.baseSalaryOverride ? ', with a custom salary override applied.' : ', using the standard position salary.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CompensationTab;