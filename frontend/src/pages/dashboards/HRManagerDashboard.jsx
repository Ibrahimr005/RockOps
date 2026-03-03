import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Briefcase, Calendar, TrendingUp, AlertCircle, UserPlus } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * HR Manager Dashboard Component
 * Displays comprehensive HR metrics including employees, recruitment, and leave management
 */
const HRManagerDashboard = () => {
    const { t } = useTranslation();
    const { showError } = useSnackbar();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const data = await DashboardService.getHRManagerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching HR manager dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="hr-dashboard-error">No data available</div>;
    }

    const leaveRequestsData = [
        { name: 'Pending', value: dashboardData.pendingLeaveRequests || 0 },
        { name: 'Approved', value: dashboardData.approvedLeavesThisMonth || 0 },
        { name: 'Rejected', value: dashboardData.rejectedLeavesThisMonth || 0 },
    ];

    return (
        <div className="hr-manager-dashboard">
            <PageHeader title="HR Manager Dashboard" subtitle="Comprehensive HR metrics and employee management" />

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <Users />, label: "Total Employees", value: dashboardData.totalEmployees, variant: "primary", subtitle: `${dashboardData.activeEmployees} Active` },
                    { icon: <UserPlus />, label: "New Hires", value: dashboardData.newHiresThisMonth, variant: "success", subtitle: "This Month" },
                    { icon: <Briefcase />, label: "Vacancies", value: dashboardData.totalVacancies, variant: "info", subtitle: `${dashboardData.activeVacancies} Active` },
                    { icon: <Calendar />, label: "Leave Requests", value: dashboardData.pendingLeaveRequests, variant: "warning", subtitle: "Pending Approval" },
                    { icon: <TrendingUp />, label: "Present Today", value: dashboardData.presentToday, variant: "active", subtitle: `${dashboardData.absentToday} Absent` },
                    { icon: <AlertCircle />, label: "Pending Promotions", value: dashboardData.pendingPromotions, variant: "orange", subtitle: `${dashboardData.approvedPromotionsThisYear} Approved` },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="hr-manager-charts">
                <div className="hr-manager-chart-card">
                    <h3>Leave Requests Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leaveRequestsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="hr-manager-info-card">
                    <h3>HR Metrics</h3>
                    <div className="hr-manager-metrics-list">
                        <div className="hr-manager-metric-item">
                            <span>Active Employees:</span>
                            <span className="hr-manager-metric-value success">{dashboardData.activeEmployees}</span>
                        </div>
                        <div className="hr-manager-metric-item">
                            <span>Inactive Employees:</span>
                            <span className="hr-manager-metric-value">{dashboardData.inactiveEmployees}</span>
                        </div>
                        <div className="hr-manager-metric-item">
                            <span>New Hires This Month:</span>
                            <span className="hr-manager-metric-value">{dashboardData.newHiresThisMonth}</span>
                        </div>
                        <div className="hr-manager-metric-item">
                            <span>Active Vacancies:</span>
                            <span className="hr-manager-metric-value">{dashboardData.activeVacancies}</span>
                        </div>
                        <div className="hr-manager-metric-item">
                            <span>Pending Candidates:</span>
                            <span className="hr-manager-metric-value">{dashboardData.pendingCandidates}</span>
                        </div>
                        <div className="hr-manager-metric-item">
                            <span>Approved Leaves:</span>
                            <span className="hr-manager-metric-value">{dashboardData.approvedLeavesThisMonth}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Analytics Section */}
            <div className="hr-manager-additional-metrics">
                <h3>Detailed HR Analytics</h3>
                <div className="hr-analytics-grid">
                    <div className="hr-analytics-card">
                        <h4>Recruitment Pipeline</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Total Vacancies:</span>
                                <span className="analytics-value">{dashboardData.totalVacancies}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Active Vacancies:</span>
                                <span className="analytics-value success">{dashboardData.activeVacancies}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Pending Candidates:</span>
                                <span className="analytics-value">{dashboardData.pendingCandidates || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="hr-analytics-card">
                        <h4>Performance Metrics</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Turnover Rate:</span>
                                <span className="analytics-value">{dashboardData.employeeTurnoverRate || 0}%</span>
                            </div>
                            <div className="analytics-item">
                                <span>Avg Tenure:</span>
                                <span className="analytics-value">{dashboardData.averageTenure || 0} years</span>
                            </div>
                            <div className="analytics-item">
                                <span>Attendance Rate:</span>
                                <span className="analytics-value success">{dashboardData.averageAttendanceRate || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {(dashboardData.expiringContracts > 0 || dashboardData.missingDocuments > 0 || dashboardData.pendingOnboarding > 0) && (
                <div className="hr-manager-alerts-section">
                    <h3>HR Alerts</h3>
                    <div className="hr-manager-alerts-grid">
                        {dashboardData.expiringContracts > 0 && (
                            <div className="hr-manager-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.expiringContracts}</div>
                                    <div className="alert-label">Expiring Contracts</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.missingDocuments > 0 && (
                            <div className="hr-manager-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.missingDocuments}</div>
                                    <div className="alert-label">Missing Documents</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.pendingOnboarding > 0 && (
                            <div className="hr-manager-alert-card info">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.pendingOnboarding}</div>
                                    <div className="alert-label">Pending Onboarding</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRManagerDashboard;
