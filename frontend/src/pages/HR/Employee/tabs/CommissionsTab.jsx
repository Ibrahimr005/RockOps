import React from 'react';

const CommissionsTab = ({ employee, formatCurrency }) => {
    return (
        <div className="commissions-info tab-panel">
            {/*<h3>Commissions & Bonuses</h3>*/}

            <div className="commissions-summary">
                <div className="summary-card">
                    <h4>Total Commissions</h4>
                    <div className="amount">{formatCurrency(employee.commission || 0)}</div>
                    <div className="period">Year to Date</div>
                </div>
                <div className="summary-card">
                    <h4>Performance Bonus</h4>
                    <div className="amount">{formatCurrency(employee.bonus || 0)}</div>
                    <div className="period">Last Quarter</div>
                </div>
            </div>

            <div className="commissions-table-container">
                <table className="commissions-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Description</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>March 30, 2025</td>
                        <td>Performance Bonus</td>
                        <td>{formatCurrency(500)}</td>
                        <td>Q1 Performance Target Achieved</td>
                        <td><span className="status-badge completed">Paid</span></td>
                    </tr>
                    <tr>
                        <td>February 15, 2025</td>
                        <td>Sales Commission</td>
                        <td>{formatCurrency(350)}</td>
                        <td>Monthly Sales Target Exceeded</td>
                        <td><span className="status-badge completed">Paid</span></td>
                    </tr>
                    <tr>
                        <td>April 28, 2025</td>
                        <td>Referral Bonus</td>
                        <td>{formatCurrency(200)}</td>
                        <td>New Employee Referral</td>
                        <td><span className="status-badge pending">Processing</span></td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CommissionsTab;