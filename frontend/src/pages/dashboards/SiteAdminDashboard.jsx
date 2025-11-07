import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, Database, AlertCircle, TrendingUp, MapPin } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { SnackbarContext } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import './Dashboard.css';

/**
 * Site Admin Dashboard Component
 * Displays site-specific management metrics and operational data
 */
const SiteAdminDashboard = () => {
    const { t } = useTranslation();
    const { showError } = useContext(SnackbarContext);
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
            <div className="site-admin-dashboard-header">
                <div>
                    <h1>{dashboardData.siteName}</h1>
                    <p>Site Administration Dashboard</p>
                </div>
                <div className="site-admin-status-badge">
                    <MapPin size={18} />
                    <span>{dashboardData.siteStatus}</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="site-admin-kpi-grid">
                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <Users />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.totalEmployees}</div>
                        <div className="site-admin-kpi-label">Total Employees</div>
                        <div className="site-admin-kpi-sub">{dashboardData.activeEmployees} Active</div>
                    </div>
                </div>

                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <Package />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.totalEquipment}</div>
                        <div className="site-admin-kpi-label">Equipment</div>
                        <div className="site-admin-kpi-sub">{dashboardData.availableEquipment} Available</div>
                    </div>
                </div>

                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <Database />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.totalWarehouses}</div>
                        <div className="site-admin-kpi-label">Warehouses</div>
                        <div className="site-admin-kpi-sub">{dashboardData.totalInventoryItems} Items</div>
                    </div>
                </div>

                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <AlertCircle />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.criticalAlerts}</div>
                        <div className="site-admin-kpi-label">Critical Alerts</div>
                        <div className="site-admin-kpi-sub">{dashboardData.pendingApprovals} Pending</div>
                    </div>
                </div>

                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <TrendingUp />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.siteUtilizationRate}%</div>
                        <div className="site-admin-kpi-label">Site Utilization</div>
                        <div className="site-admin-kpi-sub">Overall Rate</div>
                    </div>
                </div>

                <div className="site-admin-kpi-card">
                    <div className="site-admin-kpi-icon">
                        <TrendingUp />
                    </div>
                    <div className="site-admin-kpi-content">
                        <div className="site-admin-kpi-value">{dashboardData.equipmentUtilizationRate}%</div>
                        <div className="site-admin-kpi-label">Equipment Utilization</div>
                        <div className="site-admin-kpi-sub">Active Usage</div>
                    </div>
                </div>
            </div>

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