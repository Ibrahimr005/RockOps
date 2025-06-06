import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Clock, Package, Wrench, TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './EquipmentDashboard.scss';

const EquipmentDashboard = forwardRef(({ equipmentId }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        consumablesOverTime: [],
        workHoursOverTime: [],
        maintenanceHistory: [],
        summaryStats: {
            totalWorkHours: 0,
            totalConsumables: 0,
            maintenanceEvents: 0,
            averageWorkHours: 0
        }
    });

    const token = localStorage.getItem('token');
    const axiosInstance = axios.create({
        headers: { Authorization: `Bearer ${token}` }
    });

    const fetchDashboardData = async () => {
        if (!equipmentId) return;

        try {
            setLoading(true);

            // Fetch multiple data sources in parallel
            const [
                consumablesResponse,
                sarkyResponse,
                maintenanceResponse
            ] = await Promise.allSettled([
                // Fetch consumables data
                axiosInstance.get(`http://localhost:8080/api/equipment/${equipmentId}/consumables`),
                // Fetch work hours (sarky) data
                axiosInstance.get(`http://localhost:8080/api/v1/equipment/${equipmentId}/sarky`),
                // Fetch maintenance data (using same endpoint as InSiteMaintenanceLog)
                axiosInstance.get(`http://localhost:8080/api/v1/maintenance/equipment/${equipmentId}`)
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

            // Calculate summary statistics
            const summaryStats = calculateSummaryStats(consumablesData, workHoursData, maintenanceData);

            setDashboardData({
                consumablesOverTime: consumablesData,
                workHoursOverTime: workHoursData,
                maintenanceHistory: maintenanceData,
                summaryStats
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const processConsumablesData = (data) => {
        if (!Array.isArray(data)) return [];

        // Group consumables by month and sum quantities
        const monthlyData = {};

        data.forEach(item => {
            if (item.transactionDate) {
                const date = new Date(item.transactionDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalQuantity: 0,
                        itemCount: 0
                    };
                }

                monthlyData[monthKey].totalQuantity += item.quantity || 0;
                monthlyData[monthKey].itemCount += 1;
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Show last 12 months
    };

    const processSarkyData = (data) => {
        if (!Array.isArray(data)) return [];

        // Group work hours by month
        const monthlyData = {};

        data.forEach(sarky => {
            if (sarky.workDate) {
                const date = new Date(sarky.workDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalHours: 0,
                        workDays: 0
                    };
                }

                monthlyData[monthKey].totalHours += sarky.workedHours || 0;
                monthlyData[monthKey].workDays += 1;
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Show last 12 months
    };

    const processMaintenanceData = (data) => {
        if (!Array.isArray(data)) return [];

        // Group maintenance events by month
        const monthlyData = {};

        data.forEach(maintenance => {
            if (maintenance.scheduledDate || maintenance.createdAt) {
                const date = new Date(maintenance.scheduledDate || maintenance.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalEvents: 0,
                        completedEvents: 0
                    };
                }

                monthlyData[monthKey].totalEvents += 1;
                if (maintenance.status === 'COMPLETED') {
                    monthlyData[monthKey].completedEvents += 1;
                }
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Show last 12 months
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

    const formatMonth = (monthString) => {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    // Custom tooltip for better data presentation
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
        refreshDashboard: fetchDashboardData
    }));

    useEffect(() => {
        fetchDashboardData();
    }, [equipmentId]);

    if (loading) {
        return (
            <div className="rockops-dashboard-loading">
                <div className="rockops-dashboard-loading-spinner"></div>
                <p>Loading dashboard data...</p>
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
                    <p>Comprehensive overview of equipment metrics and maintenance history</p>
                </div>
            </div>

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
                            Monthly work hours trend
                        </div>
                    </div>
                    <div className="rockops-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dashboardData.workHoursOverTime}>
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
                                        formatter={(value) => [`${value} hours`, 'Work Hours']}
                                    />}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalHours"
                                    stroke="var(--color-primary)"
                                    strokeWidth={3}
                                    dot={{ fill: "var(--color-primary)", strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: "var(--color-primary)", strokeWidth: 2 }}
                                    name="Work Hours"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Consumables Usage Chart */}
                <div className="rockops-chart-card">
                    <div className="rockops-chart-header">
                        <div className="rockops-chart-title">
                            <Package size={20} />
                            <h3>Consumables Usage Over Time</h3>
                        </div>
                        <div className="rockops-chart-subtitle">
                            Monthly consumables consumption
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
                                        formatter={(value) => [`${value} items`, 'Total Consumables']}
                                    />}
                                />
                                <Bar
                                    dataKey="totalQuantity"
                                    fill="var(--color-success)"
                                    name="Total Consumables"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Maintenance History Chart */}
                <div className="rockops-chart-card full-width">
                    <div className="rockops-chart-header">
                        <div className="rockops-chart-title">
                            <Wrench size={20} />
                            <h3>Maintenance History & Status</h3>
                        </div>
                        <div className="rockops-chart-subtitle">
                            Monthly maintenance events and completion status
                        </div>
                    </div>
                    <div className="rockops-chart-container">
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dashboardData.maintenanceHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                                                return [`${value} events`, name];
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
                        <div className="rockops-dashboard-legend">
                            <div className="legend-item">
                                <span className="legend-icon" style={{ backgroundColor: 'var(--color-warning)' }}></span>
                                <span className="legend-text">Total Events</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-icon" style={{ backgroundColor: 'var(--color-success)' }}></span>
                                <span className="legend-text">Completed Events</span>
                            </div>
                        </div>
                    </div>
                </div>
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
                                {dashboardData.summaryStats.averageWorkHours > 0 ?
                                    `${Math.round((dashboardData.summaryStats.totalWorkHours / dashboardData.summaryStats.averageWorkHours) * 100)}%` :
                                    '0%'
                                }
                            </div>
                            <div className="insight-label">Equipment Utilization</div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.maintenanceHistory.length > 0 ?
                                    `${Math.round((dashboardData.maintenanceHistory.reduce((sum, item) => sum + item.completedEvents, 0) /
                                        dashboardData.maintenanceHistory.reduce((sum, item) => sum + item.totalEvents, 0)) * 100) || 0}%` :
                                    '0%'
                                }
                            </div>
                            <div className="insight-label">Maintenance Completion Rate</div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-metric">
                                {dashboardData.workHoursOverTime.length > 0 ?
                                    `${dashboardData.workHoursOverTime.filter(item => item.totalHours > 0).length}` :
                                    '0'
                                }
                            </div>
                            <div className="insight-label">Active Months</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EquipmentDashboard;