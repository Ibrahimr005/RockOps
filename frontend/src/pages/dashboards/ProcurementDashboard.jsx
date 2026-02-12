import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, FileText, Users, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import DashboardService from '../../services/dashboardService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ContentLoader from '../../components/common/ContentLoader/ContentLoader';
import PageHeader from '../../components/common/PageHeader/PageHeader.jsx';
import StatisticsCards from '../../components/common/StatisticsCards/StatisticsCards.jsx';
import '../../styles/dashboard-styles.scss';

/**
 * Procurement Dashboard Component
 * Displays procurement operations and vendor management metrics
 */
const ProcurementDashboard = () => {
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
            <PageHeader title="Procurement Dashboard" subtitle="Procurement operations and vendor management" />

            {/* KPI Cards */}
            <StatisticsCards
                columns={3}
                cards={[
                    {
                        icon: <FileText />,
                        label: "Request Orders",
                        value: dashboardData.totalRequestOrders,
                        variant: "primary",
                        subtitle: `${dashboardData.pendingRequestOrders} Pending`,
                    },
                    {
                        icon: <ShoppingCart />,
                        label: "Purchase Orders",
                        value: dashboardData.totalPurchaseOrders,
                        variant: "info",
                        subtitle: `${dashboardData.inProgressPurchaseOrders} In Progress`,
                    },
                    {
                        icon: <Users />,
                        label: "Merchants",
                        value: dashboardData.totalMerchants,
                        variant: "purple",
                        subtitle: `${dashboardData.activeMerchants} Active`,
                    },
                    {
                        icon: <DollarSign />,
                        label: "Total Value",
                        value: `$${(dashboardData.totalProcurementValue || 0).toLocaleString()}`,
                        variant: "success",
                        subtitle: `$${(dashboardData.pendingOrdersValue || 0).toLocaleString()} Pending`,
                    },
                    {
                        icon: <TrendingUp />,
                        label: "Fulfillment Rate",
                        value: `${dashboardData.orderFulfillmentRate}%`,
                        variant: "lime",
                        subtitle: `${dashboardData.onTimeDeliveryRate}% On-time`,
                    },
                    {
                        icon: <AlertCircle />,
                        label: "Overdue Orders",
                        value: dashboardData.overdueOrders,
                        variant: "danger",
                        subtitle: `${dashboardData.urgentRequests} Urgent`,
                    },
                ]}
            />

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
                            <span className="procurement-metric-value">{dashboardData.pendingApprovals || 0}</span>
                        </div>
                        <div className="procurement-metric-item">
                            <span>Total Procurement Value:</span>
                            <span className="procurement-metric-value success">${(dashboardData.totalProcurementValue || 0).toLocaleString()}</span>
                        </div>
                        <div className="procurement-metric-item">
                            <span>Active Merchants:</span>
                            <span className="procurement-metric-value">{dashboardData.activeMerchants || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Procurement Metrics */}
            <div className="procurement-additional-metrics">
                <h3>Vendor & Order Analytics</h3>
                <div className="procurement-analytics-grid">
                    <div className="procurement-analytics-card">
                        <h4>Order Status</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Approved Orders:</span>
                                <span className="analytics-value success">{dashboardData.approvedRequestOrders || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Completed Orders:</span>
                                <span className="analytics-value">{dashboardData.completedRequestOrders || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Rejected Orders:</span>
                                <span className="analytics-value alert">{dashboardData.rejectedRequestOrders || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="procurement-analytics-card">
                        <h4>Performance Indicators</h4>
                        <div className="analytics-content">
                            <div className="analytics-item">
                                <span>Overdue Orders:</span>
                                <span className="analytics-value alert">{dashboardData.overdueOrders || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>Urgent Requests:</span>
                                <span className="analytics-value warning">{dashboardData.urgentRequests || 0}</span>
                            </div>
                            <div className="analytics-item">
                                <span>In Progress POs:</span>
                                <span className="analytics-value">{dashboardData.inProgressPurchaseOrders || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcurementDashboard;