import React from 'react';

const DeductionsTab = ({ employee, formatCurrency }) => {
    return (
        <div className="deductions-info tab-panel">
            {/*<h3>Salary Deductions</h3>*/}

            <div className="deductions-summary">
                <div className="summary-card">
                    <h4>Total Deductions</h4>
                    <div className="amount">{formatCurrency(250)}</div>
                    <div className="period">Current Month</div>
                </div>
            </div>

            <div className="deductions-table-container">
                <table className="deductions-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>April 15, 2025</td>
                        <td>Tax</td>
                        <td>{formatCurrency(150)}</td>
                        <td>Income Tax</td>
                        <td><span className="status-badge completed">Processed</span></td>
                    </tr>
                    <tr>
                        <td>April 15, 2025</td>
                        <td>Insurance</td>
                        <td>{formatCurrency(75)}</td>
                        <td>Health Insurance</td>
                        <td><span className="status-badge completed">Processed</span></td>
                    </tr>
                    <tr>
                        <td>April 25, 2025</td>
                        <td>Absence</td>
                        <td>{formatCurrency(25)}</td>
                        <td>Unauthorized Absence</td>
                        <td><span className="status-badge pending">Pending</span></td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeductionsTab;