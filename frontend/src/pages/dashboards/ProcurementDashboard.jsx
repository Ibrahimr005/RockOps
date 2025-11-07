import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, FileText, Users, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { SnackbarContext } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import './Dashboard.css';

/**
 * Procurement Dashboard Component
 * Displays procurement operations and vendor management metrics
 */
const ProcurementDashboard = () => {
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
            const data = await DashboardService.getProcurementDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching procurement dashboard:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ContentLoader />;
    }

    if (!dashboardData) {
        return <div className="procurement-dashboard-error">No data available</div>;
    }

    const requestOrdersData = [
        { name: 'Pending', value: dashboardData.pendingRequestOrders || 0 },
        { name: 'Approved', value: dashboardData.approvedRequestOrders || 0 },
        { name: 'Completed', value: dashboardData.completedRequestOrders || 0 },
        { name: 'Rejected', value: dashboardData.rejectedRequestOrders || 0 },
    ];

    return (
        <div className="procurement-dashboard">
            <div className="procurement-dashboard-header">
                <h1>Procurement Dashboard</h1>
                <p>Procurement operations and vendor management</p>
            </div>

            {/* KPI Cards */}
            <div className="procurement-kpi-grid">
                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <FileText />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">{dashboardData.totalRequestOrders}</div>
                        <div className="procurement-kpi-label">Request Orders</div>
                        <div className="procurement-kpi-sub">{dashboardData.pendingRequestOrders} Pending</div>
                    </div>
                </div>

                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <ShoppingCart />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">{dashboardData.totalPurchaseOrders}</div>
                        <div className="procurement-kpi-label">Purchase Orders</div>
                        <div className="procurement-kpi-sub">{dashboardData.inProgressPurchaseOrders} In Progress</div>
                    </div>
                </div>

                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <Users />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">{dashboardData.totalMerchants}</div>
                        <div className="procurement-kpi-label">Merchants</div>
                        <div className="procurement-kpi-sub">{dashboardData.activeMerchants} Active</div>
                    </div>
                </div>

                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <DollarSign />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">
                            ${(dashboardData.totalProcurementValue || 0).toLocaleString()}
                        </div>
                        <div className="procurement-kpi-label">Total Value</div>
                        <div className="procurement-kpi-sub">
                            ${(dashboardData.pendingOrdersValue || 0).toLocaleString()} Pending
                        </div>
                    </div>
                </div>

                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <TrendingUp />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">{dashboardData.orderFulfillmentRate}%</div>
                        <div className="procurement-kpi-label">Fulfillment Rate</div>
                        <div className="procurement-kpi-sub">
                            {dashboardData.onTimeDeliveryRate}% On-time
                        </div>
                    </div>
                </div>

                <div className="procurement-kpi-card">
                    <div className="procurement-kpi-icon">
                        <AlertCircle />
                    </div>
                    <div className="procurement-kpi-content">
                        <div className="procurement-kpi-value">{dashboardData.overdueOrders}</div>
                        <div className="procurement-kpi-label">Overdue Orders</div>
                        <div className="procurement-kpi-sub">{dashboardData.urgentRequests} Urgent</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="procurement-charts">
                <div className="procurement-chart-card">
                    <h3>Request Orders Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={requestOrdersData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="procurement-info-card">
                    <h3>Performance Metrics</h3>
                    <div className="procurement-metrics-list">
                        <div className="procurement-metric-item">
                            <span>Avg Processing Time:</span>
                            <span className="procurement-metric-value">
                                {dashboardData.averageProcessingTime} days
                            </span>
                        </div>
                        <div className="procurement-metric-item">
                            <span>Order Fulfillment Rate:</span>
                            <span className="procurement-metric-value success">
                                {dashboardData.orderFulfillmentRate}%
                            </span>
                        </div>
                        <div className="procurement-metric-item">
                            <span>On-time Delivery:</span>
                            <span className="procurement-metric-value success">
                                {dashboardData.onTimeDeliveryRate}%
                            </span>
                        </div>
                        <div className="procurement-metric-item">
                            <span>Pending Approvals:</span>
                            <span className="procurement-metric-value">{dashboardData.pendingApprovals}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcurementDashboard;