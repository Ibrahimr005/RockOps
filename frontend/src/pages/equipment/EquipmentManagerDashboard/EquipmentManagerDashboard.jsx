import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { Package, Users, Truck, AlertTriangle, TrendingUp, Search, RefreshCw, Activity, MapPin, CheckCircle, ArrowUp, ArrowDown, Eye, BarChart3, PieChart as PieChartIcon, Settings, Wrench, Calendar, Clock } from 'lucide-react';
import { equipmentService } from '../../../services/equipmentService.js';
import { inSiteMaintenanceService } from '../../../services/inSiteMaintenanceService.js';
import { useTranslation } from 'react-i18next';
import './EquipmentManagerDashboard.scss';

const EquipmentManagerDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeframe, setTimeframe] = useState('week');
    const [selectedType, setSelectedType] = useState('all');

    // State for all data
    const [equipment, setEquipment] = useState([]);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [equipmentBrands, setEquipmentBrands] = useState([]);
    const [sites, setSites] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [maintenanceData, setMaintenanceData] = useState({});
    const [sarkyData, setSarkyData] = useState({});
    const [error, setError] = useState(null);

    // API Functions
    const fetchEquipment = async () => {
        try {
            const response = await equipmentService.getAllEquipment();
            if (response.data) {
                setEquipment(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching equipment:', error);
            setError('Failed to fetch equipment data');
        }
        return [];
    };

    const fetchEquipmentTypes = async () => {
        try {
            const response = await equipmentService.getAllEquipmentTypes();
            if (response.data) {
                setEquipmentTypes(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching equipment types:', error);
        }
        return [];
    };

    const fetchEquipmentBrands = async () => {
        try {
            const response = await equipmentService.getAllEquipmentBrands();
            if (response.data) {
                setEquipmentBrands(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching equipment brands:', error);
        }
        return [];
    };

    const fetchSites = async () => {
        try {
            const response = await equipmentService.getAllSites();
            if (response.data) {
                setSites(response.data);
                console.log(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
        return [];
    };

    const fetchStatusOptions = async () => {
        try {
            const response = await equipmentService.getEquipmentStatusOptions();
            if (response.data) {
                setStatusOptions(response.data);
                return response.data;
            }
        } catch (error) {
            console.error('Error fetching status options:', error);
        }
        return [];
    };

    const fetchMaintenanceAnalytics = async (equipmentId) => {
        try {
            const response = await inSiteMaintenanceService.getAnalytics(equipmentId);
            if (response.data) {
                return response.data;
            }
        } catch (error) {
            console.error(`Error fetching maintenance analytics for equipment ${equipmentId}:`, error);
        }
        return {};
    };

    const fetchSarkyAnalytics = async (equipmentId) => {
        try {
            const response = await equipmentService.getSarkyAnalyticsForEquipment(equipmentId);
            if (response.data) {
                return response.data;
            }
        } catch (error) {
            console.error(`Error fetching sarky analytics for equipment ${equipmentId}:`, error);
        }
        return {};
    };

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch basic data
            const [equipmentData, typesData, brandsData, sitesData, statusData] = await Promise.all([
                fetchEquipment(),
                fetchEquipmentTypes(),
                fetchEquipmentBrands(),
                fetchSites(),
                fetchStatusOptions()
            ]);

            // Only fetch analytics for equipment that exist
            if (equipmentData.length > 0) {
                // Limit to first 10 equipment items to avoid too many API calls
                const limitedEquipment = equipmentData.slice(0, 10);
                
                const maintenancePromises = limitedEquipment.map(eq => 
                    fetchMaintenanceAnalytics(eq.id).then(data => ({ id: eq.id, data }))
                );
                const sarkyPromises = limitedEquipment.map(eq => 
                    fetchSarkyAnalytics(eq.id).then(data => ({ id: eq.id, data }))
                );

                const [maintenanceResults, sarkyResults] = await Promise.all([
                    Promise.allSettled(maintenancePromises),
                    Promise.allSettled(sarkyPromises)
                ]);

                // Process maintenance results
                const maintenanceMap = {};
                maintenanceResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        maintenanceMap[result.value.id] = result.value.data;
                    }
                });

                // Process sarky results
                const sarkyMap = {};
                sarkyResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        sarkyMap[result.value.id] = result.value.data;
                    }
                });

                setMaintenanceData(maintenanceMap);
                setSarkyData(sarkyMap);
            }

        } catch (error) {
            console.error('Error loading data:', error);
            setError('Failed to load dashboard data. Please try refreshing.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Filter equipment based on selected type
    const getFilteredEquipment = () => {
        if (selectedType === 'all') {
            return equipment;
        }
        return equipment.filter(eq => eq.typeId === selectedType);
    };

    // Helper function to get color for status
    const getStatusColor = (status) => {
        switch (status) {
            case 'RUNNING':
                return '#10b981';
            case 'AVAILABLE':
                return '#27ae60';
            case 'SOLD':
                return '#ef4444';
            case 'IN_MAINTENANCE':
                return '#f59e0b';
            case 'SCRAPPED':
                return '#8b5cf6';
            case 'RENTED':
                return '#3060d0';
            default:
                return '#6b7280';
        }
    };

    // Calculate summary statistics
    const filteredEquipment = getFilteredEquipment();
    const totalEquipment = filteredEquipment.length;
    const activeEquipment = filteredEquipment.filter(eq => 
        statusOptions.some(status => status.value === eq.status)
    ).length;
    const inactiveEquipment = totalEquipment - activeEquipment;
    const totalMaintenanceEvents = Object.values(maintenanceData).reduce((sum, data) => 
        sum + (data.totalMaintenanceEvents || 0), 0);
    const totalWorkHours = Object.values(sarkyData).reduce((sum, data) => 
        sum + (data.totalWorkHours || 0), 0);

    // Calculate equipment data for charts
    const equipmentByTypeData = equipmentTypes.map(type => {
        const typeEquipment = equipment.filter(eq => eq.typeId === type.id);
        const count = typeEquipment.length;
        const active = typeEquipment.filter(eq => 
            statusOptions.some(status => status.value === eq.status)
        ).length;
        
        return {
            name: type.name,
            count: count,
            active: active,
            inactive: count - active,
            maintenance: typeEquipment.filter(eq => eq.status === 'IN_MAINTENANCE').length
        };
    }).filter(item => item.count > 0);

    const statusData = statusOptions.map(status => {
        const count = equipment.filter(eq => eq.status === status.value).length;
        return {
            name: status.label,
            value: count,
            color: getStatusColor(status.value)
        };
    }).filter(item => item.value > 0);

    const brandData = equipmentBrands.map(brand => {
        const count = equipment.filter(eq => eq.brandId === brand.id).length;
        return { name: brand.name, value: count };
    }).filter(item => item.value > 0).slice(0, 8);

    // Filter sites based on search term
    const getFilteredSites = () => {
        return sites.filter(site =>
            site.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const siteData = getFilteredSites().map(site => {
        const siteEquipment = equipment.filter(eq => eq.siteId === site.id);
        const activeSiteEquipment = siteEquipment.filter(eq => 
            statusOptions.some(status => status.value === eq.status)
        );
        const maintenanceEvents = siteEquipment.reduce((sum, eq) => 
            sum + (maintenanceData[eq.id]?.totalMaintenanceEvents || 0), 0);
        const workHours = siteEquipment.reduce((sum, eq) => 
            sum + (sarkyData[eq.id]?.totalWorkHours || 0), 0);
        
        return {
            name: site.name,
            totalEquipment: siteEquipment.length,
            activeEquipment: activeSiteEquipment.length,
            utilizationRate: siteEquipment.length > 0 ? Math.round((activeSiteEquipment.length / siteEquipment.length) * 100) : 0,
            maintenanceEvents: maintenanceEvents,
            workHours: Math.round(workHours),
            location: site.physicalAddress || 'Unknown',
            completionRate: maintenanceData[siteEquipment[0]?.id]?.completionRate || 0
        };
    }).filter(site => site.totalEquipment > 0);

    // Generate maintenance trends data from analytics
    const maintenanceTrendsData = Object.values(maintenanceData)
        .filter(data => data.monthlyBreakdown && data.monthlyBreakdown.length > 0)
        .reduce((acc, data) => {
            data.monthlyBreakdown.forEach(month => {
                const existingMonth = acc.find(item => item.month === month.month);
                if (existingMonth) {
                    existingMonth.totalEvents += month.totalEvents || 0;
                    existingMonth.completedEvents += month.completedEvents || 0;
                } else {
                    acc.push({
                        month: month.month,
                        totalEvents: month.totalEvents || 0,
                        completedEvents: month.completedEvents || 0
                    });
                }
            });
            return acc;
        }, [])
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // Last 6 months

    // Generate work hours trends from sarky data
    const workHoursTrendsData = Object.values(sarkyData)
        .filter(data => data.monthlyWorkHours && data.monthlyWorkHours.length > 0)
        .reduce((acc, data) => {
            data.monthlyWorkHours.forEach(month => {
                const existingMonth = acc.find(item => item.month === month.month);
                if (existingMonth) {
                    existingMonth.totalHours += month.totalHours || 0;
                    existingMonth.workDays += month.workDays || 0;
                } else {
                    acc.push({
                        month: month.month,
                        totalHours: month.totalHours || 0,
                        workDays: month.workDays || 0
                    });
                }
            });
            return acc;
        }, [])
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // Last 6 months

    // Calculate additional metrics
    const avgUtilizationRate = siteData.length > 0 ? 
        Math.round(siteData.reduce((sum, site) => sum + site.utilizationRate, 0) / siteData.length) : 0;
    
    const totalOverdueMaintenances = Object.values(maintenanceData).reduce((sum, data) => 
        sum + (data.overdueEvents || 0), 0);

    const avgMaintenanceCompletionRate = Object.values(maintenanceData).length > 0 ?
        Math.round(Object.values(maintenanceData).reduce((sum, data) => 
            sum + (data.completionRate || 0), 0) / Object.values(maintenanceData).length) : 0;

    return (
        <div className="eq-dashboard">
            {/* Header Section */}
            <header className="eq-header">
                <div className="eq-header-container">
                    <div className="eq-header-content">
                        <div className="eq-title-section">
                            <h1>Equipment Operations</h1>
                            <p>Comprehensive equipment management and analytics dashboard</p>
                        </div>
                        <div className="eq-header-controls">
                            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="eq-time-filter">
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                            </select>
                            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="eq-type-filter">
                                <option value="all">All Equipment Types</option>
                                {equipmentTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                            <button onClick={loadAllData} disabled={loading} className="eq-refresh-btn">
                                <RefreshCw className={loading ? "eq-spinning" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="eq-content">
                {error && (
                    <div className="eq-error-banner">
                        <AlertTriangle size={20} />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* KPI Section */}
                <section className="eq-kpi-section">
                    <div className="eq-section-header">
                        <h2>Key Performance Indicators</h2>
                        <p>Real-time overview of your equipment fleet operations</p>
                    </div>
                    <div className="eq-kpi-grid">
                        <div className="eq-kpi-card eq-primary">
                            <div className="eq-kpi-icon">
                                <Truck />
                            </div>
                            <div className="eq-kpi-content">
                                <div className="eq-kpi-value">{totalEquipment.toLocaleString()}</div>
                                <div className="eq-kpi-label">Total Equipment</div>
                                <div className="eq-kpi-trend eq-positive">
                                    <ArrowUp size={14} />
                                    {equipmentTypes.length} types available
                                </div>
                            </div>
                        </div>

                        <div className="eq-kpi-card eq-success">
                            <div className="eq-kpi-icon">
                                <CheckCircle />
                            </div>
                            <div className="eq-kpi-content">
                                <div className="eq-kpi-value">{totalEquipment > 0 ? Math.round((activeEquipment / totalEquipment) * 100) : 0}%</div>
                                <div className="eq-kpi-label">Utilization Rate</div>
                                <div className="eq-kpi-trend eq-positive">
                                    <ArrowUp size={14} />
                                    {activeEquipment} active units
                                </div>
                            </div>
                        </div>

                        <div className="eq-kpi-card eq-warning">
                            <div className="eq-kpi-icon">
                                <Wrench />
                            </div>
                            <div className="eq-kpi-content">
                                <div className="eq-kpi-value">{totalMaintenanceEvents}</div>
                                <div className="eq-kpi-label">Maintenance Events</div>
                                <div className="eq-kpi-trend eq-neutral">
                                    <Activity size={14} />
                                    {avgMaintenanceCompletionRate}% completion rate
                                </div>
                            </div>
                        </div>

                        <div className="eq-kpi-card eq-info">
                            <div className="eq-kpi-icon">
                                <Clock />
                            </div>
                            <div className="eq-kpi-content">
                                <div className="eq-kpi-value">{Math.round(totalWorkHours).toLocaleString()}</div>
                                <div className="eq-kpi-label">Total Work Hours</div>
                                <div className="eq-kpi-trend eq-positive">
                                    <TrendingUp size={14} />
                                    Operational time logged
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Analytics Section */}
                <section className="eq-analytics-section">
                    <div className="eq-section-header">
                        <h2>Equipment Analytics</h2>
                        <p>Deep insights into equipment performance and utilization</p>
                    </div>
                    <div className="eq-analytics-grid">
                        {/* Main Chart */}
                        <div className="eq-chart-card eq-main-chart">
                            <div className="eq-chart-header">
                                <div className="eq-chart-title">
                                    <BarChart3 className="eq-chart-icon" />
                                    <div>
                                        <h3>Equipment by Type</h3>
                                        <p>Distribution and status across equipment types</p>
                                    </div>
                                </div>
                                <button className="eq-view-details-btn">
                                    <Eye size={16} />
                                    View Details
                                </button>
                            </div>
                            <div className="eq-chart-container">
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={equipmentByTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <Tooltip contentStyle={{
                                            backgroundColor: 'var(--color-surface)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--color-text-primary)'
                                        }} />
                                        <Bar dataKey="active" fill="#10b981" name="Active" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="inactive" fill="#ef4444" name="Inactive" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="maintenance" fill="#f59e0b" name="In Maintenance" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Status Chart */}
                        <div className="eq-chart-card">
                            <div className="eq-chart-header">
                                <div className="eq-chart-title">
                                    <PieChartIcon className="eq-chart-icon" />
                                    <div>
                                        <h3>Equipment Status</h3>
                                        <p>Current fleet status</p>
                                    </div>
                                </div>
                            </div>
                            <div className="eq-chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="eq-chart-legend">
                                {statusData.map((item, index) => (
                                    <div key={item.name} className="eq-legend-item">
                                        <div className="eq-legend-color" style={{ backgroundColor: item.color }} />
                                        <span className="eq-legend-label">{item.name}</span>
                                        <span className="eq-legend-value">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Maintenance Trends Chart */}
                        <div className="eq-chart-card">
                            <div className="eq-chart-header">
                                <div className="eq-chart-title">
                                    <TrendingUp className="eq-chart-icon" />
                                    <div>
                                        <h3>Maintenance Trends</h3>
                                        <p>Monthly maintenance events</p>
                                    </div>
                                </div>
                            </div>
                            <div className="eq-chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={maintenanceTrendsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="totalEvents" stroke="#f59e0b" name="Total Events" />
                                        <Line type="monotone" dataKey="completedEvents" stroke="#10b981" name="Completed" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Work Hours Trends Chart */}
                        <div className="eq-chart-card">
                            <div className="eq-chart-header">
                                <div className="eq-chart-title">
                                    <Clock className="eq-chart-icon" />
                                    <div>
                                        <h3>Work Hours Trends</h3>
                                        <p>Monthly operational hours</p>
                                    </div>
                                </div>
                            </div>
                            <div className="eq-chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={workHoursTrendsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="totalHours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Equipment Management Section */}
                <section className="eq-equipment-section">
                    <div className="eq-section-header">
                        <h2>Fleet Management</h2>
                        <p>Monitor and manage equipment across all sites</p>
                    </div>
                    <div className="eq-equipment-content">
                        <div className="eq-equipment-overview">
                            <div className="eq-overview-header">
                                <div className="eq-overview-title">
                                    <MapPin className="eq-overview-icon" />
                                    <div>
                                        <h3>Equipment by Location</h3>
                                        <p>Real-time site distribution and metrics</p>
                                    </div>
                                </div>
                                <div className="eq-search-container">
                                    <Search className="eq-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search sites..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="eq-search-input"
                                    />
                                </div>
                            </div>
                            <div className="eq-equipment-grid">
                                {siteData.map((site, index) => (
                                    <div key={site.name} className="eq-equipment-card">
                                        <div className="eq-equipment-header">
                                            <div className="eq-equipment-info">
                                                <h4>{site.name}</h4>
                                                <div className="eq-equipment-meta">
                                                    <span><MapPin size={12} /> {site.location}</span>
                                                    <span><Truck size={12} /> {site.totalEquipment} units</span>
                                                </div>
                                            </div>
                                            <div className={`eq-status-badge ${site.utilizationRate > 80 ? 'eq-success' : site.utilizationRate > 60 ? 'eq-warning' : 'eq-danger'}`}>
                                                {site.utilizationRate > 80 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                            </div>
                                        </div>
                                        <div className="eq-equipment-stats">
                                            <div className="eq-stat">
                                                <span className="eq-stat-value">{site.activeEquipment}</span>
                                                <span className="eq-stat-label">Active</span>
                                            </div>
                                            <div className="eq-stat">
                                                <span className="eq-stat-value">{site.utilizationRate}%</span>
                                                <span className="eq-stat-label">Utilization</span>
                                            </div>
                                            <div className="eq-stat">
                                                <span className="eq-stat-value">{site.workHours}</span>
                                                <span className="eq-stat-label">Work Hours</span>
                                            </div>
                                        </div>
                                        <div className="eq-utilization-indicator">
                                            <div className="eq-utilization-bar">
                                                <div
                                                    className="eq-utilization-fill"
                                                    style={{
                                                        width: `${site.utilizationRate}%`,
                                                        backgroundColor: site.utilizationRate > 80 ? '#10b981' :
                                                            site.utilizationRate > 60 ? '#f59e0b' : '#ef4444'
                                                    }}
                                                />
                                            </div>
                                            <span className="eq-utilization-text">{site.utilizationRate}% utilized</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="eq-brand-overview">
                            <div className="eq-brand-header">
                                <div className="eq-brand-title">
                                    <Settings className="eq-brand-icon" />
                                    <div>
                                        <h3>Equipment by Brand</h3>
                                        <p>Fleet composition and brand distribution</p>
                                    </div>
                                </div>
                            </div>
                            <div className="eq-brand-list">
                                {brandData.map((brand, index) => (
                                    <div key={brand.name} className="eq-brand-item">
                                        <div className="eq-brand-info">
                                            <span className="eq-brand-name">{brand.name}</span>
                                            <span className="eq-brand-count">{brand.value} units</span>
                                        </div>
                                        <div className="eq-brand-bar">
                                            <div
                                                className="eq-brand-fill"
                                                style={{
                                                    width: `${(brand.value / Math.max(...brandData.map(b => b.value))) * 100}%`,
                                                    backgroundColor: `hsl(${200 + index * 40}, 70%, 50%)`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Additional Insights Section */}
                <section className="eq-insights-section">
                    <div className="eq-section-header">
                        <h2>Fleet Insights</h2>
                        <p>Additional metrics and performance indicators</p>
                    </div>
                    <div className="eq-insights-grid">
                        <div className="eq-insight-card">
                            <div className="eq-insight-header">
                                <AlertTriangle className="eq-insight-icon" />
                                <h3>Maintenance Alerts</h3>
                            </div>
                            <div className="eq-insight-content">
                                <div className="eq-insight-value">{totalOverdueMaintenances}</div>
                                <div className="eq-insight-label">Overdue Maintenances</div>
                                <div className="eq-insight-description">
                                    Equipment requiring immediate attention
                                </div>
                            </div>
                        </div>
                        
                        <div className="eq-insight-card">
                            <div className="eq-insight-header">
                                <Activity className="eq-insight-icon" />
                                <h3>Fleet Efficiency</h3>
                            </div>
                            <div className="eq-insight-content">
                                <div className="eq-insight-value">{avgUtilizationRate}%</div>
                                <div className="eq-insight-label">Average Utilization</div>
                                <div className="eq-insight-description">
                                    Overall fleet utilization rate
                                </div>
                            </div>
                        </div>
                        
                        <div className="eq-insight-card">
                            <div className="eq-insight-header">
                                <CheckCircle className="eq-insight-icon" />
                                <h3>Maintenance Success</h3>
                            </div>
                            <div className="eq-insight-content">
                                <div className="eq-insight-value">{avgMaintenanceCompletionRate}%</div>
                                <div className="eq-insight-label">Completion Rate</div>
                                <div className="eq-insight-description">
                                    Average maintenance completion rate
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default EquipmentManagerDashboard;