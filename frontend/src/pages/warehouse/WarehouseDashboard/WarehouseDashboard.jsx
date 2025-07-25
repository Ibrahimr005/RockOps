import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Package, Users, Warehouse, AlertTriangle, TrendingUp, Search, RefreshCw, Activity, MapPin, CheckCircle, ArrowUp, ArrowDown, Eye, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import './WarehouseDashboard.scss';

// Import services
import { warehouseService } from '../../../services/warehouse/warehouseService';
import { itemService } from '../../../services/warehouse/itemService';
import { itemTypeService } from '../../../services/warehouse/itemTypeService';
import { itemCategoryService } from '../../../services/warehouse/itemCategoryService';

const WarehouseManagerDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeframe, setTimeframe] = useState('week');
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');

    // State for all data
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [itemTypes, setItemTypes] = useState([]);
    const [itemCategories, setItemCategories] = useState([]);
    const [warehouseSummaries, setWarehouseSummaries] = useState({});
    const [itemCounts, setItemCounts] = useState({});

    // Service Functions
    const fetchWarehouses = async () => {
        try {
            const data = await warehouseService.getAll();
            setWarehouses(data);
            return data;
        } catch (error) {
            console.error('Error fetching warehouses:', error);
            return [];
        }
    };

    const fetchItemTypes = async () => {
        try {
            const data = await itemTypeService.getAll();
            setItemTypes(data);
            return data;
        } catch (error) {
            console.error('Error fetching item types:', error);
            return [];
        }
    };

    const fetchItemCategories = async () => {
        try {
            const data = await itemCategoryService.getAll();
            setItemCategories(data);
            return data;
        } catch (error) {
            console.error('Error fetching item categories:', error);
            return [];
        }
    };

    const fetchWarehouseItems = async (warehouseId) => {
        try {
            const data = await itemService.getItemsByWarehouse(warehouseId);
            return data;
        } catch (error) {
            console.error(`Error fetching items for warehouse ${warehouseId}:`, error);
            return [];
        }
    };

    const fetchWarehouseSummary = async (warehouseId) => {
        try {
            const data = await itemService.getWarehouseSummary(warehouseId);
            return data;
        } catch (error) {
            console.error(`Error fetching summary for warehouse ${warehouseId}:`, error);
            return {};
        }
    };

    const fetchWarehouseItemCounts = async (warehouseId) => {
        try {
            const data = await itemService.getItemStatusCounts(warehouseId);
            return data;
        } catch (error) {
            console.error(`Error fetching counts for warehouse ${warehouseId}:`, error);
            return {};
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Fetch base data
            const warehousesData = await fetchWarehouses();
            await fetchItemTypes();
            await fetchItemCategories();

            // Fetch warehouse-specific data
            const allItems = [];
            const summaries = {};
            const counts = {};

            for (const warehouse of warehousesData) {
                const warehouseItems = await fetchWarehouseItems(warehouse.id);
                const summary = await fetchWarehouseSummary(warehouse.id);
                const itemCounts = await fetchWarehouseItemCounts(warehouse.id);

                allItems.push(...warehouseItems.map(item => ({ ...item, warehouseName: warehouse.name })));
                summaries[warehouse.id] = summary;
                counts[warehouse.id] = itemCounts;
            }

            setItems(allItems);
            setWarehouseSummaries(summaries);
            setItemCounts(counts);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Calculate summary statistics
    const totalWarehouses = warehouses.length;
    const totalItems = items.length;
    const totalEmployees = warehouses.reduce((sum, w) => sum + (w.employees?.length || 0), 0);
    const totalAlerts = Object.values(itemCounts).reduce((sum, counts) =>
        sum + (counts.stolen || 0) + (counts.overReceived || 0), 0);

    const warehouseData = warehouses.map(warehouse => {
        const summary = warehouseSummaries[warehouse.id] || {};
        const counts = itemCounts[warehouse.id] || {};
        return {
            name: warehouse.name,
            totalItems: summary.totalItems || 0,
            activeIssues: summary.activeDiscrepancies || 0,
            inStock: counts.inWarehouse || 0,
            employees: warehouse.employees?.length || 0,
            capacity: 1000,
            utilization: Math.round(((summary.totalItems || 0) / 1000) * 100)
        };
    });

    const statusData = [
        { name: 'In Stock', value: items.filter(item => item.itemStatus === 'IN_WAREHOUSE').length, color: '#10b981' },
        { name: 'Missing', value: items.filter(item => item.itemStatus === 'MISSING').length, color: '#ef4444' },
        { name: 'Over Received', value: items.filter(item => item.itemStatus === 'OVERRECEIVED').length, color: '#f59e0b' },
        { name: 'Delivering', value: items.filter(item => item.itemStatus === 'DELIVERING').length, color: '#3b82f6' },
        { name: 'Pending', value: items.filter(item => item.itemStatus === 'PENDING').length, color: '#8b5cf6' }
    ].filter(item => item.value > 0);

    const categoryData = itemCategories.filter(cat => !cat.parentCategory).map(category => {
        const count = items.filter(item => {
            const itemCategory = item.itemType?.itemCategory;
            return itemCategory?.name === category.name || (itemCategory?.parentCategory?.name === category.name);
        }).length;
        return { name: category.name, value: count };
    }).filter(item => item.value > 0).slice(0, 5);

    const trendData = [
        { name: 'Mon', items: 2400, issues: 24 },
        { name: 'Tue', items: 1398, issues: 13 },
        { name: 'Wed', items: 9800, issues: 98 },
        { name: 'Thu', items: 3908, issues: 39 },
        { name: 'Fri', items: 4800, issues: 48 },
        { name: 'Sat', items: 3800, issues: 38 },
        { name: 'Sun', items: 4300, issues: 43 }
    ];

    return (
        <div className="wh-dashboard">
            {/* Header Section */}
            <header className="wh-header">
                <div className="wh-header-container">
                    <div className="wh-header-content">
                        <div className="wh-title-section">
                            <h1>Warehouse Operations</h1>
                            <p>Real-time insights and analytics dashboard</p>
                        </div>
                        <div className="wh-header-controls">
                            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="wh-time-filter">
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                            </select>
                            <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="wh-warehouse-filter">
                                <option value="all">All Warehouses</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                            <button onClick={loadAllData} disabled={loading} className="wh-refresh-btn">
                                <RefreshCw className={loading ? "wh-spinning" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="wh-content">
                {/* KPI Section */}
                <section className="wh-kpi-section">
                    <div className="wh-section-header">
                        <h2>Key Performance Indicators</h2>
                        <p>Real-time overview of your warehouse operations</p>
                    </div>
                    <div className="wh-kpi-grid">
                        <div className="wh-kpi-card wh-primary">
                            <div className="wh-kpi-icon">
                                <Package />
                            </div>
                            <div className="wh-kpi-content">
                                <div className="wh-kpi-value">{totalItems.toLocaleString()}</div>
                                <div className="wh-kpi-label">Total Inventory</div>
                                <div className="wh-kpi-trend wh-positive">
                                    <ArrowUp size={14} />
                                    +12% from last month
                                </div>
                            </div>
                        </div>

                        <div className="wh-kpi-card wh-success">
                            <div className="wh-kpi-icon">
                                <CheckCircle />
                            </div>
                            <div className="wh-kpi-content">
                                <div className="wh-kpi-value">{Math.round((statusData.find(s => s.name === 'In Stock')?.value || 0) / totalItems * 100) || 0}%</div>
                                <div className="wh-kpi-label">Stock Availability</div>
                                <div className="wh-kpi-trend wh-positive">
                                    <ArrowUp size={14} />
                                    +8% from last week
                                </div>
                            </div>
                        </div>

                        <div className="wh-kpi-card wh-warning">
                            <div className="wh-kpi-icon">
                                <AlertTriangle />
                            </div>
                            <div className="wh-kpi-content">
                                <div className="wh-kpi-value">{totalAlerts}</div>
                                <div className="wh-kpi-label">Active Issues</div>
                                <div className="wh-kpi-trend wh-negative">
                                    <ArrowDown size={14} />
                                    -3% from last week
                                </div>
                            </div>
                        </div>

                        <div className="wh-kpi-card wh-info">
                            <div className="wh-kpi-icon">
                                <Users />
                            </div>
                            <div className="wh-kpi-content">
                                <div className="wh-kpi-value">{totalEmployees}</div>
                                <div className="wh-kpi-label">Team Members</div>
                                <div className="wh-kpi-trend wh-neutral">
                                    <Activity size={14} />
                                    Across {totalWarehouses} locations
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Analytics Section */}
                <section className="wh-analytics-section">
                    <div className="wh-section-header">
                        <h2>Performance Analytics</h2>
                        <p>Deep insights into warehouse operations and trends</p>
                    </div>
                    <div className="wh-analytics-grid">
                        {/* Main Chart */}
                        <div className="wh-chart-card wh-main-chart">
                            <div className="wh-chart-header">
                                <div className="wh-chart-title">
                                    <BarChart3 className="wh-chart-icon" />
                                    <div>
                                        <h3>Warehouse Performance</h3>
                                        <p>Inventory levels and capacity utilization</p>
                                    </div>
                                </div>
                                <button className="wh-view-details-btn">
                                    <Eye size={16} />
                                    View Details
                                </button>
                            </div>
                            <div className="wh-chart-container">
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={warehouseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <Tooltip contentStyle={{
                                            backgroundColor: 'var(--color-surface)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            color: 'var(--color-text-primary)'
                                        }} />
                                        <Bar dataKey="totalItems" fill="#3b82f6" name="Total Items" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="activeIssues" fill="#ef4444" name="Active Issues" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Status Chart */}
                        <div className="wh-chart-card">
                            <div className="wh-chart-header">
                                <div className="wh-chart-title">
                                    <PieChartIcon className="wh-chart-icon" />
                                    <div>
                                        <h3>Inventory Status</h3>
                                        <p>Current distribution</p>
                                    </div>
                                </div>
                            </div>
                            <div className="wh-chart-container">
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
                            <div className="wh-chart-legend">
                                {statusData.map((item, index) => (
                                    <div key={item.name} className="wh-legend-item">
                                        <div className="wh-legend-color" style={{ backgroundColor: item.color }} />
                                        <span className="wh-legend-label">{item.name}</span>
                                        <span className="wh-legend-value">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trends Chart */}
                        <div className="wh-chart-card">
                            <div className="wh-chart-header">
                                <div className="wh-chart-title">
                                    <TrendingUp className="wh-chart-icon" />
                                    <div>
                                        <h3>Weekly Trends</h3>
                                        <p>Items vs issues</p>
                                    </div>
                                </div>
                            </div>
                            <div className="wh-chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="items" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                                        <Area type="monotone" dataKey="issues" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Warehouse Management Section */}
                <section className="wh-warehouse-section">
                    <div className="wh-section-header">
                        <h2>Warehouse Management</h2>
                        <p>Monitor and manage individual warehouse locations</p>
                    </div>
                    <div className="wh-warehouse-content">
                        <div className="wh-warehouse-overview">
                            <div className="wh-overview-header">
                                <div className="wh-overview-title">
                                    <Warehouse className="wh-overview-icon" />
                                    <div>
                                        <h3>Active Locations</h3>
                                        <p>Real-time status and metrics</p>
                                    </div>
                                </div>
                                <div className="wh-search-container">
                                    <Search className="wh-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search warehouses..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="wh-search-input"
                                    />
                                </div>
                            </div>
                            <div className="wh-warehouse-grid">
                                {warehouseData.filter(w =>
                                    w.name.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map((warehouse, index) => (
                                    <div key={warehouse.name} className="wh-warehouse-card">
                                        <div className="wh-warehouse-header">
                                            <div className="wh-warehouse-info">
                                                <h4>{warehouse.name}</h4>
                                                <div className="wh-warehouse-meta">
                                                    <span><MapPin size={12} /> Location {index + 1}</span>
                                                    <span><Users size={12} /> {warehouse.employees} staff</span>
                                                </div>
                                            </div>
                                            <div className={`wh-status-badge ${warehouse.activeIssues === 0 ? 'wh-success' : 'wh-warning'}`}>
                                                {warehouse.activeIssues === 0 ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                            </div>
                                        </div>
                                        <div className="wh-warehouse-stats">
                                            <div className="wh-stat">
                                                <span className="wh-stat-value">{warehouse.totalItems.toLocaleString()}</span>
                                                <span className="wh-stat-label">Items</span>
                                            </div>
                                            <div className="wh-stat">
                                                <span className="wh-stat-value">{warehouse.utilization}%</span>
                                                <span className="wh-stat-label">Capacity</span>
                                            </div>
                                            <div className="wh-stat">
                                                <span className={`wh-stat-value ${warehouse.activeIssues > 0 ? 'wh-warning' : 'wh-success'}`}>
                                                    {warehouse.activeIssues}
                                                </span>
                                                <span className="wh-stat-label">Issues</span>
                                            </div>
                                        </div>
                                        <div className="wh-capacity-indicator">
                                            <div className="wh-capacity-bar">
                                                <div
                                                    className="wh-capacity-fill"
                                                    style={{
                                                        width: `${warehouse.utilization}%`,
                                                        backgroundColor: warehouse.utilization > 80 ? '#ef4444' :
                                                            warehouse.utilization > 60 ? '#f59e0b' : '#10b981'
                                                    }}
                                                />
                                            </div>
                                            <span className="wh-capacity-text">{warehouse.utilization}% utilized</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="wh-category-overview">
                            <div className="wh-category-header">
                                <div className="wh-category-title">
                                    <Package className="wh-category-icon" />
                                    <div>
                                        <h3>Category Distribution</h3>
                                        <p>Items by main categories</p>
                                    </div>
                                </div>
                            </div>
                            <div className="wh-category-list">
                                {categoryData.map((category, index) => (
                                    <div key={category.name} className="wh-category-item">
                                        <div className="wh-category-info">
                                            <span className="wh-category-name">{category.name}</span>
                                            <span className="wh-category-count">{category.value} items</span>
                                        </div>
                                        <div className="wh-category-bar">
                                            <div
                                                className="wh-category-fill"
                                                style={{
                                                    width: `${(category.value / Math.max(...categoryData.map(c => c.value))) * 100}%`,
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
            </div>
        </div>
    );
};

export default WarehouseManagerDashboard;