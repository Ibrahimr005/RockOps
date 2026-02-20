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
import StatisticsCards from '../../../../components/common/StatisticsCards/StatisticsCards.jsx';
import './Dashboard.scss';

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [balances, setBalances] = useState(null);
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useSnackbar();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [summaryRes, balancesRes, merchantsRes] = await Promise.all([
                financeService.accountsPayable.dashboard.getSummary(),
                financeService.accountsPayable.dashboard.getBalances(),
                financeService.accountsPayable.dashboard.getMerchants().catch(() => ({ data: [] }))
            ]);

            setSummary(summaryRes.data);
            setBalances(balancesRes.data);
            setMerchants(merchantsRes.data || []);
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
            <div className="ap-dashboard">
                <div className="dashboard-loading">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ap-dashboard">
            {/* Summary Cards */}
            <StatisticsCards
                cards={[
                    {
                        icon: <FiFileText />,
                        label: "Pending Offers",
                        value: summary?.pendingOffersCount || 0,
                        variant: "warning",
                        subtitle: formatCurrency(summary?.pendingOffersAmount)
                    },
                    {
                        icon: <FiClock />,
                        label: "Pending Requests",
                        value: summary?.pendingPaymentRequestsCount || 0,
                        variant: "info",
                        subtitle: formatCurrency(summary?.pendingPaymentRequestsAmount)
                    },
                    {
                        icon: <FiCheckCircle />,
                        label: "Ready to Pay",
                        value: summary?.readyToPayCount || 0,
                        variant: "success",
                        subtitle: formatCurrency(summary?.readyToPayAmount)
                    },
                    {
                        icon: <FiDollarSign />,
                        label: "Paid Today",
                        value: summary?.paidTodayCount || 0,
                        variant: "primary",
                        subtitle: formatCurrency(summary?.paidTodayAmount)
                    },
                    {
                        icon: <FiTrendingUp />,
                        label: "Available Balance",
                        value: formatCurrency(summary?.availableBalance),
                        variant: "lime"
                    },
                    {
                        icon: <FiShoppingBag />,
                        label: "Total Balance",
                        value: formatCurrency(summary?.totalBalance),
                        variant: "total"
                    }
                ]}
                columns={3}
            />

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

            {/* Merchant Payment Summaries */}
            {merchants.length > 0 && (
                <div className="merchant-summaries">
                    <h3 className="section-title">Top Merchants by Payment</h3>
                    <div className="merchant-table-container">
                        <table className="merchant-table">
                            <thead>
                                <tr>
                                    <th>Merchant</th>
                                    <th>Total Paid</th>
                                    <th>Payments</th>
                                    <th>Last Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {merchants.slice(0, 10).map((merchant) => (
                                    <tr key={merchant.merchantId}>
                                        <td className="merchant-name">{merchant.merchantName}</td>
                                        <td className="merchant-amount">{formatCurrency(merchant.totalPaid)}</td>
                                        <td>{merchant.numberOfPayments}</td>
                                        <td>{merchant.lastPaymentDate ? new Date(merchant.lastPaymentDate).toLocaleDateString() : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;