import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Package, Wrench, TrendingUp, AlertCircle, Activity, Settings } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
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
            <div className="equipment-manager-dashboard-header">
                <h1>Equipment Manager Dashboard</h1>
                <p>Equipment inventory and maintenance management</p>
            </div>

            {/* KPI Cards */}
            <div className="equipment-manager-kpi-grid">
                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <Package />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.totalEquipment}</div>
                        <div className="equipment-manager-kpi-label">Total Equipment</div>
                        <div className="equipment-manager-kpi-sub">{dashboardData.availableEquipment} Available</div>
                    </div>
                </div>

                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <Activity />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.inUseEquipment}</div>
                        <div className="equipment-manager-kpi-label">In Use</div>
                        <div className="equipment-manager-kpi-sub">{dashboardData.overallUtilizationRate}% Utilization</div>
                    </div>
                </div>

                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <Wrench />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.inMaintenanceEquipment}</div>
                        <div className="equipment-manager-kpi-label">In Maintenance</div>
                        <div className="equipment-manager-kpi-sub">{dashboardData.ongoingMaintenance} Ongoing</div>
                    </div>
                </div>

                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <Settings />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.totalMaintenanceRecords}</div>
                        <div className="equipment-manager-kpi-label">Maintenance Records</div>
                        <div className="equipment-manager-kpi-sub">{dashboardData.scheduledMaintenance} Scheduled</div>
                    </div>
                </div>

                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <AlertCircle />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.outOfServiceEquipment}</div>
                        <div className="equipment-manager-kpi-label">Out of Service</div>
                        <div className="equipment-manager-kpi-sub">{dashboardData.overdueMaintenanceCount} Overdue</div>
                    </div>
                </div>

                <div className="equipment-manager-kpi-card">
                    <div className="equipment-manager-kpi-icon">
                        <TrendingUp />
                    </div>
                    <div className="equipment-manager-kpi-content">
                        <div className="equipment-manager-kpi-value">{dashboardData.completedMaintenanceThisMonth}</div>
                        <div className="equipment-manager-kpi-label">Completed Maintenance</div>
                        <div className="equipment-manager-kpi-sub">This Month</div>
                    </div>
                </div>
            </div>

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
