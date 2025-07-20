import React, { useState, useEffect } from 'react';
import { FaBuilding, FaCalculator, FaTrash, FaChartLine, FaCog } from 'react-icons/fa';
import './FixedAssets.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { financeService } from '../../../services/financeService.js';

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

            console.log('=== FETCHING FIXED ASSETS STATS ===');

            // Use financeService instead of manual fetch calls
            const [assetsResponse, disposalsResponse] = await Promise.all([
                financeService.fixedAssets.getAll(),
                financeService.fixedAssets.getAllDisposals()
            ]);

            console.log('Raw assets response:', assetsResponse);
            console.log('Raw disposals response:', disposalsResponse);

            // Extract data from Axios responses
            const assets = assetsResponse.data || assetsResponse;
            const disposals = disposalsResponse.data || disposalsResponse;

            console.log('Extracted assets:', assets);
            console.log('Extracted disposals:', disposals);

            // Ensure we have arrays
            const assetsArray = Array.isArray(assets) ? assets : [];
            const disposalsArray = Array.isArray(disposals) ? disposals : [];

            // Calculate basic metrics
            const totalAssets = assetsArray.length;
            const activeAssets = assetsArray.filter(asset => asset.status === 'ACTIVE').length;

            console.log('Calculated metrics:', {
                totalAssets,
                activeAssets,
                disposalsCount: disposalsArray.length
            });

            // Calculate total value and monthly depreciation for active assets
            let totalValue = 0;
            let monthlyDepreciation = 0;

            // Process active assets to get their current values and depreciation
            const activeAssetsList = assetsArray.filter(asset => asset.status === 'ACTIVE').slice(0, 50); // Limit for performance

            const assetCalculations = await Promise.all(
                activeAssetsList.map(async (asset) => {
                    try {
                        const [bookValueResponse, monthlyDepResponse] = await Promise.all([
                            financeService.fixedAssets.getBookValue(asset.id),
                            financeService.fixedAssets.getMonthlyDepreciation(asset.id)
                        ]);

                        // Extract data from responses
                        const bookValue = bookValueResponse.data || bookValueResponse || 0;
                        const monthlyDep = monthlyDepResponse.data || monthlyDepResponse || 0;

                        return {
                            bookValue: parseFloat(bookValue) || 0,
                            monthlyDep: parseFloat(monthlyDep) || 0
                        };
                    } catch (error) {
                        console.error(`Error fetching data for asset ${asset.id}:`, error);
                        return { bookValue: 0, monthlyDep: 0 };
                    }
                })
            );

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

            console.log('Final calculations:', {
                totalValue,
                monthlyDepreciation
            });

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
            showError('Failed to load fixed assets statistics: ' + err.message);

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