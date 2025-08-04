import React from 'react';

const PositionAnalyticsTab = ({
                                  positionData,
                                  formatCurrency
                              }) => {
    const { promotionStats, salaryStats, validation, employeeAnalytics } = positionData;

    return (
        <div className="analytics-tab">
            <div className="analytics-grid">
                <div className="analytics-section">
                    <h3>Position Performance</h3>
                    <div className="performance-metrics">
                        <div className="metric">
                            <span className="metric-label">Promotion Rate</span>
                            <span className="metric-value">
                                {promotionStats.promotionRateFromPosition ?
                                    `${promotionStats.promotionRateFromPosition.toFixed(1)}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="metric">
                            <span className="metric-label">Employee Eligibility Rate</span>
                            <span className="metric-value">
                                {employeeAnalytics.promotionEligibilityRate ?
                                    `${Math.round(employeeAnalytics.promotionEligibilityRate)}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="metric">
                            <span className="metric-label">Average Tenure</span>
                            <span className="metric-value">
                                {employeeAnalytics.averageMonthsInPosition ?
                                    `${Math.round(employeeAnalytics.averageMonthsInPosition)} months` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="analytics-section">
                    <h3>Salary Analysis</h3>
                    <div className="salary-analysis">
                        {salaryStats.numberOfEmployees > 0 && (
                            <>
                                <div className="salary-metric">
                                    <span className="metric-label">Average Employee Salary</span>
                                    <span className="metric-value">{formatCurrency(salaryStats.averageEmployeeSalary)}</span>
                                </div>
                                <div className="salary-metric">
                                    <span className="metric-label">Salary Range</span>
                                    <span className="metric-value">
                                        {formatCurrency(salaryStats.minEmployeeSalary)} - {formatCurrency(salaryStats.maxEmployeeSalary)}
                                    </span>
                                </div>
                                <div className="salary-metric">
                                    <span className="metric-label">Total Payroll</span>
                                    <span className="metric-value">{formatCurrency(employeeAnalytics.totalPayroll)}</span>
                                </div>
                            </>
                        )}
                        <div className="salary-metric">
                            <span className="metric-label">Base Position Salary</span>
                            <span className="metric-value">{formatCurrency(salaryStats.calculatedMonthlySalary || salaryStats.baseSalary)}</span>
                        </div>
                    </div>
                </div>

                <div className="analytics-section">
                    <h3>Position Characteristics</h3>
                    <div className="characteristics">
                        <div className="characteristic">
                            <span className="char-label">High-Level Position</span>
                            <span className={`char-value ${validation.isHighLevelPosition ? 'yes' : 'no'}`}>
                                {validation.isHighLevelPosition ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="characteristic">
                            <span className="char-label">Career Progression Available</span>
                            <span className={`char-value ${validation.hasCareerProgression ? 'yes' : 'no'}`}>
                                {validation.hasCareerProgression ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="characteristic">
                            <span className="char-label">Promotion Destination</span>
                            <span className={`char-value ${validation.isPromotionDestination ? 'yes' : 'no'}`}>
                                {validation.isPromotionDestination ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="characteristic">
                            <span className="char-label">Valid Configuration</span>
                            <span className={`char-value ${validation.isValid ? 'yes' : 'no'}`}>
                                {validation.isValid ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Contract Type Distribution */}
                {employeeAnalytics.contractTypeDistribution && Object.keys(employeeAnalytics.contractTypeDistribution).length > 0 && (
                    <div className="analytics-section">
                        <h3>Contract Type Distribution</h3>
                        <div className="distribution-metrics">
                            {Object.entries(employeeAnalytics.contractTypeDistribution).map(([type, count]) => (
                                <div key={type} className="distribution-item">
                                    <span className="distribution-label">{type.replace('_', ' ')}:</span>
                                    <span className="distribution-value">{count} employees</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Distribution */}
                {employeeAnalytics.statusDistribution && Object.keys(employeeAnalytics.statusDistribution).length > 0 && (
                    <div className="analytics-section">
                        <h3>Employee Status Distribution</h3>
                        <div className="distribution-metrics">
                            {Object.entries(employeeAnalytics.statusDistribution).map(([status, count]) => (
                                <div key={status} className="distribution-item">
                                    <span className="distribution-label">{status}:</span>
                                    <span className="distribution-value">{count} employees</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PositionAnalyticsTab;