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
import './MaintenanceDashboard.scss';

const MaintenanceDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('week');
    const [selectedSite, setSelectedSite] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Mock data - replace with actual API calls
    const [dashboardData, setDashboardData] = useState({
        activeMaintenance: 12,
        completedThisWeek: 8,
        overdueMaintenance: 3,
        totalEquipment: 45,
        maintenanceByType: [
            { name: 'Preventive', value: 6, color: '#4caf50' },
            { name: 'Corrective', value: 4, color: '#ff9800' },
            { name: 'Emergency', value: 2, color: '#f44336' }
        ],
        maintenanceBySite: [
            { name: 'Site A', active: 4, completed: 3, overdue: 1 },
            { name: 'Site B', active: 3, completed: 2, overdue: 1 },
            { name: 'Site C', active: 5, completed: 3, overdue: 1 }
        ],
        weeklyTrend: [
            { day: 'Mon', active: 8, completed: 2 },
            { day: 'Tue', active: 10, completed: 3 },
            { day: 'Wed', active: 12, completed: 5 },
            { day: 'Thu', active: 9, completed: 4 },
            { day: 'Fri', active: 7, completed: 6 },
            { day: 'Sat', active: 5, completed: 3 },
            { day: 'Sun', active: 3, completed: 2 }
        ],
        teamPerformance: [
            { name: 'John Smith', completed: 15, efficiency: 95 },
            { name: 'Sarah Johnson', completed: 12, efficiency: 88 },
            { name: 'Mike Wilson', completed: 18, efficiency: 92 },
            { name: 'Lisa Brown', completed: 10, efficiency: 85 }
        ]
    });

    const [recentMaintenance, setRecentMaintenance] = useState([
        {
            id: 1,
            equipmentName: 'Generator Unit #G001',
            type: 'Preventive',
            status: 'IN_PROGRESS',
            assignedTo: 'John Smith',
            startDate: '2024-01-15',
            expectedCompletion: '2024-01-17'
        },
        {
            id: 2,
            equipmentName: 'Excavator #E005',
            type: 'Corrective',
            status: 'COMPLETED',
            assignedTo: 'Sarah Johnson',
            startDate: '2024-01-14',
            completionDate: '2024-01-16'
        },
        {
            id: 3,
            equipmentName: 'Bulldozer #B003',
            type: 'Emergency',
            status: 'OVERDUE',
            assignedTo: 'Mike Wilson',
            startDate: '2024-01-10',
            expectedCompletion: '2024-01-12'
        }
    ]);

    const [alerts, setAlerts] = useState([
        {
            id: 1,
            type: 'warning',
            title: 'Overdue Maintenance',
            message: 'Bulldozer #B003 maintenance is 3 days overdue',
            equipment: 'Bulldozer #B003',
            priority: 'high'
        },
        {
            id: 2,
            type: 'info',
            title: 'Scheduled Maintenance',
            message: 'Generator #G002 preventive maintenance due tomorrow',
            equipment: 'Generator #G002',
            priority: 'medium'
        }
    ]);

    useEffect(() => {
        loadDashboardData();
    }, [timeframe, selectedSite, selectedStatus]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // TODO: Replace with actual API calls
            // const response = await maintenanceService.getDashboardData({
            //     timeframe,
            //     site: selectedSite,
            //     status: selectedStatus
            // });
            // setDashboardData(response.data);
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            setLoading(false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'var(--color-success)';
            case 'IN_PROGRESS': return 'var(--color-primary)';
            case 'OVERDUE': return 'var(--color-danger)';
            case 'SCHEDULED': return 'var(--color-warning)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle size={16} />;
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
                                <option value="site-a">Site A</option>
                                <option value="site-b">Site B</option>
                                <option value="site-c">Site C</option>
                            </select>
                            <button 
                                onClick={loadDashboardData}
                                className="refresh-btn"
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
                            <div className="maintenance-kpi-value">{dashboardData.activeMaintenance}</div>
                            <div className="maintenance-kpi-label">Active Maintenance</div>
                            <div className="maintenance-kpi-trend maintenance-positive">
                                <TrendingUp size={14} />
                                2 new this week
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-kpi-card maintenance-success">
                        <div className="maintenance-kpi-icon">
                            <CheckCircle />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.completedThisWeek}</div>
                            <div className="maintenance-kpi-label">Completed This Week</div>
                            <div className="maintenance-kpi-trend maintenance-positive">
                                <TrendingUp size={14} />
                                15% increase
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-kpi-card maintenance-warning">
                        <div className="maintenance-kpi-icon">
                            <AlertTriangle />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.overdueMaintenance}</div>
                            <div className="maintenance-kpi-label">Overdue Maintenance</div>
                            <div className="maintenance-kpi-trend maintenance-negative">
                                <AlertTriangle size={14} />
                                Requires attention
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-kpi-card maintenance-info">
                        <div className="maintenance-kpi-icon">
                            <Users />
                        </div>
                        <div className="maintenance-kpi-content">
                            <div className="maintenance-kpi-value">{dashboardData.totalEquipment}</div>
                            <div className="maintenance-kpi-label">Total Equipment</div>
                            <div className="maintenance-kpi-trend maintenance-neutral">
                                <Activity size={14} />
                                Under maintenance
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
                                        data={dashboardData.maintenanceByType}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dashboardData.maintenanceByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="maintenance-chart-legend">
                                {dashboardData.maintenanceByType.map((item, index) => (
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

                    {/* Weekly Trend */}
                    <div className="maintenance-chart-card">
                        <div className="maintenance-chart-header">
                            <h3>Weekly Maintenance Trend</h3>
                            <BarChart3 size={20} />
                        </div>
                        <div className="maintenance-chart-content">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dashboardData.weeklyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="active" fill="var(--color-primary)" name="Active" />
                                    <Bar dataKey="completed" fill="var(--color-success)" name="Completed" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Site Performance */}
                    <div className="maintenance-chart-card">
                        <div className="maintenance-chart-header">
                            <h3>Site Performance</h3>
                            <MapPin size={20} />
                        </div>
                        <div className="maintenance-chart-content">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dashboardData.maintenanceBySite}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="active" fill="var(--color-primary)" name="Active" />
                                    <Bar dataKey="completed" fill="var(--color-success)" name="Completed" />
                                    <Bar dataKey="overdue" fill="var(--color-danger)" name="Overdue" />
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
                            {recentMaintenance.map((maintenance) => (
                                <div key={maintenance.id} className="maintenance-activity-item">
                                    <div className="maintenance-activity-icon" style={{ color: getStatusColor(maintenance.status) }}>
                                        {getStatusIcon(maintenance.status)}
                                    </div>
                                    <div className="maintenance-activity-details">
                                        <div className="maintenance-activity-title">{maintenance.equipmentName}</div>
                                        <div className="maintenance-activity-subtitle">
                                            {maintenance.type} • {maintenance.assignedTo}
                                        </div>
                                        <div className="maintenance-activity-date">
                                            {maintenance.startDate} - {maintenance.expectedCompletion || maintenance.completionDate}
                                        </div>
                                    </div>
                                    <div className="maintenance-activity-status" style={{ color: getStatusColor(maintenance.status) }}>
                                        {maintenance.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="maintenance-activity-card">
                        <div className="maintenance-activity-header">
                            <h3>Alerts & Notifications</h3>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="maintenance-activity-content">
                            {alerts.map((alert) => (
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
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Performance */}
            <section className="maintenance-team">
                <div className="maintenance-section-header">
                    <h2>Team Performance</h2>
                    <p>Maintenance team efficiency and completion rates</p>
                </div>
                <div className="maintenance-team-grid">
                    {dashboardData.teamPerformance.map((member, index) => (
                        <div key={index} className="maintenance-team-card">
                            <div className="maintenance-team-header">
                                <div className="maintenance-team-avatar">
                                    {member.name.charAt(0)}
                                </div>
                                <div className="maintenance-team-info">
                                    <h4>{member.name}</h4>
                                    <span className="maintenance-team-role">Maintenance Technician</span>
                                </div>
                            </div>
                            <div className="maintenance-team-stats">
                                <div className="maintenance-team-stat">
                                    <span className="maintenance-team-stat-value">{member.completed}</span>
                                    <span className="maintenance-team-stat-label">Completed</span>
                                </div>
                                <div className="maintenance-team-stat">
                                    <span className="maintenance-team-stat-value">{member.efficiency}%</span>
                                    <span className="maintenance-team-stat-label">Efficiency</span>
                                </div>
                            </div>
                            <div className="maintenance-team-progress">
                                <div className="maintenance-team-progress-bar">
                                    <div 
                                        className="maintenance-team-progress-fill"
                                        style={{ width: `${member.efficiency}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default MaintenanceDashboard; 