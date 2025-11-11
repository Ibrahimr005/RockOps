import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { purchaseOrderService } from '../../../../../services/procurement/purchaseOrderService';
import './IssuesTab.scss';

const IssuesTab = ({ purchaseOrder, issues, onRefresh, onResolveSuccess, onError }) => {
    const [resolutions, setResolutions] = useState({});
    const [expandedIssueId, setExpandedIssueId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter unresolved issues
    const unresolvedIssues = issues.filter(issue => issue.issueStatus === 'REPORTED');

    useEffect(() => {
        const initialResolutions = {};
        unresolvedIssues.forEach(issue => {
            initialResolutions[issue.id] = {
                issueId: issue.id,
                resolutionType: '',
                resolutionNotes: ''
            };
        });
        setResolutions(initialResolutions);

        // Start all collapsed
        setExpandedIssueId(null);
    }, [issues]);

    const toggleIssue = (issueId) => {
        setExpandedIssueId(expandedIssueId === issueId ? null : issueId);
    };

    const handleResolutionTypeChange = (issueId, resolutionType) => {
        setResolutions(prev => ({
            ...prev,
            [issueId]: {
                ...prev[issueId],
                resolutionType: resolutionType
            }
        }));
    };

    const handleResolutionNotesChange = (issueId, notes) => {
        setResolutions(prev => ({
            ...prev,
            [issueId]: {
                ...prev[issueId],
                resolutionNotes: notes
            }
        }));
    };

    const getResolvedCount = () => {
        return Object.values(resolutions).filter(r => r.resolutionType && r.resolutionNotes.trim()).length;
    };

    const canSubmit = () => {
        const resolvedCount = getResolvedCount();
        if (resolvedCount === 0) return false;

        const startedResolutions = Object.values(resolutions).filter(r =>
            r.resolutionType || r.resolutionNotes.trim()
        );

        return startedResolutions.every(r => r.resolutionType && r.resolutionNotes.trim());
    };

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        setIsSubmitting(true);
        try {
            const resolutionsArray = Object.values(resolutions)
                .filter(resolution => resolution.resolutionType && resolution.resolutionNotes.trim())
                .map(resolution => ({
                    issueId: resolution.issueId,
                    resolutionType: resolution.resolutionType,
                    resolutionNotes: resolution.resolutionNotes
                }));

            await purchaseOrderService.resolveIssues(purchaseOrder.id, resolutionsArray);

            const resolvedCount = resolutionsArray.length;
            const remainingCount = unresolvedIssues.length - resolvedCount;

            if (onResolveSuccess) {
                onResolveSuccess(resolvedCount, remainingCount);
            }

            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            console.error('Error resolving issues:', err);
            if (onError) {
                onError('Failed to resolve issues. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIssueTypeDisplay = (issueType) => {
        const typeMap = {
            'DAMAGED': { label: 'Damaged', color: '#f59e0b' },
            'NOT_ARRIVED': { label: 'Never Arrived', color: '#ef4444' },
            'WRONG_ITEM': { label: 'Wrong Item', color: '#8b5cf6' },
            'WRONG_QUANTITY': { label: 'Wrong Quantity', color: '#3b82f6' },
            'QUALITY_ISSUE': { label: 'Quality Issue', color: '#f59e0b' },
            'OTHER': { label: 'Other Issue', color: '#6b7280' }
        };
        return typeMap[issueType] || { label: issueType, color: '#6b7280' };
    };

    const getResolutionTypeOptions = () => [
        { value: 'REDELIVERY', label: 'Redelivery - Merchant will resend items' },
        { value: 'REFUND', label: 'Refund - Return money to customer' },
        { value: 'ACCEPT_SHORTAGE', label: 'Accept Shortage - Close with reduced quantity' }
    ];

    const getMerchantInfo = (issue) => {
        if (issue.merchantId) {
            return {
                id: issue.merchantId,
                name: issue.merchantName,
                phoneNumber: issue.merchantContactPhone,
                alternativePhoneNumber: issue.merchantContactSecondPhone,
                email: issue.merchantContactEmail,
                address: issue.merchantAddress
            };
        }
        return null;
    };

    if (unresolvedIssues.length === 0) {
        return (
            <div className="issues-tab">
                <div className="no-issues-container">
                    <FiCheckCircle size={48} />
                    <h3>No Unresolved Issues</h3>
                    <p>All issues for this purchase order have been resolved.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="issues-tab">
            <div className="issues-instructions">
                <FiAlertCircle />
                <p>Click on each issue to expand and provide resolution details. You can resolve issues individually or all at once.</p>
            </div>

            <div className="issues-list">
                {unresolvedIssues.map((issue, index) => {
                    const typeDisplay = getIssueTypeDisplay(issue.issueType);
                    const resolution = resolutions[issue.id] || {};
                    const unit = issue.measuringUnit || 'units';
                    const merchant = getMerchantInfo(issue);
                    const isResolved = resolution.resolutionType && resolution.resolutionNotes.trim();
                    const isExpanded = expandedIssueId === issue.id;

                    return (
                        <div key={issue.id} className={`issue-card accordion ${isResolved ? 'resolved' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
                            <div className="accordion-header" onClick={() => toggleIssue(issue.id)}>
                                <div className="accordion-header-left">
                                    <span className="issue-number">#{index + 1}</span>
                                    {isResolved && <FiCheckCircle className="resolved-icon" />}
                                    <div className="issue-main-info">
                                        <span className="issue-item-name">{issue.itemTypeName || 'Unknown Item'}</span>
                                        <span
                                            className="issue-type-badge"
                                            style={{
                                                backgroundColor: `${typeDisplay.color}15`,
                                                color: typeDisplay.color,
                                                borderColor: `${typeDisplay.color}40`
                                            }}
                                        >
                        {typeDisplay.label}
                    </span>
                                    </div>
                                    <span className="issue-quantity">{issue.affectedQuantity} {unit}</span>
                                </div>

                                <div className="accordion-header-right">
                                    {isResolved && <span className="resolved-label">Resolved</span>}
                                    <button className="accordion-toggle" type="button">
                                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="accordion-content">
                                    <div className="issue-card-body">
                                        {merchant && (
                                            <div className="merchant-section-wrapper">
                                                <div className="info-section merchant-section">
                                                    <h4 className="section-title">Merchant</h4>

                                                    <div className="merchant-name">{merchant.name}</div>

                                                    <div className="contact-list">
                                                        {merchant.phoneNumber && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Phone</span>
                                                                <a href={`tel:${merchant.phoneNumber}`} className="contact-value">
                                                                    {merchant.phoneNumber}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {merchant.alternativePhoneNumber && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Alt Phone</span>
                                                                <a href={`tel:${merchant.alternativePhoneNumber}`} className="contact-value">
                                                                    {merchant.alternativePhoneNumber}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {merchant.email && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Email</span>
                                                                <a href={`mailto:${merchant.email}`} className="contact-value">
                                                                    {merchant.email}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {merchant.address && (
                                                            <div className="contact-row full">
                                                                <span className="contact-label">Address</span>
                                                                <span className="contact-value">{merchant.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="details-resolution-row">
                                            <div className="issue-details-column">
                                                <div className="info-section">
                                                    <h4 className="section-title">Issue Details</h4>

                                                    <div className="detail-list">
                                                        <div className="detail-row">
                                                            <span className="detail-label">Item</span>
                                                            <span className="detail-value">{issue.itemTypeName || 'Unknown'}</span>
                                                        </div>

                                                        <div className="detail-row">
                                                            <span className="detail-label">Issue Type</span>
                                                            <span
                                                                className="detail-value issue-type-text"
                                                                style={{ color: typeDisplay.color }}
                                                            >
                                            {typeDisplay.label}
                                        </span>
                                                        </div>

                                                        <div className="detail-row">
                                                            <span className="detail-label">Quantity</span>
                                                            <span className="detail-value">{issue.affectedQuantity} {unit}</span>
                                                        </div>

                                                        {issue.issueDescription && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Description</span>
                                                                <span className="detail-value">"{issue.issueDescription}"</span>
                                                            </div>
                                                        )}

                                                        <div className="detail-row">
                                                            <span className="detail-label">Reported By</span>
                                                            <span className="detail-value">{issue.reportedBy}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="resolution-column">
                                                <div className="info-section">
                                                    <h4 className="section-title">Resolution</h4>

                                                    <div className="form-group">
                                                        <label className="form-label">
                                                            Resolution Type <span className="required">*</span>
                                                        </label>
                                                        <select
                                                            className={`form-select ${!resolution.resolutionType ? 'empty' : ''}`}
                                                            value={resolution.resolutionType || ''}
                                                            onChange={(e) => handleResolutionTypeChange(issue.id, e.target.value)}
                                                            disabled={isSubmitting}
                                                        >
                                                            <option value="">Select type...</option>
                                                            {getResolutionTypeOptions().map(option => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="form-group">
                                                        <label className="form-label">
                                                            Resolution Notes <span className="required">*</span>
                                                        </label>
                                                        <textarea
                                                            className="form-textarea"
                                                            placeholder="Provide detailed resolution information..."
                                                            value={resolution.resolutionNotes || ''}
                                                            onChange={(e) => handleResolutionNotesChange(issue.id, e.target.value)}
                                                            rows={4}
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>

                                                    {resolution.resolutionType && (
                                                        <div className={`resolution-hint ${resolution.resolutionType.toLowerCase()}`}>
                                                            <FiAlertCircle />
                                                            <span>
                                            {resolution.resolutionType === 'REDELIVERY' &&
                                                'PO will return to Pending for warehouse to receive replacement items.'}
                                                                {resolution.resolutionType === 'REFUND' &&
                                                                    'Items will be marked as refunded and this part of the order closed.'}
                                                                {resolution.resolutionType === 'ACCEPT_SHORTAGE' &&
                                                                    'Reduced quantity will be accepted and this part closed.'}
                                        </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="issues-footer">
                <div className="footer-info">
                    {getResolvedCount() > 0 ? (
                        <span className="footer-status ready">
                            <FiCheckCircle />
                            Ready to resolve {getResolvedCount()} of {unresolvedIssues.length} issue{unresolvedIssues.length !== 1 ? 's' : ''}
                        </span>
                    ) : (
                        <span className="footer-status warning">
                            <FiAlertCircle />
                            {unresolvedIssues.length} unresolved issue{unresolvedIssues.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <button
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canSubmit()}
                >
                    {isSubmitting ? (
                        <>
                            <div className="spinner-small"></div>
                            Resolving...
                        </>
                    ) : (
                        <>
                            <FiCheckCircle />
                            Resolve Issues ({getResolvedCount()})
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default IssuesTab;