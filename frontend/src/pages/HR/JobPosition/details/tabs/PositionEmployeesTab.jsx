import React from 'react';
import {
    FiUser,
    FiAward,
    FiClock,
    FiDollarSign,
    FiTrendingUp,
    FiUsers
} from 'react-icons/fi';
import DataTable from '../../../../../components/common/DataTable/DataTable';

const PositionEmployeesTab = ({
                                  positionData,
                                  formatCurrency,
                                  getContractTypeDisplay,
                                  navigate
                              }) => {
    const { employees, eligibleEmployees, employeeAnalytics } = positionData;

    const employeeColumns = [
        {
            header: 'Name',
            accessor: 'fullName',
            sortable: true,
            render: (row) => (
                <div className="employee-name-cell">
                    <div className="name">{row.fullName || `${row.firstName} ${row.lastName}`}</div>
                    <div className="employee-id">ID: {row.employeeId || row.id || 'N/A'}</div>
                </div>
            )
        },
        {
            header: 'Current Salary',
            accessor: 'monthlySalary',
            sortable: true,
            render: (row) => {
                const salary = row.monthlySalary || row.baseSalary;
                return (
                    <div className="salary-cell">
                        <div className="salary">{formatCurrency(salary)}/month</div>
                        {row.jobPosition?.contractType && (
                            <div className="contract-type">{getContractTypeDisplay(row.jobPosition.contractType)}</div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Hire Date',
            accessor: 'hireDate',
            sortable: true,
            render: (row) => row.hireDate ? new Date(row.hireDate).toLocaleDateString() : 'N/A'
        },
        {
            header: 'Time in Position',
            accessor: 'monthsSinceLastPromotion',
            sortable: true,
            render: (row) => {
                const months = row.monthsSinceLastPromotion || 0;
                const years = Math.floor(months / 12);
                const remainingMonths = months % 12;

                if (years > 0) {
                    return `${years}y ${remainingMonths}m`;
                }
                return `${months}m`;
            }
        },
        {
            header: 'Promotion Status',
            accessor: 'promotionEligible',
            sortable: true,
            render: (row) => {
                const isEligible = eligibleEmployees.some(emp => emp.id === row.id);
                const hasPending = row.hasPendingPromotionRequests;

                if (hasPending) {
                    return (
                        <span className="promotion-status pending">
                            <FiClock /> Pending Request
                        </span>
                    );
                } else if (isEligible) {
                    return (
                        <span className="promotion-status eligible">
                            <FiAward /> Eligible
                        </span>
                    );
                } else {
                    return (
                        <span className="promotion-status not-eligible">
                            <FiUser /> Not Eligible
                        </span>
                    );
                }
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.status?.toLowerCase() || 'active'}`}>
                    {row.status || 'Active'}
                </span>
            )
        }
    ];

    const employeeActions = [
        {
            label: 'View Details',
            icon: <FiUser />,
            onClick: (row) => navigate(`/hr/employee-details/${row.id}`),
            className: 'info',
        }
    ];

    return (
        <div className="employees-tab">
            <div className="tab-header">
                <h3>Current Employees ({employees.length})</h3>
                <div className="employee-stats">
                    {eligibleEmployees.length > 0 && (
                        <div className="promotion-eligible">
                            <FiAward className="promotion-icon" />
                            <span>{eligibleEmployees.length} eligible for promotion</span>
                        </div>
                    )}
                    {employeeAnalytics.averageMonthsInPosition && (
                        <div className="avg-tenure">
                            <FiClock className="tenure-icon" />
                            <span>Avg: {Math.round(employeeAnalytics.averageMonthsInPosition)} months in position</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Analytics Summary */}
            {Object.keys(employeeAnalytics).length > 0 && (
                <div className="employee-analytics-summary">
                    <div className="analytics-cards">
                        <div className="analytics-card">
                            <div className="card-header">
                                <FiDollarSign className="card-icon" />
                                <h4>Salary Overview</h4>
                            </div>
                            <div className="card-stats">
                                {employeeAnalytics.averageSalary && (
                                    <div className="stat">
                                        <span className="label">Average:</span>
                                        <span className="value">{formatCurrency(employeeAnalytics.averageSalary)}</span>
                                    </div>
                                )}
                                {employeeAnalytics.totalPayroll && (
                                    <div className="stat">
                                        <span className="label">Total Payroll:</span>
                                        <span className="value">{formatCurrency(employeeAnalytics.totalPayroll)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="analytics-card">
                            <div className="card-header">
                                <FiTrendingUp className="card-icon" />
                                <h4>Promotion Metrics</h4>
                            </div>
                            <div className="card-stats">
                                <div className="stat">
                                    <span className="label">Eligibility Rate:</span>
                                    <span className="value">{Math.round(employeeAnalytics.promotionEligibilityRate || 0)}%</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Total Promotions:</span>
                                    <span className="value">{employeeAnalytics.totalPromotionsFromPosition || 0}</span>
                                </div>
                            </div>
                        </div>

                        {employeeAnalytics.statusDistribution && Object.keys(employeeAnalytics.statusDistribution).length > 0 && (
                            <div className="analytics-card">
                                <div className="card-header">
                                    <FiUsers className="card-icon" />
                                    <h4>Status Distribution</h4>
                                </div>
                                <div className="card-stats">
                                    {Object.entries(employeeAnalytics.statusDistribution).map(([status, count]) => (
                                        <div key={status} className="stat">
                                            <span className="label">{status}:</span>
                                            <span className="value">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <DataTable
                data={employees}
                columns={employeeColumns}
                actions={employeeActions}
                loading={false}
                showSearch={true}
                showFilters={true}
                filterableColumns={['status', 'promotionEligible']}
                defaultSortField="fullName"
                defaultSortDirection="asc"
                emptyMessage="No employees currently assigned to this position."
            />
        </div>
    );
};

export default PositionEmployeesTab;