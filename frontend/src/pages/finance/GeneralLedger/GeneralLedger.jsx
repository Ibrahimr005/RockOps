import React, { useState } from 'react';
import { FaBook, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import './GeneralLedger.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

// Import your components
import JournalEntries from './JournalEntries/JournalEntries';
import PeriodClosing from './PeriodClosing/PeriodClosing';
import AuditTrail from './AuditTrail/AuditTrail';

const GeneralLedger = () => {
    const [activeTab, setActiveTab] = useState('journals');
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'journals', label: 'Journal Entries', icon: <FaBook /> },
        { id: 'periods', label: 'Period Closing', icon: <FaCalendarAlt /> },
        { id: 'audit', label: 'Audit Trail', icon: <FaHistory /> }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'journals':
                return <JournalEntries />;
            case 'periods':
                return <PeriodClosing />;
            case 'audit':
                return <AuditTrail />;
            default:
                return <JournalEntries />;
        }
    };

    return (
        <div className="general-ledger-container">
            <div className="gl-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`gl-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="gl-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default GeneralLedger;