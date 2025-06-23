import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { 
    Clock, Package, Wrench, TrendingUp, Activity, AlertTriangle, CheckCircle, 
    MapPin, User, DollarSign, Calendar, Thermometer, Gauge, Shield, 
    AlertCircle, Info, Zap, Target, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import axios from 'axios';
import './EquipmentDashboard.scss';

const EquipmentDashboard = forwardRef(({ equipmentId }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [equipmentData, setEquipmentData] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        consumablesOverTime: [],
        workHoursOverTime: [],
        maintenanceHistory: [],
        maintenanceAnalytics: {},
        sarkyAnalytics: {},
        summaryStats: {
            totalWorkHours: 0,
            totalConsumables: 0,
            maintenanceEvents: 0,
            averageWorkHours: 0
        }
    });
    const [alerts, setAlerts] = useState([]);

    const token = localStorage.getItem('token');
    const axiosInstance = axios.create({
        headers: { Authorization: `Bearer ${token}` }
    });

    const fetchEquipmentData = async () => {
        try {
            const response = await axiosInstance.get(`http://localhost:8080/api/equipment/${equipmentId}`);
            setEquipmentData(response.data);
        } catch (error) {
            console.error('Error fetching equipment data:', error);
        }
    };

    const fetchDashboardData = async () => {
        if (!equipmentId) return;

        try {
            setLoading(true);

            // Fetch multiple data sources in parallel
            const [
                consumablesResponse,
                sarkyResponse,
                maintenanceResponse,
                maintenanceAnalyticsResponse,
                sarkyAnalyticsResponse
            ] = await Promise.allSettled([
                // Fetch consumables data
                axiosInstance.get(`http://localhost:8080/api/equipment/${equipmentId}/consumables`),
                // Fetch work hours (sarky) data
                axiosInstance.get(`http://localhost:8080/api/v1/equipment/${equipmentId}/sarky`),
                // Fetch maintenance data
                axiosInstance.get(`http://localhost:8080/api/v1/maintenance/equipment/${equipmentId}`),
                // Fetch maintenance analytics
                axiosInstance.get(`http://localhost:8080/api/v1/maintenance/equipment/${equipmentId}/analytics`),
                // Fetch sarky analytics
                axiosInstance.get(`http://localhost:8080/api/v1/equipment/${equipmentId}/sarky/analytics`)
            ]);

            // Process consumables data
            let consumablesData = [];
            if (consumablesResponse.status === 'fulfilled' && consumablesResponse.value?.data) {
                consumablesData = processConsumablesData(consumablesResponse.value.data);
            }

            // Process sarky (work hours) data
            let workHoursData = [];
            if (sarkyResponse.status === 'fulfilled' && sarkyResponse.value?.data) {
                workHoursData = processSarkyData(sarkyResponse.value.data);
            }

            // Process maintenance data
            let maintenanceData = [];
            if (maintenanceResponse.status === 'fulfilled' && maintenanceResponse.value?.data) {
                maintenanceData = processMaintenanceData(maintenanceResponse.value.data);
            }

            // Process maintenance analytics
            let maintenanceAnalytics = {};
            if (maintenanceAnalyticsResponse.status === 'fulfilled' && maintenanceAnalyticsResponse.value?.data) {
                maintenanceAnalytics = maintenanceAnalyticsResponse.value.data;
            }

            // Process sarky analytics
            let sarkyAnalytics = {};
            if (sarkyAnalyticsResponse.status === 'fulfilled' && sarkyAnalyticsResponse.value?.data) {
                sarkyAnalytics = sarkyAnalyticsResponse.value.data;
            }

            // Calculate summary statistics
            const summaryStats = calculateSummaryStats(consumablesData, workHoursData, maintenanceData);

            setDashboardData({
                consumablesOverTime: consumablesData,
                workHoursOverTime: workHoursData,
                maintenanceHistory: maintenanceData,
                maintenanceAnalytics,
                sarkyAnalytics,
                summaryStats
            });

            // Generate alerts
            generateAlerts(equipmentData, maintenanceAnalytics, sarkyAnalytics, consumablesData);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const processConsumablesData = (data) => {
        if (!Array.isArray(data)) return [];

        const monthlyData = {};
        data.forEach(item => {
            if (item.transactionDate) {
                const date = new Date(item.transactionDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalQuantity: 0,
                        itemCount: 0,
                        totalCost: 0
                    };
                }

                monthlyData[monthKey].totalQuantity += item.quantity || 0;
                monthlyData[monthKey].itemCount += 1;
                monthlyData[monthKey].totalCost += (item.quantity || 0) * (item.unitPrice || 0);
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);
    };

    const processSarkyData = (data) => {
        if (!Array.isArray(data)) return [];

        const monthlyData = {};
        data.forEach(sarky => {
            if (sarky.workDate) {
                const date = new Date(sarky.workDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalHours: 0,
                        workDays: 0,
                        efficiency: 0
                    };
                }

                monthlyData[monthKey].totalHours += sarky.workedHours || 0;
                monthlyData[monthKey].workDays += 1;
                monthlyData[monthKey].efficiency = monthlyData[monthKey].totalHours / monthlyData[monthKey].workDays;
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);
    };

    const processMaintenanceData = (data) => {
        if (!Array.isArray(data)) return [];

        const monthlyData = {};
        data.forEach(maintenance => {
            if (maintenance.scheduledDate || maintenance.createdAt) {
                const date = new Date(maintenance.scheduledDate || maintenance.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalEvents: 0,
                        completedEvents: 0,
                        totalCost: 0
                    };
                }

                monthlyData[monthKey].totalEvents += 1;
                if (maintenance.status === 'COMPLETED') {
                    monthlyData[monthKey].completedEvents += 1;
                }
                monthlyData[monthKey].totalCost += maintenance.cost || 0;
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);
    };

    const calculateSummaryStats = (consumables, workHours, maintenance) => {
        const totalWorkHours = workHours.reduce((sum, item) => sum + item.totalHours, 0);
        const totalConsumables = consumables.reduce((sum, item) => sum + item.totalQuantity, 0);
        const maintenanceEvents = maintenance.reduce((sum, item) => sum + item.totalEvents, 0);
        const workingMonths = workHours.filter(item => item.totalHours > 0).length;
        const averageWorkHours = workingMonths > 0 ? totalWorkHours / workingMonths : 0;

        return {
            totalWorkHours: Math.round(totalWorkHours),
            totalConsumables: Math.round(totalConsumables),
            maintenanceEvents,
            averageWorkHours: Math.round(averageWorkHours * 10) / 10
        };
    };

    const generateAlerts = (equipment, maintenanceAnalytics, sarkyAnalytics, consumables) => {
        const newAlerts = [];

        // Equipment status alerts
        if (equipment?.status === 'IN_MAINTENANCE') {
            newAlerts.push({
                type: 'warning',
                icon: <Wrench size={16} />,
                title: 'Equipment in Maintenance',
                message: 'Equipment is currently undergoing maintenance'
            });
        }

        if (equipment?.status === 'UNAVAILABLE') {
            newAlerts.push({
                type: 'error',
                icon: <AlertCircle size={16} />,
                title: 'Equipment Unavailable',
                message: 'Equipment is currently unavailable for use'
            });
        }

        // Maintenance alerts
        if (maintenanceAnalytics?.overdueEvents > 0) {
            newAlerts.push({
                type: 'error',
                icon: <Calendar size={16} />,
                title: 'Overdue Maintenance',
                message: `${maintenanceAnalytics.overdueEvents} maintenance events are overdue`
            });
        }

        if (maintenanceAnalytics?.completionRate < 80) {
            newAlerts.push({
                type: 'warning',
                icon: <CheckCircle size={16} />,
                title: 'Low Maintenance Completion',
                message: `Maintenance completion rate is ${maintenanceAnalytics.completionRate}%`
            });
        }

        // Performance alerts
        if (sarkyAnalytics?.averageHoursPerDay < 4) {
            newAlerts.push({
                type: 'info',
                icon: <Activity size={16} />,
                title: 'Low Utilization',
                message: 'Equipment utilization is below optimal levels'
            });
        }

        // Consumables alerts
        if (consumables.length > 0) {
            const recentConsumables = consumables.slice(-3);
            const avgConsumption = recentConsumables.reduce((sum, item) => sum + item.totalQuantity, 0) / recentConsumables.length;
            if (avgConsumption > 100) {
                newAlerts.push({
                    type: 'warning',
                    icon: <Package size={16} />,
                    title: 'High Consumables Usage',
                    message: 'Consumables usage is higher than normal'
                });
            }
        }

        setAlerts(newAlerts);
    };

    const formatMonth = (monthString) => {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'available': return 'var(--color-success)';
            case 'in_use': return 'var(--color-primary)';
            case 'in_maintenance': return 'var(--color-warning)';
            case 'unavailable': return 'var(--color-danger)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const CustomTooltip = ({ active, payload, label, labelFormatter, formatter }) => {
        if (active && payload && payload.length) {
            return (
                <div className="rockops-dashboard-tooltip">
                    <p className="tooltip-label">{labelFormatter ? labelFormatter(label) : label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="tooltip-entry" style={{ color: entry.color }}>
                            <span className="tooltip-dot" style={{ backgroundColor: entry.color }}></span>
                            {formatter ? formatter(entry.value, entry.name)[0] : `${entry.name}: ${entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
        refreshDashboard: () => {
            fetchEquipmentData();
            fetchDashboardData();
        }
    }));

    useEffect(() => {
        fetchEquipmentData();
        fetchDashboardData();
    }, [equipmentId]);

    if (loading) {
        return (
            <div className="rockops-dashboard-loading">
                <div className="rockops-dashboard-loading-spinner"></div>
                <p>Loading comprehensive equipment insights...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rockops-dashboard-error">
                <AlertTriangle size={48} className="error-icon" />
                <h3>Unable to Load Dashboard</h3>
                <p>{error}</p>
                <button onClick={fetchDashboardData} className="rockops-btn rockops-btn--primary">
                    <Activity size={16} />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="rockops-equipment-dashboard">
            {/* Header */}
            <div className="rockops-dashboard-header">
                <div className="rockops-dashboard-title">
                    <TrendingUp size={24} />
                    <h2>Equipment Performance Dashboard</h2>
                </div>
                <div className="rockops-dashboard-subtitle">
                    <p>Comprehensive overview of equipment metrics, health, and operational insights</p>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="rockops-dashboard-alerts">
                    {alerts.map((alert, index) => (
                        <div key={index} className={`rockops-alert rockops-alert--${alert.type}`}>
                            <div className="rockops-alert-icon">{alert.icon}</div>
                            <div className="rockops-alert-content">
                                <div className="rockops-alert-title">{alert.title}</div>
                                <div className="rockops-alert-message">{alert.message}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

          

            {/* Summary Stats */}
            <div className="rockops-dashboard-stats">
                <div className="rockops-stat-card primary">
                    <div className="rockops-stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="rockops-stat-content">
                        <div className="rockops-stat-value">{dashboardData.summaryStats.totalWorkHours}</div>
                        <div className="rockops-stat-label">Total Work Hours</div>
                        <div className="rockops-stat-sublabel">Last 12 months</div>
                    </div>
                </div>

                <div className="rockops-stat-card success">
                    <div className="rockops-stat-icon">
                        <Package size={24} />
                    </div>
                    <div className="rockops-stat-content">
                        <div className="rockops-stat-value">{dashboardData.summaryStats.totalConsumables}</div>
                        <div className="rockops-stat-label">Consumables Used</div>
                        <div className="rockops-stat-sublabel">Total quantity</div>
                    </div>
                </div>

                <div className="rockops-stat-card warning">
                    <div className="rockops-stat-icon">
                        <Wrench size={24} />
                    </div>
                    <div className="rockops-stat-content">
                        <div className="rockops-stat-value">{dashboardData.summaryStats.maintenanceEvents}</div>
                        <div className="rockops-stat-label">Maintenance Events</div>
                        <div className="rockops-stat-sublabel">Last 12 months</div>
                    </div>
                </div>

                <div className="rockops-stat-card info">
                    <div className="rockops-stat-icon">
                        <Activity size={24} />
                    </div>
                    <div className="rockops-stat-content">
                        <div className="rockops-stat-value">{dashboardData.summaryStats.averageWorkHours}</div>
                        <div className="rockops-stat-label">Average Hours/Month</div>
                        <div className="rockops-stat-sublabel">Monthly average</div>
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="rockops-performance-metrics">
                <div className="rockops-metrics-header">
                    <h3>Performance Metrics</h3>
                </div>
                <div className="rockops-metrics-grid">
                    <div className="rockops-metric-card">
                        <div className="rockops-metric-icon">
                            <Gauge size={20} />
                        </div>
                        <div className="rockops-metric-content">
                            <div className="rockops-metric-value">
                                {dashboardData.sarkyAnalytics?.averageHoursPerDay || 0}
                            </div>
                            <div className="rockops-metric-label">Avg Hours/Day</div>
                        </div>
                    </div>
                    <div className="rockops-metric-card">
                        <div className="rockops-metric-icon">
                            <Target size={20} />
                        </div>
                        <div className="rockops-metric-content">
                            <div className="rockops-metric-value">
                                {dashboardData.maintenanceAnalytics?.completionRate || 0}%
                            </div>
                            <div className="rockops-metric-label">Maintenance Completion</div>
                        </div>
                    </div>
                    <div className="rockops-metric-card">
                        <div className="rockops-metric-icon">
                            <Zap size={20} />
                        </div>
                        <div className="rockops-metric-content">
                            <div className="rockops-metric-value">
                                {dashboardData.maintenanceAnalytics?.meanTimeBetweenEvents || 0}
                            </div>
                            <div className="rockops-metric-label">Days Between Maintenance</div>
                        </div>
                    </div>
                    <div className="rockops-metric-card">
                        <div className="rockops-metric-icon">
                            <Thermometer size={20} />
                        </div>
                        <div className="rockops-metric-content">
                            <div className="rockops-metric-value">
                                {dashboardData.maintenanceAnalytics?.overdueEvents || 0}
                            </div>
                            <div className="rockops-metric-label">Overdue Events</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="rockops-dashboard-charts">
                {/* Work Hours Chart */}
                <div className="rockops-chart-card">
                    <div className="rockops-chart-header">
                        <div className="rockops-chart-title">
                            <Clock size={20} />
                            <h3>Work Hours Over Time</h3>
                        </div>
                        <div className="rockops-chart-subtitle">
                            Monthly work hours and efficiency trends
                        </div>
                    </div>
                    <div className="rockops-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={dashboardData.workHoursOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={formatMonth}
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <Tooltip
                                    content={<CustomTooltip
                                        labelFormatter={formatMonth}
                                        formatter={(value, name) => {
                                            if (name === 'totalHours') return [`${value} hours`, 'Work Hours'];
                                            if (name === 'efficiency') return [`${value.toFixed(1)} hours/day`, 'Efficiency'];
                                            return [`${value}`, name];
                                        }}
                                    />}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalHours"
                                    stroke="var(--color-primary)"
                                    fill="rgba(72, 128, 255, 0.1)"
                                    strokeWidth={2}
                                    name="Work Hours"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="efficiency"
                                    stroke="var(--color-success)"
                                    strokeWidth={2}
                                    dot={{ fill: "var(--color-success)", strokeWidth: 2, r: 4 }}
                                    name="Efficiency"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Maintenance Health Chart */}
                <div className="rockops-chart-card">
                    <div className="rockops-chart-header">
                        <div className="rockops-chart-title">
                            <Wrench size={20} />
                            <h3>Maintenance Health</h3>
                        </div>
                        <div className="rockops-chart-subtitle">
                            Maintenance completion and cost trends
                        </div>
                    </div>
                    <div className="rockops-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.maintenanceHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={formatMonth}
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <Tooltip
                                    content={<CustomTooltip
                                        labelFormatter={formatMonth}
                                        formatter={(value, name) => {
                                            if (name === 'totalEvents') return [`${value} events`, 'Total Events'];
                                            if (name === 'completedEvents') return [`${value} events`, 'Completed Events'];
                                            if (name === 'totalCost') return [formatCurrency(value), 'Total Cost'];
                                            return [`${value}`, name];
                                        }}
                                    />}
                                />
                                <Bar
                                    dataKey="totalEvents"
                                    fill="var(--color-warning)"
                                    name="Total Events"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="completedEvents"
                                    fill="var(--color-success)"
                                    name="Completed Events"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Consumables Usage Chart */}
                <div className="rockops-chart-card">
                    <div className="rockops-chart-header">
                        <div className="rockops-chart-title">
                            <Package size={20} />
                            <h3>Consumables Usage & Cost</h3>
                        </div>
                        <div className="rockops-chart-subtitle">
                            Monthly consumables consumption and costs
                        </div>
                    </div>
                    <div className="rockops-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.consumablesOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={formatMonth}
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="var(--color-text-secondary)"
                                    fontSize={12}
                                />
                                <Tooltip
                                    content={<CustomTooltip
                                        labelFormatter={formatMonth}
                                        formatter={(value, name) => {
                                            if (name === 'totalQuantity') return [`${value} items`, 'Total Quantity'];
                                            if (name === 'totalCost') return [formatCurrency(value), 'Total Cost'];
                                            return [`${value}`, name];
                                        }}
                                    />}
                                />
                                <Bar
                                    dataKey="totalQuantity"
                                    fill="var(--color-info)"
                                    name="Total Quantity"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Work Type Distribution */}
                {dashboardData.sarkyAnalytics?.workTypeBreakdown && (
                    <div className="rockops-chart-card">
                        <div className="rockops-chart-header">
                            <div className="rockops-chart-title">
                                <PieChartIcon size={20} />
                                <h3>Work Type Distribution</h3>
                            </div>
                            <div className="rockops-chart-subtitle">
                                Breakdown of work hours by type
                            </div>
                        </div>
                        <div className="rockops-chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={dashboardData.sarkyAnalytics.workTypeBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="totalHours"
                                    >
                                        {dashboardData.sarkyAnalytics.workTypeBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} hours`, 'Work Hours']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Insights */}
            <div className="rockops-dashboard-insights">
                <div className="rockops-insights-card">
                    <div className="rockops-insights-header">
                        <h3>
                            <CheckCircle size={20} />
                            Performance Insights
                        </h3>
                    </div>
                    <div className="rockops-insights-content">
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.sarkyAnalytics?.averageHoursPerDay > 0 ?
                                    `${Math.round((dashboardData.sarkyAnalytics.averageHoursPerDay / 8) * 100)}%` :
                                    '0%'
                                }
                            </div>
                            <div className="insight-label">Daily Utilization Rate</div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.maintenanceAnalytics?.completionRate || 0}%
                            </div>
                            <div className="insight-label">Maintenance Completion Rate</div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.workHoursOverTime.filter(item => item.totalHours > 0).length}
                            </div>
                            <div className="insight-label">Active Months</div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.maintenanceAnalytics?.meanTimeBetweenEvents || 0}
                            </div>
                            <div className="insight-label">Avg Days Between Maintenance</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EquipmentDashboard;
