import React, { useState, useEffect } from 'react';
import { FaUniversity, FaExchangeAlt, FaBalanceScale, FaChartLine, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa';
import './BankReconciliation.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { financeService } from '../../../services/financeService.js';

// Import your components
import BankAccountManagement from './BankAccountManagement/BankAccountManagement.jsx';
import TransactionMatching from './TransactionMatching/TransactionMatching.jsx';
import ReconciliationReports from './ReconciliationReports/ReconciliationReports.jsx';
import DiscrepancyManagement from './DiscrepancyManagement/DiscrepancyManagement.jsx';
import BankReconciliationDashboard from './BankReconciliationDashboard/BankReconciliationDashboard.jsx';

const BankReconciliation = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaClipboardList /> },
        { id: 'accounts', label: 'Bank Accounts', icon: <FaUniversity /> },
        { id: 'matching', label: 'Transaction Matching', icon: <FaExchangeAlt /> },
        { id: 'discrepancies', label: 'Discrepancy Management', icon: <FaExclamationTriangle /> },
        { id: 'reports', label: 'Reconciliation Reports', icon: <FaChartLine /> }
    ];

    // Fetch stats for the intro card
    useEffect(() => {
        fetchBankReconciliationStats();
    }, []);

    const fetchBankReconciliationStats = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING BANK RECONCILIATION STATS ===');

            // Use financeService for bank reconciliation stats
            const [
                allAccounts,
                unconfirmedMatches,
                openDiscrepancies,
                unreconciledTransactions
            ] = await Promise.all([
                financeService.bankReconciliation.bankAccounts.getAll(),
                financeService.bankReconciliation.transactionMatches.getUnconfirmed(),
                financeService.bankReconciliation.discrepancies.getOpen(),
                financeService.bankReconciliation.internalTransactions.getUnreconciled()
            ]);

            console.log('Bank Reconciliation stats data received:', {
                allAccounts,
                unconfirmedMatches,
                openDiscrepancies,
                unreconciledTransactions
            });

            // Extract data from Axios responses
            const accountsData = allAccounts.data || allAccounts;
            const matchesData = unconfirmedMatches.data || unconfirmedMatches;
            const discrepanciesData = openDiscrepancies.data || openDiscrepancies;
            const unreconciledData = unreconciledTransactions.data || unreconciledTransactions;

            console.log('=== EXTRACTED DATA ===');
            console.log('Accounts data:', accountsData);
            console.log('Matches data:', matchesData);
            console.log('Discrepancies data:', discrepanciesData);
            console.log('Unreconciled data:', unreconciledData);

            // Extract arrays safely
            const accountsArray = Array.isArray(accountsData) ? accountsData : [];
            const matchesArray = Array.isArray(matchesData) ? matchesData : [];
            const discrepanciesArray = Array.isArray(discrepanciesData) ? discrepanciesData : [];
            const unreconciledArray = Array.isArray(unreconciledData) ? unreconciledData : [];

            console.log('Final extracted data:', {
                accountsArray: accountsArray.length,
                matchesArray: matchesArray.length,
                discrepanciesArray: discrepanciesArray.length,
                unreconciledArray: unreconciledArray.length
            });

            // Calculate total account balance
            const totalBalance = accountsArray.reduce((sum, account) => {
                return sum + (parseFloat(account.currentBalance) || 0);
            }, 0);

            // Format the data for the IntroCard
            setStats([
                {
                    value: accountsArray.length.toString(),
                    label: 'Active Bank Accounts'
                },
                {
                    value: formatCurrency(totalBalance),
                    label: 'Total Account Balance'
                },
                {
                    value: unreconciledArray.length.toString(),
                    label: 'Unreconciled Transactions'
                },
                {
                    value: discrepanciesArray.length.toString(),
                    label: 'Open Discrepancies'
                }
            ]);

        } catch (err) {
            console.error("Error fetching bank reconciliation stats:", err);
            showError('Failed to load bank reconciliation statistics: ' + err.message);

            // Set error state stats
            setStats([
                {
                    value: '--',
                    label: 'Active Bank Accounts'
                },
                {
                    value: '--',
                    label: 'Total Account Balance'
                },
                {
                    value: '--',
                    label: 'Unreconciled Transactions'
                },
                {
                    value: '--',
                    label: 'Open Discrepancies'
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
                return <BankReconciliationDashboard />;
            case 'accounts':
                return <BankAccountManagement />;
            case 'matching':
                return <TransactionMatching />;
            case 'discrepancies':
                return <DiscrepancyManagement />;
            case 'reports':
                return <ReconciliationReports />;
            default:
                return <BankReconciliationDashboard />;
        }
    };

    const handleInfoClick = () => {
        showSuccess('Bank Reconciliation ensures accuracy between internal financial records and bank statements. Track accounts, match transactions, resolve discrepancies, and generate comprehensive reconciliation reports to maintain financial integrity.');
    };

    return (
        <div className="bank-reconciliation-container">
            {/* Enhanced IntroCard with Icon */}
            <IntroCard
                icon={<FaBalanceScale />}
                label="FINANCE MANAGEMENT"
                title="Bank Reconciliation"
                stats={loading ? [] : stats}
                onInfoClick={handleInfoClick}
            />

            <div className="bank-reconciliation-content-container">
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
                <div className="bank-reconciliation-content">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default BankReconciliation;