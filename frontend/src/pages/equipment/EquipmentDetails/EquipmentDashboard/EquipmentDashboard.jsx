import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';
import { equipmentService } from '../../../../services/equipmentService';
import { sarkyService } from '../../../../services/sarkyService';
import { inSiteMaintenanceService } from '../../../../services/inSiteMaintenanceService';
import apiClient from '../../../../utils/apiClient';
import './EquipmentDashboard.scss';

const   EquipmentDashboard = forwardRef(({ equipmentId }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        consumablesOverTime: [],
        workHoursOverTime: [],
        maintenanceHistory: [],
        maintenanceAnalytics: null,
        sarkyAnalytics: null,
        consumableAnalytics: null,
        summaryStats: {
            totalWorkHours: 0,
            totalConsumables: 0,
            maintenanceEvents: 0,
            averageWorkHours: 0,
            totalWorkDays: 0,
            workTypesUsed: 0,
            uniqueDrivers: 0,
            maintenanceCompletionRate: 0,
            overdueMaintenanceEvents: 0,
            meanTimeBetweenMaintenance: 0
        }
    });

    const fetchDashboardData = async () => {
        if (!equipmentId) return;

        try {
            setLoading(true);
            
            // Fetch multiple data sources in parallel using services
            const [
                consumablesResponse,
                sarkyResponse,
                sarkyAnalyticsResponse,
                maintenanceAnalyticsResponse,
                consumableAnalyticsResponse
            ] = await Promise.allSettled([
                // Fetch consumables data using equipment service
                equipmentService.getEquipmentConsumables(equipmentId),
                // Fetch work hours (sarky) data using sarky service
                sarkyService.getByEquipment(equipmentId),
                // Fetch new sarky analytics data using equipment service
                equipmentService.getSarkyAnalyticsForEquipment(equipmentId),
                // Fetch maintenance analytics using InSite maintenance service
                inSiteMaintenanceService.getAnalytics(equipmentId),
                // Fetch consumable analytics using equipment service
                equipmentService.getConsumableAnalytics(equipmentId)
            ]);

            // Process consumables data
            let consumablesData = [];
            if (consumablesResponse.status === 'fulfilled' && consumablesResponse.value?.data) {
                consumablesData = processConsumablesData(consumablesResponse.value.data);
            }

            // Get sarky analytics data
            let sarkyAnalytics = null;
            if (sarkyAnalyticsResponse.status === 'fulfilled' && sarkyAnalyticsResponse.value?.data) {
                sarkyAnalytics = sarkyAnalyticsResponse.value.data;
            }

            // Get maintenance analytics data
            let maintenanceAnalytics = null;
            if (maintenanceAnalyticsResponse.status === 'fulfilled' && maintenanceAnalyticsResponse.value?.data) {
                maintenanceAnalytics = maintenanceAnalyticsResponse.value.data;
                console.log('Maintenance Analytics Data:', maintenanceAnalytics);
            }

            // Get consumable analytics data
            let consumableAnalytics = null;
            if (consumableAnalyticsResponse.status === 'fulfilled' && consumableAnalyticsResponse.value?.data) {
                consumableAnalytics = consumableAnalyticsResponse.value.data;
                console.log('Consumable Analytics Data:', consumableAnalytics);
            }

            // Use sarky analytics data for work hours chart if available, otherwise fallback to old processing
            let workHoursChartData = [];
            if (sarkyAnalytics?.monthlyWorkHours?.length > 0) {
                workHoursChartData = processSarkyAnalyticsForChart(sarkyAnalytics);
                console.log('Using sarky analytics data for work hours chart:', workHoursChartData);
            } else if (sarkyResponse.status === 'fulfilled' && sarkyResponse.value?.data) {
                workHoursChartData = processSarkyData(sarkyResponse.value.data);
                console.log('Using legacy sarky data for work hours chart:', workHoursChartData);
            }
            
            // Additional fallback: If we have analytics but no monthly breakdown, create one
            if (workHoursChartData.length === 0 && sarkyAnalytics?.totalWorkHours > 0 && sarkyResponse.status === 'fulfilled' && sarkyResponse.value?.data) {
                console.log('Creating fallback monthly data from raw sarky entries');
                const rawSarkyData = sarkyResponse.value.data;
                workHoursChartData = processSarkyData(rawSarkyData);
                console.log('Fallback monthly data created:', workHoursChartData);
            }

            // Process maintenance history for chart display
            let maintenanceHistoryData = [];
            if (maintenanceAnalytics?.monthlyBreakdown) {
                maintenanceHistoryData = maintenanceAnalytics.monthlyBreakdown;
            }
            
            console.log('Dashboard Data Summary:', {
                sarkyAnalytics: sarkyAnalytics ? 'Available' : 'Not Available',
                maintenanceAnalytics: maintenanceAnalytics ? 'Available' : 'Not Available',
                workHoursDataPoints: workHoursChartData.length,
                totalWorkHours: sarkyAnalytics?.totalWorkHours || 0,
                totalMaintenanceEvents: maintenanceAnalytics?.totalMaintenanceEvents || 0,
                maintenanceCompletionRate: maintenanceAnalytics?.completionRate || 0,
                monthlyDataSample: workHoursChartData.slice(0, 3),
                fullSarkyAnalytics: sarkyAnalytics,
                fullMaintenanceAnalytics: maintenanceAnalytics
            });

            // Calculate summary statistics with maintenance analytics
            const summaryStats = calculateSummaryStats(consumablesData, workHoursChartData, maintenanceHistoryData, sarkyAnalytics, maintenanceAnalytics);

            setDashboardData({
                consumablesOverTime: consumablesData,
                workHoursOverTime: workHoursChartData,
                maintenanceHistory: maintenanceHistoryData,
                maintenanceAnalytics: maintenanceAnalytics,
                sarkyAnalytics: sarkyAnalytics,
                consumableAnalytics: consumableAnalytics,
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

        // Group work hours by month with enhanced metrics
        const monthlyData = {};
        
        data.forEach(sarky => {
            if (sarky.date) {
                const date = new Date(sarky.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalHours: 0,
                        workDays: 0,
                        entries: 0,
                        daysWorked: new Set()
                    };
                }
                
                monthlyData[monthKey].totalHours += sarky.workedHours || 0;
                monthlyData[monthKey].entries += 1;
                monthlyData[monthKey].daysWorked.add(sarky.date);
            }
        });

        return Object.values(monthlyData)
            .map(item => ({
                month: item.month,
                totalHours: item.totalHours,
                workDays: item.daysWorked.size,
                averageHoursPerDay: item.daysWorked.size > 0 ? item.totalHours / item.daysWorked.size : 0,
                entriesPerDay: item.daysWorked.size > 0 ? item.entries / item.daysWorked.size : 0,
                utilizationRate: Math.min((item.totalHours / (item.daysWorked.size * 8)) * 100, 100) // Efficiency vs 8hr standard
            }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Show last 12 months
    };

    const processSarkyAnalyticsForChart = (analytics) => {
        if (!analytics?.monthlyWorkHours?.length) return [];
        
        return analytics.monthlyWorkHours.map(item => ({
            month: item.month,
            totalHours: item.totalHours,
            workDays: item.workDays,
            averageHoursPerDay: item.averageHoursPerDay,
            entriesPerDay: item.entriesPerDay || 1,
            utilizationRate: Math.min((item.totalHours / (item.workDays * 8)) * 100, 100) // Efficiency vs 8hr standard
        }));
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
                        maintenanceCount: 0,
                        completedCount: 0
                    };
                }
                
                monthlyData[monthKey].maintenanceCount += 1;
                if (maintenance.status === 'COMPLETED') {
                    monthlyData[monthKey].completedCount += 1;
                }
            }
        });

        return Object.values(monthlyData)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Show last 12 months
    };

    const calculateSummaryStats = (consumables, workHours, maintenance, sarkyAnalytics, maintenanceAnalytics) => {
        const totalWorkHours = workHours.reduce((sum, item) => sum + item.totalHours, 0);
        const totalConsumables = consumables.reduce((sum, item) => sum + item.totalQuantity, 0);
        const maintenanceEvents = maintenanceAnalytics?.totalMaintenanceEvents || 0;
        const workingMonths = workHours.filter(item => item.totalHours > 0).length;
        const averageWorkHours = workingMonths > 0 ? totalWorkHours / workingMonths : 0;

        // Enhanced stats from sarky analytics
        const totalWorkDays = sarkyAnalytics?.totalWorkDays || 0;
        const workTypesUsed = sarkyAnalytics?.workTypeBreakdown?.length || 0;
        const uniqueDrivers = sarkyAnalytics?.driverBreakdown?.length || 0;

        // Maintenance metrics
        const maintenanceCompletionRate = maintenanceAnalytics?.completionRate || 0;
        const overdueMaintenanceEvents = maintenanceAnalytics?.overdueEvents || 0;
        const meanTimeBetweenMaintenance = maintenanceAnalytics?.meanTimeBetweenEvents || 0;

        return {
            totalWorkHours: sarkyAnalytics?.totalWorkHours || Math.round(totalWorkHours),
            totalConsumables: Math.round(totalConsumables),
            maintenanceEvents,
            averageWorkHours: sarkyAnalytics?.averageHoursPerDay || Math.round(averageWorkHours * 10) / 10,
            totalWorkDays,
            workTypesUsed,
            uniqueDrivers,
            maintenanceCompletionRate: Math.round(maintenanceCompletionRate * 10) / 10,
            overdueMaintenanceEvents,
            meanTimeBetweenMaintenance: Math.round(meanTimeBetweenMaintenance * 10) / 10
        };
    };

    const formatMonth = (monthString) => {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    // Colors for pie charts
    const CHART_COLORS = ['#4880ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

    // Custom label function for pie charts
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        if (percent < 0.05) return null; // Don't show labels for slices smaller than 5%
        
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
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
            <div className="equipment-dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="equipment-dashboard-error">
                <p>Error: {error}</p>
                <button onClick={fetchDashboardData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="equipment-dashboard">
            {/* Summary Stats */}
            <div className="dashboard-stats">
                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-work-hours">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Total Work Hours</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.totalWorkHours}</p>
                        <span className="eq-dashboard-stat-label">
                            {dashboardData.summaryStats.totalWorkDays > 0 && (
                                `${dashboardData.summaryStats.totalWorkDays} work days`
                            )}
                        </span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-average-hours">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 11H1v3h8v3l5-4-5-4v2z"/>
                            <path d="M22 12h-6"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Average Hours/Day</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.averageWorkHours}</p>
                        <span className="eq-dashboard-stat-label">Per work day</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-work-types">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z"/>
                            <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Work Types Used</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.workTypesUsed}</p>
                        <span className="eq-dashboard-stat-label">Different types</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-drivers">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Unique Drivers</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.uniqueDrivers}</p>
                        <span className="eq-dashboard-stat-label">Total operators</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-consumables">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Consumables Used</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.totalConsumables}</p>
                        <span className="eq-dashboard-stat-label">Total quantity</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-maintenance">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Maintenance Events</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.maintenanceEvents}</p>
                        <span className="eq-dashboard-stat-label">Total recorded</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-completion-rate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                            <path d="M22 4L12 14.01l-3-3"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Completion Rate</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.maintenanceCompletionRate}%</p>
                        <span className="eq-dashboard-stat-label">Maintenance completed</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-overdue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                            <path d="M17 3h4v4M21 7l-4-4M7 17l-4 4M3 21h4v-4"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Overdue Maintenance</h3>
                        <p className="eq-dashboard-stat-value" style={{color: dashboardData.summaryStats.overdueMaintenanceEvents > 0 ? '#f44336' : '#10b981'}}>
                            {dashboardData.summaryStats.overdueMaintenanceEvents}
                        </p>
                        <span className="eq-dashboard-stat-label">Scheduled past due</span>
                    </div>
                </div>

                <div className="eq-dashboard-stat-card">
                    <div className="eq-dashboard-stat-icon eq-dashboard-frequency">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                    </div>
                    <div className="eq-dashboard-stat-content">
                        <h3>Avg. Time Between</h3>
                        <p className="eq-dashboard-stat-value">{dashboardData.summaryStats.meanTimeBetweenMaintenance}</p>
                        <span className="eq-dashboard-stat-label">Days between maintenance</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="dashboard-charts">
                {/* Consumables Usage Chart */}
                <div className="chart-card">
                    <h3>Consumables Usage Over Time</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.consumablesOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="month" 
                                    tickFormatter={formatMonth}
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={formatMonth}
                                    formatter={(value) => [`${value} items`, 'Total Consumables']}
                                />
                                <Bar dataKey="totalQuantity" fill="#10b981" name="Total Consumables" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Enhanced Maintenance History Chart */}
                <div className="chart-card">
                    <h3>Maintenance History & Status Breakdown</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.maintenanceHistory}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="month" 
                                    tickFormatter={formatMonth}
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={formatMonth}
                                    formatter={(value, name) => {
                                        if (name === 'totalEvents') return [`${value} events`, 'Total Events'];
                                        if (name === 'completedEvents') return [`${value} events`, 'Completed'];
                                        if (name === 'inProgressEvents') return [`${value} events`, 'In Progress'];
                                        if (name === 'scheduledEvents') return [`${value} events`, 'Scheduled'];
                                        if (name === 'cancelledEvents') return [`${value} events`, 'Cancelled'];
                                        return [`${value} events`, name];
                                    }}
                                />
                                <Bar dataKey="completedEvents" stackId="a" fill="#10b981" name="Completed" />
                                <Bar dataKey="inProgressEvents" stackId="a" fill="#f59e0b" name="In Progress" />
                                <Bar dataKey="scheduledEvents" stackId="a" fill="#3b82f6" name="Scheduled" />
                                <Bar dataKey="cancelledEvents" stackId="a" fill="#ef4444" name="Cancelled" />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="chart-legend">
                            <div className="legend-item">
                                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                                <span className="legend-label">Completed</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                                <span className="legend-label">In Progress</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                                <span className="legend-label">Scheduled</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                                <span className="legend-label">Cancelled</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Type Breakdown */}
                {dashboardData.maintenanceAnalytics?.maintenanceTypeBreakdown && 
                 Object.keys(dashboardData.maintenanceAnalytics.maintenanceTypeBreakdown).length > 0 && (
                    <div className="chart-card">
                        <h3>Maintenance Type Distribution</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={Object.entries(dashboardData.maintenanceAnalytics.maintenanceTypeBreakdown).map(([type, count]) => ({
                                            name: type,
                                            value: count,
                                            percentage: Math.round((count / dashboardData.maintenanceAnalytics.totalMaintenanceEvents) * 100)
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomLabel}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {Object.entries(dashboardData.maintenanceAnalytics.maintenanceTypeBreakdown).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value, name, props) => [
                                            `${value} events (${props.payload.percentage}%)`,
                                            props.payload.name
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="chart-legend">
                                {Object.entries(dashboardData.maintenanceAnalytics.maintenanceTypeBreakdown).map(([type, count], index) => (
                                    <div key={type} className="legend-item">
                                        <span 
                                            className="legend-color" 
                                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                        ></span>
                                        <span className="legend-label">
                                            {type} ({count} events)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Technician Performance */}
                {dashboardData.maintenanceAnalytics?.technicianPerformance && 
                 Object.keys(dashboardData.maintenanceAnalytics.technicianPerformance).length > 0 && (
                    <div className="chart-card">
                        <h3>Technician Performance</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart 
                                    data={Object.entries(dashboardData.maintenanceAnalytics.technicianPerformance).map(([name, stats]) => ({
                                        technician: name.length > 15 ? name.substring(0, 15) + '...' : name,
                                        fullName: name,
                                        totalJobs: stats.totalJobs,
                                        completedJobs: stats.completedJobs,
                                        completionRate: Math.round(stats.completionRate * 10) / 10
                                    }))}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="technician"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis yAxisId="jobs" orientation="left" />
                                    <YAxis yAxisId="rate" orientation="right" />
                                    <Tooltip 
                                        formatter={(value, name, props) => {
                                            if (name === 'totalJobs') return [`${value} jobs`, 'Total Jobs'];
                                            if (name === 'completedJobs') return [`${value} jobs`, 'Completed Jobs'];
                                            if (name === 'completionRate') return [`${value}%`, 'Completion Rate'];
                                            return [`${value}`, name];
                                        }}
                                        labelFormatter={(label, payload) => {
                                            return payload?.[0]?.payload?.fullName || label;
                                        }}
                                    />
                                    <Bar yAxisId="jobs" dataKey="totalJobs" fill="#6b7280" name="Total Jobs" />
                                    <Bar yAxisId="jobs" dataKey="completedJobs" fill="#10b981" name="Completed Jobs" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="chart-legend">
                                <div className="legend-item">
                                    <span className="legend-color" style={{ backgroundColor: '#6b7280' }}></span>
                                    <span className="legend-label">Total Jobs</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                                    <span className="legend-label">Completed Jobs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Consumable Insights Section */}
                {dashboardData.consumableAnalytics && (
                    <>
                        {/*/!* Low Stock Alert *!/*/}
                        {/*{dashboardData.consumableAnalytics.lowStockItems?.length > 0 && (*/}
                        {/*    <div className="chart-card alert-card">*/}
                        {/*        <h3>⚠️ Low Stock Alert</h3>*/}
                        {/*        <div className="alert-content">*/}
                        {/*            <p className="alert-summary">*/}
                        {/*                {dashboardData.consumableAnalytics.lowStockItems.length} items are running low (≤5 units)*/}
                        {/*            </p>*/}
                        {/*            <div className="low-stock-items">*/}
                        {/*                {dashboardData.consumableAnalytics.lowStockItems.map((item, index) => (*/}
                        {/*                    <div key={index} className="low-stock-item">*/}
                        {/*                        <span className="item-name">{item.itemName}</span>*/}
                        {/*                        <span className="item-quantity">{item.currentQuantity} units</span>*/}
                        {/*                        <span className="item-category">{item.category}</span>*/}
                        {/*                    </div>*/}
                        {/*                ))}*/}
                        {/*            </div>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*)}*/}

                        {/* Top Consumables Chart */}
                        {dashboardData.consumableAnalytics.topConsumables && 
                         Object.keys(dashboardData.consumableAnalytics.topConsumables).length > 0 && (
                            <div className="chart-card">
                                <h3>Most Used Consumables</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart 
                                            data={Object.entries(dashboardData.consumableAnalytics.topConsumables).map(([name, quantity]) => ({
                                                itemName: name.length > 20 ? name.substring(0, 20) + '...' : name,
                                                fullName: name,
                                                quantity: quantity
                                            }))}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="itemName"
                                                angle={-45}
                                                textAnchor="end"
                                                height={80}
                                            />
                                            <YAxis />
                                            <Tooltip 
                                                formatter={(value, name, props) => [`${value} units`, 'Total Used']}
                                                labelFormatter={(label, payload) => {
                                                    return payload?.[0]?.payload?.fullName || label;
                                                }}
                                            />
                                            <Bar dataKey="quantity" fill="#10b981" name="Total Used" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Category Breakdown Chart */}
                        {dashboardData.consumableAnalytics.categoryBreakdown && 
                         Object.keys(dashboardData.consumableAnalytics.categoryBreakdown).length > 0 && (
                            <div className="chart-card">
                                <h3>Consumables by Category</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(dashboardData.consumableAnalytics.categoryBreakdown).map(([category, stats]) => ({
                                                    name: category,
                                                    value: stats.totalQuantity,
                                                    items: stats.totalItems,
                                                    avgQuantity: Math.round(stats.avgQuantity * 100) / 100
                                                }))}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={renderCustomLabel}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {Object.entries(dashboardData.consumableAnalytics.categoryBreakdown).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value, name, props) => [
                                                    `${value} units (${props.payload.items} items)`,
                                                    props.payload.name
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="chart-legend">
                                        {Object.entries(dashboardData.consumableAnalytics.categoryBreakdown).map(([category, stats], index) => (
                                            <div key={category} className="legend-item">
                                                <span 
                                                    className="legend-color" 
                                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                ></span>
                                                <span className="legend-label">
                                                    {category} ({stats.totalQuantity} units)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Monthly Consumption Trends */}
                        {dashboardData.consumableAnalytics.monthlyTrends && 
                         Object.keys(dashboardData.consumableAnalytics.monthlyTrends).length > 0 && (
                            <div className="chart-card">
                                <h3>Monthly Consumption Trends</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart 
                                            data={Object.entries(dashboardData.consumableAnalytics.monthlyTrends)
                                                .map(([month, stats]) => ({
                                                    month: month,
                                                    totalQuantity: stats.totalQuantity,
                                                    totalItems: stats.totalItems,
                                                    uniqueTypes: stats.uniqueTypes
                                                }))
                                                .sort((a, b) => a.month.localeCompare(b.month))
                                            }
                                        >
                                            <defs>
                                                <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="month" 
                                                tickFormatter={formatMonth}
                                            />
                                            <YAxis />
                                            <Tooltip 
                                                labelFormatter={formatMonth}
                                                formatter={(value, name) => {
                                                    if (name === 'totalQuantity') return [`${value} units`, 'Total Consumed'];
                                                    if (name === 'totalItems') return [`${value} items`, 'Total Items'];
                                                    if (name === 'uniqueTypes') return [`${value} types`, 'Unique Types'];
                                                    return [`${value}`, name];
                                                }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="totalQuantity" 
                                                stroke="#10b981" 
                                                fillOpacity={1} 
                                                fill="url(#colorQuantity)" 
                                                name="Total Consumed"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Sarky Analytics Charts - Only show if data exists */}
                {dashboardData.sarkyAnalytics && (
                    <>
                        {/* Work Type Breakdown */}
                        {dashboardData.sarkyAnalytics.workTypeBreakdown?.length > 0 && (
                            <div className="chart-card">
                                <h3>Work Type Distribution</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={dashboardData.sarkyAnalytics.workTypeBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={renderCustomLabel}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="totalHours"
                                                nameKey="workTypeName"
                                            >
                                                {dashboardData.sarkyAnalytics.workTypeBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value, name, props) => [
                                                    `${value} hours (${props.payload.percentage}%)`,
                                                    props.payload.workTypeName
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="chart-legend">
                                        {dashboardData.sarkyAnalytics.workTypeBreakdown.map((entry, index) => (
                                            <div key={entry.workTypeName} className="legend-item">
                                                <span 
                                                    className="legend-color" 
                                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                ></span>
                                                <span className="legend-label">
                                                    {entry.workTypeName} ({entry.totalHours}h)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Driver Performance Breakdown */}
                        {dashboardData.sarkyAnalytics.driverBreakdown?.length > 0 && (
                            <div className="chart-card">
                                <h3>Driver Performance Distribution</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={dashboardData.sarkyAnalytics.driverBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={renderCustomLabel}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="totalHours"
                                                nameKey="driverName"
                                            >
                                                {dashboardData.sarkyAnalytics.driverBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value, name, props) => [
                                                    `${value} hours (${props.payload.percentage}%)`,
                                                    props.payload.driverName
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="chart-legend">
                                        {dashboardData.sarkyAnalytics.driverBreakdown.map((entry, index) => (
                                            <div key={entry.driverName} className="legend-item">
                                                <span 
                                                    className="legend-color" 
                                                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                ></span>
                                                <span className="legend-label">
                                                    {entry.driverName} ({entry.totalHours}h)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Monthly Work Hours from Analytics */}
                        {dashboardData.sarkyAnalytics.monthlyWorkHours?.length > 0 && (
                            <div className="chart-card">
                                <h3>Detailed Monthly Work Analysis</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={dashboardData.sarkyAnalytics.monthlyWorkHours}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis 
                                                dataKey="month" 
                                                tickFormatter={formatMonth}
                                            />
                                            <YAxis yAxisId="hours" orientation="left" />
                                            <YAxis yAxisId="days" orientation="right" />
                                            <Tooltip 
                                                labelFormatter={formatMonth}
                                                formatter={(value, name) => {
                                                    if (name === 'totalHours') return [`${value} hours`, 'Total Hours'];
                                                    if (name === 'workDays') return [`${value} days`, 'Work Days'];
                                                    if (name === 'averageHoursPerDay') return [`${value} hours/day`, 'Average Hours/Day'];
                                                    return [`${value}`, name];
                                                }}
                                            />
                                            <Bar yAxisId="hours" dataKey="totalHours" fill="#4880ff" name="Total Hours" />
                                            <Bar yAxisId="days" dataKey="workDays" fill="#10b981" name="Work Days" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="chart-legend">
                                        <div className="legend-item">
                                            <span className="legend-color" style={{ backgroundColor: '#4880ff' }}></span>
                                            <span className="legend-label">Total Hours (Left Axis)</span>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                                            <span className="legend-label">Work Days (Right Axis)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

export default EquipmentDashboard; 