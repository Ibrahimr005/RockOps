import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp, FiPackage, FiTruck, FiPhone, FiMail, FiMapPin, FiBox, FiClock, FiFilter } from 'react-icons/fi';
import { purchaseOrderService } from '../../../../../services/procurement/purchaseOrderService';
import './IssuesTab.scss';

const IssuesTab = ({ purchaseOrder, issues, onRefresh, onResolveSuccess, onError }) => {
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [resolutions, setResolutions] = useState({});
    const [expandedIssueId, setExpandedIssueId] = useState(null);
    const [expandedResolvedIssueId, setExpandedResolvedIssueId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showResolvedFilters, setShowResolvedFilters] = useState(false);
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        itemName: '',
        category: '',
        issueType: '',
        minQuantity: ''
    });
    const [resolvedFilters, setResolvedFilters] = useState({
        itemName: '',
        category: '',
        issueType: '',
        minQuantity: ''
    });

    // Filter unresolved issues
    const unresolvedIssues = useMemo(() =>
            issues.filter(issue => issue.issueStatus === 'REPORTED'),
        [issues]
    );

    // Filter resolved issues
    const resolvedIssues = useMemo(() =>
            issues.filter(issue => issue.issueStatus === 'RESOLVED'),
        [issues]
    );

    console.log('=== UNRESOLVED ISSUES ===', JSON.stringify(unresolvedIssues, null, 2));
    console.log('=== RESOLVED ISSUES ===', JSON.stringify(resolvedIssues, null, 2));

    // Group unresolved issues by merchant
    const issuesByMerchant = useMemo(() => {
        const grouped = {};
        unresolvedIssues.forEach(issue => {
            const merchantId = issue.merchantId || 'unknown';
            const merchantName = issue.merchantName || 'Unknown Merchant';

            if (!grouped[merchantId]) {
                grouped[merchantId] = {
                    merchantId,
                    merchantName,
                    merchantPhone: issue.merchantContactPhone,
                    merchantAltPhone: issue.merchantContactSecondPhone,
                    merchantEmail: issue.merchantContactEmail,
                    merchantPhotoUrl: issue.merchantPhotoUrl,
                    merchantAddress: issue.merchantAddress,
                    issues: []
                };
            }
            grouped[merchantId].issues.push(issue);
        });

        return grouped;
    }, [unresolvedIssues]);

    // Group resolved issues by merchant
    const resolvedIssuesByMerchant = useMemo(() => {
        const grouped = {};
        resolvedIssues.forEach(issue => {
            const merchantId = issue.merchantId || 'unknown';
            const merchantName = issue.merchantName || 'Unknown Merchant';

            if (!grouped[merchantId]) {
                grouped[merchantId] = {
                    merchantId,
                    merchantName,
                    merchantPhone: issue.merchantContactPhone,
                    merchantAltPhone: issue.merchantContactSecondPhone,
                    merchantEmail: issue.merchantContactEmail,
                    merchantPhotoUrl: issue.merchantPhotoUrl,
                    merchantAddress: issue.merchantAddress,
                    issues: []
                };
            }
            grouped[merchantId].issues.push(issue);
        });

        return grouped;
    }, [resolvedIssues]);

    const filteredIssues = useMemo(() => {
        if (!selectedMerchant) return [];
        const merchant = issuesByMerchant[selectedMerchant];
        if (!merchant) return [];

        return merchant.issues.filter(issue => {
            if (filters.itemName && issue.itemTypeName !== filters.itemName) return false;
            if (filters.category && issue.itemTypeCategoryName !== filters.category) return false;
            if (filters.issueType && issue.issueType !== filters.issueType) return false;
            if (filters.minQuantity && issue.affectedQuantity < parseFloat(filters.minQuantity)) return false;
            return true;
        });
    }, [selectedMerchant, issuesByMerchant, filters]);

    const filteredResolvedIssues = useMemo(() => {
        if (!selectedMerchant) return [];
        const merchant = resolvedIssuesByMerchant[selectedMerchant];
        if (!merchant) return [];

        return merchant.issues.filter(issue => {
            if (resolvedFilters.itemName && issue.itemTypeName !== resolvedFilters.itemName) return false;
            if (resolvedFilters.category && issue.itemTypeCategoryName !== resolvedFilters.category) return false;
            if (resolvedFilters.issueType && issue.issueType !== resolvedFilters.issueType) return false;
            if (resolvedFilters.minQuantity && issue.affectedQuantity < parseFloat(resolvedFilters.minQuantity)) return false;
            return true;
        });
    }, [selectedMerchant, resolvedIssuesByMerchant, resolvedFilters]);

    const handleMerchantSelect = (merchantId) => {
        setSelectedMerchant(merchantId);
        setExpandedIssueId(null);
        setExpandedResolvedIssueId(null);

        const merchant = issuesByMerchant[merchantId];
        const initialResolutions = {};

        if (merchant) {
            merchant.issues.forEach(issue => {
                initialResolutions[issue.id] = {
                    issueId: issue.id,
                    resolutionType: '',
                    resolutionNotes: ''
                };
            });
        }

        setResolutions(initialResolutions);
    };

    const toggleIssue = (issueId) => {
        setExpandedIssueId(expandedIssueId === issueId ? null : issueId);
    };

    const toggleResolvedIssue = (issueId) => {
        setExpandedResolvedIssueId(expandedResolvedIssueId === issueId ? null : issueId);
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
        if (!selectedMerchant) return false;
        const merchant = issuesByMerchant[selectedMerchant];
        if (!merchant) return false;

        return merchant.issues.every(issue => {
            const resolution = resolutions[issue.id];
            return resolution && resolution.resolutionType && resolution.resolutionNotes.trim();
        });
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

            setSelectedMerchant(null);
            setResolutions({});

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

    const getResolutionTypeLabel = (resolutionType) => {
        const option = getResolutionTypeOptions().find(opt => opt.value === resolutionType);
        return option ? option.label : resolutionType;
    };

    // No unresolved issues and no resolved issues
    if (unresolvedIssues.length === 0 && resolvedIssues.length === 0) {
        return (
            <div className="issues-tab">
                <div className="issues-section">
                    <div className="no-issues-container">
                        <FiCheckCircle size={48} />
                        <h3>No Issues</h3>
                        <p>There are no issues for this purchase order.</p>
                    </div>
                </div>
            </div>
        );
    }

// Merchant selection view
    if (!selectedMerchant) {
        // Combine all merchants (both resolved and unresolved)
        const allMerchants = {};

        // Add unresolved merchants
        Object.values(issuesByMerchant).forEach(merchant => {
            allMerchants[merchant.merchantId] = {
                ...merchant,
                unresolvedCount: merchant.issues.length,
                resolvedCount: 0
            };
        });

        // Add or update with resolved merchants
        Object.values(resolvedIssuesByMerchant).forEach(merchant => {
            if (allMerchants[merchant.merchantId]) {
                allMerchants[merchant.merchantId].resolvedCount = merchant.issues.length;
            } else {
                allMerchants[merchant.merchantId] = {
                    ...merchant,
                    unresolvedCount: 0,
                    resolvedCount: merchant.issues.length
                };
            }
        });

        return (
            <div className="issues-tab">
                <div className="issues-section">
                    <h3 className="section-title">
                        <FiAlertCircle />
                        Select Merchant to View Issues
                    </h3>
                    <p className="section-description">View resolved and unresolved issues from one merchant at a time</p>

                    <div className="merchant-list">
                        {Object.values(allMerchants).map(merchant => (
                            <div
                                key={merchant.merchantId}
                                className="merchant-card"
                                onClick={() => handleMerchantSelect(merchant.merchantId)}
                            >
                                <div className="merchant-card-icon">
                                    {merchant.merchantPhotoUrl ? (
                                        <img src={merchant.merchantPhotoUrl} alt={merchant.merchantName} />
                                    ) : (
                                        <FiPackage />
                                    )}
                                </div>
                                <div className="merchant-card-content">
                                    <h4>{merchant.merchantName}</h4>
                                    <div className="merchant-card-stats">
                                                                         <span className="stat-badge resolved">
            {merchant.resolvedCount} resolved
        </span>
        <span className="stat-badge pending">
            {merchant.unresolvedCount} unresolved
        </span>

                                    </div>
                                </div>
                                <div className="merchant-card-arrow">→</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Issue resolution view for selected merchant
    const currentMerchant = issuesByMerchant[selectedMerchant];
    const currentResolvedMerchant = resolvedIssuesByMerchant[selectedMerchant];
    const hasUnresolvedIssues = currentMerchant && currentMerchant.issues.length > 0;
    const hasResolvedIssues = currentResolvedMerchant && currentResolvedMerchant.issues.length > 0;

    return (
        <div className="issues-tab">
            {/* Merchant Info Section */}
            <div className="issues-section">
                <div className="section-header-with-action">
                    <h3 className="section-title">
                        <FiTruck />
                        Merchant Information
                    </h3>
                    <button className="btn-back" onClick={() => setSelectedMerchant(null)}>
                        ← Back to Merchants
                    </button>
                </div>

                <div className="merchant-info-card">
                    <div className="merchant-info-header">
                        <div className="merchant-left">
                            {(currentMerchant?.merchantPhotoUrl || currentResolvedMerchant?.merchantPhotoUrl) ? (
                                <img src={currentMerchant?.merchantPhotoUrl || currentResolvedMerchant?.merchantPhotoUrl} alt={currentMerchant?.merchantName || currentResolvedMerchant?.merchantName} className="merchant-photo" />
                            ) : (
                                <div className="merchant-icon">
                                    <FiTruck />
                                </div>
                            )}
                            <div className="merchant-details">
                                <h4
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/merchants/${currentMerchant?.merchantId || currentResolvedMerchant?.merchantId}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {currentMerchant?.merchantName || currentResolvedMerchant?.merchantName}
                                </h4>
                                <div className="merchant-contact">
                                    {(currentMerchant?.merchantPhone || currentResolvedMerchant?.merchantPhone) && (
                                        <a href={`tel:${currentMerchant?.merchantPhone || currentResolvedMerchant?.merchantPhone}`} className="contact-item">
                                            <FiPhone />
                                            {currentMerchant?.merchantPhone || currentResolvedMerchant?.merchantPhone}
                                        </a>
                                    )}
                                    {(currentMerchant?.merchantEmail || currentResolvedMerchant?.merchantEmail) && (
                                        <a href={`mailto:${currentMerchant?.merchantEmail || currentResolvedMerchant?.merchantEmail}`} className="contact-item">
                                            <FiMail />
                                            {currentMerchant?.merchantEmail || currentResolvedMerchant?.merchantEmail}
                                        </a>
                                    )}
                                    {(currentMerchant?.merchantAddress || currentResolvedMerchant?.merchantAddress) && (
                                        <a                           // ← HERE IS THE <a TAG!
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentMerchant?.merchantAddress || currentResolvedMerchant?.merchantAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-item"
                                        >
                                            <FiMapPin />
                                            {currentMerchant?.merchantAddress || currentResolvedMerchant?.merchantAddress}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="merchant-stats">
                            {hasResolvedIssues && (
                                <div className="stat-item resolved">
                                    <FiCheckCircle />
                                    <span><strong>{currentResolvedMerchant.issues.length}</strong> Resolved</span>
                                </div>
                            )}
                            {hasUnresolvedIssues && (
                                <>
                                    <div className="stat-item pending">
                                        <FiClock />
                                        <span><strong>{currentMerchant.issues.length}</strong> Issues</span>
                                    </div>
                                    <div className="stat-item">
                                        <FiCheckCircle />
                                        <span><strong>{getResolvedCount()}</strong> / {currentMerchant.issues.length} Ready</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resolved Issues Section */}
            <div className="issues-section">
                <div className="section-header-with-action">
                    <h3 className="section-title">
                        <FiCheckCircle />
                        Resolved Issues ({hasResolvedIssues ? currentResolvedMerchant.issues.length : 0})
                    </h3>
                    {hasResolvedIssues && (
                        <button
                            className={`filter-btn ${Object.values(resolvedFilters).some(f => f) ? 'active' : ''}`}
                            onClick={() => setShowResolvedFilters(!showResolvedFilters)}
                        >
                            <FiFilter />
                            Filter
                            {Object.values(resolvedFilters).filter(f => f).length > 0 && (
                                <span className="filter-count">{Object.values(resolvedFilters).filter(f => f).length}</span>
                            )}
                        </button>
                    )}
                </div>

                {hasResolvedIssues ? (
                    <>
                        <div className={`filter-panel ${showResolvedFilters ? 'open' : 'closed'}`}>
                            <div className="filter-grid">
                                <div className="filter-item">
                                    <label>Item Name</label>
                                    <select
                                        value={resolvedFilters.itemName}
                                        onChange={(e) => setResolvedFilters(prev => ({ ...prev, itemName: e.target.value }))}
                                    >
                                        <option value="">All Items</option>
                                        {[...new Set(currentResolvedMerchant.issues.map(i => i.itemTypeName))].map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Category</label>
                                    <select
                                        value={resolvedFilters.category}
                                        onChange={(e) => setResolvedFilters(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        <option value="">All Categories</option>
                                        {[...new Set(currentResolvedMerchant.issues.map(i => i.itemTypeCategoryName).filter(Boolean))].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Issue Type</label>
                                    <select
                                        value={resolvedFilters.issueType}
                                        onChange={(e) => setResolvedFilters(prev => ({ ...prev, issueType: e.target.value }))}
                                    >
                                        <option value="">All Types</option>
                                        {[...new Set(currentResolvedMerchant.issues.map(i => i.issueType))].map(type => (
                                            <option key={type} value={type}>{getIssueTypeDisplay(type).label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Min Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="Min qty"
                                        value={resolvedFilters.minQuantity}
                                        onChange={(e) => setResolvedFilters(prev => ({ ...prev, minQuantity: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="filter-actions">
                    <span className="filter-stats">
                        Showing {filteredResolvedIssues.length} of {currentResolvedMerchant.issues.length} issues
                    </span>
                                <button
                                    className="clear-filters-btn"
                                    onClick={() => setResolvedFilters({ itemName: '', category: '', issueType: '', minQuantity: '' })}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>

                        <div className="issues-list">
                            {filteredResolvedIssues.map((issue) => {
                                const typeDisplay = getIssueTypeDisplay(issue.issueType);
                                const unit = issue.measuringUnit || 'units';
                                const isExpanded = expandedResolvedIssueId === issue.id;

                                return (
                                    <div key={issue.id} className={`issue-card resolved ${isExpanded ? 'expanded' : ''}`}>
                                        <div className="issue-header" onClick={() => toggleResolvedIssue(issue.id)}>
                                            <div
                                                className="issue-type-tag"
                                                style={{
                                                    backgroundColor: `${typeDisplay.color}15`,
                                                    color: typeDisplay.color,
                                                    borderColor: `${typeDisplay.color}40`
                                                }}
                                            >
                                                {typeDisplay.label}
                                            </div>
                                            <button className="expand-btn">
                                                {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                            </button>
                                            <div className="issue-icon">
                                                <FiCheckCircle />
                                            </div>
                                            <div className="issue-info">
                                                <h4>{issue.itemTypeName || 'Unknown Item'}</h4>
                                                {issue.itemTypeCategoryName && (
                                                    <span className="issue-category">{issue.itemTypeCategoryName}</span>
                                                )}
                                            </div>
                                            <div className="issue-quantity">
                                                <span className="qty-value">{issue.affectedQuantity}</span>
                                                <span className="qty-unit">{unit}</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="issue-content">
                                                <div className="details-resolution-row">
                                                    <div className="issue-details-column">
                                                        <div className="form-section-header">
                                                            <h5>ISSUE DETAILS</h5>
                                                        </div>
                                                        <div className="form-section-body">
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
                                                        <div className="form-section-header">
                                                            <h5>RESOLUTION</h5>
                                                        </div>
                                                        <div className="form-section-body">
                                                            <div className="detail-list">
                                                                <div className="detail-row">
                                                                    <span className="detail-label">Resolution Type</span>
                                                                    <span className="detail-value">{getResolutionTypeLabel(issue.resolutionType)}</span>
                                                                </div>

                                                                <div className="detail-row">
                                                                    <span className="detail-label">Resolution Notes</span>
                                                                    <span className="detail-value">"{issue.resolutionNotes}"</span>
                                                                </div>

                                                                {issue.resolvedBy && (
                                                                    <div className="detail-row">
                                                                        <span className="detail-label">Resolved By</span>
                                                                        <span className="detail-value">{issue.resolvedBy}</span>
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
                    </>
                ) : (
                    <div className="no-issues-container">
                        <FiCheckCircle size={48} />
                        <h3>No Resolved Issues</h3>
                        <p>This merchant has no resolved issues yet.</p>
                    </div>
                )}
            </div>

            {/* Unresolved Issues Section */}
            <div className="issues-section">
                <div className="section-header-with-action">
                    <h3 className="section-title">
                        <FiAlertCircle />
                        Issues to Resolve ({hasUnresolvedIssues ? currentMerchant.issues.length : 0})
                    </h3>
                    {hasUnresolvedIssues && (
                        <button
                            className={`filter-btn ${Object.values(filters).some(f => f) ? 'active' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <FiFilter />
                            Filter
                            {Object.values(filters).filter(f => f).length > 0 && (
                                <span className="filter-count">{Object.values(filters).filter(f => f).length}</span>
                            )}
                        </button>
                    )}
                </div>

                {hasUnresolvedIssues ? (
                    <>
                        <div className={`filter-panel ${showFilters ? 'open' : 'closed'}`}>
                            <div className="filter-grid">
                                <div className="filter-item">
                                    <label>Item Name</label>
                                    <select
                                        value={filters.itemName}
                                        onChange={(e) => setFilters(prev => ({ ...prev, itemName: e.target.value }))}
                                    >
                                        <option value="">All Items</option>
                                        {[...new Set(currentMerchant.issues.map(i => i.itemTypeName))].map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Category</label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        <option value="">All Categories</option>
                                        {[...new Set(currentMerchant.issues.map(i => i.itemTypeCategoryName).filter(Boolean))].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Issue Type</label>
                                    <select
                                        value={filters.issueType}
                                        onChange={(e) => setFilters(prev => ({ ...prev, issueType: e.target.value }))}
                                    >
                                        <option value="">All Types</option>
                                        {[...new Set(currentMerchant.issues.map(i => i.issueType))].map(type => (
                                            <option key={type} value={type}>{getIssueTypeDisplay(type).label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-item">
                                    <label>Min Quantity</label>
                                    <input
                                        type="number"
                                        placeholder="Min qty"
                                        value={filters.minQuantity}
                                        onChange={(e) => setFilters(prev => ({ ...prev, minQuantity: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="filter-actions">
                    <span className="filter-stats">
                        Showing {filteredIssues.length} of {currentMerchant.issues.length} issues
                    </span>
                                <button
                                    className="clear-filters-btn"
                                    onClick={() => setFilters({ itemName: '', category: '', issueType: '', minQuantity: '' })}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>

                        <div className="issues-list">
                            {filteredIssues.map((issue) => {
                                const typeDisplay = getIssueTypeDisplay(issue.issueType);
                                const resolution = resolutions[issue.id] || {};
                                const unit = issue.measuringUnit || 'units';
                                const isResolved = resolution.resolutionType && resolution.resolutionNotes.trim();
                                const isExpanded = expandedIssueId === issue.id;

                                return (
                                    <div key={issue.id} className={`issue-card ${isExpanded ? 'expanded' : ''} ${isResolved ? 'resolved' : ''}`}>
                                        <div className="issue-header" onClick={() => toggleIssue(issue.id)}>
                                            <div
                                                className="issue-type-tag"
                                                style={{
                                                    backgroundColor: `${typeDisplay.color}15`,
                                                    color: typeDisplay.color,
                                                    borderColor: `${typeDisplay.color}40`
                                                }}
                                            >
                                                {typeDisplay.label}
                                            </div>
                                            <button className="expand-btn">
                                                {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                            </button>
                                            <div className="issue-icon">
                                                <FiAlertCircle />
                                            </div>
                                            <div className="issue-info">
                                                <h4>{issue.itemTypeName || 'Unknown Item'}</h4>
                                                {issue.itemTypeCategoryName && (
                                                    <span className="issue-category">{issue.itemTypeCategoryName}</span>
                                                )}
                                            </div>
                                            <div className="issue-quantity">
                                                <span className="qty-value">{issue.affectedQuantity}</span>
                                                <span className="qty-unit">{unit}</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="issue-content">
                                                <div className="details-resolution-row">
                                                    <div className="issue-details-column">
                                                        <div className="form-section-header">
                                                            <h5>ISSUE DETAILS</h5>
                                                        </div>
                                                        <div className="form-section-body">
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
                                                        <div className="form-section-header">
                                                            <h5>RESOLUTION</h5>
                                                        </div>
                                                        <div className="form-section-body">
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
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="no-issues-container">
                        <FiCheckCircle size={48} />
                        <h3>No Unresolved Issues</h3>
                        <p>All issues from this merchant have been resolved.</p>
                    </div>
                )}
            </div>

            {/* Submit Section - Only show if there are unresolved issues */}
            {hasUnresolvedIssues && (
                <div className="issues-section">
                    <h3 className="section-title">
                        <FiCheckCircle />
                        Submit Resolutions
                    </h3>

                    <div className="submit-info">
                        {canSubmit() ? (
                            <span className="submit-status ready">
                                <FiCheckCircle />
                                All {currentMerchant.issues.length} issues ready to resolve
                            </span>
                        ) : (
                            <span className="submit-status warning">
                                <FiAlertCircle />
                                {getResolvedCount()} of {currentMerchant.issues.length} issues completed - all required
                            </span>
                        )}

                        <div className="submit-actions">
                            <button
                                className="btn-primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !canSubmit()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner"></span>
                                        Resolving...
                                    </>
                                ) : (
                                    <>
                                        <FiCheckCircle />
                                        Resolve All Issues ({currentMerchant.issues.length})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuesTab;