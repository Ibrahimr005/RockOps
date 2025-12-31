import React from 'react';
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaClock, FaUser, FaDollarSign, FaTools, FaFileAlt } from 'react-icons/fa';
import './MaintenanceTimeline.scss';

const MaintenanceTimeline = ({ events }) => {
    if (!events || events.length === 0) {
        return <div className="maintenance-timeline-empty">No timeline events recorded.</div>;
    }

    const getIcon = (type) => {
        switch (type) {
            case 'CREATED': return <FaFileAlt />;
            case 'APPROVED': return <FaCheckCircle />;
            case 'REJECTED': return <FaExclamationTriangle />;
            case 'SUBMITTED': return <FaClock />;
            case 'COMPLETED': return <FaTools />;
            case 'INFO': return <FaInfoCircle />;
            default: return <FaInfoCircle />;
        }
    };

    const getTypeClass = (type) => {
        return type ? type.toLowerCase() : 'info';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="maintenance-timeline">
            {events.map((event, index) => (
                <div key={index} className={`timeline-item ${getTypeClass(event.type)}`}>
                    <div className="timeline-marker">
                        {getIcon(event.type)}
                    </div>
                    <div className="timeline-content">
                        <div className="timeline-header">
                            <span className="timeline-title">{event.title}</span>
                            <span className="timeline-date">{formatDate(event.timestamp)}</span>
                        </div>
                        <div className="timeline-body">
                            <p className="timeline-description">{event.description}</p>
                            {event.actorName && (
                                <div className="timeline-actor">
                                    <FaUser size={12} />
                                    <span>{event.actorName}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MaintenanceTimeline;
