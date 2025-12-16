import React from 'react';
import { FaCircle, FaCheckCircle, FaShoppingCart, FaDollarSign, FaCalculator, FaTruck, FaFlagCheckered } from 'react-icons/fa';
import './DirectPurchaseTimeline.scss';

const DirectPurchaseTimeline = ({ ticket }) => {
    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimelineEvents = () => {
        const events = [];

        // Ticket created
        if (ticket.createdAt) {
            events.push({
                time: ticket.createdAt,
                icon: <FaShoppingCart />,
                event: 'Ticket Created',
                description: `Direct purchase ticket "${ticket.title || 'Untitled'}" was created`,
                status: 'completed'
            });
        }

        // Step 1: Creation
        if (ticket.step1StartedAt) {
            events.push({
                time: ticket.step1StartedAt,
                icon: <FaCircle />,
                event: 'Step 1 Started',
                description: 'Creation step initiated',
                status: ticket.step1Completed ? 'completed' : 'in-progress'
            });
        }

        if (ticket.step1CompletedAt) {
            events.push({
                time: ticket.step1CompletedAt,
                icon: <FaCheckCircle />,
                event: 'Step 1 Completed',
                description: 'Creation step completed successfully',
                status: 'completed'
            });
        }

        // Step 2: Purchasing
        if (ticket.step2StartedAt) {
            events.push({
                time: ticket.step2StartedAt,
                icon: <FaDollarSign />,
                event: 'Step 2 Started',
                description: 'Purchasing step initiated',
                status: ticket.step2Completed ? 'completed' : 'in-progress'
            });
        }

        if (ticket.merchantName) {
            events.push({
                time: ticket.step2StartedAt || ticket.updatedAt,
                icon: <FaCircle />,
                event: 'Merchant Selected',
                description: `Merchant: ${ticket.merchantName}`,
                status: 'info'
            });
        }

        if (ticket.step2CompletedAt) {
            events.push({
                time: ticket.step2CompletedAt,
                icon: <FaCheckCircle />,
                event: 'Step 2 Completed',
                description: 'Purchasing details finalized',
                status: 'completed'
            });
        }

        // Step 3: Finalize Purchasing
        if (ticket.step3StartedAt) {
            events.push({
                time: ticket.step3StartedAt,
                icon: <FaCalculator />,
                event: 'Step 3 Started',
                description: 'Finalize purchasing step initiated',
                status: ticket.step3Completed ? 'completed' : 'in-progress'
            });
        }

        if (ticket.step3CompletedAt) {
            events.push({
                time: ticket.step3CompletedAt,
                icon: <FaCheckCircle />,
                event: 'Step 3 Completed',
                description: 'Actual costs recorded and payment finalized',
                status: 'completed'
            });
        }

        // Step 4: Transporting
        if (ticket.step4StartedAt) {
            events.push({
                time: ticket.step4StartedAt,
                icon: <FaTruck />,
                event: 'Step 4 Started',
                description: 'Transportation step initiated',
                status: ticket.step4Completed ? 'completed' : 'in-progress'
            });
        }

        if (ticket.transportToSiteName) {
            events.push({
                time: ticket.step4StartedAt || ticket.updatedAt,
                icon: <FaCircle />,
                event: 'Transport Details Added',
                description: `Destination: ${ticket.transportToSiteName}`,
                status: 'info'
            });
        }

        if (ticket.step4CompletedAt) {
            events.push({
                time: ticket.step4CompletedAt,
                icon: <FaCheckCircle />,
                event: 'Step 4 Completed',
                description: 'Transportation arranged',
                status: 'completed'
            });
        }

        // Ticket completed
        if (ticket.completedAt) {
            events.push({
                time: ticket.completedAt,
                icon: <FaFlagCheckered />,
                event: 'Ticket Completed',
                description: 'Direct purchase ticket marked as completed',
                status: 'success'
            });
        }

        // Sort by time (newest first)
        return events.sort((a, b) => new Date(b.time) - new Date(a.time));
    };

    const events = getTimelineEvents();

    if (events.length === 0) {
        return (
            <div className="timeline-empty">
                <p>No timeline events available yet.</p>
            </div>
        );
    }

    return (
        <div className="direct-purchase-timeline">
            {events.map((event, index) => (
                <div key={index} className={`timeline-event ${event.status}`}>
                    <div className="timeline-icon-wrapper">
                        <div className="timeline-icon">{event.icon}</div>
                        {index < events.length - 1 && <div className="timeline-line"></div>}
                    </div>
                    <div className="timeline-content">
                        <div className="timeline-header">
                            <strong className="timeline-event-name">{event.event}</strong>
                            <span className="timeline-time">{formatDateTime(event.time)}</span>
                        </div>
                        <p className="timeline-description">{event.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DirectPurchaseTimeline;
