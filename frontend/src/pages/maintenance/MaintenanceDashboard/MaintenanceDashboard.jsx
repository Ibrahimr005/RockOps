import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
    Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp, 
    Users, Calendar, Activity, MapPin, Settings, RefreshCw,
    Eye, BarChart3, PieChart as PieChartIcon, Filter
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import maintenanceService from '../../../services/maintenanceService';
import { siteService } from '../../../services/siteService';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';


import './MaintenanceDashboard.scss';

const MaintenanceDashboard = () => {
    const { t } = useTranslation();
    const { showError, showSuccess } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('week');
    const [selectedSite, setSelectedSite] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Real data from API
    const [dashboardData, setDashboardData] = useState(null);
    const [recentMaintenance, setRecentMaintenance] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [sites, setSites] = useState([]);

    useEffect(() => {
        loadDashboardData();
        loadSites();
    }, [timeframe, selectedSite, selectedStatus]);

    const loadSites = async () => {
        try {
            const response = await siteService.getAll();
            setSites(response.data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
            // Silently fail for sites loading, don't show error to user
        }
    };

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load dashboard data
            const dashboardResponse = await maintenanceService.getDashboard();
            setDashboardData(dashboardResponse.data);

            // Load recent maintenance records
            const allRecords = await maintenanceService.getAllRecords();
            const recent = allRecords.data
                .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate))
                .slice(0, 5);
            setRecentMaintenance(recent);

            // Generate alerts from overdue maintenance
            const overdueRecords = await maintenanceService.getOverdueRecords();
            const generatedAlerts = overdueRecords.data.map(record => ({
                id: record.id,
                type: 'warning',
                title: 'Overdue Maintenance',
                message: `${record.equipmentInfo || record.equipmentName} maintenance is overdue`,
                equipment: record.equipmentInfo || record.equipmentName,
                priority: 'high'
            }));
            setAlerts(generatedAlerts);

            showSuccess('Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'var(--color-success)';
            case 'ACTIVE': return 'var(--color-primary)';
            case 'IN_PROGRESS': return 'var(--color-primary)';
            case 'OVERDUE': return 'var(--color-danger)';
            case 'SCHEDULED': return 'var(--color-warning)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle size={16} />;
            case 'ACTIVE': return <Activity size={16} />;
            case 'IN_PROGRESS': return <Activity size={16} />;
            case 'OVERDUE': return <AlertTriangle size={16} />;
            case 'SCHEDULED': return <Clock size={16} />;
            default: return <Settings size={16} />;
        }
    };

    const getAlertIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={16} />;
            case 'error': return <AlertTriangle size={16} />;
            case 'info': return <Clock size={16} />;
            case 'success': return <CheckCircle size={16} />;
            default: return <Settings size={16} />;
        }
    };

    // Show loading page while data is being fetched
    if (loading) {
        return <LoadingPage />;
    }

    // Show error if no dashboard data
    if (!dashboardData) {
        return (
            <div className="maintenance-dashboard">
                <div className="maintenance-error">
                    <AlertTriangle size={48} />
                    <h2>Unable to Load Dashboard</h2>
                    <p>There was an error loading the maintenance dashboard data.</p>
                    <button onClick={loadDashboardData} className="btn-primary">
                        <RefreshCw size={16} />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-dashboard">
            {/* Header Section */}
            <header className="maintenance-header">
                <div className="maintenance-header-container">
                    <div className="maintenance-header-left">
                        <h1>Maintenance Dashboard</h1>
                        <p>Monitor equipment maintenance activities and team performance</p>
                    </div>
                    <div className="maintenance-header-right">
                        <div className="maintenance-filters">
                            <select 
                                value={timeframe} 
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="filter-select"
                            >
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                            </select>
                            <select 
                                value={selectedSite} 
                                onChange={(e) => setSelectedSite(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Sites</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                            <button 
                                onClick={loadDashboardData}
                                className="btn-primary btn-sm"
                                disabled={loading}
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* KPI Cards Section */}
            <section className="maintenance-kpis">
                <div className="maintenance-kpi-grid">
                    <div className="maintenance-kpi-card maintenance-primary">
                        <div className="maintenance-kpi-icon">
                            <Wrench />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.activeRecords || 0}</div>
                            <div className="maintenance-kpi-label">Active Maintenance</div>
                            <div className="maintenance-kpi-trend maintenance-neutral">
                                <Activity size={14} />
                                In progress
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-kpi-card maintenance-success">
                        <div className="maintenance-kpi-icon">
                            <CheckCircle />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.completedRecords || 0}</div>
                            <div className="maintenance-kpi-label">Completed</div>
                            <div className="maintenance-kpi-trend maintenance-positive">
                                <CheckCircle size={14} />
                                Total completed
                            </div>
                        </div>
                    </div>

                    <div className={`maintenance-kpi-card ${(dashboardData.overdueRecords || 0) > 0 ? 'maintenance-warning' : 'maintenance-success'}`}>
                        <div className="maintenance-kpi-icon">
                            {(dashboardData.overdueRecords || 0) > 0 ? <AlertTriangle /> : <CheckCircle />}
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.overdueRecords || 0}</div>
                            <div className="maintenance-kpi-label">Overdue Maintenance</div>
                            <div className={`maintenance-kpi-trend ${(dashboardData.overdueRecords || 0) > 0 ? 'maintenance-negative' : 'maintenance-positive'}`}>
                                {(dashboardData.overdueRecords || 0) > 0 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                {(dashboardData.overdueRecords || 0) > 0 ? 'Requires attention' : 'All on schedule'}
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-kpi-card maintenance-info">
                        <div className="maintenance-kpi-icon">
                            <Users />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.equipmentInMaintenance || 0}</div>
                            <div className="maintenance-kpi-label">Equipment In Maintenance</div>
                            <div className="maintenance-kpi-trend maintenance-neutral">
                                <Wrench size={14} />
                                Currently servicing
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Charts Section */}
            <section className="maintenance-charts">
                <div className="maintenance-charts-grid">
                    {/* Maintenance by Type */}
                    <div className="maintenance-chart-card">
                        <div className="maintenance-chart-header">
                            <h3>Maintenance by Type</h3>
                            <PieChartIcon size={20} />
                        </div>
                        <div className="maintenance-chart-content">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Active', value: dashboardData.activeRecords || 0, color: 'var(--color-primary)' },
                                            { name: 'Completed', value: dashboardData.completedRecords || 0, color: 'var(--color-success)' },
                                            { name: 'Overdue', value: dashboardData.overdueRecords || 0, color: 'var(--color-danger)' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {[
                                            { name: 'Active', value: dashboardData.activeRecords || 0, color: '#4880ff' },
                                            { name: 'Completed', value: dashboardData.completedRecords || 0, color: '#4caf50' },
                                            { name: 'Overdue', value: dashboardData.overdueRecords || 0, color: '#f44336' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="maintenance-chart-legend">
                                {[
                                    { name: 'Active', value: dashboardData.activeRecords || 0, color: '#4880ff' },
                                    { name: 'Completed', value: dashboardData.completedRecords || 0, color: '#4caf50' },
                                    { name: 'Overdue', value: dashboardData.overdueRecords || 0, color: '#f44336' }
                                ].map((item, index) => (
                                    <div key={index} className="legend-item">
                                        <div 
                                            className="legend-color" 
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span>{item.name}: {item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Cost Overview */}
                    <div className="maintenance-chart-card">
                        <div className="maintenance-chart-header">
                            <h3>Cost Overview</h3>
                            <BarChart3 size={20} />
                        </div>
                        <div className="maintenance-chart-content">
                            <div className="cost-metrics">
                                <div className="cost-metric">
                                    <span className="cost-label">Total Cost</span>
                                    <span className="cost-value">${(dashboardData.totalCost || 0).toLocaleString()}</span>
                                </div>
                                <div className="cost-metric">
                                    <span className="cost-label">Average Cost</span>
                                    <span className="cost-value">${(dashboardData.averageCost || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step Progress */}
                    <div className="maintenance-chart-card">
                        <div className="maintenance-chart-header">
                            <h3>Step Progress</h3>
                            <Activity size={20} />
                        </div>
                        <div className="maintenance-chart-content">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={[
                                    { 
                                        name: 'Steps', 
                                        completed: dashboardData.completedSteps || 0, 
                                        active: dashboardData.activeSteps || 0 
                                    }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="completed" fill="var(--color-success)" name="Completed" />
                                    <Bar dataKey="active" fill="var(--color-primary)" name="Active" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Activity and Alerts */}
            <section className="maintenance-activity">
                <div className="maintenance-activity-grid">
                    {/* Recent Maintenance */}
                    <div className="maintenance-activity-card">
                        <div className="maintenance-activity-header">
                            <h3>Recent Maintenance</h3>
                            <Eye size={20} />
                        </div>
                        <div className="maintenance-activity-content">
                            {recentMaintenance.length > 0 ? recentMaintenance.map((maintenance) => (
                                <div key={maintenance.id} className="maintenance-activity-item">
                                    <div className="maintenance-activity-icon" style={{ color: getStatusColor(maintenance.status) }}>
                                        {getStatusIcon(maintenance.status)}
                                    </div>
                                    <div className="maintenance-activity-details">
                                        <div className="maintenance-activity-title">
                                            {maintenance.equipmentInfo || maintenance.equipmentName || 'Unknown Equipment'}
                                        </div>
                                        <div className="maintenance-activity-subtitle">
                                            {maintenance.currentResponsiblePerson || 'Unassigned'}
                                        </div>
                                        <div className="maintenance-activity-date">
                                            {new Date(maintenance.creationDate).toLocaleDateString()} - {
                                                maintenance.expectedCompletionDate 
                                                    ? new Date(maintenance.expectedCompletionDate).toLocaleDateString()
                                                    : 'No due date'
                                            }
                                        </div>
                                    </div>
                                    <div className="maintenance-activity-status" style={{ color: getStatusColor(maintenance.status) }}>
                                        {maintenance.status}
                                    </div>
                                </div>
                            )) : (
                                <div className="maintenance-empty">
                                    <Activity size={32} />
                                    <p>No recent maintenance records</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="maintenance-activity-card">
                        <div className="maintenance-activity-header">
                            <h3>Alerts & Notifications</h3>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="maintenance-activity-content">
                            {alerts.length > 0 ? alerts.map((alert) => (
                                <div key={alert.id} className={`maintenance-alert-item maintenance-alert-${alert.type}`}>
                                    <div className="maintenance-alert-icon">
                                        {getAlertIcon(alert.type)}
                                    </div>
                                    <div className="maintenance-alert-details">
                                        <div className="maintenance-alert-title">{alert.title}</div>
                                        <div className="maintenance-alert-message">{alert.message}</div>
                                        <div className="maintenance-alert-equipment">{alert.equipment}</div>
                                    </div>
                                    <div className={`maintenance-alert-priority maintenance-priority-${alert.priority}`}>
                                        {alert.priority}
                                    </div>
                                </div>
                            )) : (
                                <div className="maintenance-empty">
                                    <CheckCircle size={32} />
                                    <p>No alerts - all maintenance is on schedule</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default MaintenanceDashboard; 