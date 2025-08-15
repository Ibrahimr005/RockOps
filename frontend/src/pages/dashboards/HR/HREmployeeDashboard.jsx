import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SalaryStatisticsCard from './components/SalaryStatisticsCard.jsx';
import EmployeeDistributionCard from './components/EmployeeDistributionCard.jsx';
import DepartmentSalaryChart from './components/DepartmentSalaryChart.jsx';
import MonthlySalaryChart from './components/MonthlySalaryChart.jsx';
import EmployeePositionChart from './components/EmployeePositionChart.jsx';
import './HRDashboard.css';
import { hrDashboardService } from '../../../services/hrDashboardService';

const HRDashboard = () => {
    const { t } = useTranslation();
    const [salaryStats, setSalaryStats] = useState(null);
    const [employeeDistribution, setEmployeeDistribution] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch salary statistics and employee distribution
                const [salaryResponse, distributionResponse] = await Promise.all([
                    hrDashboardService.getSalaryStatistics(),
                    hrDashboardService.getEmployeeDistribution()
                ]);

                // Parse responses
                const salaryData = salaryResponse.data;
                const distributionData = distributionResponse.data;

                setSalaryStats(salaryData);
                setEmployeeDistribution(distributionData);
                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="hr-dashboard-loading">
                <div className="loading-spinner"></div>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="hr-dashboard-error">
                <h3>{t('common.error')}</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="hr-dashboard">
            <div className="hr-dashboard-header">
                <h1>{t('hr.dashboard.title')}</h1>
            </div>

            <div className="hr-dashboard-content">
                {/* Salary Statistics Section */}
                <div className="dashboard-section">
                    <h2>{t('hr.dashboard.salaryStatistics')}</h2>
                    <div className="stats-cards">
                        <SalaryStatisticsCard data={salaryStats} />
                    </div>

                    <div className="stats-charts">
                        <DepartmentSalaryChart
                            departmentSalaries={salaryStats?.departmentAverageSalaries || {}}
                        />
                        <MonthlySalaryChart
                            monthlySalaries={salaryStats?.monthlySalaryTotals || {}}
                        />
                    </div>
                </div>

                {/* Employee Distribution Section */}
                <div className="dashboard-section">
                    <h2>{t('hr.dashboard.employeeDistribution')}</h2>
                    <div className="distribution-cards">
                        {employeeDistribution.map((site, index) => (
                            <EmployeeDistributionCard key={index} data={site} />
                        ))}
                    </div>

                    {employeeDistribution.length > 0 && (
                        <div className="distribution-charts">
                            <EmployeePositionChart data={employeeDistribution} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;