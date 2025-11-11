import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import './ResolveIssueModal.scss';

const ResolveIssueModal = ({ purchaseOrder, isOpen, onClose, onSubmit }) => {
    const navigate = useNavigate();
    const [issues, setIssues] = useState([]);
    const [resolutions, setResolutions] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingIssues, setIsFetchingIssues] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && purchaseOrder) {
            fetchIssues();
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
            // Reset state when modal closes
            setIssues([]);
            setResolutions({});
            setError(null);
        }

        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen, purchaseOrder]);

    const fetchIssues = async () => {
        if (!purchaseOrder?.id) return;

        setIsFetchingIssues(true);
        setError(null);

        try {
            const data = await purchaseOrderService.getIssues(purchaseOrder.id);

            // Filter only unresolved issues
            const unresolvedIssues = (data.issues || []).filter(
                issue => issue.issueStatus === 'REPORTED'
            );

            console.log('Fetched unresolved issues:', unresolvedIssues);
            setIssues(unresolvedIssues);

            // Initialize resolutions object
            const initialResolutions = {};
            unresolvedIssues.forEach(issue => {
                initialResolutions[issue.id] = {
                    issueId: issue.id,
                    resolutionType: '',
                    resolutionNotes: ''
                };
            });
            setResolutions(initialResolutions);

        } catch (err) {
            console.error('Error fetching issues:', err);
            setError('Failed to load issues. Please try again.');
        } finally {
            setIsFetchingIssues(false);
        }
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

    const validateResolutions = () => {
        for (const issue of issues) {
            const resolution = resolutions[issue.id];
            if (!resolution.resolutionType) {
                return {
                    isValid: false,
                    message: 'Please select a resolution type for all issues.'
                };
            }
            if (!resolution.resolutionNotes.trim()) {
                return {
                    isValid: false,
                    message: 'Please provide resolution notes for all issues.'
                };
            }
        }
        return { isValid: true };
    };

    const handleSubmit = async () => {
        const validation = validateResolutions();
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const resolutionArray = Object.values(resolutions);
            console.log('Submitting resolutions:', resolutionArray);
            await onSubmit(resolutionArray);
            onClose();
        } catch (err) {
            console.error('Error submitting resolutions:', err);
            setError(err.message || 'Failed to resolve issues. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewMerchant = (merchantId, e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/merchants/${merchantId}`);
    };

    const handleCallMerchant = (phoneNumber, e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `tel:${phoneNumber}`;
    };

    const handleEmailMerchant = (email, e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `mailto:${email}`;
    };

    const getIssueTypeDisplay = (issueType) => {
        const typeMap = {
            'DAMAGED': { label: 'Damaged', icon: '⚠️', color: '#f59e0b' },
            'NEVER_ARRIVED': { label: 'Never Arrived', icon: '❌', color: '#ef4444' },
            'WRONG_ITEM': { label: 'Wrong Item', icon: '🔄', color: '#8b5cf6' },
            'OTHER': { label: 'Other Issue', icon: '❓', color: '#6b7280' }
        };
        return typeMap[issueType] || { label: issueType, icon: '•', color: '#6b7280' };
    };

    const getResolutionTypeOptions = () => [
        { value: 'REDELIVERY', label: 'Redelivery - Merchant will resend items' },
        { value: 'REFUND', label: 'Refund - Return money to customer' },
        { value: 'REPLACEMENT_PO', label: 'Replacement PO - Create new purchase order' },
        { value: 'ACCEPT_SHORTAGE', label: 'Accept Shortage - Close with reduced quantity' }
    ];

    const getMerchantInfo = (issue) => {
        // Map the DTO fields to the format expected by the component
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

    if (!isOpen || !purchaseOrder) return null;

    return (
        <div className="resolve-issue-modal-overlay" onClick={onClose}>
            <div className="resolve-issue-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="resolve-issue-modal-header">
                    <div className="header-content">
                        <div className="icon-wrapper">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="modal-title">Resolve Issues</h2>
                            <div className="modal-subtitle">
                                PO #{purchaseOrder.poNumber}
                            </div>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="resolve-issue-modal-content">
                    {/* Error Message */}
                    {error && (
                        <div className="error-banner">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loading State */}
                    {isFetchingIssues && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading issues...</p>
                        </div>
                    )}

                    {/* No Issues State */}
                    {!isFetchingIssues && issues.length === 0 && (
                        <div className="no-issues-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <h3>No Unresolved Issues</h3>
                            <p>All issues for this purchase order have been resolved.</p>
                        </div>
                    )}

                    {/* Issues List */}
                    {!isFetchingIssues && issues.length > 0 && (
                        <>
                            <div className="issues-instruction">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="16" x2="12" y2="12"/>
                                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                                </svg>
                                <p>
                                    Select a resolution type and provide notes for each issue below.
                                    You can contact merchants directly using the provided contact information.
                                </p>
                            </div>

                            <div className="issues-list">
                                {issues.map((issue, index) => {
                                    const typeDisplay = getIssueTypeDisplay(issue.issueType);
                                    const resolution = resolutions[issue.id] || {};
                                    const unit = issue.measuringUnit || 'units';
                                    const merchant = getMerchantInfo(issue);

                                    return (
                                        <div key={issue.id} className="issue-resolution-card">
                                            {/* Issue Header */}
                                            <div className="issue-header">
                                                <div className="issue-number">Issue #{index + 1}</div>
                                                <div
                                                    className="issue-type-badge"
                                                    style={{
                                                        backgroundColor: `${typeDisplay.color}20`,
                                                        color: typeDisplay.color,
                                                        borderColor: `${typeDisplay.color}40`
                                                    }}
                                                >
                                                    <span className="issue-icon">{typeDisplay.icon}</span>
                                                    <span className="issue-type-label">{typeDisplay.label}</span>
                                                </div>
                                            </div>

                                            {/* Merchant Information Section */}
                                            {merchant && (
                                                <div className="merchant-info-section">
                                                    <div className="merchant-header">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                                            <polyline points="9 22 9 12 15 12 15 22"/>
                                                        </svg>
                                                        <h4>Merchant Information</h4>
                                                    </div>

                                                    <div className="merchant-details">
                                                        <div className="merchant-name-row">
                                                            <span className="merchant-name">{merchant.name}</span>
                                                            {merchant.id && (
                                                                <button
                                                                    className="btn-view-merchant"
                                                                    onClick={(e) => handleViewMerchant(merchant.id, e)}
                                                                    title="View full merchant profile"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                                                        <polyline points="15 3 21 3 21 9"/>
                                                                        <line x1="10" y1="14" x2="21" y2="3"/>
                                                                    </svg>
                                                                    View Profile
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="merchant-contact-info">
                                                            {/* Phone Numbers */}
                                                            {merchant.phoneNumber && (
                                                                <div className="contact-item">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                                    </svg>
                                                                    <span className="contact-label">Phone:</span>
                                                                    <a
                                                                        href={`tel:${merchant.phoneNumber}`}
                                                                        className="contact-value clickable"
                                                                        onClick={(e) => handleCallMerchant(merchant.phoneNumber, e)}
                                                                    >
                                                                        {merchant.phoneNumber}
                                                                    </a>
                                                                    <button
                                                                        className="btn-contact-action"
                                                                        onClick={(e) => handleCallMerchant(merchant.phoneNumber, e)}
                                                                        title="Call merchant"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                                        </svg>
                                                                        Call
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Alternative Phone */}
                                                            {merchant.alternativePhoneNumber && (
                                                                <div className="contact-item">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                                    </svg>
                                                                    <span className="contact-label">Alt Phone:</span>
                                                                    <a
                                                                        href={`tel:${merchant.alternativePhoneNumber}`}
                                                                        className="contact-value clickable"
                                                                        onClick={(e) => handleCallMerchant(merchant.alternativePhoneNumber, e)}
                                                                    >
                                                                        {merchant.alternativePhoneNumber}
                                                                    </a>
                                                                    <button
                                                                        className="btn-contact-action"
                                                                        onClick={(e) => handleCallMerchant(merchant.alternativePhoneNumber, e)}
                                                                        title="Call merchant"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                                        </svg>
                                                                        Call
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Email */}
                                                            {merchant.email && (
                                                                <div className="contact-item">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                                        <polyline points="22,6 12,13 2,6"/>
                                                                    </svg>
                                                                    <span className="contact-label">Email:</span>
                                                                    <a
                                                                        href={`mailto:${merchant.email}`}
                                                                        className="contact-value clickable"
                                                                        onClick={(e) => handleEmailMerchant(merchant.email, e)}
                                                                    >
                                                                        {merchant.email}
                                                                    </a>
                                                                    <button
                                                                        className="btn-contact-action"
                                                                        onClick={(e) => handleEmailMerchant(merchant.email, e)}
                                                                        title="Email merchant"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                                            <polyline points="22,6 12,13 2,6"/>
                                                                        </svg>
                                                                        Email
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Address */}
                                                            {merchant.address && (
                                                                <div className="contact-item address">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                                                        <circle cx="12" cy="10" r="3"/>
                                                                    </svg>
                                                                    <span className="contact-label">Address:</span>
                                                                    <span className="contact-value">{merchant.address}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Issue Details */}
                                            <div className="issue-details">
                                                <div className="details-header">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"/>
                                                        <line x1="12" y1="16" x2="12" y2="12"/>
                                                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                                                    </svg>
                                                    <h4>Issue Details</h4>
                                                </div>

                                                <div className="detail-row">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                    </svg>
                                                    <span className="detail-label">Item:</span>
                                                    <span className="detail-value">{issue.itemTypeName || 'Unknown Item'}</span>
                                                </div>

                                                <div className="detail-row">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                        <line x1="9" y1="9" x2="15" y2="9"/>
                                                        <line x1="9" y1="15" x2="15" y2="15"/>
                                                    </svg>
                                                    <span className="detail-label">Quantity:</span>
                                                    <span className="detail-value quantity">
                                                        {issue.affectedQuantity} {unit}
                                                    </span>
                                                </div>

                                                {issue.issueDescription && (
                                                    <div className="detail-row description">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                        </svg>
                                                        <span className="detail-label">Description:</span>
                                                        <span className="detail-value">"{issue.issueDescription}"</span>
                                                    </div>
                                                )}

                                                <div className="detail-row">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                        <circle cx="12" cy="7" r="4"/>
                                                    </svg>
                                                    <span className="detail-label">Reported by:</span>
                                                    <span className="detail-value">{issue.reportedBy}</span>
                                                </div>
                                            </div>

                                            {/* Resolution Section */}
                                            <div className="resolution-section">
                                                <div className="resolution-divider"></div>

                                                {/* Resolution Type Dropdown */}
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                                        </svg>
                                                        Resolution Type <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        className={`form-select ${!resolution.resolutionType ? 'empty' : ''}`}
                                                        value={resolution.resolutionType || ''}
                                                        onChange={(e) => handleResolutionTypeChange(issue.id, e.target.value)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <option value="">Select resolution type...</option>
                                                        {getResolutionTypeOptions().map(option => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Resolution Notes */}
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                            <path d="M14 2v6h6"/>
                                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                                            <path d="M10 9H8"/>
                                                        </svg>
                                                        Resolution Notes <span className="required">*</span>
                                                    </label>
                                                    <textarea
                                                        className="form-textarea"
                                                        placeholder="Explain the resolution details (e.g., refund amount, expected redelivery date, merchant contact info...)"
                                                        value={resolution.resolutionNotes || ''}
                                                        onChange={(e) => handleResolutionNotesChange(issue.id, e.target.value)}
                                                        rows={3}
                                                        disabled={isSubmitting}
                                                    />
                                                    <div className="textarea-hint">
                                                        Provide detailed information about how this issue was resolved.
                                                    </div>
                                                </div>

                                                {/* Resolution Type Info */}
                                                {resolution.resolutionType && (
                                                    <div className={`resolution-info ${resolution.resolutionType.toLowerCase()}`}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="12" r="10"/>
                                                            <line x1="12" y1="16" x2="12" y2="12"/>
                                                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                                                        </svg>
                                                        <span>
                                                            {resolution.resolutionType === 'REDELIVERY' &&
                                                                'This PO will return to Pending for warehouse to receive replacement items.'}
                                                            {resolution.resolutionType === 'REFUND' &&
                                                                'This will mark the affected items as refunded and close this part of the order.'}
                                                            {resolution.resolutionType === 'REPLACEMENT_PO' &&
                                                                'A new purchase order will be created for the replacement items.'}
                                                            {resolution.resolutionType === 'ACCEPT_SHORTAGE' &&
                                                                'This will accept the reduced quantity and close this part of the order.'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isFetchingIssues && issues.length > 0 && (
                    <div className="resolve-issue-modal-footer">
                        <div className="footer-info">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            <span>
                                Resolving {issues.length} issue{issues.length !== 1 ? 's' : ''} for PO #{purchaseOrder.poNumber}
                            </span>
                        </div>
                        <div className="footer-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="spinner-small"></div>
                                        Resolving...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        Resolve All Issues
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResolveIssueModal;