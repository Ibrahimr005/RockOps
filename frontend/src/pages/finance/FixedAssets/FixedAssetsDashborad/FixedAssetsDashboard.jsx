import React, { useState, useEffect } from 'react';
import { FaBuilding, FaChartLine, FaCalculator, FaTrash, FaMoneyBillWave, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import './FixedAssetsDashboard.css';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";

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

            // Fetch all assets to calculate dashboard metrics
            const assetsResponse = await fetch(`http://localhost:8080/api/v1/fixed-assets`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!assetsResponse.ok) {
                throw new Error('Failed to fetch assets');
            }

            const assets = await assetsResponse.json();

            // Fetch all disposals for recent activity and counts
            const disposalsResponse = await fetch(`http://localhost:8080/api/v1/fixed-assets/disposals`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const disposals = disposalsResponse.ok ? await disposalsResponse.json() : [];

            // Calculate metrics from the data
            const totalAssets = assets.length;
            const activeAssets = assets.filter(asset => asset.status === 'ACTIVE').length;
            const disposedAssets = disposals.length;

            // Calculate total value (sum of current book values)
            let totalValue = 0;
            let totalDepreciation = 0;
            let monthlyDepreciation = 0;

            // For each asset, get its current book value and depreciation
            for (const asset of assets) {
                if (asset.status === 'ACTIVE') {
                    try {
                        // Get current book value
                        const bookValueResponse = await fetch(
                            `http://localhost:8080/api/v1/fixed-assets/${asset.id}/book-value`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        if (bookValueResponse.ok) {
                            const bookValue = await bookValueResponse.json();
                            totalValue += bookValue;
                        }

                        // Get accumulated depreciation
                        const accDepResponse = await fetch(
                            `http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/accumulated`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        if (accDepResponse.ok) {
                            const accDep = await accDepResponse.json();
                            totalDepreciation += accDep;
                        }

                        // Get monthly depreciation
                        const monthlyDepResponse = await fetch(
                            `http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/monthly`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );

                        if (monthlyDepResponse.ok) {
                            const monthlyDep = await monthlyDepResponse.json();
                            monthlyDepreciation += monthlyDep;
                        }
                    } catch (error) {
                        console.error(`Error fetching data for asset ${asset.id}:`, error);
                    }
                }
            }

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
            if (disposals.length > 0) {
                const recentDisposals = disposals
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
            const maintenanceAssets = assets.filter(asset => asset.status === 'MAINTENANCE');
            if (maintenanceAssets.length > 0) {
                activities.push({
                    type: 'maintenance_needed',
                    title: 'Assets Under Maintenance',
                    description: `${maintenanceAssets.length} asset${maintenanceAssets.length > 1 ? 's' : ''} currently under maintenance`,
                    time: 'Ongoing',
                    icon: 'warning'
                });
            }

            // High depreciation assets (assets with high monthly depreciation)
            const sortedByDepreciation = [];
            for (const asset of assets.filter(a => a.status === 'ACTIVE').slice(0, 5)) {
                try {
                    const monthlyDepResponse = await fetch(
                        `http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/monthly`,
                        {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (monthlyDepResponse.ok) {
                        const monthlyDep = await monthlyDepResponse.json();
                        if (monthlyDep > 500) { // Assets with high monthly depreciation
                            sortedByDepreciation.push({ asset, monthlyDep });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching depreciation for asset ${asset.id}:`, error);
                }
            }

            if (sortedByDepreciation.length > 0) {
                const highestDepAsset = sortedByDepreciation[0];
                activities.push({
                    type: 'high_depreciation',
                    title: 'High Depreciation Alert',
                    description: `${highestDepAsset.asset.name} has monthly depreciation of $${highestDepAsset.monthlyDep.toLocaleString()}`,
                    time: 'Current month',
                    icon: 'calculator'
                });
            }

            // Recent status changes (inactive assets that might have been recently changed)
            const inactiveAssets = assets.filter(asset => asset.status === 'INACTIVE');
            if (inactiveAssets.length > 0 && inactiveAssets.length < totalAssets * 0.3) { // Only if reasonable number
                activities.push({
                    type: 'status_change',
                    title: 'Asset Status Updates',
                    description: `${inactiveAssets.length} asset${inactiveAssets.length > 1 ? 's' : ''} marked as inactive`,
                    time: 'Recent',
                    icon: 'clock'
                });
            }

            // Asset portfolio summary
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
            showError('Failed to load dashboard data');
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