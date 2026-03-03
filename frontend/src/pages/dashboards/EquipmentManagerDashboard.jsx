import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Package, Wrench, TrendingUp, AlertCircle, Activity, Settings } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Equipment Manager Dashboard Component
 * Displays equipment inventory, maintenance, and utilization metrics
 */
const EquipmentManagerDashboard = () => {
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
            const data = await DashboardService.getEquipmentManagerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching equipment manager dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="equipment-dashboard-error">No data available</div>;
    }

    const equipmentStatusData = Object.entries(dashboardData.equipmentByStatus || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const maintenanceTypeData = Object.entries(dashboardData.maintenanceByType || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="equipment-manager-dashboard">
            <PageHeader title="Equipment Manager Dashboard" subtitle="Equipment inventory and maintenance management" />

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <Package />, label: "Total Equipment", value: dashboardData.totalEquipment, variant: "primary", subtitle: `${dashboardData.availableEquipment} Available` },
                    { icon: <Activity />, label: "In Use", value: dashboardData.inUseEquipment, variant: "active", subtitle: `${dashboardData.overallUtilizationRate}% Utilization` },
                    { icon: <Wrench />, label: "In Maintenance", value: dashboardData.inMaintenanceEquipment, variant: "warning", subtitle: `${dashboardData.ongoingMaintenance} Ongoing` },
                    { icon: <Settings />, label: "Maintenance Records", value: dashboardData.totalMaintenanceRecords, variant: "info", subtitle: `${dashboardData.scheduledMaintenance} Scheduled` },
                    { icon: <AlertCircle />, label: "Out of Service", value: dashboardData.outOfServiceEquipment, variant: "danger", subtitle: `${dashboardData.overdueMaintenanceCount} Overdue` },
                    { icon: <TrendingUp />, label: "Completed Maintenance", value: dashboardData.completedMaintenanceThisMonth, variant: "success", subtitle: "This Month" },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="equipment-manager-charts">
                <div className="equipment-manager-chart-card">
                    <h3>Equipment Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={equipmentStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {equipmentStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="equipment-manager-info-card">
                    <h3>Equipment Metrics</h3>
                    <div className="equipment-manager-metrics-list">
                        <div className="equipment-manager-metric-item">
                            <span>Available Equipment:</span>
                            <span className="equipment-manager-metric-value success">{dashboardData.availableEquipment}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>In Use:</span>
                            <span className="equipment-manager-metric-value">{dashboardData.inUseEquipment}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>In Maintenance:</span>
                            <span className="equipment-manager-metric-value">{dashboardData.inMaintenanceEquipment}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Out of Service:</span>
                            <span className="equipment-manager-metric-value alert">{dashboardData.outOfServiceEquipment}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Overall Utilization:</span>
                            <span className="equipment-manager-metric-value success">{dashboardData.overallUtilizationRate}%</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Upcoming Maintenance:</span>
                            <span className="equipment-manager-metric-value">{dashboardData.upcomingMaintenanceCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Charts Row */}
            <div className="equipment-manager-charts">
                <div className="equipment-manager-chart-card">
                    <h3>Maintenance Status Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={maintenanceTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="equipment-manager-info-card">
                    <h3>Performance Metrics</h3>
                    <div className="equipment-manager-metrics-list">
                        <div className="equipment-manager-metric-item">
                            <span>Avg Maintenance Duration:</span>
                            <span className="equipment-manager-metric-value">{dashboardData.averageMaintenanceDuration || 0} days</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Total Maintenance Records:</span>
                            <span className="equipment-manager-metric-value">{dashboardData.totalMaintenanceRecords}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Completed This Month:</span>
                            <span className="equipment-manager-metric-value success">{dashboardData.completedMaintenanceThisMonth}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Low Stock Consumables:</span>
                            <span className="equipment-manager-metric-value alert">{dashboardData.lowStockConsumables}</span>
                        </div>
                        <div className="equipment-manager-metric-item">
                            <span>Critical Stock Items:</span>
                            <span className="equipment-manager-metric-value alert">{dashboardData.criticalStockConsumables}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance Overview */}
            <div className="equipment-manager-maintenance-section">
                <h3>Maintenance Overview</h3>
                <div className="equipment-manager-maintenance-grid">
                    <div className="equipment-manager-maintenance-card">
                        <div className="maintenance-icon">
                            <Wrench />
                        </div>
                        <div className="maintenance-content">
                            <div className="maintenance-value">{dashboardData.ongoingMaintenance}</div>
                            <div className="maintenance-label">Ongoing Maintenance</div>
                        </div>
                    </div>
                    <div className="equipment-manager-maintenance-card">
                        <div className="maintenance-icon">
                            <Settings />
                        </div>
                        <div className="maintenance-content">
                            <div className="maintenance-value">{dashboardData.scheduledMaintenance}</div>
                            <div className="maintenance-label">Scheduled Maintenance</div>
                        </div>
                    </div>
                    <div className="equipment-manager-maintenance-card">
                        <div className="maintenance-icon">
                            <TrendingUp />
                        </div>
                        <div className="maintenance-content">
                            <div className="maintenance-value">{dashboardData.completedMaintenanceThisMonth}</div>
                            <div className="maintenance-label">Completed This Month</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {(dashboardData.overdueMaintenanceCount > 0 || dashboardData.lowStockConsumables > 0 || dashboardData.outOfServiceEquipment > 0) && (
                <div className="equipment-manager-alerts-section">
                    <h3>Equipment Alerts</h3>
                    <div className="equipment-manager-alerts-grid">
                        {dashboardData.overdueMaintenanceCount > 0 && (
                            <div className="equipment-manager-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.overdueMaintenanceCount}</div>
                                    <div className="alert-label">Overdue Maintenance</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.outOfServiceEquipment > 0 && (
                            <div className="equipment-manager-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.outOfServiceEquipment}</div>
                                    <div className="alert-label">Out of Service</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.lowStockConsumables > 0 && (
                            <div className="equipment-manager-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.lowStockConsumables}</div>
                                    <div className="alert-label">Low Stock Consumables</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentManagerDashboard;
