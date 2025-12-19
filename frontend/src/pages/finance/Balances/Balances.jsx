import React, { useState, useEffect } from 'react';
import {
    FaUniversity,
    FaExchangeAlt,
    FaPiggyBank,
    FaUserTie,
    FaClipboardList,
    FaMoneyBillWave
} from 'react-icons/fa';
import './Balances.css';
import { useSnackbar } from '../../../contexts/SnackbarContext.jsx';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { financeService } from '../../../services/financeService.js';

// Import tab components
import BankAccountList from './BankAccounts/BankAccountList.jsx';
import CashSafeList from './CashSafes/CashSafeList.jsx';
import CashWithPersonList from './CashWithPersons/CashWithPersonList.jsx';
import TransactionList from './Transactions/TransactionList.jsx';
//import PendingTransactions from './Transactions/PendingTransactions.jsx';

const Balances = () => {
    const [activeTab, setActiveTab] = useState('bank-accounts');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'bank-accounts', label: 'Bank Accounts', icon: <FaUniversity /> },
        { id: 'cash-safes', label: 'Cash Safes', icon: <FaPiggyBank /> },
        { id: 'cash-with-persons', label: 'Cash With Persons', icon: <FaUserTie /> },
        { id: 'transactions', label: 'All Transactions', icon: <FaExchangeAlt /> },
        // { id: 'pending', label: 'Pending Approvals', icon: <FaClipboardList /> }
    ];

    useEffect(() => {
        fetchBalancesStats();
    }, []);

    const fetchBalancesStats = async () => {
        try {
            setLoading(true);

            const [
                bankAccountsRes,
                cashSafesRes,
                cashWithPersonsRes,
                pendingCountRes
            ] = await Promise.all([
                financeService.balances.bankAccounts.getAllActive(),
                financeService.balances.cashSafes.getAllActive(),
                financeService.balances.cashWithPersons.getAllActive(),
                financeService.balances.transactions.getPendingCount()
            ]);

            const bankAccounts = bankAccountsRes.data || [];
            const cashSafes = cashSafesRes.data || [];
            const cashWithPersons = cashWithPersonsRes.data || [];
            const pendingCount = pendingCountRes.data || 0;

            // Calculate total balances
            const totalBankBalance = bankAccounts.reduce((sum, acc) =>
                sum + (parseFloat(acc.currentBalance) || 0), 0);
            const totalCashSafeBalance = cashSafes.reduce((sum, safe) =>
                sum + (parseFloat(safe.currentBalance) || 0), 0);
            const totalCashWithPersonBalance = cashWithPersons.reduce((sum, person) =>
                sum + (parseFloat(person.currentBalance) || 0), 0);
            const totalBalance = totalBankBalance + totalCashSafeBalance + totalCashWithPersonBalance;

            setStats([
                {
                    value: formatCurrency(totalBalance),
                    label: 'Total Balance (EGP)'
                },
                {
                    value: bankAccounts.length.toString(),
                    label: 'Bank Accounts'
                },
                {
                    value: (cashSafes.length + cashWithPersons.length).toString(),
                    label: 'Cash Holders'
                },
                {
                    value: pendingCount.toString(),
                    label: 'Pending Transactions'
                }
            ]);

        } catch (err) {
            console.error("Error fetching balances stats:", err);
            showError('Failed to load balances statistics');
            setStats([
                { value: '--', label: 'Total Balance (EGP)' },
                { value: '--', label: 'Bank Accounts' },
                { value: '--', label: 'Cash Holders' },
                { value: '--', label: 'Pending Transactions' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'bank-accounts':
                return <BankAccountList onDataChange={fetchBalancesStats} />;
            case 'cash-safes':
                return <CashSafeList onDataChange={fetchBalancesStats} />;
            case 'cash-with-persons':
                return <CashWithPersonList onDataChange={fetchBalancesStats} />;
            case 'transactions':
                return <TransactionList onDataChange={fetchBalancesStats} />;
            // case 'pending':
            //     return <PendingTransactions onDataChange={fetchBalancesStats} />;
            default:
                return <BankAccountList onDataChange={fetchBalancesStats} />;
        }
    };

    const handleInfoClick = () => {
        showSuccess('Balances module manages your company\'s bank accounts, cash in safes, and cash held by individuals. Track all deposits, withdrawals, and transfers with approval workflows.');
    };

    return (
        <div className="balances-container">
            <IntroCard
                icon={<FaMoneyBillWave />}
                label="FINANCE MANAGEMENT"
                title="Balances & Accounts"
                stats={loading ? [] : stats}
                onInfoClick={handleInfoClick}
            />

            <div className="balances-content-container">
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

                <div className="balances-content">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Balances;