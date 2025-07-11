import React, { useState, useEffect } from 'react';
import { FaBook, FaCalendarAlt, FaHistory, FaFileInvoiceDollar } from 'react-icons/fa';
import './GeneralLedger.scss';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';

// Import your components
import JournalEntries from './JournalEntries/JournalEntries';
import PeriodClosing from './PeriodClosing/PeriodClosing';
import AuditTrail from './AuditTrail/AuditTrail';

const GeneralLedger = () => {
    const [activeTab, setActiveTab] = useState('journals');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        {
            id: 'journals',
            label: 'Journal Entries',
            icon: <FaBook />
        },
        {
            id: 'periods',
            label: 'Period Closing',
            icon: <FaCalendarAlt />
        },
        {
            id: 'audit',
            label: 'Audit Trail',
            icon: <FaHistory />
        }
    ];

    // Fetch stats for the intro card
    useEffect(() => {
        fetchGeneralLedgerStats();
    }, []);

    const fetchGeneralLedgerStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            // You can create an endpoint for general ledger stats or calculate from existing data
            const response = await fetch('http://localhost:8080/api/v1/general-ledger/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats([
                    {
                        value: data.totalJournalEntries || '0',
                        label: 'Total Entries',
                        color: '#4880ff'
                    },
                    {
                        value: data.pendingEntries || '0',
                        label: 'Pending Approval',
                        color: '#ff9800'
                    },
                    {
                        value: data.currentPeriodStatus || 'Open',
                        label: 'Current Period',
                        color: '#4caf50'
                    },
                    {
                        value: `$${data.currentBalance || '0'}`,
                        label: 'Period Balance',
                        color: '#6366f1'
                    }
                ]);
            } else {
                // Fallback stats if endpoint doesn't exist yet
                setStats([
                    {
                        value: '156',
                        label: 'Total Entries',
                        color: '#4880ff'
                    },
                    {
                        value: '8',
                        label: 'Pending Approval',
                        color: '#ff9800'
                    },
                    {
                        value: 'Open',
                        label: 'Current Period',
                        color: '#4caf50'
                    },
                    {
                        value: '$248,750',
                        label: 'Period Balance',
                        color: '#6366f1'
                    }
                ]);
            }
        } catch (err) {
            console.error("Error fetching general ledger stats:", err);
            // Set default stats on error
            setStats([
                {
                    value: '--',
                    label: 'Total Entries',
                    color: '#4880ff'
                },
                {
                    value: '--',
                    label: 'Pending Approval',
                    color: '#ff9800'
                },
                {
                    value: 'Unknown',
                    label: 'Current Period',
                    color: '#6b7280'
                },
                {
                    value: '--',
                    label: 'Period Balance',
                    color: '#6366f1'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

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

    const handleInfoClick = () => {
        showSuccess('General Ledger manages all financial transactions, journal entries, and period closings for your organization. This is the central hub for all accounting activities.');
    };

    return (
        <div className="general-ledger-container">
            {/* Enhanced IntroCard with Icon */}
            <IntroCard
                icon={<FaFileInvoiceDollar />}
                iconColor="#4880ff"
                iconSize="3rem"
                label="FINANCE MANAGEMENT"
                title="General Ledger"
                stats={loading ? [] : stats}
                onInfoClick={handleInfoClick}
                className="general-ledger-intro"
            />
<div className="gl-content-container">        {/* Tab Navigation */}
            <div className="tabs-header">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {/*{tab.icon}*/}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="gl-content">
                {renderTabContent()}
            </div>
        </div>
        </div>
    );
};

export default GeneralLedger;