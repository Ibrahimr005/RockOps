import React from 'react';
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaGlobeAmericas,
    FaBriefcase,
    FaBuilding,
    FaCalendarAlt,
    FaStickyNote,
    FaFilePdf,
    FaEdit,
    FaUserCheck,
    FaTrashAlt,
    FaTimes,
    FaClock,
    FaCheckCircle
} from 'react-icons/fa';
import './CandidateDetailsModal.scss';

const CandidateDetailsModal = ({
                                   candidate,
                                   onClose,
                                   onEdit,
                                   onHire,
                                   onDelete,
                                   vacancyStats
                               }) => {

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Get status display using global status badge classes
    const getStatusDisplay = (status) => {
        const statusMap = {
            'APPLIED': { text: 'Applied', class: 'info', icon: <FaUser /> },
            'UNDER_REVIEW': { text: 'Under Review', class: 'under-review', icon: <FaClock /> },
            'INTERVIEWED': { text: 'Interviewed', class: 'processing', icon: <FaCheckCircle /> },
            'PENDING_HIRE': { text: 'Pending Hire', class: 'pending', icon: <FaClock /> },
            'HIRED': { text: 'Hired', class: 'completed', icon: <FaUserCheck /> },
            'REJECTED': { text: 'Rejected', class: 'rejected', icon: <FaTimes /> },
            'POTENTIAL': { text: 'Potential', class: 'draft', icon: <FaUser /> },
            'WITHDRAWN': { text: 'Withdrawn', class: 'cancelled', icon: <FaTimes /> }
        };

        return statusMap[status] || { text: status || 'N/A', class: 'draft', icon: <FaUser /> };
    };

    const statusDisplay = getStatusDisplay(candidate.candidateStatus);

    // Check if actions should be disabled
    const isHired = candidate.candidateStatus === 'HIRED';
    const isPendingHire = candidate.candidateStatus === 'PENDING_HIRE';
    const canHire = !isHired && !(vacancyStats?.isFull && candidate.candidateStatus !== 'POTENTIAL');

    return (
        <div className="modal-backdrop">
            <div className="modal-container modal-lg">
                {/* Modal Header - Using global modal header with primary gradient */}
                <div className="modal-header ">
                    <div className="candidate-header-content">
                        <div className="candidate-avatar">
                            <FaUser />
                        </div>
                        <div className="candidate-basic-info">
                            <h2 className="modal-title">{candidate.firstName} {candidate.lastName}</h2>
                            <p className="modal-subtitle">{candidate.currentPosition || 'No position specified'}</p>
                            <div className={`status-badge large ${statusDisplay.class}`}>
                                {statusDisplay.icon}
                                <span>{statusDisplay.text}</span>
                            </div>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* Modal Body - Using global modal body */}
                <div className="modal-body">
                    {/* Contact Information Section */}
                    <div className="modal-section">
                        <h3 className="modal-section-title">
                            <FaEnvelope />
                            Contact Information
                        </h3>
                        <div className="candidate-details-grid">
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaEnvelope />
                                    Email
                                </div>
                                <div className="candidate-detail-value">
                                    {candidate.email || 'Not provided'}
                                </div>
                            </div>
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaPhone />
                                    Phone
                                </div>
                                <div className="candidate-detail-value">
                                    {candidate.phoneNumber || 'Not provided'}
                                </div>
                            </div>
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaGlobeAmericas />
                                    Country
                                </div>
                                <div className="candidate-detail-value">
                                    {candidate.country || 'Not specified'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Information Section */}
                    <div className="modal-section">
                        <h3 className="modal-section-title">
                            <FaBriefcase />
                            Professional Information
                        </h3>
                        <div className="candidate-details-grid">
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaBriefcase />
                                    Current Position
                                </div>
                                <div className="candidate-detail-value">
                                    {candidate.currentPosition || 'Not specified'}
                                </div>
                            </div>
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaBuilding />
                                    Current Company
                                </div>
                                <div className="candidate-detail-value">
                                    {candidate.currentCompany || 'Not specified'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Application Information Section */}
                    <div className="modal-section">
                        <h3 className="modal-section-title">
                            <FaCalendarAlt />
                            Application Information
                        </h3>
                        <div className="candidate-details-grid">
                            <div className="candidate-detail-item">
                                <div className="candidate-detail-label">
                                    <FaCalendarAlt />
                                    Application Date
                                </div>
                                <div className="candidate-detail-value">
                                    {formatDate(candidate.applicationDate)}
                                </div>
                            </div>
                            {candidate.hiredDate && (
                                <div className="candidate-detail-item">
                                    <div className="candidate-detail-label">
                                        <FaUserCheck />
                                        Hired Date
                                    </div>
                                    <div className="candidate-detail-value">
                                        {formatDate(candidate.hiredDate)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resume Section */}
                    {candidate.resumeUrl && (
                        <div className="modal-section">
                            <h3 className="modal-section-title">
                                <FaFilePdf />
                                Resume/CV
                            </h3>
                            <div className="candidate-resume-section">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => window.open(candidate.resumeUrl, '_blank')}
                                >
                                    <FaFilePdf />
                                    View Resume/CV
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    {candidate.notes && (
                        <div className="modal-section">
                            <h3 className="modal-section-title">
                                <FaStickyNote />
                                Notes
                            </h3>
                            <div className="candidate-notes-content">
                                <p>{candidate.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Information */}
                    {isPendingHire && (
                        <div className="modal-section">
                            <div className="modal-warning">
                                <FaClock />
                                <div>
                                    <h4>Pending Hire Status</h4>
                                    <p>This candidate is marked as pending hire. Complete the employee form to finalize the hiring process.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vacancy Full Notice */}
                    {vacancyStats?.isFull && candidate.candidateStatus !== 'POTENTIAL' && !isHired && (
                        <div className="modal-section">
                            <div className="modal-error">
                                <FaTimes />
                                <div>
                                    <h4>Vacancy Full</h4>
                                    <p>This vacancy is currently full. This candidate cannot be hired unless moved to potential list first.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer - Using global modal footer with space between */}
                <div className="candidate-modal-footer modal-footer-between">
                    <button
                        className="modal-btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>

                    <div className="candidate-primary-actions">
                        {!isHired && (
                            <button
                                className="btn btn-primary"
                                onClick={onEdit}
                            >
                                <FaEdit />
                                Edit
                            </button>
                        )}

                        {canHire && (
                            <button
                                className={`btn ${isPendingHire ? 'modal-btn-warning' : 'btn-success'}`}
                                onClick={onHire}
                            >
                                {isPendingHire ? <FaClock /> : <FaUserCheck />}
                                {isPendingHire ? 'Complete Hiring' : 'Hire'}
                            </button>
                        )}

                        {isHired && (
                            <div className="status-badge completed">
                                <FaUserCheck />
                                Already Hired
                            </div>
                        )}

                        {!isHired && (
                            <button
                                className="modal-btn-danger"
                                onClick={onDelete}
                            >
                                <FaTrashAlt />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CandidateDetailsModal;