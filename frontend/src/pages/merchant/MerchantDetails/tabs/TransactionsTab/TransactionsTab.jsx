import React, { useState, useEffect } from 'react';
import { merchantService } from '../../../../../services/merchant/merchantService';
import DataTable from '../../../../../components/common/DataTable/DataTable';
import './TransactionsTab.scss';

const TransactionsTab = ({ merchant }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, [merchant.id]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await merchantService.getTransactions(merchant.id);
            setTransactions(data || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError('Failed to load transactions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        // Remove microseconds (keep only 3 decimals)
        const cleanDate = dateString.replace(/(\.\d{3})\d+$/, '$1');

        const date = new Date(cleanDate);

        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', ' •');
    };




    const formatIssueType = (issueType) => {
        if (!issueType) return '';
        // Handle if issueType is an object
        if (typeof issueType === 'object') {
            return issueType.name || issueType.type || '';
        }
        return String(issueType).replace(/_/g, ' ');
    };

    const calculateStats = () => {
        const totalTransactions = transactions.length;
        const goodTransactions = transactions.filter(t => t.status === 'GOOD').length;
        const issueTransactions = transactions.filter(t => t.status === 'HAS_ISSUES').length;
        const totalQuantityReceived = transactions.reduce((sum, t) => sum + (t.quantityReceived || 0), 0);
        const totalIssueQuantity = transactions.reduce((sum, t) => sum + (t.issueQuantity || 0), 0);
        const redeliveries = transactions.filter(t => t.isRedelivery).length;
        const resolvedIssues = transactions.filter(t =>
            t.status === 'HAS_ISSUES' && t.resolutionStatus === 'RESOLVED'
        ).length;

        // Calculate performance metrics
        const successRate = totalTransactions > 0
            ? Math.round((goodTransactions / totalTransactions) * 100)
            : 0;

        const resolutionRate = issueTransactions > 0
            ? Math.round((resolvedIssues / issueTransactions) * 100)
            : 0;

        const issueRate = totalTransactions > 0
            ? Math.round((issueTransactions / totalTransactions) * 100)
            : 0;

        const redeliveryRate = totalTransactions > 0
            ? Math.round((redeliveries / totalTransactions) * 100)
            : 0;

        // Quality score calculation (weighted average)
        const qualityScore = Math.round(
            (successRate * 0.5) +
            (resolutionRate * 0.3) +
            ((100 - issueRate) * 0.15) +
            ((100 - redeliveryRate) * 0.05)
        );

        // Find most ordered item
        const itemCounts = {};
        transactions.forEach(t => {
            const key = t.itemTypeName;
            itemCounts[key] = (itemCounts[key] || 0) + t.quantityReceived;
        });
        const mostOrderedItem = Object.keys(itemCounts).length > 0
            ? Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]
            : null;

        // Calculate average delivery issues per order
        const avgIssuesPerOrder = totalTransactions > 0
            ? (totalIssueQuantity / totalTransactions).toFixed(2)
            : 0;

        return {
            totalTransactions,
            goodTransactions,
            issueTransactions,
            totalQuantityReceived,
            totalIssueQuantity,
            redeliveries,
            resolvedIssues,
            mostOrderedItem,
            successRate,
            resolutionRate,
            issueRate,
            redeliveryRate,
            qualityScore,
            avgIssuesPerOrder
        };
    };

    const stats = calculateStats();

    // Get performance rating based on quality score
    const getPerformanceRating = (score) => {
        if (score >= 90) return { label: 'Excellent', class: 'excellent' };
        if (score >= 75) return { label: 'Good', class: 'good' };
        if (score >= 60) return { label: 'Fair', class: 'fair' };
        return { label: 'Needs Improvement', class: 'poor' };
    };

    const performanceRating = getPerformanceRating(stats.qualityScore);

    // Compute filter options safely
    const categoryOptions = React.useMemo(() => {
        const categories = transactions
            .map(t => t.itemCategoryName)
            .filter(cat => {
                // Filter out null, undefined, empty strings, and objects
                return cat != null &&
                    cat !== '' &&
                    typeof cat === 'string';
            });
        return [...new Set(categories)];
    }, [transactions]);

    // Table columns configuration
    const tableColumns = [

        {
            id: 'poNumber',
            header: 'PO Number',
            accessor: 'poNumber',
            sortable: true,
            minWidth: '150px',
            cell: (row) => <span className="po-number">#{row.poNumber}</span>
        },

        {
            id: 'category',
            header: 'Category',
            accessor: 'itemCategoryName',
            sortable: true,
            minWidth: '120px'
        },
        {
            id: 'itemInfo',
            header: 'Item',
            accessor: 'itemTypeName',
            sortable: true,
            minWidth: '150px',
            cell: (row) => (
                <div className="item-cell">
                    <div className="item-name">{row.itemTypeName}</div>
                    <div className="item-category">{row.itemCategoryName}</div>
                </div>
            )
        },

        {
            id: 'quantity',
            header: 'Quantity',
            accessor: 'quantityReceived',
            sortable: true,
            minWidth: '100px',
            cell: (row) => (
                <div className="quantity-cell">
                    <div className="good-qty">{row.quantityReceived} units</div>
                    {row.issueQuantity > 0 && (
                        <div className="issue-qty">-{row.issueQuantity} issues</div>
                    )}
                </div>
            )
        },
        {
            id: 'issueType',
            header: 'Issue Type',
            accessor: 'issueType',
            sortable: true,
            minWidth: '180px',
            cell: (row) => {
                if (!row.issueType) return <span className="no-issue">No Issues</span>;
                return (
                    <div className="issue-cell">
                        <div className="issue-type">{formatIssueType(row.issueType)}</div>
                        {row.resolutionStatus && (
                            <div className={`resolution-status resolution-${(row.resolutionStatus || '').toLowerCase()}`}>
                                {row.resolutionStatus}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'receivedBy',
            header: 'Received By',
            accessor: 'receivedBy',
            sortable: true,
            minWidth: '150px'
        },
        {
            id: 'receivedAt',
            header: 'Received At',
            accessor: 'receivedAt',
            sortable: true,
            minWidth: '180px',
            cell: (row) => formatDate(row.receivedAt)
        }
    ];

    if (loading) {
        return (
            <div className="transactions-tab">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading transaction data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="transactions-tab">
                <div className="error-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h4>Error Loading Transactions</h4>
                    <p>{error}</p>
                    <button className="retry-button" onClick={fetchTransactions}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="transactions-tab">
            {/* Performance Overview Section */}
            <div className="performance-overview">
                <div className="section-header-transactions-merchant">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                        Merchant Performance Overview
                    </h3>
                </div>

                {/* Key Metrics Grid */}
                <div className="metrics-grid">
                    <div className="metric-card metric-primary">
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-header">Success Rate</div>
                            <div className="metric-value">{stats.successRate}%</div>
                            <div className="metric-detail">
                                {stats.goodTransactions} of {stats.totalTransactions} deliveries
                            </div>
                            <div className={`metric-indicator ${stats.successRate >= 90 ? 'excellent' : stats.successRate >= 75 ? 'good' : 'fair'}`}>
                                <div className="indicator-bar" style={{ width: `${stats.successRate}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card metric-warning">
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-header">Issue Rate</div>
                            <div className="metric-value">{stats.issueRate}%</div>
                            <div className="metric-detail">
                                {stats.issueTransactions} issues reported
                            </div>
                            <div className={`metric-indicator ${stats.issueRate <= 10 ? 'excellent' : stats.issueRate <= 25 ? 'good' : 'fair'}`}>
                                <div className="indicator-bar reverse" style={{ width: `${stats.issueRate}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card metric-info">
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-header">Resolution Rate</div>
                            <div className="metric-value">{stats.resolutionRate}%</div>
                            <div className="metric-detail">
                                {stats.resolvedIssues} of {stats.issueTransactions} resolved
                            </div>
                            <div className={`metric-indicator ${stats.resolutionRate >= 80 ? 'excellent' : stats.resolutionRate >= 60 ? 'good' : 'fair'}`}>
                                <div className="indicator-bar" style={{ width: `${stats.resolutionRate}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card metric-secondary">
                        <div className="metric-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                <polyline points="17 6 23 6 23 12"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-header">Redelivery Rate</div>
                            <div className="metric-value">{stats.redeliveryRate}%</div>
                            <div className="metric-detail">
                                {stats.redeliveries} redeliveries made
                            </div>
                            <div className={`metric-indicator ${stats.redeliveryRate <= 5 ? 'excellent' : stats.redeliveryRate <= 15 ? 'good' : 'fair'}`}>
                                <div className="indicator-bar reverse" style={{ width: `${stats.redeliveryRate}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Stats */}
                <div className="stats-row">
                    <div className="stat-item">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Total Quantity</div>
                            <div className="stat-value">{stats.totalQuantityReceived.toLocaleString()}</div>
                        </div>
                    </div>

                    {stats.mostOrderedItem && (
                        <div className="stat-item stat-highlight">
                            <div className="stat-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">Most Ordered Item</div>
                                <div className="stat-value">{stats.mostOrderedItem[0]}</div>
                                <div className="stat-detail">{stats.mostOrderedItem[1]} units</div>
                            </div>
                        </div>
                    )}

                    <div className="stat-item">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Avg Issues per Order</div>
                            <div className="stat-value">{stats.avgIssuesPerOrder}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table Section */}
            <div className="transactions-table-section">
                <div className="section-header-transactions-merchant">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        Delivery Transactions History
                    </h3>
                </div>

                {transactions.length > 0 ? (
                    <DataTable
                        data={transactions}
                        columns={tableColumns}
                        defaultItemsPerPage={10}
                        itemsPerPageOptions={[5,10,15,20]}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={[
                            {
                                accessor: 'itemTypeName',
                                header: 'Item',
                                filterType: 'text'
                            },
                            {
                                accessor: 'itemCategoryName',
                                header: 'Category',
                                filterType: 'text'
                            },
                            {
                                accessor: 'poNumber',
                                header: 'PO Number',
                                filterType: 'text'
                            },
                            {
                                accessor: 'quantityReceived',
                                header: 'Quantity',
                                filterType: 'number'
                            },
                            {
                                accessor: 'issueType',
                                header: 'Issue Type',
                                filterType: 'text'
                            },
                            {
                                accessor: 'receivedBy',
                                header: 'Received By',
                                filterType: 'text'
                            }
                        ]}
                        showExportButton={true}
                        exportFileName={`${merchant.name}_transactions`}
                        exportAllData={false}
                        className="transactions-data-table"
                        emptyMessage="No delivery transactions found for this merchant"
                    />
                ) : (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <h4>No Transactions Found</h4>
                        <p>No delivery transactions have been recorded for this merchant yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionsTab;