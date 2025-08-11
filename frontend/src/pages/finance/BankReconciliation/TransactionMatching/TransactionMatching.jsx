import React, { useState, useEffect } from 'react';
import { FaExchangeAlt, FaCheck, FaTimes, FaRobot, FaEye, FaFileExcel } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const TransactionMatching = () => {
    const [matches, setMatches] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [loading, setLoading] = useState(true);
    const [autoMatchingLoading, setAutoMatchingLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('unconfirmed');
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'unconfirmed', label: 'Unconfirmed Matches', count: 0 },
        { id: 'needs-review', label: 'Needs Review', count: 0 },
        { id: 'all', label: 'All Matches', count: 0 }
    ];

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    useEffect(() => {
        if (bankAccounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(bankAccounts[0].id);
        }
    }, [bankAccounts]);

    useEffect(() => {
        if (selectedAccountId) {
            fetchTransactionMatches();
        }
    }, [selectedAccountId, activeTab]);

    const fetchBankAccounts = async () => {
        try {
            const response = await financeService.bankReconciliation.bankAccounts.getAll();
            const data = response.data || response;
            setBankAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
            showError('Failed to load bank accounts: ' + error.message);
            setBankAccounts([]);
        }
    };

    const fetchTransactionMatches = async () => {
        try {
            setLoading(true);
            let response;

            switch (activeTab) {
                case 'unconfirmed':
                    response = await financeService.bankReconciliation.transactionMatches.getUnconfirmed();
                    break;
                case 'needs-review':
                    response = await financeService.bankReconciliation.transactionMatches.getNeedingReview();
                    break;
                case 'all':
                default:
                    response = await financeService.bankReconciliation.transactionMatches.getByBankAccount(selectedAccountId);
                    break;
            }

            const data = response.data || response;
            setMatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching transaction matches:', error);
            showError('Failed to load transaction matches: ' + error.message);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmMatch = async (match) => {
        try {
            await financeService.bankReconciliation.transactionMatches.confirm(match.id, 'Current User');
            showSuccess('Transaction match confirmed successfully');
            fetchTransactionMatches();
        } catch (error) {
            console.error('Error confirming match:', error);
            showError('Failed to confirm match: ' + error.message);
        }
    };

    const handleRejectMatch = async (match) => {
        if (window.confirm('Are you sure you want to reject this match?')) {
            try {
                await financeService.bankReconciliation.transactionMatches.delete(match.id);
                showSuccess('Transaction match rejected successfully');
                fetchTransactionMatches();
            } catch (error) {
                console.error('Error rejecting match:', error);
                showError('Failed to reject match: ' + error.message);
            }
        }
    };

    const handleAutoMatch = async () => {
        if (!selectedAccountId) {
            showError('Please select a bank account first');
            return;
        }

        try {
            setAutoMatchingLoading(true);
            const response = await financeService.bankReconciliation.transactionMatches.performAutoMatching(selectedAccountId);
            const data = response.data || response;
            const matchCount = Array.isArray(data) ? data.length : 0;

            if (matchCount > 0) {
                showSuccess(`Auto-matching completed! ${matchCount} new matches found.`);
                fetchTransactionMatches();
            } else {
                showSuccess('Auto-matching completed. No new matches found.');
            }
        } catch (error) {
            console.error('Error performing auto-matching:', error);
            showError('Failed to perform auto-matching: ' + error.message);
        } finally {
            setAutoMatchingLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getConfidenceScoreBadge = (score) => {
        if (score >= 0.8) {
            return <span className="bank-reconciliation-status-badge bank-reconciliation-status-high">High ({(score * 100).toFixed(0)}%)</span>;
        } else if (score >= 0.5) {
            return <span className="bank-reconciliation-status-badge bank-reconciliation-status-medium">Medium ({(score * 100).toFixed(0)}%)</span>;
        } else {
            return <span className="bank-reconciliation-status-badge bank-reconciliation-status-low">Low ({(score * 100).toFixed(0)}%)</span>;
        }
    };

    const getStatusBadge = (isConfirmed) => {
        return (
            <span className={`bank-reconciliation-status-badge ${isConfirmed ? 'bank-reconciliation-status-confirmed' : 'bank-reconciliation-status-pending'}`}>
                {isConfirmed ? 'Confirmed' : 'Pending'}
            </span>
        );
    };

    const columns = [
        {
            header: 'Bank Statement Entry',
            accessor: 'bankStatementEntry.description',
            sortable: true,
            filterable: true,
            render: (row, value) => (
                <div>
                    <div className="font-medium">{value || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                        {formatCurrency(row.bankStatementEntry?.amount)} • {row.bankStatementEntry?.transactionDate ? new Date(row.bankStatementEntry.transactionDate).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            )
        },
        {
            header: 'Internal Transaction',
            accessor: 'internalTransaction.description',
            sortable: true,
            filterable: true,
            render: (row, value) => (
                <div>
                    <div className="font-medium">{value || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                        {formatCurrency(row.internalTransaction?.amount)} • {row.internalTransaction?.transactionDate ? new Date(row.internalTransaction.transactionDate).toLocaleDateString() : 'N/A'}
                    </div>
                </div>
            )
        },
        {
            header: 'Confidence Score',
            accessor: 'confidenceScore',
            sortable: true,
            align: 'center',
            render: (row, value) => getConfidenceScoreBadge(value)
        },
        {
            header: 'Match Type',
            accessor: 'matchType',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row, value) => (
                <span className="capitalize">{value?.toLowerCase().replace('_', ' ') || 'N/A'}</span>
            )
        },
        {
            header: 'Status',
            accessor: 'confirmed',
            sortable: true,
            filterable: true,
            filterType: 'select',
            render: (row, value) => getStatusBadge(value)
        },
        {
            header: 'Created Date',
            accessor: 'createdDate',
            sortable: true,
            render: (row, value) => value ? new Date(value).toLocaleDateString() : 'N/A'
        }
    ];

    const actions = [
        {
            label: 'View Details',
            icon: <FaEye />,
            onClick: (match) => {
                // TODO: Implement view details modal
                showSuccess(`Viewing details for match ${match.id}`);
            }
        },
        {
            label: 'Confirm Match',
            icon: <FaCheck />,
            onClick: (match) => handleConfirmMatch(match),
            className: 'bank-reconciliation-btn-success',
            isDisabled: (match) => match.confirmed
        },
        {
            label: 'Reject Match',
            icon: <FaTimes />,
            onClick: (match) => handleRejectMatch(match),
            className: 'bank-reconciliation-btn-danger',
            isDisabled: (match) => match.confirmed
        }
    ];

    const filterableColumns = [
        { header: 'Bank Description', accessor: 'bankStatementEntry.description', filterType: 'text' },
        { header: 'Internal Description', accessor: 'internalTransaction.description', filterType: 'text' },
        { header: 'Match Type', accessor: 'matchType', filterType: 'select' },
        { header: 'Status', accessor: 'confirmed', filterType: 'select' }
    ];

    const selectedAccount = bankAccounts.find(account => account.id === selectedAccountId);

    return (
        <div className="bank-reconciliation-card">
            <div className="bank-reconciliation-card-header">
                <h3 className="bank-reconciliation-card-title">
                    <FaExchangeAlt />
                    Transaction Matching
                </h3>
                <div className="bank-reconciliation-card-actions">
                    <select
                        className="bank-reconciliation-form-select"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        style={{ minWidth: '200px', marginRight: '10px' }}
                    >
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                                {account.accountName} ({account.bankName})
                            </option>
                        ))}
                    </select>
                    <button
                        className="bank-reconciliation-btn bank-reconciliation-btn-primary"
                        onClick={handleAutoMatch}
                        disabled={!selectedAccountId || autoMatchingLoading}
                    >
                        {autoMatchingLoading ? (
                            <>
                                <div className="bank-reconciliation-loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <FaRobot />
                                Auto Match
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tabs-header" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && <span className="tab-count">({tab.count})</span>}
                    </button>
                ))}
            </div>

            {selectedAccount && (
                <div className="bank-reconciliation-stats" style={{ marginBottom: '20px' }}>
                    <div className="bank-reconciliation-stat-card">
                        <div className="bank-reconciliation-stat-value">{selectedAccount.accountName}</div>
                        <div className="bank-reconciliation-stat-label">Selected Account</div>
                    </div>
                    <div className="bank-reconciliation-stat-card">
                        <div className="bank-reconciliation-stat-value">{formatCurrency(selectedAccount.currentBalance)}</div>
                        <div className="bank-reconciliation-stat-label">Current Balance</div>
                    </div>
                    <div className="bank-reconciliation-stat-card">
                        <div className="bank-reconciliation-stat-value">{matches.length}</div>
                        <div className="bank-reconciliation-stat-label">Total Matches</div>
                    </div>
                    <div className="bank-reconciliation-stat-card">
                        <div className="bank-reconciliation-stat-value">{matches.filter(m => !m.confirmed).length}</div>
                        <div className="bank-reconciliation-stat-label">Pending Confirmation</div>
                    </div>
                </div>
            )}

            <DataTable
                data={matches}
                columns={columns}
                loading={loading}
                actions={actions}
                showExportButton={true}
                exportButtonText="Export Matches"
                exportButtonIcon={<FaFileExcel />}
                exportFileName="transaction_matches"
                tableTitle={`Transaction Matches - ${activeTab.replace('-', ' ').toUpperCase()}`}
                emptyMessage={selectedAccountId ? "No transaction matches found" : "Please select a bank account to view matches"}
                className="bank-reconciliation-table"
                filterableColumns={filterableColumns}
                defaultSortField="createdDate"
                defaultSortDirection="desc"
            />
        </div>
    );
};

export default TransactionMatching;