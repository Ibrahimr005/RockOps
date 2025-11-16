import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench, Package, AlertCircle, TrendingUp, Users, Calendar } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import '../../styles/dashboard-styles.scss';

/**
 * Maintenance Manager Dashboard Component
 * Displays maintenance operations, equipment service, and technician metrics
 * Also used by MAINTENANCE_EMPLOYEE role
 */
const MaintenanceManagerDashboard = () => {
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
            const data = await DashboardService.getMaintenanceManagerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching maintenance dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="maintenance-dashboard-error">No data available</div>;
    }

    const maintenanceData = [
        { name: 'Scheduled', value: dashboardData.scheduledMaintenance || 0 },
        { name: 'Ongoing', value: dashboardData.ongoingMaintenance || 0 },
        { name: 'Completed', value: dashboardData.completedMaintenance || 0 },
        { name: 'Pending', value: dashboardData.pendingMaintenance || 0 },
    ];

    return (
        <div className="maintenance-dashboard">
            <div className="maintenance-dashboard-header">
                <h1>Maintenance Dashboard</h1>
                <p>Maintenance operations and equipment service management</p>
            </div>

            {/* KPI Cards */}
            <div className="maintenance-kpi-grid">
                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <Wrench />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.totalMaintenanceRecords}</div>
                        <div className="maintenance-kpi-label">Total Maintenance</div>
                        <div className="maintenance-kpi-sub">{dashboardData.ongoingMaintenance} Ongoing</div>
                    </div>
                </div>

                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <Calendar />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.scheduledMaintenance}</div>
                        <div className="maintenance-kpi-label">Scheduled</div>
                        <div className="maintenance-kpi-sub">{dashboardData.upcomingThisWeek} This Week</div>
                    </div>
                </div>

                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <Package />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.totalEquipment}</div>
                        <div className="maintenance-kpi-label">Total Equipment</div>
                        <div className="maintenance-kpi-sub">{dashboardData.equipmentInMaintenance} In Maintenance</div>
                    </div>
                </div>

                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <Users />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.totalTechnicians}</div>
                        <div className="maintenance-kpi-label">Technicians</div>
                        <div className="maintenance-kpi-sub">{dashboardData.availableTechnicians} Available</div>
                    </div>
                </div>

                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <TrendingUp />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.completedMaintenance}</div>
                        <div className="maintenance-kpi-label">Completed</div>
                        <div className="maintenance-kpi-sub">Total</div>
                    </div>
                </div>

                <div className="maintenance-kpi-card">
                    <div className="maintenance-kpi-icon">
                        <AlertCircle />
                    </div>
                    <div className="maintenance-kpi-content">
                        <div className="maintenance-kpi-value">{dashboardData.overdueMaintenance}</div>
                        <div className="maintenance-kpi-label">Overdue</div>
                        <div className="maintenance-kpi-sub">{dashboardData.criticalMaintenanceAlerts} Critical</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="maintenance-charts">
                <div className="maintenance-chart-card">
                    <h3>Maintenance Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={maintenanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="maintenance-info-card">
                    <h3>Operational Metrics</h3>
                    <div className="maintenance-metrics-list">
                        <div className="maintenance-metric-item">
                            <span>Equipment Available:</span>
                            <span className="maintenance-metric-value success">{dashboardData.equipmentAvailable}</span>
                        </div>
                        <div className="maintenance-metric-item">
                            <span>Equipment in Maintenance:</span>
                            <span className="maintenance-metric-value">{dashboardData.equipmentInMaintenance}</span>
                        </div>
                        <div className="maintenance-metric-item">
                            <span>Ongoing Maintenance:</span>
                            <span className="maintenance-metric-value">{dashboardData.ongoingMaintenance}</span>
                        </div>
                        <div className="maintenance-metric-item">
                            <span>Scheduled Maintenance:</span>
                            <span className="maintenance-metric-value">{dashboardData.scheduledMaintenance}</span>
                        </div>
                        <div className="maintenance-metric-item">
                            <span>Upcoming This Week:</span>
                            <span className="maintenance-metric-value">{dashboardData.upcomingThisWeek}</span>
                        </div>
                        <div className="maintenance-metric-item">
                            <span>Upcoming This Month:</span>
                            <span className="maintenance-metric-value">{dashboardData.upcomingThisMonth}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consumables Section */}
            <div className="maintenance-consumables-section">
                <h3>Parts & Consumables</h3>
                <div className="maintenance-consumables-grid">
                    <div className="maintenance-consumable-card">
                        <div className="consumable-icon">
                            <Package />
                        </div>
                        <div className="consumable-content">
                            <div className="consumable-value">{dashboardData.totalConsumables}</div>
                            <div className="consumable-label">Total Consumables</div>
                        </div>
                    </div>
                    <div className="maintenance-consumable-card warning">
                        <div className="consumable-icon">
                            <AlertCircle />
                        </div>
                        <div className="consumable-content">
                            <div className="consumable-value">{dashboardData.lowStockConsumables}</div>
                            <div className="consumable-label">Low Stock Items</div>
                        </div>
                    </div>
                    <div className="maintenance-consumable-card">
                        <div className="consumable-icon">
                            <TrendingUp />
                        </div>
                        <div className="consumable-content">
                            <div className="consumable-value">{dashboardData.usedConsumablesThisMonth}</div>
                            <div className="consumable-label">Used This Month</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {(dashboardData.overdueMaintenance > 0 || dashboardData.criticalMaintenanceAlerts > 0 || dashboardData.highPriorityTasks > 0) && (
                <div className="maintenance-alerts-section">
                    <h3>Maintenance Alerts</h3>
                    <div className="maintenance-alerts-grid">
                        {dashboardData.overdueMaintenance > 0 && (
                            <div className="maintenance-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.overdueMaintenance}</div>
                                    <div className="alert-label">Overdue Maintenance</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.criticalMaintenanceAlerts > 0 && (
                            <div className="maintenance-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.criticalMaintenanceAlerts}</div>
                                    <div className="alert-label">Critical Alerts</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.highPriorityTasks > 0 && (
                            <div className="maintenance-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.highPriorityTasks}</div>
                                    <div className="alert-label">High Priority Tasks</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Additional Maintenance Analytics */}
            <div className="maintenance-additional-metrics">
                <h3>Detailed Maintenance Analytics</h3>
                <div className="maintenance-analytics-grid">
                    <div className="maintenance-analytics-card">
                        <h4>Maintenance Schedule</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Upcoming This Week:</span>
                                <span className="analytics-value">{dashboardData.upcomingThisWeek || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Upcoming This Month:</span>
                                <span className="analytics-value">{dashboardData.upcomingThisMonth || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Pending Maintenance:</span>
                                <span className="analytics-value">{dashboardData.pendingMaintenance || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="maintenance-analytics-card">
                        <h4>Resource Utilization</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Total Technicians:</span>
                                <span className="analytics-value">{dashboardData.totalTechnicians || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Available Technicians:</span>
                                <span className="analytics-value success">{dashboardData.availableTechnicians || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Equipment Available:</span>
                                <span className="analytics-value success">{dashboardData.equipmentAvailable || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceManagerDashboard;

