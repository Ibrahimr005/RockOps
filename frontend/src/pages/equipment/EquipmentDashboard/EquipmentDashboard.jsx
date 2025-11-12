import React, { useState, useEffect, forwardRef, useImperativeHandle, useContext } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart 
} from 'recharts';
import { 
    Clock, Package, Wrench, TrendingUp, Activity, AlertTriangle, CheckCircle,
    DollarSign, Zap, Fuel, Users, Calendar, Target, TrendingDown, Award
} from 'lucide-react';
import { SnackbarContext } from '../../../contexts/SnackbarContext';
import { equipmentService } from '../../../services/equipmentService';
import LoadingPage from '../../../components/common/LoadingPage/LoadingPage';
import '../.././../styles/dashboard-styles.scss';
import './EquipmentDashboard.scss';

const EquipmentDashboard = forwardRef(({ equipmentId }, ref) => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('MONTH');
    const { showSnackbar } = useContext(SnackbarContext);

    const COLORS = {
        primary: '#4880ff',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        purple: '#8b5cf6',
        pink: '#ec4899',
        orange: '#f97316'
    };

    const fetchDashboardData = async () => {
        if (!equipmentId) return;

        try {
            setLoading(true);
            const response = await equipmentService.getEquipmentDashboard(equipmentId, selectedPeriod);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showSnackbar('Failed to load dashboard data. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        refreshDashboard: fetchDashboardData
    }));

    useEffect(() => {
        fetchDashboardData();
    }, [equipmentId, selectedPeriod]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatNumber = (value, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value || 0);
    };

    if (loading) {
        return <LoadingPage />;
    }

    if (!dashboardData) {
        return (
            <div className="rockops-equipment-dashboard-error">
                <AlertTriangle size={48} />
                <h3>Unable to Load Dashboard</h3>
                <p>No data available for this equipment</p>
            </div>
        );
    }

    const { 
        solarConsumption, 
        fuelConsumption, 
        lastExternalMaintenance,
        externalMaintenanceHistory,
        inSiteMaintenanceHistory,
        consumablesHistory,
        workingHoursMetrics,
        productivityMetrics,
        runningCostDetails,
        rentingPriceAnalysis,
        workingHourPriceBreakdown,
        efficiencyMetrics
    } = dashboardData;

    return (
        <div className="rockops-equipment-dashboard">
            {/* Period Selector */}
            <div className="rockops-equipment-dashboard-period-selector">
                <h2 className="rockops-equipment-dashboard-title">
                    <TrendingUp size={28} />
                    Equipment Performance Dashboard
                </h2>
                <div className="rockops-equipment-dashboard-period-buttons">
                    {['WEEK', 'MONTH', '3MONTH', '6MONTH', 'YEAR'].map(period => (
                        <button
                            key={period}
                            className={`rockops-equipment-dashboard-period-button ${selectedPeriod === period ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod(period)}
                        >
                            {period === '3MONTH' ? '3 Months' : period === '6MONTH' ? '6 Months' : period.charAt(0) + period.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="rockops-equipment-dashboard-kpi-grid">
                {/* Working Hours */}
                <div className="rockops-equipment-dashboard-kpi-card primary">
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <Clock size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatNumber(workingHoursMetrics?.totalWorkingHours, 0)}
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Total Working Hours</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            Avg: {formatNumber(workingHoursMetrics?.averageDailyHours, 1)} hrs/day
                        </div>
                    </div>
                </div>

                {/* Productivity */}
                <div className="rockops-equipment-dashboard-kpi-card success">
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <Target size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatNumber(productivityMetrics?.totalProduction, 0)} m³
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Total Production</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            Rate: {formatNumber(productivityMetrics?.productionRate, 2)} m³/hr
                        </div>
                    </div>
                </div>

                {/* Running Cost */}
                <div className="rockops-equipment-dashboard-kpi-card warning">
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <DollarSign size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatCurrency(runningCostDetails?.totalRunningCost)}
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Total Running Cost</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            {formatCurrency(workingHourPriceBreakdown?.workingHourPrice)}/hr
                        </div>
                    </div>
                </div>

                {/* Efficiency */}
                <div className={`rockops-equipment-dashboard-kpi-card ${
                    efficiencyMetrics?.efficiencyStatus === 'EXCELLENT' ? 'success' :
                    efficiencyMetrics?.efficiencyStatus === 'GOOD' ? 'info' :
                    efficiencyMetrics?.efficiencyStatus === 'AVERAGE' ? 'warning' : 'danger'
                }`}>
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <Award size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatNumber(efficiencyMetrics?.workingHoursEfficiency, 0)}%
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Working Hours Efficiency</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            {efficiencyMetrics?.efficiencyStatus}
                        </div>
                    </div>
                </div>

                {/* Fuel Consumption */}
                <div className="rockops-equipment-dashboard-kpi-card danger">
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <Fuel size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatCurrency(fuelConsumption?.monthlyCost)}
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Fuel Cost (Monthly)</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            {formatNumber(fuelConsumption?.monthlyQuantity, 0)} L
                        </div>
                    </div>
                </div>

                {/* Solar Consumption */}
                <div className="rockops-equipment-dashboard-kpi-card info">
                    <div className="rockops-equipment-dashboard-kpi-icon">
                        <Zap size={28} />
                    </div>
                    <div className="rockops-equipment-dashboard-kpi-content">
                        <div className="rockops-equipment-dashboard-kpi-value">
                            {formatCurrency(solarConsumption?.monthlyCost)}
                        </div>
                        <div className="rockops-equipment-dashboard-kpi-label">Solar/Power Cost</div>
                        <div className="rockops-equipment-dashboard-kpi-sub">
                            {formatNumber(solarConsumption?.monthlyQuantity, 0)} kWh
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="rockops-equipment-dashboard-charts">
                {/* Working Hours Chart */}
                <div className="rockops-equipment-dashboard-chart-card">
                    <div className="rockops-equipment-dashboard-chart-header">
                        <h3><Clock size={20} /> Working Hours Over Time</h3>
                        <p>Monthly working hours trend</p>
                    </div>
                    <div className="rockops-equipment-dashboard-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={workingHoursMetrics?.workingHoursOverTime || []}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="period" stroke="var(--color-text-secondary)" />
                                <YAxis stroke="var(--color-text-secondary)" />
                                <Tooltip />
                                <Area 
                                    type="monotone" 
                                    dataKey="hours" 
                                    stroke={COLORS.primary} 
                                    fillOpacity={1} 
                                    fill="url(#colorHours)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Running Cost Breakdown */}
                <div className="rockops-equipment-dashboard-chart-card">
                    <div className="rockops-equipment-dashboard-chart-header">
                        <h3><DollarSign size={20} /> Running Cost Breakdown</h3>
                        <p>Cost distribution by category</p>
                    </div>
                    <div className="rockops-equipment-dashboard-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={runningCostDetails?.costBreakdown || []}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.category}: ${formatNumber(entry.percentage, 1)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="amount"
                                >
                                    {(runningCostDetails?.costBreakdown || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Productivity Chart */}
                <div className="rockops-equipment-dashboard-chart-card full-width">
                    <div className="rockops-equipment-dashboard-chart-header">
                        <h3><Target size={20} /> Productivity & Efficiency</h3>
                        <p>Production rate and efficiency metrics</p>
                    </div>
                    <div className="rockops-equipment-dashboard-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={productivityMetrics?.productionOverTime || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="period" stroke="var(--color-text-secondary)" />
                                <YAxis stroke="var(--color-text-secondary)" />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="production" fill={COLORS.success} name="Production (m³)" />
                                <Bar dataKey="rate" fill={COLORS.info} name="Rate (m³/hr)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Metrics Sections */}
            <div className="rockops-equipment-dashboard-sections">
                {/* Last External Maintenance */}
                {lastExternalMaintenance && (
                    <div className="rockops-equipment-dashboard-section-card">
                        <h3><Wrench size={20} /> Last External Maintenance</h3>
                        <div className="rockops-equipment-dashboard-section-content">
                            <div className="rockops-equipment-dashboard-metric-row">
                                <span>Date:</span>
                                <span className="metric-value">{new Date(lastExternalMaintenance.maintenanceDate).toLocaleDateString()}</span>
                            </div>
                            <div className="rockops-equipment-dashboard-metric-row">
                                <span>Days Ago:</span>
                                <span className="metric-value">{lastExternalMaintenance.daysAgo} days</span>
                            </div>
                            <div className="rockops-equipment-dashboard-metric-row">
                                <span>Cost:</span>
                                <span className="metric-value">{formatCurrency(lastExternalMaintenance.cost)}</span>
                            </div>
                            <div className="rockops-equipment-dashboard-metric-row">
                                <span>Merchant:</span>
                                <span className="metric-value">{lastExternalMaintenance.merchantName || 'N/A'}</span>
                            </div>
                            <div className="rockops-equipment-dashboard-metric-row">
                                <span>Status:</span>
                                <span className={`metric-value ${lastExternalMaintenance.status.toLowerCase()}`}>
                                    {lastExternalMaintenance.status}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Working Hour Price Breakdown */}
                <div className="rockops-equipment-dashboard-section-card">
                    <h3><DollarSign size={20} /> Working Hour Price Breakdown</h3>
                    <div className="rockops-equipment-dashboard-section-content">
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Working Hour Price:</span>
                            <span className="metric-value success">
                                {formatCurrency(workingHourPriceBreakdown?.workingHourPrice)}
                            </span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Driver Salary/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.driverSalaryPerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Sub-Driver Salary/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.subDriverSalaryPerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Fuel/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.fuelPerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Consumables/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.consumablesPerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>In-Site Maintenance/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.inSiteMaintenancePerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>External Maintenance/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.externalMaintenancePerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Food/Hour:</span>
                            <span className="metric-value">{formatCurrency(workingHourPriceBreakdown?.foodPerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Productivity/Hour:</span>
                            <span className="metric-value info">
                                {formatNumber(workingHourPriceBreakdown?.productivityPerHour, 2)} m³/hr
                            </span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Price per Cubic Meter:</span>
                            <span className="metric-value warning">
                                {formatCurrency(workingHourPriceBreakdown?.pricePerCubicMeter)}/m³
                            </span>
                        </div>
                    </div>
                </div>

                {/* Renting Price Analysis */}
                <div className="rockops-equipment-dashboard-section-card">
                    <h3><TrendingUp size={20} /> Renting Price Analysis</h3>
                    <div className="rockops-equipment-dashboard-section-content">
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Renting Price/Hour:</span>
                            <span className="metric-value">{formatCurrency(rentingPriceAnalysis?.rentingPricePerHour)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Total Working Hours:</span>
                            <span className="metric-value">{formatNumber(rentingPriceAnalysis?.totalWorkingHours, 0)} hrs</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Total Renting Revenue:</span>
                            <span className="metric-value success">{formatCurrency(rentingPriceAnalysis?.totalRentingRevenue)}</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Profit Margin:</span>
                            <span className={`metric-value ${rentingPriceAnalysis?.profitMargin >= 0 ? 'success' : 'danger'}`}>
                                {formatCurrency(rentingPriceAnalysis?.profitMargin)}
                            </span>
                        </div>
                        {rentingPriceAnalysis?.notes && (
                            <div className="rockops-equipment-dashboard-note">
                                <AlertTriangle size={16} />
                                <span>{rentingPriceAnalysis.notes}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Efficiency Metrics */}
                <div className="rockops-equipment-dashboard-section-card">
                    <h3><Activity size={20} /> Efficiency Metrics</h3>
                    <div className="rockops-equipment-dashboard-section-content">
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Working Hours Efficiency:</span>
                            <span className={`metric-value ${
                                efficiencyMetrics?.workingHoursEfficiency >= 90 ? 'success' :
                                efficiencyMetrics?.workingHoursEfficiency >= 75 ? 'info' :
                                efficiencyMetrics?.workingHoursEfficiency >= 60 ? 'warning' : 'danger'
                            }`}>
                                {formatNumber(efficiencyMetrics?.workingHoursEfficiency, 1)}%
                            </span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Expected Hours:</span>
                            <span className="metric-value">{formatNumber(efficiencyMetrics?.expectedTotalHours, 0)} hrs</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Actual Hours:</span>
                            <span className="metric-value">{formatNumber(efficiencyMetrics?.actualTotalHours, 0)} hrs</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Productivity Efficiency:</span>
                            <span className={`metric-value ${
                                efficiencyMetrics?.productivityEfficiency >= 90 ? 'success' :
                                efficiencyMetrics?.productivityEfficiency >= 75 ? 'info' :
                                efficiencyMetrics?.productivityEfficiency >= 60 ? 'warning' : 'danger'
                            }`}>
                                {formatNumber(efficiencyMetrics?.productivityEfficiency, 1)}%
                            </span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Expected Production:</span>
                            <span className="metric-value">{formatNumber(efficiencyMetrics?.expectedProductivity, 0)} m³</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row">
                            <span>Actual Production:</span>
                            <span className="metric-value">{formatNumber(efficiencyMetrics?.actualProductivity, 0)} m³</span>
                        </div>
                        <div className="rockops-equipment-dashboard-metric-row highlight">
                            <span>Overall Status:</span>
                            <span className={`metric-value ${
                                efficiencyMetrics?.efficiencyStatus === 'EXCELLENT' ? 'success' :
                                efficiencyMetrics?.efficiencyStatus === 'GOOD' ? 'info' :
                                efficiencyMetrics?.efficiencyStatus === 'AVERAGE' ? 'warning' : 'danger'
                            }`}>
                                {efficiencyMetrics?.efficiencyStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance History */}
            {(externalMaintenanceHistory?.length > 0 || inSiteMaintenanceHistory?.length > 0) && (
                <div className="rockops-equipment-dashboard-maintenance-section">
                    <h2><Wrench size={24} /> Maintenance History</h2>
                    
                    {/* External Maintenance */}
                    {externalMaintenanceHistory?.length > 0 && (
                        <div className="rockops-equipment-dashboard-maintenance-card">
                            <h3>External Maintenance History</h3>
                            <div className="rockops-equipment-dashboard-maintenance-list">
                                {externalMaintenanceHistory.map((maintenance, index) => (
                                    <div key={index} className="rockops-equipment-dashboard-maintenance-item">
                                        <div className="maintenance-date">
                                            <Calendar size={16} />
                                            {new Date(maintenance.maintenanceDate).toLocaleDateString()}
                                        </div>
                                        <div className="maintenance-details">
                                            <p className="maintenance-description">{maintenance.description}</p>
                                            <div className="maintenance-meta">
                                                <span>Cost: {formatCurrency(maintenance.cost)}</span>
                                                <span>Merchant: {maintenance.merchantName || 'N/A'}</span>
                                                <span className={`status ${maintenance.status.toLowerCase()}`}>
                                                    {maintenance.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* In-Site Maintenance */}
                    {inSiteMaintenanceHistory?.length > 0 && (
                        <div className="rockops-equipment-dashboard-maintenance-card">
                            <h3>In-Site Maintenance History</h3>
                            <div className="rockops-equipment-dashboard-maintenance-list">
                                {inSiteMaintenanceHistory.map((maintenance, index) => (
                                    <div key={index} className="rockops-equipment-dashboard-maintenance-item">
                                        <div className="maintenance-date">
                                            <Calendar size={16} />
                                            {new Date(maintenance.maintenanceDate).toLocaleDateString()}
                                        </div>
                                        <div className="maintenance-details">
                                            <p className="maintenance-type">{maintenance.maintenanceType}</p>
                                            <p className="maintenance-description">{maintenance.description}</p>
                                            <div className="maintenance-meta">
                                                <span>Technician: {maintenance.technicianName}</span>
                                                <span className={`status ${maintenance.status.toLowerCase()}`}>
                                                    {maintenance.status}
                                                </span>
                                            </div>
                                            {maintenance.consumablesUsed?.length > 0 && (
                                                <div className="maintenance-consumables">
                                                    <strong>Consumables Used:</strong>
                                                    {maintenance.consumablesUsed.map((consumable, idx) => (
                                                        <span key={idx}>
                                                            {consumable.itemName} ({consumable.quantity}) - {formatCurrency(consumable.totalCost)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Consumables History */}
            {consumablesHistory?.length > 0 && (
                <div className="rockops-equipment-dashboard-consumables-section">
                    <h2><Package size={24} /> Consumables History</h2>
                    <div className="rockops-equipment-dashboard-consumables-grid">
                        {consumablesHistory.map((consumable, index) => (
                            <div key={index} className="rockops-equipment-dashboard-consumable-card">
                                <h4>{consumable.itemTypeName}</h4>
                                <div className="consumable-category">{consumable.category}</div>
                                <div className="consumable-metrics">
                                    <div className="consumable-metric">
                                        <span>Total Used:</span>
                                        <strong>{formatNumber(consumable.totalQuantityUsed, 0)}</strong>
                                    </div>
                                    <div className="consumable-metric">
                                        <span>Total Cost:</span>
                                        <strong>{formatCurrency(consumable.totalCost)}</strong>
                                    </div>
                                    <div className="consumable-metric">
                                        <span>Avg Monthly:</span>
                                        <strong>{formatNumber(consumable.averageMonthlyConsumption, 1)}</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default EquipmentDashboard;
