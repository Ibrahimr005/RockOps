import React, { useState, useEffect } from 'react';
import { FaBuilding, FaCalculator, FaTrash, FaChartLine, FaCog } from 'react-icons/fa';
import './FixedAssets.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';

// Import your components
import AssetManagement from './AssetManagement/AssetManagement.jsx';
import DepreciationManagement from './DepreciationManagement/DepreciationManagement.jsx';
import DisposalManagement from './DisposalManagement/DisposalManagement.jsx';
//import FixedAssetsReports from './FixedAssetsReports/FixedAssetsReports.jsx';
import FixedAssetsDashboard from './FixedAssetsDashborad/FixedAssetsDashboard.jsx';

const FixedAssets = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaChartLine /> },
        { id: 'assets', label: 'Asset Management', icon: <FaBuilding /> },
        { id: 'depreciation', label: 'Depreciation', icon: <FaCalculator /> },
        { id: 'disposal', label: 'Asset Disposal', icon: <FaTrash /> },
        // { id: 'reports', label: 'Reports', icon: <FaChartLine /> }
    ];

    // Fetch stats for the intro card
    useEffect(() => {
        fetchFixedAssetsStats();
    }, []);

    const fetchFixedAssetsStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Use the same endpoints as FixedAssetsDashboard
            const [assetsResponse, disposalsResponse] = await Promise.all([
                // 1. Get all assets
                fetch('http://localhost:8080/api/v1/fixed-assets', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // 2. Get all disposals
                fetch('http://localhost:8080/api/v1/fixed-assets/disposals', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            if (!assetsResponse.ok) {
                throw new Error('Failed to fetch assets');
            }

            const assets = await assetsResponse.json();
            const disposals = disposalsResponse.ok ? await disposalsResponse.json() : [];

            // Calculate basic metrics
            const totalAssets = assets.length;
            const activeAssets = assets.filter(asset => asset.status === 'ACTIVE').length;

            // Calculate total value and monthly depreciation for active assets
            let totalValue = 0;
            let monthlyDepreciation = 0;

            // Process active assets to get their current values and depreciation
            const activeAssetPromises = assets
                .filter(asset => asset.status === 'ACTIVE')
                .slice(0, 50) // Limit to first 50 for performance
                .map(async (asset) => {
                    try {
                        const [bookValueResponse, monthlyDepResponse] = await Promise.all([
                            fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}/book-value`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            }),
                            fetch(`http://localhost:8080/api/v1/fixed-assets/${asset.id}/depreciation/monthly`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            })
                        ]);

                        const bookValue = bookValueResponse.ok ? await bookValueResponse.json() : 0;
                        const monthlyDep = monthlyDepResponse.ok ? await monthlyDepResponse.json() : 0;

                        return {
                            bookValue: bookValue || 0,
                            monthlyDep: monthlyDep || 0
                        };
                    } catch (error) {
                        console.error(`Error fetching data for asset ${asset.id}:`, error);
                        return { bookValue: 0, monthlyDep: 0 };
                    }
                });

            // Wait for all asset calculations to complete
            const assetCalculations = await Promise.all(activeAssetPromises);

            // Sum up the values
            totalValue = assetCalculations.reduce((sum, calc) => sum + calc.bookValue, 0);
            monthlyDepreciation = assetCalculations.reduce((sum, calc) => sum + calc.monthlyDep, 0);

            // If we have more than 50 active assets, estimate the remaining
            const remainingActiveAssets = activeAssets - 50;
            if (remainingActiveAssets > 0 && assetCalculations.length > 0) {
                const avgBookValue = totalValue / Math.min(activeAssets, 50);
                const avgMonthlyDep = monthlyDepreciation / Math.min(activeAssets, 50);

                totalValue += avgBookValue * remainingActiveAssets;
                monthlyDepreciation += avgMonthlyDep * remainingActiveAssets;
            }

            // Format the data for the IntroCard
            setStats([
                {
                    value: totalAssets.toString(),
                    label: 'Total Assets'
                },
                {
                    value: formatCurrency(totalValue),
                    label: 'Total Value'
                },
                {
                    value: formatCurrency(monthlyDepreciation),
                    label: 'Monthly Depreciation'
                },
                {
                    value: activeAssets.toString(),
                    label: 'Active Assets'
                }
            ]);

        } catch (err) {
            console.error("Error fetching fixed assets stats:", err);
            showError('Failed to load fixed assets statistics');

            // Set error state stats
            setStats([
                {
                    value: '--',
                    label: 'Total Assets'
                },
                {
                    value: '--',
                    label: 'Total Value'
                },
                {
                    value: '--',
                    label: 'Monthly Depreciation'
                },
                {
                    value: '--',
                    label: 'Active Assets'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

// Helper function to format currency
    const formatCurrency = (amount) => {
        if (!amount || amount === 'null' || amount === 'undefined') {
            return '$0';
        }

        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numericAmount)) {
            return '$0';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numericAmount);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <FixedAssetsDashboard />;
            case 'assets':
                return <AssetManagement />;
            case 'depreciation':
                return <DepreciationManagement />;
            case 'disposal':
                return <DisposalManagement />;
            // case 'reports':
            //     return <FixedAssetsReports />;
            default:
                return <FixedAssetsDashboard />;
        }
    };

    const handleInfoClick = () => {
        showSuccess('Fixed Assets Management tracks all company assets, calculates depreciation, manages asset lifecycle, and handles disposals. Monitor asset performance, compliance, and financial impact across your organization.');
    };

    return (
        <div className="fixed-assets-container">
            {/* Enhanced IntroCard with Icon */}
            <IntroCard
                icon={<FaBuilding />}
                label="ASSET MANAGEMENT"
                title="Fixed Assets"
                stats={loading ? [] : stats}
                onInfoClick={handleInfoClick}
            />

            <div className="fixed-assets-content-container">
                {/* Tab Navigation */}
                <div className="tabs-header">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="fixed-assets-content">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default FixedAssets;