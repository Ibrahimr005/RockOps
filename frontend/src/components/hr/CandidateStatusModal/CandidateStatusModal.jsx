// CandidateStatusModal with hardcoded valid transitions matching backend
import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaStar, FaComment, FaInfoCircle, FaArrowRight } from 'react-icons/fa';
import StarRating from '../../common/StarRating/StarRating';
import './CandidateStatusModal.scss';

const CandidateStatusModal = ({
                                  isOpen,
                                  onClose,
                                  candidate,
                                  onStatusUpdate,
                                  isLoading = false
                              }) => {
    const [selectedStatus, setSelectedStatus] = useState(candidate?.candidateStatus || 'APPLIED');
    const [rejectionReason, setRejectionReason] = useState('');
    const [rating, setRating] = useState(candidate?.rating || 0);
    const [ratingNotes, setRatingNotes] = useState(candidate?.ratingNotes || '');
    const [showRejectionReason, setShowRejectionReason] = useState(false);

    // All possible status options with metadata
    const allStatusOptions = [
        { value: 'APPLIED', label: 'Applied', color: 'info', description: 'Initial application received' },
        { value: 'UNDER_REVIEW', label: 'Under Review', color: 'warning', description: 'Application is being reviewed by HR' },
        { value: 'INTERVIEWED', label: 'Interviewed', color: 'primary', description: 'Candidate has been interviewed' },
        { value: 'PENDING_HIRE', label: 'Pending Hire', color: 'pending', description: 'Ready to hire, awaiting employee form completion' },
        { value: 'HIRED', label: 'Hired', color: 'success', description: 'Successfully hired and onboarded' },
        { value: 'REJECTED', label: 'Rejected', color: 'danger', description: 'Application has been rejected' },
        { value: 'POTENTIAL', label: 'Potential', color: 'secondary', description: 'Moved to potential candidates list' },
        { value: 'WITHDRAWN', label: 'Withdrawn', color: 'muted', description: 'Candidate withdrew their application' }
    ];

    // Valid transitions map matching your backend exactly
    const getValidTransitions = (currentStatus) => {
        const transitionsMap = {
            'APPLIED': ['APPLIED', 'UNDER_REVIEW', 'INTERVIEWED', 'REJECTED', 'WITHDRAWN'],
            'UNDER_REVIEW': ['UNDER_REVIEW', 'INTERVIEWED', 'REJECTED', 'WITHDRAWN', 'APPLIED'],
            'INTERVIEWED': ['INTERVIEWED', 'APPLIED', 'REJECTED', 'WITHDRAWN'],
            'PENDING_HIRE': ['PENDING_HIRE', 'HIRED', 'REJECTED', 'WITHDRAWN', 'INTERVIEWED'],
            'HIRED': ['HIRED', 'POTENTIAL'],
            'REJECTED': ['REJECTED', 'POTENTIAL', 'APPLIED'],
            'POTENTIAL': ['POTENTIAL', 'APPLIED', 'UNDER_REVIEW'],
            'WITHDRAWN': ['WITHDRAWN', 'APPLIED', 'POTENTIAL']
        };

        return transitionsMap[currentStatus] || ['APPLIED'];
    };

    // Get valid status options based on current status
    const getValidStatusOptions = () => {
        const validTransitions = getValidTransitions(candidate?.candidateStatus || 'APPLIED');
        return allStatusOptions.filter(status => validTransitions.includes(status.value));
    };

    useEffect(() => {
        if (candidate && isOpen) {
            setSelectedStatus(candidate.candidateStatus || 'APPLIED');
            setRating(candidate.rating || 0);
            setRatingNotes(candidate.ratingNotes || '');
            setRejectionReason(candidate.rejectionReason || '');
        }
    }, [candidate, isOpen]);

    useEffect(() => {
        setShowRejectionReason(selectedStatus === 'REJECTED');
    }, [selectedStatus]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const updateData = {
            status: selectedStatus,
            rating: rating || null,
            ratingNotes: ratingNotes.trim() || null,
            rejectionReason: showRejectionReason ? rejectionReason.trim() || null : null
        };

        onStatusUpdate(updateData);
    };

    const handleClose = () => {
        setSelectedStatus(candidate?.candidateStatus || 'APPLIED');
        setRating(candidate?.rating || 0);
        setRatingNotes(candidate?.ratingNotes || '');
        setRejectionReason(candidate?.rejectionReason || '');
        onClose();
    };

    const getCurrentStatusInfo = () => {
        return allStatusOptions.find(s => s.value === candidate?.candidateStatus);
    };

    const getSelectedStatusInfo = () => {
        return allStatusOptions.find(s => s.value === selectedStatus);
    };

    if (!isOpen || !candidate) return null;

    const currentStatusInfo = getCurrentStatusInfo();
    const selectedStatusInfo = getSelectedStatusInfo();
    const validStatusOptions = getValidStatusOptions();
    const availableTransitions = getValidTransitions(candidate?.candidateStatus || 'APPLIED');

    return (
        <div className="modal-overlay">
            <div className="candidate-status-modal modal-content modal-lg">
                <div className="modal-header">
                    <div className="modal-title">
                        <FaUser />
                        Update Candidate Status
                    </div>
                    <button
                        className="modal-close-btn"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="candidate-info">
                        <h4>{candidate.firstName} {candidate.lastName}</h4>
                        <p>{candidate.currentPosition} • {candidate.email}</p>

                        {/* Current Status Display */}
                        <div className="current-status-info">
                            <div className="status-transition-display">
                                <div className="current-status">
                                    <span className="label">Current Status:</span>
                                    <span className={`status-badge ${currentStatusInfo?.color || 'info'}`}>
                                        {currentStatusInfo?.label || candidate.candidateStatus}
                                    </span>
                                </div>
                                {selectedStatus !== candidate.candidateStatus && selectedStatusInfo && (
                                    <>
                                        <FaArrowRight className="transition-arrow" />
                                        <div className="new-status">
                                            <span className="label">New Status:</span>
                                            <span className={`status-badge ${selectedStatusInfo.color}`}>
                                                {selectedStatusInfo.label}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            {selectedStatusInfo?.description && selectedStatus !== candidate.candidateStatus && (
                                <div className="status-description">
                                    <FaInfoCircle />
                                    {selectedStatusInfo.description}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Selection */}
                    <div className="form-group">
                        <label>Available Status Transitions</label>

                        <div className="transitions-info">
                            <small>
                                <FaInfoCircle />
                                Showing {availableTransitions.length} valid transitions from {currentStatusInfo?.label || candidate.candidateStatus}
                            </small>
                        </div>

                        <div className="status-options">
                            {validStatusOptions.map(status => {
                                const isCurrentStatus = status.value === candidate.candidateStatus;

                                return (
                                    <label
                                        key={status.value}
                                        className={`status-option ${isCurrentStatus ? 'current-status-option' : ''}`}
                                        title={status.description}
                                    >
                                        <input
                                            type="radio"
                                            name="status"
                                            value={status.value}
                                            checked={selectedStatus === status.value}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            disabled={isLoading}
                                        />
                                        <span className={`status-badge ${status.color}`}>
                                            {status.label}
                                            {isCurrentStatus && <span className="current-indicator"> (Current)</span>}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rating Section */}
                    <div className="form-group">
                        <label>
                            <FaStar /> Rating (Optional)
                        </label>
                        <StarRating
                            rating={rating}
                            onRatingChange={setRating}
                            readonly={isLoading}
                            size="large"
                            showLabel={true}
                        />
                    </div>

                    {/* Rating Notes */}
                    <div className="form-group">
                        <label>
                            <FaComment /> Rating Notes (Optional)
                        </label>
                        <textarea
                            value={ratingNotes}
                            onChange={(e) => setRatingNotes(e.target.value)}
                            placeholder="Add notes about the candidate's performance, skills, interview feedback, etc."
                            rows="3"
                            maxLength="500"
                            disabled={isLoading}
                        />
                        <small>{ratingNotes.length}/500 characters</small>
                    </div>

                    {/* Rejection Reason - only show if status is REJECTED */}
                    {showRejectionReason && (
                        <div className="form-group">
                            <label className="required">Rejection Reason</label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Please provide a reason for rejection..."
                                rows="3"
                                required={showRejectionReason}
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`btn btn-primary ${selectedStatus === 'REJECTED' ? 'btn-danger' : ''}`}
                        disabled={
                            isLoading ||
                            (showRejectionReason && !rejectionReason.trim())
                        }
                    >
                        {isLoading ? 'Updating...' : `Update to ${selectedStatusInfo?.label || 'Selected Status'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CandidateStatusModal;