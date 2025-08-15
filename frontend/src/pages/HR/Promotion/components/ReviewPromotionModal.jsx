// src/pages/HR/Promotion/components/ReviewPromotionModal.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, User, Building, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import './ReviewPromotionModal.scss'

const ReviewPromotionModal = ({ isOpen, onClose, promotion, onSubmit }) => {
    const { showError } = useSnackbar();

    const [reviewData, setReviewData] = useState({
        action: '', // 'approve' or 'reject' as expected by backend
        managerComments: '',
        rejectionReason: '',
        approvedSalary: '',
        actualEffectiveDate: ''
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Reset form when modal opens with new promotion
    useEffect(() => {
        if (isOpen && promotion) {
            setReviewData({
                action: '',
                managerComments: '',
                rejectionReason: '',
                approvedSalary: promotion.proposedSalary || '',
                actualEffectiveDate: promotion.proposedEffectiveDate || ''
            });
            setErrors({});
        }
    }, [isOpen, promotion]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReviewData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = (action) => {
        const newErrors = {};

        if (!reviewData.managerComments?.trim()) {
            newErrors.managerComments = 'Review comments are required';
        }

        if (action === 'reject' && !reviewData.rejectionReason?.trim()) {
            newErrors.rejectionReason = 'Rejection reason is required when rejecting a request';
        }

        if (action === 'approve') {
            if (reviewData.approvedSalary) {
                const approvedSalary = parseFloat(reviewData.approvedSalary);
                if (approvedSalary <= 0) {
                    newErrors.approvedSalary = 'Approved salary must be greater than 0';
                }
            }

            if (reviewData.actualEffectiveDate) {
                const effectiveDate = new Date(reviewData.actualEffectiveDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (effectiveDate < today) {
                    newErrors.actualEffectiveDate = 'Effective date cannot be in the past';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (action) => {
        if (!validateForm(action)) {
            showError('Please fix the validation errors before submitting');
            return;
        }

        const submissionData = {
            ...reviewData,
            action: action
        };

        // Remove rejectionReason if approving
        if (action === 'approve') {
            delete submissionData.rejectionReason;
        }

        // Remove approvedSalary and actualEffectiveDate if rejecting
        if (action === 'reject') {
            delete submissionData.approvedSalary;
            delete submissionData.actualEffectiveDate;
        }

        try {
            setLoading(true);
            await onSubmit(promotion.id, submissionData);
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = () => handleSubmit('approve');
    const handleReject = () => handleSubmit('reject');

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

    const getSalaryIncrease = () => {
        if (!promotion?.currentSalary || !promotion?.proposedSalary) return null;

        const current = parseFloat(promotion.currentSalary);
        const proposed = parseFloat(promotion.proposedSalary);
        const increase = proposed - current;
        const percentage = ((increase / current) * 100).toFixed(1);

        return { increase, percentage };
    };

    const salaryIncrease = getSalaryIncrease();

    if (!isOpen || !promotion) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-xl">
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            <MessageSquare size={24} />
                            Review Promotion Request
                        </h2>
                        <p className="modal-subtitle">
                            Review and approve/reject promotion request for {promotion.employeeName}
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
                    <div className="review-container">
                        {/* Employee & Promotion Details */}
                        <div className="review-section">
                            <div className="section-header">
                                <User size={20} />
                                <h3>Employee & Promotion Details</h3>
                            </div>

                            <div className="promotion-summary-card">
                                <div className="summary-grid">
                                    {/* Employee Information */}
                                    <div className="summary-item">
                                        <label>Employee:</label>
                                        <span className="employee-name">{promotion.employeeName}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Employee ID:</label>
                                        <span>{promotion.employeeId}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Years in Position:</label>
                                        <span>{promotion.yearsInCurrentPosition || 'N/A'} years</span>
                                    </div>

                                    {/* Position Information */}
                                    <div className="summary-item">
                                        <label>Current Position:</label>
                                        <span>{promotion.currentPositionName}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Proposed Position:</label>
                                        <span className="text-success">{promotion.promotedToPositionName}</span>
                                    </div>

                                    {/* Department Information */}
                                    <div className="summary-item">
                                        <label>Current Department:</label>
                                        <span>{promotion.currentDepartmentName}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Proposed Department:</label>
                                        <span className="text-success">{promotion.promotedToDepartmentName}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Department Change:</label>
                                        <span className={promotion.involvesDepartmentChange ? 'text-warning' : 'text-muted'}>
                                            {promotion.involvesDepartmentChange ? 'Yes' : 'No'}
                                        </span>
                                    </div>

                                    {/* Request Information */}
                                    <div className="summary-item">
                                        <label>Request Date:</label>
                                        <span>{formatDate(promotion.createdAt || promotion.submittedAt)}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Priority Level:</label>
                                        <span className={`status-badge ${promotion.priority?.toLowerCase()}`}>
                                            {promotion.priority}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Information */}
                        <div className="review-section">
                            <div className="section-header">
                                <DollarSign size={20} />
                                <h3>Compensation Details</h3>
                            </div>

                            <div className="salary-review-card">
                                <div className="salary-comparison">
                                    <div className="salary-column">
                                        <h4>Current Salary</h4>
                                        <div className="salary-amount">
                                            {formatCurrency(promotion.currentSalary)}
                                        </div>
                                    </div>
                                    <div className="salary-arrow">→</div>
                                    <div className="salary-column">
                                        <h4>Proposed Salary</h4>
                                        <div className="salary-amount text-success">
                                            {formatCurrency(promotion.proposedSalary)}
                                        </div>
                                    </div>
                                </div>

                                {salaryIncrease && (
                                    <div className="salary-increase-info">
                                        <div className="increase-item">
                                            <label>Increase Amount:</label>
                                            <span className="increase-value">
                                                +{formatCurrency(salaryIncrease.increase)}
                                            </span>
                                        </div>
                                        <div className="increase-item">
                                            <label>Percentage Increase:</label>
                                            <span className="increase-percentage">
                                                +{salaryIncrease.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="effective-date">
                                    <Calendar size={16} />
                                    <span>Proposed Effective Date: {formatDate(promotion.proposedEffectiveDate)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Justification & Details */}
                        <div className="review-section">
                            <div className="section-header">
                                <MessageSquare size={20} />
                                <h3>Justification & Supporting Information</h3>
                            </div>

                            <div className="justification-card">
                                <div className="justification-item">
                                    <h4>Promotion Justification</h4>
                                    <p>{promotion.justification}</p>
                                </div>

                                {promotion.performanceRating && (
                                    <div className="justification-item">
                                        <h4>Performance Rating</h4>
                                        <span className="performance-badge">
                                            {promotion.performanceRating.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}

                                {promotion.educationalQualifications && (
                                    <div className="justification-item">
                                        <h4>Educational Qualifications</h4>
                                        <p>{promotion.educationalQualifications}</p>
                                    </div>
                                )}

                                {promotion.additionalCertifications && (
                                    <div className="justification-item">
                                        <h4>Additional Certifications</h4>
                                        <p>{promotion.additionalCertifications}</p>
                                    </div>
                                )}

                                {promotion.requiresAdditionalTraining && (
                                    <div className="justification-item">
                                        <h4>Training Requirements</h4>
                                        <p>{promotion.trainingPlan || 'Additional training required but no specific plan provided.'}</p>
                                    </div>
                                )}

                                {promotion.hrComments && (
                                    <div className="justification-item">
                                        <h4>HR Comments</h4>
                                        <p>{promotion.hrComments}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Review Form */}
                        <div className="review-section">
                            <div className="section-header">
                                <AlertTriangle size={20} />
                                <h3>HR Review & Decision</h3>
                            </div>

                            <div className="review-form">
                                <div className="form-group">
                                    <label htmlFor="managerComments" className="required">
                                        Review Comments
                                    </label>
                                    <textarea
                                        id="managerComments"
                                        name="managerComments"
                                        value={reviewData.managerComments}
                                        onChange={handleInputChange}
                                        className={`form-control ${errors.managerComments ? 'error' : ''}`}
                                        rows="4"
                                        placeholder="Provide detailed review comments explaining your decision..."
                                        required
                                    />
                                    {errors.managerComments && (
                                        <span className="error-message">{errors.managerComments}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="rejectionReason">
                                        Rejection Reason (Required if rejecting)
                                    </label>
                                    <textarea
                                        id="rejectionReason"
                                        name="rejectionReason"
                                        value={reviewData.rejectionReason}
                                        onChange={handleInputChange}
                                        className={`form-control ${errors.rejectionReason ? 'error' : ''}`}
                                        rows="3"
                                        placeholder="Provide specific reasons for rejection..."
                                    />
                                    {errors.rejectionReason && (
                                        <span className="error-message">{errors.rejectionReason}</span>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="approvedSalary">
                                            Approved Salary (Optional)
                                        </label>
                                        <input
                                            type="number"
                                            id="approvedSalary"
                                            name="approvedSalary"
                                            value={reviewData.approvedSalary}
                                            onChange={handleInputChange}
                                            className={`form-control ${errors.approvedSalary ? 'error' : ''}`}
                                            placeholder="Enter approved salary if different from proposed"
                                            step="0.01"
                                            min="0"
                                        />
                                        <div className="form-help-text">
                                            Leave empty to use proposed salary ({formatCurrency(promotion.proposedSalary)})
                                        </div>
                                        {errors.approvedSalary && (
                                            <span className="error-message">{errors.approvedSalary}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="actualEffectiveDate">
                                            Actual Effective Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            id="actualEffectiveDate"
                                            name="actualEffectiveDate"
                                            value={reviewData.actualEffectiveDate}
                                            onChange={handleInputChange}
                                            className={`form-control ${errors.actualEffectiveDate ? 'error' : ''}`}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        <div className="form-help-text">
                                            Leave empty to use proposed date ({formatDate(promotion.proposedEffectiveDate)})
                                        </div>
                                        {errors.actualEffectiveDate && (
                                            <span className="error-message">{errors.actualEffectiveDate}</span>
                                        )}
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
                        className="modal-btn-secondary"
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleReject}
                        className="modal-btn-danger"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="btn-loading-spinner"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <XCircle size={18} />
                                Reject Request
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleApprove}
                        className="btn-success"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="btn-loading-spinner"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                Approve Request
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewPromotionModal;
