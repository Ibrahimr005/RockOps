import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, Database, AlertCircle, TrendingUp, MapPin } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Site Admin Dashboard Component
 * Displays site-specific management metrics and operational data
 */
const SiteAdminDashboard = () => {
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
            const data = await DashboardService.getSiteAdminDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching site admin dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="site-admin-dashboard-error">No data available</div>;
    }

    const equipmentData = [
        { name: 'Available', value: dashboardData.availableEquipment || 0 },
        { name: 'In Use', value: dashboardData.inUseEquipment || 0 },
        { name: 'Maintenance', value: dashboardData.inMaintenanceEquipment || 0 },
    ];

    return (
        <div className="site-admin-dashboard">
            <PageHeader title={dashboardData.siteName} subtitle="Site Administration Dashboard">
                <div className="site-admin-status-badge">
                    <MapPin size={18} />
                    <span>{dashboardData.siteStatus}</span>
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <Users />, label: "Total Employees", value: dashboardData.totalEmployees, variant: "primary", subtitle: `${dashboardData.activeEmployees} Active` },
                    { icon: <Package />, label: "Equipment", value: dashboardData.totalEquipment, variant: "info", subtitle: `${dashboardData.availableEquipment} Available` },
                    { icon: <Database />, label: "Warehouses", value: dashboardData.totalWarehouses, variant: "purple", subtitle: `${dashboardData.totalInventoryItems} Items` },
                    { icon: <AlertCircle />, label: "Critical Alerts", value: dashboardData.criticalAlerts, variant: "danger", subtitle: `${dashboardData.pendingApprovals} Pending` },
                    { icon: <TrendingUp />, label: "Site Utilization", value: `${dashboardData.siteUtilizationRate}%`, variant: "success", subtitle: "Overall Rate" },
                    { icon: <TrendingUp />, label: "Equipment Utilization", value: `${dashboardData.equipmentUtilizationRate}%`, variant: "active", subtitle: "Active Usage" },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="site-admin-charts">
                <div className="site-admin-chart-card">
                    <h3>Equipment Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={equipmentData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="site-admin-info-card">
                    <h3>Operational Metrics</h3>
                    <div className="site-admin-metrics-list">
                        <div className="site-admin-metric-item">
                            <span>Active Projects:</span>
                            <span className="site-admin-metric-value">{dashboardData.activeProjects}</span>
                        </div>
                        <div className="site-admin-metric-item">
                            <span>Critical Alerts:</span>
                            <span className="site-admin-metric-value alert">{dashboardData.criticalAlerts}</span>
                        </div>
                        <div className="site-admin-metric-item">
                            <span>Pending Approvals:</span>
                            <span className="site-admin-metric-value">{dashboardData.pendingApprovals}</span>
                        </div>
                        <div className="site-admin-metric-item">
                            <span>Equipment Utilization:</span>
                            <span className="site-admin-metric-value success">{dashboardData.equipmentUtilizationRate}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SiteAdminDashboard;