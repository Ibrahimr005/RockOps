import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import { candidateService } from '../../../services/hr/candidateService';
import './CandidateStatusDropdown.scss';

const CandidateStatusDropdown = ({
                                     candidate,
                                     onStatusChange,
                                     disabled = false,
                                     showSuccess,
                                     showError
                                 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Load available statuses when component mounts
    useEffect(() => {
        if (candidate?.id) {
            loadAvailableStatuses();
        }
    }, [candidate?.id]);

    const loadAvailableStatuses = async () => {
        try {
            setLoading(true);
            const response = await candidateService.getAvailableStatuses(candidate.id);
            setAvailableStatuses(response.data || []);
        } catch (error) {
            console.error('Error loading available statuses:', error);
            // Fallback to basic statuses
            setAvailableStatuses(['APPLIED', 'UNDER_REVIEW', 'INTERVIEWED', 'HIRED', 'REJECTED']);
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplay = (status) => {
        const statusMap = {
            'APPLIED': { text: 'Applied', class: 'applied', icon: '📝' },
            'UNDER_REVIEW': { text: 'Under Review', class: 'under-review', icon: '👀' },
            'INTERVIEWED': { text: 'Interviewed', class: 'interviewed', icon: '💬' },
            'HIRED': { text: 'Hired', class: 'hired', icon: '✅' },
            'REJECTED': { text: 'Rejected', class: 'rejected', icon: '❌' },
            'POTENTIAL': { text: 'Potential', class: 'potential', icon: '⭐' },
            'WITHDRAWN': { text: 'Withdrawn', class: 'withdrawn', icon: '🚪' }
        };

        return statusMap[status] || { text: status, class: 'default', icon: '📋' };
    };

    const handleStatusSelect = async (newStatus) => {
        if (newStatus === candidate.candidateStatus) {
            setIsOpen(false);
            return;
        }

        // If selecting REJECTED, show reason modal
        if (newStatus === 'REJECTED') {
            setShowRejectionModal(true);
            setIsOpen(false);
            return;
        }

        await updateStatus(newStatus);
    };

    const updateStatus = async (newStatus, rejectionReason = null) => {
        try {
            setUpdating(true);

            const updateData = { status: newStatus };
            if (rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }

            await candidateService.updateStatus(candidate.id, updateData);

            showSuccess?.(`Status updated to ${getStatusDisplay(newStatus).text}`);
            onStatusChange?.(newStatus);

            // Reload available statuses for new state
            await loadAvailableStatuses();

        } catch (error) {
            console.error('Error updating status:', error);
            const errorMessage = error.response?.data?.message || 'Failed to update status';
            showError?.(errorMessage);
        } finally {
            setUpdating(false);
            setIsOpen(false);
        }
    };

    const handleRejectionSubmit = async () => {
        if (!rejectionReason.trim()) {
            showError?.('Please provide a reason for rejection');
            return;
        }

        await updateStatus('REJECTED', rejectionReason);
        setShowRejectionModal(false);
        setRejectionReason('');
    };

    const currentStatusDisplay = getStatusDisplay(candidate.candidateStatus);

    return (
        <div className="candidate-status-dropdown">
            <button
                className={`status-dropdown-trigger ${currentStatusDisplay.class} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && !updating && setIsOpen(!isOpen)}
                disabled={disabled || updating}
                type="button"
            >
                <span className="status-icon">{currentStatusDisplay.icon}</span>
                <span className="status-text">{currentStatusDisplay.text}</span>
                {updating ? (
                    <FaSpinner className="spinner" />
                ) : (
                    <FaChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
                )}
            </button>

            {isOpen && !disabled && (
                <div className="status-dropdown-menu">
                    {loading ? (
                        <div className="dropdown-loading">
                            <FaSpinner className="spinner" />
                            <span>Loading statuses...</span>
                        </div>
                    ) : (
                        availableStatuses.map(status => {
                            const statusDisplay = getStatusDisplay(status);
                            const isCurrent = status === candidate.candidateStatus;

                            return (
                                <button
                                    key={status}
                                    className={`status-dropdown-item ${statusDisplay.class} ${isCurrent ? 'current' : ''}`}
                                    onClick={() => handleStatusSelect(status)}
                                    disabled={isCurrent}
                                    type="button"
                                >
                                    <span className="status-icon">{statusDisplay.icon}</span>
                                    <span className="status-text">{statusDisplay.text}</span>
                                    {isCurrent && <FaCheck className="current-indicator" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Rejection Reason Modal */}
            {showRejectionModal && (
                <div className="rejection-modal-overlay">
                    <div className="rejection-modal">
                        <h3>Rejection Reason</h3>
                        <p>Please provide a reason for rejecting this candidate:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows="4"
                            maxLength="500"
                        />
                        <div className="rejection-modal-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRejectionModal(false);
                                    setRejectionReason('');
                                }}
                                className="btn-cancel"
                            >
                                <FaTimes /> Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRejectionSubmit}
                                className="btn-confirm"
                                disabled={!rejectionReason.trim()}
                            >
                                <FaCheck /> Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateStatusDropdown;