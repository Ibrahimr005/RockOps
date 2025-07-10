import React, { useState } from 'react';
import { FaBuilding, FaCalculator, FaTrash, FaChartLine, FaCog } from 'react-icons/fa';
import './FixedAssets.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

// Import your components (we'll create these step by step)
import AssetManagement from './AssetManagement/AssetManagement.jsx';
import DepreciationManagement from './DepreciationManagement/DepreciationManagement.jsx';
import DisposalManagement from './DisposalManagement/DisposalManagement.jsx';
//import FixedAssetsReports from './FixedAssetsReports/FixedAssetsReports.jsx';
import FixedAssetsDashboard from './FixedAssetsDashborad/FixedAssetsDashboard.jsx';

const FixedAssets = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaChartLine /> },
        { id: 'assets', label: 'Asset Management', icon: <FaBuilding /> },
        { id: 'depreciation', label: 'Depreciation', icon: <FaCalculator /> },
        { id: 'disposal', label: 'Asset Disposal', icon: <FaTrash /> },
        // { id: 'reports', label: 'Reports', icon: <FaChartLine /> }
    ];

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

    return (
        <div className="fixed-assets-container">
            <div className="fixed-assets-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`fixed-assets-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="fixed-assets-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default FixedAssets;