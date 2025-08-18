import React, { useState, useEffect } from 'react';
import {
    FaUniversity,
    FaExchangeAlt,
    FaExclamationTriangle,
    FaChartLine,
    FaCheckCircle,
    FaTimesCircle,
    FaClock
} from 'react-icons/fa';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const BankReconciliationDashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        accounts: [],
        recentMatches: [],
        openDiscrepancies: [],
        reconciliationStatus: []
    });
    const [loading, setLoading] = useState(true);
    const { showError } = useSnackbar();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const [
                accountsResponse,
                matchesResponse,
                discrepanciesResponse
            ] = await Promise.all([
                financeService.bankReconciliation.bankAccounts.getAll(),
                financeService.bankReconciliation.transactionMatches.getUnconfirmed(),
                financeService.bankReconciliation.discrepancies.getOpen()
            ]);

            const accounts = accountsResponse.data || accountsResponse || [];
            const matches = matchesResponse.data || matchesResponse || [];
            const discrepancies = discrepanciesResponse.data || discrepanciesResponse || [];

            // Fetch reconciliation status for each account
            const statusPromises = accounts.map(async (account) => {
                try {
                    const statusResponse = await financeService.bankReconciliation.reconciliationReports.getReconciliationStatus(account.id);
                    return statusResponse.data || statusResponse;
                } catch (error) {
                    console.error(`Error fetching status for account ${account.id}:`, error);
                    return {
                        bankAccountId: account.id,
                        bankAccountName: account.accountName,
                        reconciliationStatus: 'ERROR',
                        reconciliationPercentage: 0,
                        needsAttention: true
                    };
                }
            });

            const reconciliationStatus = await Promise.all(statusPromises);

            setDashboardData({
                accounts: Array.isArray(accounts) ? accounts : [],
                recentMatches: Array.isArray(matches) ? matches.slice(0, 5) : [],
                openDiscrepancies: Array.isArray(discrepancies) ? discrepancies.slice(0, 5) : [],
                reconciliationStatus: Array.isArray(reconciliationStatus) ? reconciliationStatus : []
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showError('Failed to load dashboard data: ' + error.message);
            setDashboardData({
                accounts: [],
                recentMatches: [],
                openDiscrepancies: [],
                reconciliationStatus: []
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETE':
                return 'green';
            case 'ISSUES':
                return 'red';
            case 'IN_PROGRESS':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETE':
                return <FaCheckCircle style={{ color: '#10b981' }} />;
            case 'ISSUES':
                return <FaTimesCircle style={{ color: '#ef4444' }} />;
            case 'IN_PROGRESS':
                return <FaClock style={{ color: '#f59e0b' }} />;
            default:
                return <FaClock style={{ color: '#6b7280' }} />;
        }
    };

    const calculateTotalBalance = () => {
        return dashboardData.accounts.reduce((sum, account) => sum + (parseFloat(account.currentBalance) || 0), 0);
    };

    const getHighPriorityDiscrepancies = () => {
        return dashboardData.openDiscrepancies.filter(d => d.priority === 'HIGH').length;
    };

    const getAccountsNeedingAttention = () => {
        return dashboardData.reconciliationStatus.filter(status => status.needsAttention).length;
    };

    if (loading) {
        return (
            <div className="bank-reconciliation-loading">
                <div className="bank-reconciliation-loading-spinner"></div>
                <div className="bank-reconciliation-loading-text">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="bank-reconciliation-dashboard">
            {/* Summary Statistics */}
            <div className="bank-reconciliation-stats">
                <div className="bank-reconciliation-stat-card">
                    <FaUniversity className="bank-reconciliation-stat-icon" />
                    <div className="bank-reconciliation-stat-value">{dashboardData.accounts.length}</div>
                    <div className="bank-reconciliation-stat-label">Active Bank Accounts</div>
                </div>
                <div className="bank-reconciliation-stat-card">
                    <FaChartLine className="bank-reconciliation-stat-icon" />
                    <div className="bank-reconciliation-stat-value">{formatCurrency(calculateTotalBalance())}</div>
                    <div className="bank-reconciliation-stat-label">Total Account Balance</div>
                </div>
                <div className="bank-reconciliation-stat-card">
                    <FaExchangeAlt className="bank-reconciliation-stat-icon" />
                    <div className="bank-reconciliation-stat-value">{dashboardData.recentMatches.length}</div>
                    <div className="bank-reconciliation-stat-label">Pending Matches</div>
                </div>
                <div className="bank-reconciliation-stat-card">
                    <FaExclamationTriangle className="bank-reconciliation-stat-icon" />
                    <div className="bank-reconciliation-stat-value">{getHighPriorityDiscrepancies()}</div>
                    <div className="bank-reconciliation-stat-label">High Priority Issues</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Account Reconciliation Status */}
                <div className="bank-reconciliation-card">
                    <div className="bank-reconciliation-card-header">
                        <h4 className="bank-reconciliation-card-title">
                            <FaUniversity />
                            Account Reconciliation Status
                        </h4>
                    </div>
                    <div className="account-status-list">
                        {dashboardData.reconciliationStatus.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '20px' }}>
                                No accounts found
                            </p>
                        ) : (
                            dashboardData.reconciliationStatus.map((status, index) => (
                                <div key={index} className="account-status-item" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 0',
                                    borderBottom: index < dashboardData.reconciliationStatus.length - 1 ? '1px solid var(--border-color)' : 'none'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                            {status.bankAccountName}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {status.reconciliationPercentage?.toFixed(1)}% reconciled
                                            {status.unreconciledTransactions > 0 && ` • ${status.unreconciledTransactions} unreconciled`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getStatusIcon(status.reconciliationStatus)}
                                        <span className={`bank-reconciliation-status-badge bank-reconciliation-status-${status.reconciliationStatus?.toLowerCase()}`}>
                                            {status.reconciliationStatus}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Transaction Matches */}
                <div className="bank-reconciliation-card">
                    <div className="bank-reconciliation-card-header">
                        <h4 className="bank-reconciliation-card-title">
                            <FaExchangeAlt />
                            Recent Transaction Matches
                        </h4>
                    </div>
                    <div className="recent-matches-list">
                        {dashboardData.recentMatches.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '20px' }}>
                                No pending matches found
                            </p>
                        ) : (
                            dashboardData.recentMatches.map((match, index) => (
                                <div key={index} className="recent-match-item" style={{
                                    padding: '12px 0',
                                    borderBottom: index < dashboardData.recentMatches.length - 1 ? '1px solid var(--border-color)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                {match.bankStatementEntry?.description || 'Bank Entry'}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                {formatCurrency(match.bankStatementEntry?.amount)} •
                                                Confidence: {((match.confidenceScore || 0) * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                        <span className={`bank-reconciliation-status-badge ${match.confirmed ? 'bank-reconciliation-status-confirmed' : 'bank-reconciliation-status-pending'}`}>
                                            {match.confirmed ? 'Confirmed' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Open Discrepancies */}
            <div className="bank-reconciliation-card">
                <div className="bank-reconciliation-card-header">
                    <h4 className="bank-reconciliation-card-title">
                        <FaExclamationTriangle />
                        Open Discrepancies
                    </h4>
                </div>
                <div className="discrepancies-list">
                    {dashboardData.openDiscrepancies.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '20px' }}>
                            No open discrepancies found
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                            {dashboardData.openDiscrepancies.map((discrepancy, index) => (
                                <div key={index} className="discrepancy-item" style={{
                                    padding: '15px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--color-surface)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '600' }}>
                                            {discrepancy.description || `Discrepancy #${discrepancy.id?.substring(0, 8)}`}
                                        </div>
                                        <span className={`bank-reconciliation-status-badge bank-reconciliation-status-${discrepancy.priority?.toLowerCase()}`}>
                                            {discrepancy.priority}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                        {discrepancy.reason}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem' }}>
                                            Created: {discrepancy.createdDate ? new Date(discrepancy.createdDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                        <span className={`bank-reconciliation-status-badge bank-reconciliation-status-${discrepancy.status?.toLowerCase()}`}>
                                            {discrepancy.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bank-reconciliation-card">
                <div className="bank-reconciliation-card-header">
                    <h4 className="bank-reconciliation-card-title">Quick Actions</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <button className="bank-reconciliation-btn bank-reconciliation-btn-primary" style={{ padding: '15px' }}>
                        <FaUniversity />
                        Manage Bank Accounts
                    </button>
                    <button className="bank-reconciliation-btn bank-reconciliation-btn-secondary" style={{ padding: '15px' }}>
                        <FaExchangeAlt />
                        Review Matches
                    </button>
                    <button className="bank-reconciliation-btn bank-reconciliation-btn-warning" style={{ padding: '15px' }}>
                        <FaExclamationTriangle />
                        Resolve Discrepancies
                    </button>
                    <button className="bank-reconciliation-btn bank-reconciliation-btn-success" style={{ padding: '15px' }}>
                        <FaChartLine />
                        View Reports
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankReconciliationDashboard;