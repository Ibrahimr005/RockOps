import React from 'react';
import './Tabs.scss';

const Tabs = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="custom-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`custom-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {tab.badge > 0 && (
                        <span className={`tab-badge ${tab.badgeVariant || ''}`}>
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default Tabs;