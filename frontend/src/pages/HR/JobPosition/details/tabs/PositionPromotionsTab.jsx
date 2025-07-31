import React from 'react';
import DataTable from '../../../../../components/common/DataTable/DataTable';

const PositionPromotionsTab = ({
                                   positionData,
                                   formatCurrency
                               }) => {
    const { promotionStats, promotionsFrom, promotionsTo, careerPaths } = positionData;

    const promotionColumns = [
        {
            header: 'Employee',
            accessor: 'employeeName',
            sortable: true,
            render: (row) => row.employeeName || row.employee?.fullName || 'N/A'
        },
        {
            header: 'From Position',
            accessor: 'currentPositionName',
            sortable: true,
            render: (row) => row.currentPositionName || row.currentJobPosition?.positionName || 'N/A'
        },
        {
            header: 'To Position',
            accessor: 'promotedToPositionName',
            sortable: true,
            render: (row) => row.promotedToPositionName || row.promotedToJobPosition?.positionName || 'N/A'
        },
        {
            header: 'Salary Change',
            accessor: 'salaryIncrease',
            sortable: true,
            render: (row) => {
                const increase = row.salaryIncrease || 0;
                if (increase === 0) return 'N/A';
                return (
                    <span className={`salary-change ${increase >= 0 ? 'positive' : 'negative'}`}>
                        {increase >= 0 ? '+' : ''}{formatCurrency(increase)}
                    </span>
                );
            }
        },
        {
            header: 'Date',
            accessor: 'implementedDate',
            sortable: true,
            render: (row) => {
                if (row.implementedDate || row.implementedAt) {
                    const date = new Date(row.implementedDate || row.implementedAt);
                    return date.toLocaleDateString();
                }
                return row.status === 'IMPLEMENTED' ? 'Completed' : 'Pending';
            }
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            render: (row) => (
                <span className={`status-badge ${row.status?.toLowerCase() || 'pending'}`}>
                    {row.status?.replace('_', ' ') || 'Pending'}
                </span>
            )
        }
    ];

    return (
        <div className="promotions-tab">
            <div className="promotion-stats">
                <div className="stat-card">
                    <h4>Promotions From This Position</h4>
                    <div className="stat-value">{promotionStats.promotionsFromCount || 0}</div>
                    <div className="stat-subtext">Total career progressions</div>
                </div>

                <div className="stat-card">
                    <h4>Promotions To This Position</h4>
                    <div className="stat-value">{promotionStats.promotionsToCount || 0}</div>
                    <div className="stat-subtext">Employees promoted here</div>
                </div>

                <div className="stat-card">
                    <h4>Average Salary Increase</h4>
                    <div className="stat-value">
                        {promotionStats.averageSalaryIncrease ?
                            formatCurrency(promotionStats.averageSalaryIncrease) : 'N/A'}
                    </div>
                    <div className="stat-subtext">From this position</div>
                </div>

                <div className="stat-card">
                    <h4>Average Time to Promotion</h4>
                    <div className="stat-value">
                        {promotionStats.averageTimeBeforePromotion ?
                            `${Math.round(promotionStats.averageTimeBeforePromotion)} months` : 'N/A'}
                    </div>
                    <div className="stat-subtext">Before promotion</div>
                </div>
            </div>

            <div className="promotion-tables">
                <div className="promotion-section">
                    <h3>Promotions From This Position ({promotionsFrom.length})</h3>
                    <DataTable
                        data={promotionsFrom}
                        columns={promotionColumns}
                        loading={false}
                        showSearch={true}
                        defaultSortField="implementedDate"
                        defaultSortDirection="desc"
                        emptyMessage="No promotions from this position yet."
                    />
                </div>

                <div className="promotion-section">
                    <h3>Promotions To This Position ({promotionsTo.length})</h3>
                    <DataTable
                        data={promotionsTo}
                        columns={promotionColumns}
                        loading={false}
                        showSearch={true}
                        defaultSortField="implementedDate"
                        defaultSortDirection="desc"
                        emptyMessage="No promotions to this position yet."
                    />
                </div>
            </div>

            {careerPaths.length > 0 && (
                <div className="career-path-section">
                    <h3>Common Career Paths</h3>
                    <div className="career-paths">
                        {careerPaths.map((path, index) => (
                            <div key={index} className="career-path-item">
                                <div className="path-arrow">→</div>
                                <div className="path-position">{path}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PositionPromotionsTab;