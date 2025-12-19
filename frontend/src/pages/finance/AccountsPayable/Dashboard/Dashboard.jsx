import React, { useState, useEffect } from 'react';
import {
    FiFileText,
    FiDollarSign,
    FiCheckCircle,
    FiClock,
    FiTrendingUp,
    FiShoppingBag
} from 'react-icons/fi';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { financeService } from '../../../../services/financeService';
import './Dashboard.scss';

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [balances, setBalances] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useSnackbar();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [summaryRes, balancesRes] = await Promise.all([
                financeService.accountsPayable.dashboard.getSummary(),
                financeService.accountsPayable.dashboard.getBalances()
            ]);

            setSummary(summaryRes.data);
            setBalances(balancesRes.data);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            showError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return 'EGP 0.00';
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="ap-dashboard">
            {/* Summary Cards */}
            <div className="dashboard-cards">
                <div className="dashboard-card card-pending-offers">
                    <div className="card-icon">
                        <FiFileText />
                    </div>
                    <div className="card-content">
                        <h3>Pending Offers</h3>
                        <p className="card-count">{summary?.pendingOffersCount || 0}</p>
                        <p className="card-amount">{formatCurrency(summary?.pendingOffersAmount)}</p>
                    </div>
                </div>

                <div className="dashboard-card card-pending-requests">
                    <div className="card-icon">
                        <FiClock />
                    </div>
                    <div className="card-content">
                        <h3>Pending Requests</h3>
                        <p className="card-count">{summary?.pendingPaymentRequestsCount || 0}</p>
                        <p className="card-amount">{formatCurrency(summary?.pendingPaymentRequestsAmount)}</p>
                    </div>
                </div>

                <div className="dashboard-card card-ready-to-pay">
                    <div className="card-icon">
                        <FiCheckCircle />
                    </div>
                    <div className="card-content">
                        <h3>Ready to Pay</h3>
                        <p className="card-count">{summary?.readyToPayCount || 0}</p>
                        <p className="card-amount">{formatCurrency(summary?.readyToPayAmount)}</p>
                    </div>
                </div>

                <div className="dashboard-card card-paid-today">
                    <div className="card-icon">
                        <FiDollarSign />
                    </div>
                    <div className="card-content">
                        <h3>Paid Today</h3>
                        <p className="card-count">{summary?.paidTodayCount || 0}</p>
                        <p className="card-amount">{formatCurrency(summary?.paidTodayAmount)}</p>
                    </div>
                </div>

                <div className="dashboard-card card-available-balance">
                    <div className="card-icon">
                        <FiTrendingUp />
                    </div>
                    <div className="card-content">
                        <h3>Available Balance</h3>
                        <p className="card-amount large">{formatCurrency(summary?.availableBalance)}</p>
                    </div>
                </div>

                <div className="dashboard-card card-total-balance">
                    <div className="card-icon">
                        <FiShoppingBag />
                    </div>
                    <div className="card-content">
                        <h3>Total Balance</h3>
                        <p className="card-amount large">{formatCurrency(summary?.totalBalance)}</p>
                    </div>
                </div>
            </div>

            {/* Balances Overview */}
            {balances && (
                <div className="balances-overview">
                    <h3 className="section-title">Balances Overview</h3>

                    <div className="balance-summary-cards">
                        <div className="balance-summary-card">
                            <h4>Bank Accounts</h4>
                            <p className="balance-amount">{formatCurrency(balances.bankAccountsBalance)}</p>
                            <p className="balance-detail">
                                {balances.activeBankAccounts} of {balances.totalBankAccounts} active
                            </p>
                        </div>

                        <div className="balance-summary-card">
                            <h4>Cash Safes</h4>
                            <p className="balance-amount">{formatCurrency(balances.cashSafesBalance)}</p>
                            <p className="balance-detail">
                                {balances.activeCashSafes} of {balances.totalCashSafes} active
                            </p>
                        </div>

                        <div className="balance-summary-card">
                            <h4>Cash With Persons</h4>
                            <p className="balance-amount">{formatCurrency(balances.cashWithPersonsBalance)}</p>
                            <p className="balance-detail">
                                {balances.activeCashWithPersons} of {balances.totalCashWithPersons} active
                            </p>
                        </div>
                    </div>

                    <div className="total-balances">
                        <div className="total-balance-item">
                            <span className="label">Total Balance:</span>
                            <span className="value">{formatCurrency(balances.totalBalance)}</span>
                        </div>
                        <div className="total-balance-item">
                            <span className="label">Available Balance:</span>
                            <span className="value">{formatCurrency(balances.availableBalance)}</span>
                        </div>
                        <div className="total-balance-item">
                            <span className="label">Reserved Balance:</span>
                            <span className="value">{formatCurrency(balances.reservedBalance)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;