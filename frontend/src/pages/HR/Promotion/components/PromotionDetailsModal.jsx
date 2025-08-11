// src/pages/HR/Promotion/components/PromotionDetailsModal.jsx
import React from 'react';
import {
    User, Building, DollarSign, Calendar, MessageSquare,
    Clock, CheckCircle, XCircle, FileText, TrendingUp,
    AlertTriangle, Star, Award
} from 'lucide-react';
import './PromotionDetailsModal.scss'

const PromotionDetailsModal = ({ isOpen, onClose, promotion }) => {

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status) => {
        const iconMap = {
            'DRAFT': <FileText size={16} />,
            'PENDING': <Clock size={16} />,
            'UNDER_REVIEW': <MessageSquare size={16} />,
            'APPROVED': <CheckCircle size={16} />,
            'REJECTED': <XCircle size={16} />,
            'IMPLEMENTED': <TrendingUp size={16} />,
            'CANCELLED': <XCircle size={16} />
        };
        return iconMap[status] || <FileText size={16} />;
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            'DRAFT': 'status-badge status-draft',
            'PENDING': 'status-badge pending',
            'UNDER_REVIEW': 'status-badge under-review',
            'APPROVED': 'status-badge approved',
            'REJECTED': 'status-badge rejected',
            'IMPLEMENTED': 'status-badge completed',
            'CANCELLED': 'status-badge cancelled'
        };

        return (
            <span className={statusClasses[status] || 'status-badge'}>
                {getStatusIcon(status)}
                {status?.replace('_', ' ')}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityClasses = {
            'LOW': 'status-badge low',
            'NORMAL': 'status-badge medium',
            'HIGH': 'status-badge high',
            'URGENT': 'status-badge urgent'
        };

        return (
            <span className={priorityClasses[priority] || 'status-badge medium'}>
                {priority}
            </span>
        );
    };

    const getSalaryIncrease = () => {
        if (!promotion?.currentSalary || !promotion?.proposedSalary) return null;

        const current = parseFloat(promotion.currentSalary);
        const proposed = parseFloat(promotion.proposedSalary);
        const change = proposed - current;
        const percentage = ((change / current) * 100).toFixed(1);

        return {
            change,
            percentage,
            isIncrease: change > 0,
            isDecrease: change < 0,
            isEqual: change === 0
        };
    };

    const salaryChange = getSalaryIncrease();

    if (!isOpen || !promotion) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-xl">
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            <TrendingUp size={24} />
                            Promotion Request Details
                        </h2>
                        <p className="modal-subtitle">
                            Complete details for promotion request #{promotion.id}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="details-container">
                        {/* Status & Basic Info */}
                        <div className="details-section">
                            <div className="section-header">
                                <AlertTriangle size={20} />
                                <h3>Request Status & Information</h3>
                            </div>

                            <div className="status-info-card">
                                <div className="status-row">
                                    <div className="status-item">
                                        <label>Current Status:</label>
                                        {getStatusBadge(promotion.status)}
                                    </div>
                                    <div className="status-item">
                                        <label>Priority Level:</label>
                                        {getPriorityBadge(promotion.priority)}
                                    </div>
                                    <div className="status-item">
                                        <label>Request ID:</label>
                                        <span className="request-id">#{promotion.id}</span>
                                    </div>
                                </div>

                                <div className="timeline-info">
                                    <div className="timeline-item">
                                        <Clock size={14} />
                                        <span>Requested: {formatDateTime(promotion.createdAt || promotion.submittedAt)}</span>
                                    </div>
                                    {promotion.reviewedAt && (
                                        <div className="timeline-item">
                                            <MessageSquare size={14} />
                                            <span>Reviewed: {formatDateTime(promotion.reviewedAt)}</span>
                                        </div>
                                    )}
                                    {promotion.approvedAt && (
                                        <div className="timeline-item">
                                            <CheckCircle size={14} />
                                            <span>Approved: {formatDateTime(promotion.approvedAt)}</span>
                                        </div>
                                    )}
                                    {promotion.implementedAt && (
                                        <div className="timeline-item">
                                            <TrendingUp size={14} />
                                            <span>Implemented: {formatDateTime(promotion.implementedAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Employee Information */}
                        <div className="details-section">
                            <div className="section-header">
                                <User size={20} />
                                <h3>Employee Information</h3>
                            </div>

                            <div className="employee-details-card">
                                <div className="employee-info-grid">
                                    <div className="info-item">
                                        <label>Employee Name:</label>
                                        <span className="employee-name">{promotion.employeeName}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Employee ID:</label>
                                        <span>{promotion.employeeId}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Years in Current Position:</label>
                                        <span>{promotion.yearsInCurrentPosition || 'N/A'} years</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Requested By:</label>
                                        <span>{promotion.requestedBy || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Position Changes */}
                        <div className="details-section">
                            <div className="section-header">
                                <Building size={20} />
                                <h3>Position & Department Changes</h3>
                            </div>

                            <div className="position-comparison-card">
                                <div className="position-comparison">
                                    <div className="position-column current">
                                        <h4>Current Position</h4>
                                        <div className="position-details">
                                            <div className="position-name">{promotion.currentPositionName}</div>
                                            <div className="department-name">{promotion.currentDepartmentName}</div>
                                        </div>
                                    </div>

                                    <div className="position-arrow">→</div>

                                    <div className="position-column proposed">
                                        <h4>Proposed Position</h4>
                                        <div className="position-details">
                                            <div className="position-name text-success">{promotion.promotedToPositionName}</div>
                                            <div className="department-name text-success">{promotion.promotedToDepartmentName}</div>
                                        </div>
                                    </div>
                                </div>

                                {promotion.involvesDepartmentChange && (
                                    <div className="department-change-notice">
                                        <AlertTriangle size={16} />
                                        <span>This promotion involves a department change</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compensation Details */}
                        <div className="details-section">
                            <div className="section-header">
                                <DollarSign size={20} />
                                <h3>Compensation Details</h3>
                            </div>

                            <div className="compensation-details-card">
                                <div className="salary-comparison">
                                    <div className="salary-column">
                                        <h4>Current Compensation</h4>
                                        <div className="salary-amount">
                                            {formatCurrency(promotion.currentSalary)}
                                        </div>
                                        <div className="salary-period">per month</div>
                                    </div>

                                    <div className="salary-arrow">→</div>

                                    <div className="salary-column">
                                        <h4>Proposed Compensation</h4>
                                        <div className="salary-amount text-success">
                                            {formatCurrency(promotion.proposedSalary)}
                                        </div>
                                        <div className="salary-period">per month</div>
                                    </div>
                                </div>

                                {salaryChange && (
                                    <div className={`salary-change-summary ${salaryChange.isDecrease ? 'decrease' : salaryChange.isIncrease ? 'increase' : 'equal'}`}>
                                        <div className="change-item">
                                            <Award size={16} />
                                            <div className="change-details">
                                                <div className="change-amount">
                                                    {salaryChange.isIncrease ? '+' : ''}{formatCurrency(salaryChange.change)}
                                                </div>
                                                <div className="change-label">Monthly {salaryChange.isIncrease ? 'Increase' : salaryChange.isDecrease ? 'Decrease' : 'Change'}</div>
                                            </div>
                                        </div>
                                        <div className="change-item">
                                            <TrendingUp size={16} />
                                            <div className="change-details">
                                                <div className="change-percentage">
                                                    {salaryChange.isIncrease ? '+' : ''}{salaryChange.percentage}%
                                                </div>
                                                <div className="change-label">Percentage {salaryChange.isIncrease ? 'Increase' : salaryChange.isDecrease ? 'Decrease' : 'Change'}</div>
                                            </div>
                                        </div>
                                        <div className="change-item">
                                            <Calendar size={16} />
                                            <div className="change-details">
                                                <div className="annual-change">
                                                    {salaryChange.isIncrease ? '+' : ''}{formatCurrency(salaryChange.change * 12)}
                                                </div>
                                                <div className="change-label">Annual {salaryChange.isIncrease ? 'Increase' : salaryChange.isDecrease ? 'Decrease' : 'Change'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="effective-date-info">
                                    <Calendar size={16} />
                                    <span>
                                        Proposed Effective Date:
                                        <strong> {formatDate(promotion.proposedEffectiveDate)}</strong>
                                    </span>
                                </div>

                                {promotion.actualEffectiveDate && (
                                    <div className="effective-date-info">
                                        <Calendar size={16} />
                                        <span>
                                            Actual Effective Date:
                                            <strong> {formatDate(promotion.actualEffectiveDate)}</strong>
                                        </span>
                                    </div>
                                )}

                                {promotion.approvedSalary && promotion.approvedSalary !== promotion.proposedSalary && (
                                    <div className="adjusted-info">
                                        <AlertTriangle size={16} />
                                        <span>
                                            HR Approved Salary:
                                            <strong> {formatCurrency(promotion.approvedSalary)}</strong>
                                        </span>
                                    </div>
                                )}

                                {promotion.daysToEffectiveDate !== null && (
                                    <div className={`days-info ${promotion.isOverdue ? 'overdue' : ''}`}>
                                        <Clock size={16} />
                                        <span>
                                            {promotion.isOverdue
                                                ? `Overdue by ${Math.abs(promotion.daysToEffectiveDate)} days`
                                                : `${promotion.daysToEffectiveDate} days until effective date`
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Performance & Justification */}
                        <div className="details-section">
                            <div className="section-header">
                                <Star size={20} />
                                <h3>Performance & Justification</h3>
                            </div>

                            <div className="justification-details-card">
                                {promotion.performanceRating && (
                                    <div className="performance-info">
                                        <h4>Performance Rating</h4>
                                        <span className="performance-badge">
                                            <Star size={14} />
                                            {promotion.performanceRating.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}

                                <div className="justification-text">
                                    <h4>Promotion Justification</h4>
                                    <p>{promotion.justification}</p>
                                </div>

                                {promotion.educationalQualifications && (
                                    <div className="qualifications-text">
                                        <h4>Educational Qualifications</h4>
                                        <p>{promotion.educationalQualifications}</p>
                                    </div>
                                )}

                                {promotion.additionalCertifications && (
                                    <div className="certifications-text">
                                        <h4>Additional Certifications</h4>
                                        <p>{promotion.additionalCertifications}</p>
                                    </div>
                                )}

                                {promotion.requiresAdditionalTraining && (
                                    <div className="training-info">
                                        <h4>Training Requirements</h4>
                                        <div className="training-required">
                                            <AlertTriangle size={16} />
                                            <span>Additional training required</span>
                                        </div>
                                        {promotion.trainingPlan && (
                                            <div className="training-plan">
                                                <h5>Training Plan:</h5>
                                                <p>{promotion.trainingPlan}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {promotion.hrComments && (
                                    <div className="hr-comments-text">
                                        <h4>HR Comments</h4>
                                        <p>{promotion.hrComments}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Review Information */}
                        {(promotion.managerComments || promotion.reviewedBy) && (
                            <div className="details-section">
                                <div className="section-header">
                                    <MessageSquare size={20} />
                                    <h3>Review Information</h3>
                                </div>

                                <div className="review-details-card">
                                    {promotion.managerComments && (
                                        <div className="review-item">
                                            <h4>Manager Comments</h4>
                                            <p>{promotion.managerComments}</p>
                                        </div>
                                    )}

                                    <div className="reviewer-info">
                                        {promotion.reviewedBy && (
                                            <div className="reviewer-item">
                                                <label>Reviewed By:</label>
                                                <span>{promotion.reviewedBy}</span>
                                            </div>
                                        )}
                                        {promotion.reviewedAt && (
                                            <div className="reviewer-item">
                                                <label>Review Date:</label>
                                                <span>{formatDateTime(promotion.reviewedAt)}</span>
                                            </div>
                                        )}
                                        {promotion.approvedBy && (
                                            <div className="reviewer-item">
                                                <label>Approved By:</label>
                                                <span>{promotion.approvedBy}</span>
                                            </div>
                                        )}
                                        {promotion.approvedAt && (
                                            <div className="reviewer-item">
                                                <label>Approval Date:</label>
                                                <span>{formatDateTime(promotion.approvedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Implementation Information */}
                        {promotion.status === 'IMPLEMENTED' && (
                            <div className="details-section">
                                <div className="section-header">
                                    <CheckCircle size={20} />
                                    <h3>Implementation Information</h3>
                                </div>

                                <div className="implementation-details-card">
                                    <div className="implementation-info">
                                        <div className="info-item">
                                            <label>Implementation Date:</label>
                                            <span>{formatDateTime(promotion.implementedAt)}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Implementation Status:</label>
                                            <span className="success-text">✅ Successfully Implemented</span>
                                        </div>
                                        {promotion.canBeImplemented !== undefined && (
                                            <div className="info-item">
                                                <label>Ready for Implementation:</label>
                                                <span className={promotion.canBeImplemented ? 'success-text' : 'warning-text'}>
                                                    {promotion.canBeImplemented ? '✅ Yes' : '⚠️ Not Ready'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rejection Information */}
                        {promotion.status === 'REJECTED' && (
                            <div className="details-section">
                                <div className="section-header">
                                    <XCircle size={20} />
                                    <h3>Rejection Information</h3>
                                </div>

                                <div className="rejection-details-card">
                                    <div className="rejection-info">
                                        {promotion.rejectionReason && (
                                            <div className="rejection-reason">
                                                <h4>Rejection Reason</h4>
                                                <p>{promotion.rejectionReason}</p>
                                            </div>
                                        )}
                                        <div className="rejection-meta">
                                            {promotion.reviewedBy && (
                                                <div className="info-item">
                                                    <label>Rejected By:</label>
                                                    <span>{promotion.reviewedBy}</span>
                                                </div>
                                            )}
                                            {promotion.reviewedAt && (
                                                <div className="info-item">
                                                    <label>Rejection Date:</label>
                                                    <span>{formatDateTime(promotion.reviewedAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Request Metadata */}
                        <div className="details-section">
                            <div className="section-header">
                                <FileText size={20} />
                                <h3>Request Information</h3>
                            </div>

                            <div className="metadata-card">
                                <div className="metadata-grid">
                                    <div className="metadata-item">
                                        <label>Request Title:</label>
                                        <span>{promotion.requestTitle}</span>
                                    </div>
                                    <div className="metadata-item">
                                        <label>Created:</label>
                                        <span>{formatDateTime(promotion.createdAt)}</span>
                                    </div>
                                    <div className="metadata-item">
                                        <label>Last Updated:</label>
                                        <span>{formatDateTime(promotion.updatedAt)}</span>
                                    </div>
                                    <div className="metadata-item">
                                        <label>Request ID:</label>
                                        <span className="request-id-full">{promotion.id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-primary"
                    >
                        <FileText size={18} />
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromotionDetailsModal;