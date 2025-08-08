import React, { useState, useEffect } from 'react';
import { FaChartLine, FaDownload, FaCalendarAlt, FaUniversity, FaFileExcel, FaFilePdf } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';

const ReconciliationReports = () => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [summaryData, setSummaryData] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const { showSuccess, showError } = useSnackbar();

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
            fetchReportData();
            fetchTrendData();
        }
    }, [selectedAccountId, dateRange]);

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

    const fetchReportData = async () => {
        if (!selectedAccountId) return;

        try {
            setLoading(true);
            const response = await financeService.bankReconciliation.reconciliationReports.getSummaryByAccount(
                selectedAccountId,
                dateRange.startDate,
                dateRange.endDate
            );
            const data = response.data || response;
            setSummaryData(data);
        } catch (error) {
            console.error('Error fetching report data:', error);
            showError('Failed to load report data: ' + error.message);
            setSummaryData(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrendData = async () => {
        if (!selectedAccountId) return;

        try {
            const response = await financeService.bankReconciliation.reconciliationReports.getReconciliationTrend(selectedAccountId);
            const data = response.data || response;
            setTrendData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching trend data:', error);
            setTrendData([]);
        }
    };

    const handleExportCSV = async () => {
        if (!selectedAccountId) {
            showError('Please select a bank account first');
            return;
        }

        try {
            const response = await financeService.bankReconciliation.reconciliationReports.exportToCsv(
                selectedAccountId,
                dateRange.startDate,
                dateRange.endDate
            );

            // Create blob and download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reconciliation_report_${selectedAccountId}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showSuccess('Report exported successfully');
        } catch (error) {
            console.error('Error exporting report:', error);
            showError('Failed to export report: ' + error.message);
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatPercentage = (value) => {
        if (!value) return '0%';
        return `${value.toFixed(1)}%`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETE':
                return '#10b981';
            case 'ISSUES':
                return '#ef4444';
            case 'IN_PROGRESS':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    const selectedAccount = bankAccounts.find(account => account.id === selectedAccountId);

    const trendColumns = [
        {
            header: 'Month',
            accessor: 'month',
            sortable: true
        },
        {
            header: 'Reconciliation %',
            accessor: 'reconciliationPercentage',
            sortable: true,
            align: 'right',
            render: (row, value) => formatPercentage(value)
        },
        {
            header: 'Total Transactions',
            accessor: 'totalTransactions',
            sortable: true,
            align: 'right'
        },
        {
            header: 'Reconciled',
            accessor: 'reconciledTransactions',
            sortable: true,
            align: 'right'
        },
        {
            header: 'Discrepancies',
            accessor: 'totalDiscrepancies',
            sortable: true,
            align: 'right'
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true,
            align: 'center',
            render: (row, value) => (
                <span
                    className="bank-reconciliation-status-badge"
                    style={{
                        backgroundColor: `${getStatusColor(value)}20`,
                        color: getStatusColor(value),
                        border: `1px solid ${getStatusColor(value)}40`
                    }}
                >
                    {value}
                </span>
            )
        }
    ];

    return (
        <div className="bank-reconciliation-card">
            <div className="bank-reconciliation-card-header">
                <h3 className="bank-reconciliation-card-title">
                    <FaChartLine />
                    Reconciliation Reports
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
                        className="bank-reconciliation-btn bank-reconciliation-btn-secondary"
                        onClick={handleExportCSV}
                        disabled={!selectedAccountId}
                    >
                        <FaFilePdf />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="bank-reconciliation-form" style={{ marginBottom: '20px' }}>
                <div className="bank-reconciliation-form-row">
                    <div className="bank-reconciliation-form-group">
                        <label className="bank-reconciliation-form-label">
                            <FaCalendarAlt /> Start Date
                        </label>
                        <input
                            type="date"
                            className="bank-reconciliation-form-input"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                        />
                    </div>
                    <div className="bank-reconciliation-form-group">
                        <label className="bank-reconciliation-form-label">
                            <FaCalendarAlt /> End Date
                        </label>
                        <input
                            type="date"
                            className="bank-reconciliation-form-input"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bank-reconciliation-loading">
                    <div className="bank-reconciliation-loading-spinner"></div>
                    <div className="bank-reconciliation-loading-text">Loading report data...</div>
                </div>
            ) : selectedAccount && summaryData ? (
                <>
                    {/* Account Summary */}
                    <div className="bank-reconciliation-stats" style={{ marginBottom: '20px' }}>
                        <div className="bank-reconciliation-stat-card">
                            <FaUniversity className="bank-reconciliation-stat-icon" />
                            <div className="bank-reconciliation-stat-value">{selectedAccount.accountName}</div>
                            <div className="bank-reconciliation-stat-label">Selected Account</div>
                        </div>
                        <div className="bank-reconciliation-stat-card">
                            <div className="bank-reconciliation-stat-value">{formatPercentage(summaryData.reconciliationPercentage)}</div>
                            <div className="bank-reconciliation-stat-label">Reconciliation Rate</div>
                        </div>
                        <div className="bank-reconciliation-stat-card">
                            <div className="bank-reconciliation-stat-value">{summaryData.totalInternalTransactions || 0}</div>
                            <div className="bank-reconciliation-stat-label">Total Transactions</div>
                        </div>
                        <div className="bank-reconciliation-stat-card">
                            <div className="bank-reconciliation-stat-value">{summaryData.openDiscrepancies || 0}</div>
                            <div className="bank-reconciliation-stat-label">Open Discrepancies</div>
                        </div>
                    </div>

                    {/* Detailed Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div className="bank-reconciliation-card">
                            <div className="bank-reconciliation-card-header">
                                <h4 className="bank-reconciliation-card-title">Transaction Summary</h4>
                            </div>
                            <div style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Internal Transactions:</span>
                                    <strong>{summaryData.totalInternalTransactions || 0}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Bank Statement Entries:</span>
                                    <strong>{summaryData.totalBankStatementEntries || 0}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Reconciled Transactions:</span>
                                    <strong style={{ color: '#10b981' }}>{summaryData.reconciledTransactions || 0}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Unmatched Internal:</span>
                                    <strong style={{ color: '#ef4444' }}>{summaryData.unmatchedInternalTransactions || 0}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Unmatched Bank Entries:</span>
                                    <strong style={{ color: '#ef4444' }}>{summaryData.unmatchedBankEntries || 0}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="bank-reconciliation-card">
                            <div className="bank-reconciliation-card-header">
                                <h4 className="bank-reconciliation-card-title">Amount Summary</h4>
                            </div>
                            <div style={{ padding: '10px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Total Internal Amount:</span>
                                    <strong>{formatCurrency(summaryData.totalInternalAmount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Total Bank Amount:</span>
                                    <strong>{formatCurrency(summaryData.totalBankAmount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Reconciled Amount:</span>
                                    <strong style={{ color: '#10b981' }}>{formatCurrency(summaryData.reconciledAmount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Unreconciled Amount:</span>
                                    <strong style={{ color: '#ef4444' }}>{formatCurrency(summaryData.unreconciledAmount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <span><strong>Final Difference:</strong></span>
                                    <strong style={{ color: Math.abs(summaryData.finalDifference || 0) < 0.01 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(summaryData.finalDifference)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reconciliation Status */}
                    <div className="bank-reconciliation-card" style={{ marginBottom: '20px' }}>
                        <div className="bank-reconciliation-card-header">
                            <h4 className="bank-reconciliation-card-title">Reconciliation Status</h4>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                border: `8px solid ${getStatusColor(summaryData.reconciliationStatus)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: `${getStatusColor(summaryData.reconciliationStatus)}10`
                            }}>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    color: getStatusColor(summaryData.reconciliationStatus)
                                }}>
                                    {formatPercentage(summaryData.reconciliationPercentage)}
                                </span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 10px 0', color: getStatusColor(summaryData.reconciliationStatus) }}>
                                    {summaryData.reconciliationStatus}
                                </h3>
                                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                                    {summaryData.reconciliationStatus === 'COMPLETE'
                                        ? 'All transactions have been successfully reconciled.'
                                        : summaryData.reconciliationStatus === 'ISSUES'
                                            ? 'There are discrepancies that need attention.'
                                            : 'Reconciliation is in progress.'}
                                </p>
                                {summaryData.totalDiscrepancies > 0 && (
                                    <p style={{ margin: '10px 0 0 0', color: '#ef4444', fontWeight: '600' }}>
                                        {summaryData.totalDiscrepancies} discrepancies found
                                        ({summaryData.highPriorityDiscrepancies} high priority)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trend Analysis */}
                    <div className="bank-reconciliation-card">
                        <div className="bank-reconciliation-card-header">
                            <h4 className="bank-reconciliation-card-title">Reconciliation Trend (Last 6 Months)</h4>
                        </div>
                        <DataTable
                            data={trendData}
                            columns={trendColumns}
                            loading={false}
                            showExportButton={true}
                            exportButtonText="Export Trend"
                            exportButtonIcon={<FaFileExcel />}
                            exportFileName="reconciliation_trend"
                            tableTitle=""
                            emptyMessage="No trend data available"
                            className="bank-reconciliation-table"
                            defaultSortField="startDate"
                            defaultSortDirection="desc"
                            itemsPerPageOptions={[6, 12, 24]}
                            defaultItemsPerPage={6}
                        />
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)' }}>
                    {selectedAccountId ? (
                        <p>No report data available for the selected period.</p>
                    ) : (
                        <p>Please select a bank account to view reconciliation reports.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReconciliationReports;