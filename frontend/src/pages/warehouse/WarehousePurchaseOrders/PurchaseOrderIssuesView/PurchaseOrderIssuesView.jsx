import React from 'react';
import './PurchaseOrderIssuesView.scss';

const PurchaseOrderIssuesView = ({ purchaseOrder, issues }) => {
    if (!issues || issues.length === 0) {
        return (
            <div className="issues-view-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
                <p>No issues reported for this purchase order</p>
            </div>
        );
    }

    // Group issues by status
    const reportedIssues = issues.filter(issue => issue.issueStatus === 'REPORTED');
    const resolvedIssues = issues.filter(issue => issue.issueStatus === 'RESOLVED');

    // Get issue type icon and label
    const getIssueTypeDisplay = (issueType) => {
        switch (issueType) {
            case 'DAMAGED':
                return {
                    icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    ),
                    label: 'Damaged',
                    className: 'damaged'
                };
            case 'NEVER_ARRIVED':
                return {
                    icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    ),
                    label: 'Never Arrived',
                    className: 'never-arrived'
                };
            case 'WRONG_ITEM':
                return {
                    icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                    ),
                    label: 'Wrong Item',
                    className: 'wrong-item'
                };
            case 'OTHER':
                return {
                    icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    ),
                    label: 'Other Issue',
                    className: 'other'
                };
            default:
                return {
                    icon: null,
                    label: issueType,
                    className: ''
                };
        }
    };

    // Get resolution type display
    const getResolutionTypeDisplay = (resolutionType) => {
        switch (resolutionType) {
            case 'REDELIVERY':
                return 'Redelivery Scheduled';
            case 'REFUND':
                return 'Refund Issued';
            case 'REPLACEMENT_PO':
                return 'Replacement PO Created';
            case 'ACCEPT_SHORTAGE':
                return 'Shortage Accepted';
            default:
                return resolutionType;
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
// Get item name - NOW SIMPLER!
    const getItemName = (issue) => {
        return issue.itemTypeName || 'Unknown Item';
    };

// Get measuring unit - NOW SIMPLER!
    const getUnit = (issue) => {
        return issue.measuringUnit || 'units';
    };

    return (
        <div className="issues-view-container">
            {/* Unresolved Issues Section */}
            {reportedIssues.length > 0 && (
                <div className="issues-section unresolved">
                    <div className="issues-section-header">
                        <div className="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <h3>Unresolved Issues</h3>
                            <span className="issue-count">{reportedIssues.length}</span>
                        </div>
                        <div className="section-status">
                            <span className="status-badge reported">
                                Awaiting Resolution
                            </span>
                        </div>
                    </div>

                    <div className="issues-list">
                        {reportedIssues.map((issue, index) => {
                            const typeDisplay = getIssueTypeDisplay(issue.issueType);
                            return (
                                <div key={issue.id || index} className="issue-card reported">
                                    <div className="issue-header">
                                        <div className={`issue-type ${typeDisplay.className}`}>
                                            {typeDisplay.icon}
                                            <span className="issue-type-label">{typeDisplay.label}</span>
                                        </div>
                                        <div className="issue-quantity">
                                            {issue.affectedQuantity} {getUnit(issue)}
                                        </div>
                                    </div>

                                    <div className="issue-item-info">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                        </svg>
                                        <span>{getItemName(issue)}</span>
                                    </div>

                                    {issue.issueDescription && (
                                        <div className="issue-description">
                                            <div className="description-label">Description:</div>
                                            <p>{issue.issueDescription}</p>
                                        </div>
                                    )}

                                    <div className="issue-metadata">
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                            <span>Reported by {issue.reportedBy}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                            <span>{formatDate(issue.reportedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Resolved Issues Section */}
            {resolvedIssues.length > 0 && (
                <div className="issues-section resolved">
                    <div className="issues-section-header">
                        <div className="section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <h3>Resolved Issues</h3>
                            <span className="issue-count">{resolvedIssues.length}</span>
                        </div>
                        <div className="section-status">
                            <span className="status-badge resolved">
                                Resolved by Procurement
                            </span>
                        </div>
                    </div>

                    <div className="issues-list">
                        {resolvedIssues.map((issue, index) => {
                            const typeDisplay = getIssueTypeDisplay(issue.issueType);
                            return (
                                <div key={issue.id || index} className="issue-card resolved">
                                    <div className="issue-header">
                                        <div className={`issue-type ${typeDisplay.className}`}>
                                            {typeDisplay.icon}
                                            <span className="issue-type-label">{typeDisplay.label}</span>
                                        </div>
                                        <div className="issue-quantity">
                                            {issue.affectedQuantity} {getUnit(issue)}
                                        </div>
                                    </div>

                                    <div className="issue-item-info">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                        </svg>
                                        <span>{getItemName(issue)}</span>
                                    </div>

                                    {issue.issueDescription && (
                                        <div className="issue-description">
                                            <div className="description-label">Original Issue:</div>
                                            <p>{issue.issueDescription}</p>
                                        </div>
                                    )}

                                    <div className="resolution-info">
                                        <div className="resolution-type">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                            <span>{getResolutionTypeDisplay(issue.resolutionType)}</span>
                                        </div>
                                        {issue.resolutionNotes && (
                                            <div className="resolution-notes">
                                                <div className="description-label">Resolution Notes:</div>
                                                <p>{issue.resolutionNotes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="issue-metadata">
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                            <span>Reported by {issue.reportedBy}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                            <span>Reported: {formatDate(issue.reportedAt)}</span>
                                        </div>
                                    </div>

                                    <div className="issue-metadata">
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                            <span>Resolved by {issue.resolvedBy}</span>
                                        </div>
                                        <div className="metadata-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                            <span>Resolved: {formatDate(issue.resolvedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderIssuesView;