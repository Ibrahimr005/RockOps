import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, Database, TrendingUp, AlertCircle, Users, Activity } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Warehouse Manager Dashboard Component
 * Displays warehouse operations, inventory, and transaction metrics
 * Also used by WAREHOUSE_EMPLOYEE role
 */
const WarehouseManagerDashboard = () => {
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
            const data = await DashboardService.getWarehouseManagerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching warehouse dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="warehouse-dashboard-error">No data available</div>;
    }

    const itemsStatusData = Object.entries(dashboardData.itemsByStatus || {}).map(([name, value]) => ({
        name,
        value,
    }));

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="warehouse-dashboard">
            <PageHeader title="Warehouse Dashboard" subtitle="Inventory management and warehouse operations" />

            {/* KPI Cards */}
            <StatisticsCards
                cards={[
                    { icon: <Database />, label: "Total Warehouses", value: dashboardData.totalWarehouses, variant: "primary", subtitle: `${dashboardData.activeWarehouses} Active` },
                    { icon: <Package />, label: "Total Items", value: dashboardData.totalItems, variant: "info", subtitle: `${dashboardData.inStockItems} In Stock` },
                    { icon: <Activity />, label: "Transactions", value: dashboardData.totalTransactions, variant: "purple", subtitle: `${dashboardData.pendingTransactions} Pending` },
                    { icon: <TrendingUp />, label: "Utilization Rate", value: `${dashboardData.utilizationRate}%`, variant: "success", subtitle: `${dashboardData.usedCapacity}/${dashboardData.totalCapacity}` },
                    { icon: <AlertCircle />, label: "Missing Items", value: dashboardData.missingItems, variant: "danger", subtitle: `${dashboardData.overReceivedItems} Over-received` },
                    { icon: <Users />, label: "Team Members", value: dashboardData.totalEmployees, variant: "active", subtitle: `${dashboardData.activeEmployees} Active` },
                ]}
                columns={3}
            />

            {/* Charts Section */}
            <div className="warehouse-charts">
                <div className="warehouse-chart-card">
                    <h3>Inventory Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={itemsStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {itemsStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="warehouse-info-card">
                    <h3>Operational Metrics</h3>
                    <div className="warehouse-metrics-list">
                        <div className="warehouse-metric-item">
                            <span>Inventory Accuracy:</span>
                            <span className="warehouse-metric-value success">{dashboardData.inventoryAccuracy}%</span>
                        </div>
                        <div className="warehouse-metric-item">
                            <span>Order Fulfillment Rate:</span>
                            <span className="warehouse-metric-value success">{dashboardData.orderFulfillmentRate}%</span>
                        </div>
                        <div className="warehouse-metric-item">
                            <span>Pending Transactions:</span>
                            <span className="warehouse-metric-value">{dashboardData.pendingTransactions}</span>
                        </div>
                        <div className="warehouse-metric-item">
                            <span>Completed This Week:</span>
                            <span className="warehouse-metric-value">{dashboardData.completedTransactionsThisWeek}</span>
                        </div>
                        <div className="warehouse-metric-item">
                            <span>Delivering Items:</span>
                            <span className="warehouse-metric-value">{dashboardData.deliveryItems}</span>
                        </div>
                        <div className="warehouse-metric-item">
                            <span>Pending Items:</span>
                            <span className="warehouse-metric-value">{dashboardData.pendingItems}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Metrics Section */}
            <div className="warehouse-additional-metrics">
                <h3>Detailed Analytics</h3>
                <div className="warehouse-analytics-grid">
                    <div className="warehouse-analytics-card">
                        <h4>Stock Status</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Low Stock Items:</span>
                                <span className="analytics-value warning">{dashboardData.lowStockItems || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Out of Stock:</span>
                                <span className="analytics-value alert">{dashboardData.outOfStockItems || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Overstock Items:</span>
                                <span className="analytics-value">{dashboardData.overstockItems || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="warehouse-analytics-card">
                        <h4>Transaction Performance</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Completed Today:</span>
                                <span className="analytics-value success">{dashboardData.completedTransactionsToday || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Avg Processing Time:</span>
                                <span className="analytics-value">{dashboardData.averageProcessingTime || 0} hrs</span>
                            </div>
                            <div className="analytics-item">
                                <span>Available Capacity:</span>
                                <span className="analytics-value">{dashboardData.availableCapacity || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Alerts Section */}
            {(dashboardData.missingItems > 0 || dashboardData.overReceivedItems > 0 || dashboardData.lowStockItems > 0) && (
                <div className="warehouse-alerts-section">
                    <h3>Stock Alerts</h3>
                    <div className="warehouse-alerts-grid">
                        {dashboardData.missingItems > 0 && (
                            <div className="warehouse-alert-card alert">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.missingItems}</div>
                                    <div className="alert-label">Missing Items</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.overReceivedItems > 0 && (
                            <div className="warehouse-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.overReceivedItems}</div>
                                    <div className="alert-label">Over-received Items</div>
                                </div>
                            </div>
                        )}
                        {dashboardData.lowStockItems > 0 && (
                            <div className="warehouse-alert-card warning">
                                <AlertCircle />
                                <div>
                                    <div className="alert-value">{dashboardData.lowStockItems}</div>
                                    <div className="alert-label">Low Stock Items</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseManagerDashboard;
