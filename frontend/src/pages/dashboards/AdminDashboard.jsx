import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, Server, Briefcase, Package, AlertCircle, TrendingUp, Database, Settings, ShoppingCart, Truck, Activity, Percent } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Admin Dashboard Component
 * Displays system-wide comprehensive metrics and analytics
 */
const AdminDashboard = () => {
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
            const data = await DashboardService.getAdminDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="admin-dashboard-error">No data available</div>;
    }

    const equipmentStatusData = Object.entries(dashboardData.equipmentByStatus || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const maintenanceStatusData = Object.entries(dashboardData.maintenanceByStatus || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const warehouseItemsData = Object.entries(dashboardData.warehouseItemsByStatus || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    return (
        <div className="admin-dashboard">
            <PageHeader title="Admin Dashboard" subtitle="System-wide overview and comprehensive metrics" />

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <Users />, label: "Total Users", value: dashboardData.totalUsers, variant: "primary", subtitle: `${dashboardData.activeUsers} Active` },
                    { icon: <Package />, label: "Total Equipment", value: dashboardData.totalEquipment, variant: "info", subtitle: `${dashboardData.availableEquipment} Available` },
                    { icon: <Database />, label: "Warehouses", value: dashboardData.totalWarehouses, variant: "purple", subtitle: `${dashboardData.totalWarehouseItems} Items` },
                    { icon: <Briefcase />, label: "Employees", value: dashboardData.totalEmployees, variant: "success", subtitle: `${dashboardData.activeEmployees} Active` },
                    { icon: <Settings />, label: "Maintenance", value: dashboardData.totalMaintenanceRecords, variant: "warning", subtitle: `${dashboardData.ongoingMaintenance} Ongoing` },
                    { icon: <AlertCircle />, label: "Leave Requests", value: dashboardData.pendingLeaveRequests, variant: "danger", subtitle: "Pending" },
                    { icon: <ShoppingCart />, label: "Purchase Orders", value: dashboardData.totalPurchaseOrders || 0, variant: "orange", subtitle: `${dashboardData.totalMerchants || 0} Merchants` },
                    { icon: <Truck />, label: "Transactions", value: dashboardData.totalTransactions || 0, variant: "lime", subtitle: `${dashboardData.pendingTransactions || 0} Pending` },
                    { icon: <Percent />, label: "Equipment Utilization", value: `${dashboardData.equipmentUtilizationRate || 0}%`, variant: "active", subtitle: "System-wide" },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="admin-dashboard-charts">
                <div className="admin-chart-card">
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

                <div className="admin-chart-card">
                    <h3>System Status</h3>
                    <div className="admin-system-status">
                        <div className="admin-status-item">
                            <span>System Health:</span>
                            <span className="admin-status-value success">{dashboardData.systemStatus}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Total Sites:</span>
                            <span className="admin-status-value">{dashboardData.totalSites}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Active Sites:</span>
                            <span className="admin-status-value">{dashboardData.activeSites}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Pending Vacancies:</span>
                            <span className="admin-status-value">{dashboardData.pendingVacancies}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Pending Invoices:</span>
                            <span className="admin-status-value">{dashboardData.pendingInvoices || 0}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Request Orders:</span>
                            <span className="admin-status-value">{dashboardData.totalRequestOrders || 0}</span>
                        </div>
                        <div className="admin-status-item">
                            <span>Warehouse Capacity:</span>
                            <span className="admin-status-value">{dashboardData.warehouseCapacityUsed || 0} items/warehouse</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Charts Row */}
            <div className="admin-dashboard-charts">
                <div className="admin-chart-card">
                    <h3>Maintenance Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={maintenanceStatusData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="admin-chart-card">
                    <h3>Warehouse Items Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={warehouseItemsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {warehouseItemsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

