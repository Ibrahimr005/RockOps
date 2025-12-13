import React, { useState, useEffect } from 'react';
import { merchantService } from '../../../../../services/merchant/merchantService';
import './PerformanceTab.scss';

const PerformanceTab = ({ merchant }) => {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPerformance();
    }, [merchant.id]);

    const fetchPerformance = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await merchantService.getPerformance(merchant.id);
            setPerformance(data || null);
        } catch (err) {
            console.error('Error fetching performance:', err);
            setError('Failed to load performance data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'IMPROVING':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                    </svg>
                );
            case 'DECLINING':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                        <polyline points="17 18 23 18 23 12"/>
                    </svg>
                );
            case 'STABLE':
            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                );
        }
    };

    if (loading) {
        return (
            <div className="performance-tab">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="performance-tab">
                <div className="error-container">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h4>Error Loading Performance Data</h4>
                    <p>{error}</p>
                    <button className="retry-button" onClick={fetchPerformance}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!performance || performance.totalOrders === 0) {
        return (
            <div className="performance-tab">
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    <h4>No Performance Data Available</h4>
                    <p>This merchant has no delivery history yet.</p>
                </div>
            </div>
        );
    }

    const performanceRating = performance.performanceRating?.toLowerCase() || 'new';

    return (
        <div className="performance-tab">
            {/* Section 1: Performance Overview */}
            {/* Section 1: Performance Overview */}
            <div className="overview-section">
                <div className="section-header-performance">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Performance Overview
                    </h3>
                </div>

                <div className="overview-grid">
                    {/* Performance Score Badge */}
                    <div className={`score-card performance-${performanceRating}`}>
                        <div className="score-circle">
                            <svg viewBox="0 0 100 100">
                                <circle className="score-bg" cx="50" cy="50" r="45"/>
                                <circle
                                    className="score-progress"
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 45}`,
                                        strokeDashoffset: `${2 * Math.PI * 45 * (1 - performance.overallScore / 100)}`
                                    }}
                                />
                            </svg>
                            <div className="score-text">
                                <span className="score-number">{performance.overallScore}</span>
                                <span className="score-total">/100</span>
                            </div>
                        </div>
                        <div className="score-label">{performance.performanceRating}</div>
                        <div className="score-subtitle">Overall Performance</div>
                    </div>

                    {/* Summary Stats */}
                    <div className="summary-stats">
                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Total Orders</div>
                                <div className="summary-value">{performance.totalOrders}</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Total Items</div>
                                <div className="summary-value">{performance.totalItemsDelivered.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Active Since</div>
                                <div className="summary-value-small">{formatDate(performance.firstOrderDate)}</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className={`summary-icon status-${performance.merchantStatus.toLowerCase()}`}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 6v6l4 2"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Status</div>
                                <div className={`summary-badge status-${performance.merchantStatus.toLowerCase()}`}>
                                    {performance.merchantStatus}
                                </div>
                                <div className="summary-detail">
                                    {performance.daysSinceLastOrder} days since last order
                                </div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Order Frequency</div>
                                <div className="summary-value">{performance.monthlyOrderFrequency}</div>
                                <div className="summary-detail">orders per month</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Good Streak</div>
                                <div className="summary-value">{performance.consecutiveGoodDeliveries}</div>
                                <div className="summary-detail">consecutive deliveries</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="16" x2="12" y2="12"/>
                                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Pending Issues</div>
                                <div className="summary-value">{performance.issuesPending}</div>
                                <div className="summary-detail">awaiting resolution</div>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                </svg>
                            </div>
                            <div className="summary-content">
                                <div className="summary-label">Recent Activity</div>
                                <div className="summary-value">{performance.recentActivity30Days}</div>
                                <div className="summary-detail">last 30 days</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quality Metrics */}
            <div className="metrics-section">
                <div className="section-header">
                    <h3>Quality & Reliability</h3>
                    <div className={`trend-badge trend-${performance.performanceTrend.toLowerCase()}`}>
                        {getTrendIcon(performance.performanceTrend)}
                        <span>{performance.performanceTrend}</span>
                    </div>
                </div>

                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">First-Time Success</div>
                            <div className="metric-value">{performance.firstTimeSuccessRate}%</div>
                            <div className="metric-detail">No redelivery needed</div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill" style={{ width: `${performance.firstTimeSuccessRate}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="2" x2="12" y2="22"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Quantity Accuracy</div>
                            <div className="metric-value">{performance.quantityAccuracy}%</div>
                            <div className="metric-detail">Correct quantities</div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill" style={{ width: `${performance.quantityAccuracy}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Order Consistency</div>
                            <div className="metric-value">{performance.orderFulfillmentConsistency}%</div>
                            <div className="metric-detail">Delivery regularity</div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill" style={{ width: `${performance.orderFulfillmentConsistency}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="16 12 12 8 8 12"/>
                                <line x1="12" y1="16" x2="12" y2="8"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Issue Resolution</div>
                            <div className="metric-value">{performance.resolutionRate}%</div>
                            <div className="metric-detail">{performance.issuesResolved}/{performance.totalIssuesReported} resolved</div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill" style={{ width: `${performance.resolutionRate}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Most Ordered Item</div>
                            <div className="metric-value-text">{performance.mostOrderedItem}</div>
                            <div className="metric-detail">{performance.mostOrderedItemQuantity} units total</div>
                        </div>
                    </div>

                    <div className="metric-card highlight">
                        <div className="metric-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div className="metric-content">
                            <div className="metric-label">Most Common Issue</div>
                            <div className="metric-value-text">{performance.mostCommonIssueType.replace(/_/g, ' ')}</div>
                            <div className="metric-detail">{performance.totalIssuesReported} total issues</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operational Metrics */}
            <div className="metrics-section">
                <div className="section-header">
                    <h3>Delivery & Operations</h3>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="2" x2="12" y2="22"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Avg Items Per Delivery</div>
                            <div className="stat-value">{performance.avgItemsPerDelivery}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Avg Issues Per Order</div>
                            <div className="stat-value">{performance.avgIssuesPerOrder}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Recent Activity (30d)</div>
                            <div className="stat-value">{performance.recentActivity30Days}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Good Deliveries</div>
                            <div className="stat-value">{performance.goodDeliveries}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">With Issues</div>
                            <div className="stat-value">{performance.deliveriesWithIssues}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                <polyline points="17 6 23 6 23 12"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Redeliveries</div>
                            <div className="stat-value">{performance.redeliveries}</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Last Order</div>
                            <div className="stat-value-small">{formatDate(performance.lastOrderDate)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceTab;