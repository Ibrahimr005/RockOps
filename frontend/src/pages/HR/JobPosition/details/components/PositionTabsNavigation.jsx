import React from 'react';
import {
    FiSettings,
    FiUsers,
    FiTrendingUp,
    FiBarChart
} from 'react-icons/fi';

const PositionTabsNavigation = ({ activeTab, setActiveTab, employeeCount }) => {
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: <FiSettings />
        },
        {
            id: 'employees',
            label: `Employees (${employeeCount})`,
            icon: <FiUsers />
        },
        {
            id: 'promotions',
            label: 'Promotions',
            icon: <FiTrendingUp />
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: <FiBarChart />
        }
    ];

    return (
        <div className="tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default PositionTabsNavigation;