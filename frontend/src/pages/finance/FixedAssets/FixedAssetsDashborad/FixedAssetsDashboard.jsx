import React, { useState, useEffect } from 'react';
import { FaBuilding, FaChartLine, FaCalculator, FaTrash, FaMoneyBillWave, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import './FixedAssetsDashboard.css';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const FixedAssetsDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        totalAssets: 0,
        totalValue: 0,
        totalDepreciation: 0,
        activeAssets: 0,
        disposedAssets: 0,
        monthlyDepreciation: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);
    const { showError } = useSnackbar();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING FIXED ASSETS DASHBOARD DATA ===');

            // Fetch all assets and disposals using financeService
            const [assetsResponse, disposalsResponse] = await Promise.all([
                financeService.fixedAssets.getAll(),
                financeService.fixedAssets.getAllDisposals()
            ]);

            console.log('Raw responses:', { assetsResponse, disposalsResponse });

            // Extract data from Axios responses
            const assets = assetsResponse.data || assetsResponse;
            const disposals = disposalsResponse.data || disposalsResponse;

            console.log('Extracted data:', { assets, disposals });

            // Ensure we have arrays
            const assetsArray = Array.isArray(assets) ? assets : [];
            const disposalsArray = Array.isArray(disposals) ? disposals : [];

            // Calculate metrics from the data
            const totalAssets = assetsArray.length;
            const activeAssets = assetsArray.filter(asset => asset.status === 'ACTIVE').length;
            const disposedAssets = disposalsArray.length;

            console.log('Basic metrics:', { totalAssets, activeAssets, disposedAssets });

            // Calculate total value (sum of current book values)
            let totalValue = 0;
            let totalDepreciation = 0;
            let monthlyDepreciation = 0;

            // For each active asset, get its current book value and depreciation
            const activeAssetsList = assetsArray.filter(asset => asset.status === 'ACTIVE');

            for (const asset of activeAssetsList) {
                try {
                    // Get current book value, accumulated depreciation, and monthly depreciation
                    const [bookValueResponse, accDepResponse, monthlyDepResponse] = await Promise.all([
                        financeService.fixedAssets.getBookValue(asset.id),
                        financeService.fixedAssets.getAccumulatedDepreciation(asset.id),
                        financeService.fixedAssets.getMonthlyDepreciation(asset.id)
                    ]);

                    // Extract data from responses
                    const bookValue = bookValueResponse.data || bookValueResponse || 0;
                    const accDep = accDepResponse.data || accDepResponse || 0;
                    const monthlyDep = monthlyDepResponse.data || monthlyDepResponse || 0;

                    totalValue += parseFloat(bookValue) || 0;
                    totalDepreciation += parseFloat(accDep) || 0;
                    monthlyDepreciation += parseFloat(monthlyDep) || 0;
                } catch (error) {
                    console.error(`Error fetching data for asset ${asset.id}:`, error);
                }
            }

            console.log('Calculated totals:', {
                totalValue,
                totalDepreciation,
                monthlyDepreciation
            });

            setDashboardData({
                totalAssets,
                totalValue,
                totalDepreciation,
                activeAssets,
                disposedAssets,
                monthlyDepreciation
            });

            // Create relevant recent activity based on available data
            const activities = [];

            // Recent disposals (if any)
            if (disposalsArray.length > 0) {
                const recentDisposals = disposalsArray
                    .sort((a, b) => new Date(b.disposalDate) - new Date(a.disposalDate))
                    .slice(0, 2);

                activities.push(...recentDisposals.map(disposal => ({
                    type: 'asset_disposed',
                    title: 'Asset Disposed',
                    description: `${disposal.assetName || 'Asset'} disposed via ${disposal.disposalMethod ? disposal.disposalMethod.toLowerCase() : 'unknown method'}`,
                    time: formatTimeAgo(disposal.disposalDate),
                    icon: 'trash'
                })));
            }

            // Assets requiring attention (maintenance status)
            const maintenanceAssets = assetsArray.filter(asset => asset.status === 'MAINTENANCE');
            if (maintenanceAssets.length > 0) {
                activities.push({
                    type: 'maintenance_needed',
                    title: 'Assets Under Maintenance',
                    description: `${maintenanceAssets.length} asset${maintenanceAssets.length > 1 ? 's' : ''} currently under maintenance`,
                    time: 'Ongoing',
                    icon: 'warning'
                });
            }

            // High depreciation assets
            if (monthlyDepreciation > 500) {
                activities.push({
                    type: 'high_depreciation',
                    title: 'High Depreciation Alert',
                    description: `Total monthly depreciation: $${monthlyDepreciation.toLocaleString()}`,
                    time: 'Current month',
                    icon: 'calculator'
                });
            }

            // Asset portfolio summary if no other activities
            if (activities.length === 0) {
                activities.push({
                    type: 'portfolio_summary',
                    title: 'Portfolio Overview',
                    description: `Managing ${totalAssets} total assets with $${totalValue.toLocaleString()} current value`,
                    time: 'Current',
                    icon: 'building'
                });

                if (monthlyDepreciation > 0) {
                    activities.push({
                        type: 'depreciation_summary',
                        title: 'Monthly Depreciation',
                        description: `Current monthly depreciation expense: $${monthlyDepreciation.toLocaleString()}`,
                        time: 'This month',
                        icon: 'calculator'
                    });
                }
            }

            setRecentActivity(activities.slice(0, 4));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showError('Failed to load dashboard data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Unknown time';

        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Less than an hour ago';
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const DashboardCard = ({ title, value, icon, color, subtitle, isLoading }) => (
        <div className={`fixed-assets-dashboard__card fixed-assets-dashboard__card--${color}`}>
            <div className="fixed-assets-dashboard__card-header">
                <div className="fixed-assets-dashboard__card-info">
                    <h3 className="fixed-assets-dashboard__card-title">{title}</h3>
                    {isLoading ? (
                        <div className="fixed-assets-dashboard__loading-skeleton"></div>
                    ) : (
                        <p className="fixed-assets-dashboard__card-value">{value}</p>
                    )}
                    {subtitle && <p className="fixed-assets-dashboard__card-subtitle">{subtitle}</p>}
                </div>
                <div className="fixed-assets-dashboard__card-icon">
                    {icon}
                </div>
            </div>
        </div>
    );

    const getActivityIcon = (iconType) => {
        switch (iconType) {
            case 'building': return <FaBuilding />;
            case 'calculator': return <FaCalculator />;
            case 'trash': return <FaTrash />;
            case 'clock': return <FaClock />;
            case 'warning': return <FaExclamationTriangle />;
            default: return <FaBuilding />;
        }
    };

    return (
        <div className="fixed-assets-dashboard">
            <div className="fixed-assets-dashboard__header">
                <h2 className="fixed-assets-dashboard__title">Fixed Assets Dashboard</h2>
                <p className="fixed-assets-dashboard__subtitle">
                    Overview of your organization's fixed assets and depreciation
                </p>
            </div>

            <div className="fixed-assets-dashboard__grid">
                <DashboardCard
                    title="Total Assets"
                    value={dashboardData.totalAssets.toLocaleString()}
                    icon={<FaBuilding />}
                    color="total"
                    subtitle="All registered assets"
                    isLoading={loading}
                />

                <DashboardCard
                    title="Total Asset Value"
                    value={formatCurrency(dashboardData.totalValue)}
                    icon={<FaMoneyBillWave />}
                    color="total"
                    subtitle="Current book value"
                    isLoading={loading}
                />

                <DashboardCard
                    title="Total Depreciation"
                    value={formatCurrency(dashboardData.totalDepreciation)}
                    icon={<FaCalculator />}
                    color="depreciation"
                    subtitle="Accumulated depreciation"
                    isLoading={loading}
                />

                <DashboardCard
                    title="Active Assets"
                    value={dashboardData.activeAssets.toLocaleString()}
                    icon={<FaChartLine />}
                    color="active"
                    subtitle="Currently in use"
                    isLoading={loading}
                />

                <DashboardCard
                    title="Disposed Assets"
                    value={dashboardData.disposedAssets.toLocaleString()}
                    icon={<FaTrash />}
                    color="disposed"
                    subtitle="Sold or scrapped"
                    isLoading={loading}
                />

                <DashboardCard
                    title="Monthly Depreciation"
                    value={formatCurrency(dashboardData.monthlyDepreciation)}
                    icon={<FaCalculator />}
                    color="monthly"
                    subtitle="Current month expense"
                    isLoading={loading}
                />
            </div>

            <div className="fixed-assets-dashboard__recent-activity">
                <h3 className="fixed-assets-dashboard__activity-title">Recent Activity & Insights</h3>
                {loading ? (
                    <div className="fixed-assets-dashboard__activity-loading">
                        <div className="fixed-assets-dashboard__loading-skeleton"></div>
                        <div className="fixed-assets-dashboard__loading-skeleton"></div>
                        <div className="fixed-assets-dashboard__loading-skeleton"></div>
                    </div>
                ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                        <div key={index} className="fixed-assets-dashboard__activity-item">
                            <div className="fixed-assets-dashboard__activity-icon">
                                {getActivityIcon(activity.icon)}
                            </div>
                            <div className="fixed-assets-dashboard__activity-content">
                                <h4 className="fixed-assets-dashboard__activity-heading">
                                    {activity.title}
                                </h4>
                                <p className="fixed-assets-dashboard__activity-description">
                                    {activity.description} - {activity.time}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="fixed-assets-dashboard__no-activity">
                        <p>No recent activity found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FixedAssetsDashboard;