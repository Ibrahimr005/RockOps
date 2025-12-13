import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle, FiPackage, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import IntroCard from '../../../../components/common/IntroCard/IntroCard';
import { purchaseOrderService } from '../../../../services/procurement/purchaseOrderService';
import Snackbar from "../../../../components/common/Snackbar2/Snackbar2.jsx";
import './ResolveIssuesPage.scss';

const ResolveIssuesPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [issues, setIssues] = useState([]);
    const [resolutions, setResolutions] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Accordion state - track which issue is expanded
    const [expandedIssueId, setExpandedIssueId] = useState(null);

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const po = await purchaseOrderService.getById(id);
            setPurchaseOrder(po);

            const data = await purchaseOrderService.getIssues(id);
            const unresolvedIssues = (data.issues || []).filter(
                issue => issue.issueStatus === 'REPORTED'
            );

            setIssues(unresolvedIssues);

            const initialResolutions = {};
            unresolvedIssues.forEach(issue => {
                initialResolutions[issue.id] = {
                    issueId: issue.id,
                    resolutionType: '',
                    resolutionNotes: ''
                };
            });
            setResolutions(initialResolutions);

            // Auto-expand first issue
            if (unresolvedIssues.length > 0) {
                setExpandedIssueId(unresolvedIssues[0].id);
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load purchase order issues. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
    const validateResolutions = () => {
        // Get only the issues that have been started (either type or notes filled)
        const startedResolutions = Object.entries(resolutions).filter(([issueId, resolution]) =>
            resolution.resolutionType || resolution.resolutionNotes.trim()
        );

        // If no issues have been started
        if (startedResolutions.length === 0) {
            return {
                isValid: false,
                message: 'Please resolve at least one issue before submitting.'
            };
        }

        // Validate that started resolutions are complete
        for (const [issueId, resolution] of startedResolutions) {
            if (!resolution.resolutionType) {
                return {
                    isValid: false,
                    message: 'Please select a resolution type for all started resolutions.'
                };
            }
            if (!resolution.resolutionNotes.trim()) {
                return {
                    isValid: false,
                    message: 'Please provide resolution notes for all started resolutions.'
                };
            }
        }

        return {
            isValid: true,
            resolvedCount: startedResolutions.length
        };
    };


    const handleSubmit = async () => {
        const validation = validateResolutions();
        if (!validation.isValid) {
            setNotificationMessage(validation.message);
            setNotificationType('error');
            setShowNotification(true);
            return;
        }

        setIsSubmitting(true);

        try {
            // Only send resolutions that are complete (have both type and notes)
            const resolutionsArray = Object.values(resolutions)
                .filter(resolution => resolution.resolutionType && resolution.resolutionNotes.trim())
                .map(resolution => ({
                    issueId: resolution.issueId,
                    resolutionType: resolution.resolutionType,
                    resolutionNotes: resolution.resolutionNotes
                }));

            console.log('Submitting resolutions:', resolutionsArray);

            // Call the API
            const response = await purchaseOrderService.resolveIssues(id, resolutionsArray);

            const resolvedCount = resolutionsArray.length;
            const remainingCount = issues.length - resolvedCount;

            if (remainingCount > 0) {
                setNotificationMessage(`Successfully resolved ${resolvedCount} issue${resolvedCount !== 1 ? 's' : ''}. ${remainingCount} issue${remainingCount !== 1 ? 's' : ''} remaining.`);
            } else {
                setNotificationMessage(`Successfully resolved all ${resolvedCount} issue${resolvedCount !== 1 ? 's' : ''}`);
            }
            setNotificationType('success');
            setShowNotification(true);

            // If there are remaining issues, refresh the page to show them
            if (remainingCount > 0) {
                setTimeout(() => {
                    fetchData(); // Refresh to show remaining issues
                }, 1500);
            } else {
                // All issues resolved, go back to disputed orders
                setTimeout(() => {
                    navigate('/procurement/disputed-purchase-orders');
                }, 1500);
            }

        } catch (err) {
            console.error('Error submitting resolutions:', err);
            setNotificationMessage(err.message || 'Failed to resolve issues. Please try again.');
            setNotificationType('error');
            setShowNotification(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewMerchant = (merchantId) => {
        navigate(`/merchants/${merchantId}`);
    };

    const handleCallMerchant = (phoneNumber) => {
        window.location.href = `tel:${phoneNumber}`;
    };

    const handleEmailMerchant = (email) => {
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

    const getResolvedCount = () => {
        return Object.values(resolutions).filter(r => r.resolutionType && r.resolutionNotes.trim()).length;
    };

    if (isLoading) {
        return (
            <div className="resolve-issues-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading issues...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="resolve-issues-page">
                <div className="error-container">
                    <FiAlertCircle size={48} />
                    <h3>Error Loading Issues</h3>
                    <p>{error}</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!purchaseOrder || issues.length === 0) {
        return (
            <div className="resolve-issues-page">
                <div className="no-issues-container">
                    <FiCheckCircle size={48} />
                    <h3>No Unresolved Issues</h3>
                    <p>All issues have been resolved.</p>
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const breadcrumbs = [
        { label: 'Procurement', onClick: () => navigate('/procurement') },
        { label: 'Disputed Orders', onClick: () => navigate('/procurement/disputed-purchase-orders') },
        { label: 'Resolve Issues' }
    ];

    return (
        <div className="resolve-issues-page">
            {/* IntroCard Header */}
            <IntroCard
                title={`PO #${purchaseOrder.poNumber}`}
                label="RESOLVE ISSUES"
                breadcrumbs={breadcrumbs}
                icon={<FiPackage />}
                stats={[
                    { value: issues.length, label: 'Issues' },
                    { value: getResolvedCount(), label: 'Resolved' }
                ]}
            />

            {/* Instruction Banner */}
            <div className="instruction-banner">
                <FiAlertCircle />
                <p>Click on each issue to expand and provide resolution details. You can resolve issues individually or all at once.</p>
            </div>
            {/* Issues List - Accordion Style */}
            <div className="issues-container">
                {issues.map((issue, index) => {
                    const typeDisplay = getIssueTypeDisplay(issue.issueType);
                    const resolution = resolutions[issue.id] || {};
                    const unit = issue.measuringUnit || 'units';
                    const merchant = getMerchantInfo(issue);
                    const isResolved = resolution.resolutionType && resolution.resolutionNotes.trim();
                    const isExpanded = expandedIssueId === issue.id;

                    return (
                        <div className={`issue-card accordion ${isResolved ? 'resolved' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
                            {/* Issue Type Badge - Top Right Corner */}
                            <div
                                className="issue-type-badge-corner"
                                style={{
                                    backgroundColor: `${typeDisplay.color}20`,
                                    color: typeDisplay.color,
                                    borderColor: `${typeDisplay.color}60`
                                }}
                            >
                                <span className="badge-icon">{typeDisplay.icon}</span>
                                <span>{typeDisplay.label}</span>
                            </div>

                            {/* Accordion Header - Always Visible */}
                            <div className="accordion-header" onClick={() => toggleIssue(issue.id)}>
                                <div className="accordion-header-left">
                                    <span className="issue-number">#{index + 1}</span>
                                    {isResolved && <FiCheckCircle className="resolved-icon" />}
                                    <span className="issue-item-name">{issue.itemTypeName || 'Unknown Item'}</span>
                                    <span className="issue-quantity">
                {issue.affectedQuantity} {unit}
            </span>
                                </div>

                                <div className="accordion-header-right">
                                    {isResolved && (
                                        <span className="resolved-label">Resolved</span>
                                    )}
                                    <button className="accordion-toggle" type="button">
                                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                    </button>
                                </div>
                            </div>

                            {/* Accordion Content - Expandable */}
                            {isExpanded && (
                                <div className="accordion-content">
                                    <div className="issue-card-body">
                                        {/* Full-Width Merchant Section */}
                                        {merchant && (
                                            <div className="merchant-section-wrapper">
                                                <div className="info-section merchant-section">
                                                    <h4 className="section-title">Merchant</h4>

                                                    <div className="merchant-name">
                                                        {merchant.name}
                                                        {merchant.id && (
                                                            <button
                                                                className="btn-link"
                                                                onClick={() => handleViewMerchant(merchant.id)}
                                                            >
                                                                View Profile
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="contact-list">
                                                        {merchant.phoneNumber && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Phone</span>
                                                                <a href={`tel:${merchant.phoneNumber}`} className="contact-value">
                                                                    {merchant.phoneNumber}
                                                                </a>
                                                                <button
                                                                    className="btn-action"
                                                                    onClick={() => handleCallMerchant(merchant.phoneNumber)}
                                                                >
                                                                    Call
                                                                </button>
                                                            </div>
                                                        )}

                                                        {merchant.alternativePhoneNumber && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Alt Phone</span>
                                                                <a href={`tel:${merchant.alternativePhoneNumber}`} className="contact-value">
                                                                    {merchant.alternativePhoneNumber}
                                                                </a>
                                                                <button
                                                                    className="btn-action"
                                                                    onClick={() => handleCallMerchant(merchant.alternativePhoneNumber)}
                                                                >
                                                                    Call
                                                                </button>
                                                            </div>
                                                        )}

                                                        {merchant.email && (
                                                            <div className="contact-row">
                                                                <span className="contact-label">Email</span>
                                                                <a href={`mailto:${merchant.email}`} className="contact-value">
                                                                    {merchant.email}
                                                                </a>
                                                                <button
                                                                    className="btn-action"
                                                                    onClick={() => handleEmailMerchant(merchant.email)}
                                                                >
                                                                    Email
                                                                </button>
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

                                        {/* Issue Details + Resolution Row */}
                                        <div className="details-resolution-row">
                                            {/* Issue Details Column */}
                                            <div className="issue-details-column">
                                                <div className="info-section">
                                                    <h4 className="section-title">Issue Details</h4>

                                                    <div className="detail-list">
                                                        <div className="detail-row">
                                                            <span className="detail-label">Item</span>
                                                            <span className="detail-value">{issue.itemTypeName || 'Unknown'}</span>
                                                        </div>

                                                        <div className="detail-row">
                                                            <span className="detail-label">Quantity</span>
                                                            <span className="detail-value quantity">{issue.affectedQuantity} {unit}</span>
                                                        </div>

                                                        {issue.issueDescription && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Description</span>
                                                                <span className="detail-value description">"{issue.issueDescription}"</span>
                                                            </div>
                                                        )}

                                                        <div className="detail-row">
                                                            <span className="detail-label">Reported By</span>
                                                            <span className="detail-value">{issue.reportedBy}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Resolution Column */}
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
                                                                {resolution.resolutionType === 'REPLACEMENT_PO' &&
                                                                    'A new purchase order will be created for replacement items.'}
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

            {/* Fixed Bottom Bar */}
            <div className="bottom-action-bar">
                <div className="action-bar-content">
                    <div className="action-info">
                        <FiAlertCircle />
                        <span>
            {getResolvedCount() > 0
                ? `Ready to resolve ${getResolvedCount()} of ${issues.length} issue${issues.length !== 1 ? 's' : ''}`
                : `${issues.length} unresolved issue${issues.length !== 1 ? 's' : ''} for PO #{purchaseOrder.poNumber}`
            }
        </span>
                    </div>

                    <div className="action-buttons">
                        <button
                            className="btn-secondary"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || getResolvedCount() === 0}
                        >
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || getResolvedCount() !== issues.length}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="spinner-small"></div>
                                    Resolving...
                                </>
                            ) : (
                                <>
                                    <FiCheckCircle />
                                    Resolve All Issues
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default ResolveIssuesPage;