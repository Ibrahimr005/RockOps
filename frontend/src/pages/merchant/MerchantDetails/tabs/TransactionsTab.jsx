import React, { useState, useEffect } from 'react';
import "../MerchantDetails.scss"

const TransactionsTab = ({ merchant }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Simulate loading transactions data based on merchant information
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Generate mock transactions based on merchant reliability and type
                const generateMockTransactions = () => {
                    const baseTransactionCount = merchant.reliabilityScore ? Math.floor(merchant.reliabilityScore * 10) : 5;
                    const transactions = [];

                    // Generate transactions for the last 6 months
                    for (let i = 0; i < baseTransactionCount; i++) {
                        const daysAgo = Math.floor(Math.random() * 180); // Random day in last 6 months
                        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

                        // Amount based on merchant type and reliability
                        let baseAmount = 500;
                        if (merchant.merchantType === 'PREMIUM') baseAmount = 2000;
                        else if (merchant.merchantType === 'ENTERPRISE') baseAmount = 5000;

                        const amount = baseAmount + (Math.random() * baseAmount * 2);

                        // Status based on reliability score
                        let status = 'completed';
                        if (merchant.reliabilityScore < 3.0) {
                            const rand = Math.random();
                            if (rand < 0.2) status = 'cancelled';
                            else if (rand < 0.4) status = 'pending';
                        } else if (merchant.reliabilityScore < 4.0) {
                            if (Math.random() < 0.1) status = 'pending';
                        }

                        // Items based on merchant categories
                        const getItemsForCategories = () => {
                            if (merchant.itemCategories && merchant.itemCategories.length > 0) {
                                const category = merchant.itemCategories[Math.floor(Math.random() * merchant.itemCategories.length)];
                                return category.name || 'General Items';
                            }
                            return ['Office Supplies', 'IT Equipment', 'Furniture', 'Cleaning Supplies', 'Marketing Materials'][Math.floor(Math.random() * 5)];
                        };

                        transactions.push({
                            id: `TXN-${String(i + 1).padStart(3, '0')}`,
                            orderNumber: `ORD-${date.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
                            date: date.toISOString().split('T')[0],
                            amount: amount,
                            status: status,
                            items: getItemsForCategories(),
                            paymentMethod: merchant.preferredPaymentMethod || 'Bank Transfer',
                            quantity: Math.floor(Math.random() * 50) + 1
                        });
                    }

                    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                };

                setTransactions(generateMockTransactions());
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [merchant]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'merchant-details-completed';
            case 'pending':
                return 'merchant-details-pending';
            case 'cancelled':
                return 'merchant-details-cancelled';
            default:
                return '';
        }
    };

    const calculateSummaryStats = () => {
        const filteredTransactions = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);
        const completedTransactions = transactions.filter(t => t.status === 'completed');
        const pendingTransactions = transactions.filter(t => t.status === 'pending');
        const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
        const averageOrderValue = completedTransactions.length > 0 ? totalAmount / completedTransactions.length : 0;
        const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

        return {
            totalTransactions: transactions.length,
            completedTransactions: completedTransactions.length,
            pendingTransactions: pendingTransactions.length,
            totalAmount,
            pendingAmount,
            averageOrderValue,
            filteredCount: filteredTransactions.length
        };
    };

    const stats = calculateSummaryStats();

    const filteredTransactions = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);

    if (loading) {
        return (
            <div className="merchant-details-tab-panel">
                <h3>Transaction History</h3>
                <div className="merchant-details-loading-spinner">
                    <div className="merchant-details-spinner"></div>
                    <p>Loading transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="merchant-details-tab-panel">
            <h3>Transaction History</h3>

            {/* Transaction Summary */}
            <div className="merchant-details-terms-grid">
                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Total Transactions</div>
                    <div className="merchant-details-term-value">
                        {stats.totalTransactions}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Completed Orders</div>
                    <div className="merchant-details-term-value merchant-details-delivery-time">
                        {stats.completedTransactions}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Total Revenue</div>
                    <div className="merchant-details-term-value">
                        {formatCurrency(stats.totalAmount)}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Average Order Value</div>
                    <div className="merchant-details-term-value merchant-details-payment-method">
                        {formatCurrency(stats.averageOrderValue)}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Pending Orders</div>
                    <div className="merchant-details-term-value" style={{ color: stats.pendingTransactions > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {stats.pendingTransactions}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Pending Amount</div>
                    <div className="merchant-details-term-value" style={{ color: stats.pendingAmount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                        {formatCurrency(stats.pendingAmount)}
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div style={{
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <label style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    Filter by Status:
                </label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)'
                    }}
                >
                    <option value="all">All Transactions ({stats.totalTransactions})</option>
                    <option value="completed">Completed ({stats.completedTransactions})</option>
                    <option value="pending">Pending ({stats.pendingTransactions})</option>
                    <option value="cancelled">Cancelled ({transactions.filter(t => t.status === 'cancelled').length})</option>
                </select>
            </div>

            {/* Transactions Table */}
            {filteredTransactions.length > 0 ? (
                <div className="merchant-details-transactions-table-container">
                    <table className="merchant-details-transactions-table">
                        <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Order Number</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Items</th>
                            <th>Quantity</th>
                            <th>Payment Method</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                                <td style={{ fontWeight: '600' }}>{transaction.id}</td>
                                <td>{transaction.orderNumber}</td>
                                <td className="merchant-details-date-value">{formatDate(transaction.date)}</td>
                                <td className="merchant-details-currency-value">{formatCurrency(transaction.amount)}</td>
                                <td>{transaction.items}</td>
                                <td>{transaction.quantity}</td>
                                <td>{transaction.paymentMethod}</td>
                                <td>
                                    <span className={`merchant-details-status-badge ${getStatusBadgeClass(transaction.status)}`}>
                                        {transaction.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="merchant-details-empty-state">
                    <div className="merchant-details-empty-icon">📋</div>
                    <h4>No transactions found</h4>
                    <p>No transactions match the selected filter criteria.</p>
                </div>
            )}

            {/* Additional Transaction Details */}
            <div className="merchant-details-info-grid" style={{ marginTop: '3rem' }}>
                <div className="merchant-details-info-group">
                    <h4>Payment Information</h4>
                    <div className="merchant-details-info-item">
                        <label>Preferred Payment Method</label>
                        <p className="merchant-details-highlight-value">
                            {merchant.preferredPaymentMethod || 'Bank Transfer'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Payment Processing Time</label>
                        <p className="merchant-details-date-value">
                            {merchant.preferredPaymentMethod === 'Credit Card' ? '1-2 days' :
                                merchant.preferredPaymentMethod === 'Bank Transfer' ? '3-5 days' : '2-3 days'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Outstanding Balance</label>
                        <p className="merchant-details-currency-value">
                            {formatCurrency(stats.pendingAmount)}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Credit Utilization</label>
                        <p>{stats.pendingAmount > 10000 ? 'High' : stats.pendingAmount > 5000 ? 'Medium' : 'Low'}</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Transaction Analytics</h4>
                    <div className="merchant-details-info-item">
                        <label>Success Rate</label>
                        <p className="merchant-details-status-indicator" style={{
                            color: stats.completedTransactions / stats.totalTransactions > 0.9 ? 'var(--color-success)' : 'var(--color-warning)'
                        }}>
                            {Math.round((stats.completedTransactions / stats.totalTransactions) * 100)}%
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Monthly Average</label>
                        <p className="merchant-details-currency-value">
                            {formatCurrency(stats.totalAmount / 6)} {/* Assuming 6 months of data */}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Largest Transaction</label>
                        <p className="merchant-details-currency-value">
                            {transactions.length > 0 ? formatCurrency(Math.max(...transactions.map(t => t.amount))) : '$0.00'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Transaction Frequency</label>
                        <p>{stats.totalTransactions > 20 ? 'High' : stats.totalTransactions > 10 ? 'Medium' : 'Low'}</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Recent Activity</h4>
                    <div className="merchant-details-info-item">
                        <label>Last Transaction Date</label>
                        <p className="merchant-details-date-value">
                            {transactions.length > 0 ? formatDate(transactions[0].date) : 'No transactions'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Days Since Last Order</label>
                        <p>
                            {transactions.length > 0 ?
                                Math.floor((new Date() - new Date(transactions[0].date)) / (1000 * 60 * 60 * 24)) + ' days' :
                                'N/A'
                            }
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Average Delivery Time</label>
                        <p className="merchant-details-date-value">
                            {merchant.averageDeliveryTime ? `${merchant.averageDeliveryTime} days` : 'Not tracked'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Order Trend</label>
                        <p className="merchant-details-status-indicator">
                            {stats.totalTransactions > 15 ? 'Increasing' : stats.totalTransactions > 8 ? 'Stable' : 'Decreasing'}
                        </p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Performance Metrics</h4>
                    <div className="merchant-details-info-item">
                        <label>Reliability Score</label>
                        <p className={`merchant-details-reliability-score ${merchant.reliabilityScore < 3 ? 'merchant-details-low-score' : ''}`}>
                            {merchant.reliabilityScore ? `${merchant.reliabilityScore}/5.0` : 'Not rated'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>On-Time Delivery Rate</label>
                        <p className="merchant-details-status-indicator">
                            {merchant.reliabilityScore ? `${Math.round(merchant.reliabilityScore * 20)}%` : 'Not tracked'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Quality Rating</label>
                        <p className="merchant-details-status-indicator">
                            {merchant.reliabilityScore >= 4.5 ? 'Excellent' :
                                merchant.reliabilityScore >= 3.5 ? 'Good' :
                                    merchant.reliabilityScore >= 2.5 ? 'Fair' : 'Needs Improvement'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Business Relationship</label>
                        <p>{stats.totalTransactions > 20 ? 'Long-term Partner' : stats.totalTransactions > 10 ? 'Regular Supplier' : 'New Vendor'}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Transaction Actions</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="merchant-details-create-order-btn">
                        Create New Order
                    </button>
                    <button className="merchant-details-view-details-btn">
                        Export Transactions
                    </button>
                    <button className="merchant-details-edit-merchant-btn">
                        Payment Reminder
                    </button>
                    {stats.pendingTransactions > 0 && (
                        <button className="merchant-details-edit-merchant-btn" style={{ backgroundColor: 'var(--color-warning)' }}>
                            Review Pending Orders ({stats.pendingTransactions})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionsTab;