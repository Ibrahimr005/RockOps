import React, { useState, useEffect } from 'react';
import {
    FiCheckCircle, FiX, FiUser, FiCalendar, FiRefreshCw,
    FiSend, FiClock, FiFlag
} from 'react-icons/fi';
import { offerService } from '../../../services/procurement/offerService';
import './OfferTimeline.scss';

const OfferTimeline = ({
                           offer,
                           variant = 'default',
                           showRetryInfo = true
                       }) => {
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [retryableEvents, setRetryableEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Fetch timeline data when component mounts or offer changes
    useEffect(() => {
        const fetchTimelineData = async () => {
            if (!offer?.id) return;

            try {
                setLoading(true);
                setError(null);

                // Get complete timeline events from API
                const timeline = await offerService.getTimeline(offer.id);
                setTimelineEvents(timeline || []);

                // Get retryable events for retry buttons
                const retryable = await offerService.getRetryableEvents(offer.id);
                setRetryableEvents(retryable || []);

            } catch (err) {
                console.error('Error fetching timeline:', err);
                setError('Failed to load timeline');
            } finally {
                setLoading(false);
            }
        };

        fetchTimelineData();
    }, [offer?.id]);

    // Update timeline line height after render
    useEffect(() => {
        const updateTimelineHeight = () => {
            const timelineSteps = document.querySelector('.timeline-steps');
            const lastStep = document.querySelector('.timeline-step:last-child');
            const timelineLine = document.querySelector('.timeline-steps::before');

            if (timelineSteps && lastStep) {
                const lastStepPosition = lastStep.offsetTop + 10; // 10px to reach the circle center
                timelineSteps.style.setProperty('--timeline-height', `${lastStepPosition}px`);
            }
        };

        if (!loading) {
            // Small delay to ensure DOM is updated
            setTimeout(updateTimelineHeight, 50);
        }
    }, [timelineEvents, loading]);

    // Convert timeline events to display steps
    const getTimelineSteps = () => {
        const steps = [];

        // 1. Request Order Approved (if exists)
        if (offer?.requestOrder) {
            steps.push({
                id: 'request-approved',
                title: 'Request Order Approved',
                status: 'active',
                date: formatDate(offer.requestOrder.approvedAt),
                user: offer.requestOrder.approvedBy || 'N/A',
                dateLabel: 'Approved at',
                userLabel: 'Approved by',
                eventType: 'REQUEST_APPROVED'
            });
        }

        // 2. Add all timeline events from database
        timelineEvents.forEach((event) => {
            const step = convertEventToStep(event);
            if (step) {
                steps.push(step);
            }
        });

        // 3. Add pending manager review step ONLY if offer is submitted but no manager decision yet
        if (offer?.status === 'SUBMITTED' &&
            !timelineEvents.some(e => e.eventType === 'MANAGER_ACCEPTED' || e.eventType === 'MANAGER_REJECTED')) {
            steps.push({
                id: 'pending-manager-review',
                title: 'Awaiting Management Review',
                status: 'pending', // EMPTY circle
                date: '',
                user: '',
                dateLabel: '',
                userLabel: '',
                eventType: 'PENDING_MANAGER_REVIEW',
                description: 'Manager will review and either accept or reject this offer'
            });
        }

        // DEBUG LOGGING - Add this right before calling addPendingSteps
        console.log('=== TIMELINE DEBUG ===');
        console.log('offer.status:', offer?.status);
        console.log('timelineEvents:', timelineEvents);
        console.log('timelineEvents length:', timelineEvents.length);
        console.log('has OFFER_SUBMITTED:', timelineEvents.some(e => e.eventType === 'OFFER_SUBMITTED'));
        console.log('steps before addPendingSteps:', steps);

        // 4. Add pending steps based on current status
        addPendingSteps(steps, offer);

        console.log('steps after addPendingSteps:', steps);
        console.log('=== END TIMELINE DEBUG ===');

        return steps;
    };

    // Convert timeline event to display step
    const convertEventToStep = (event) => {
        let status = 'active'; // Green circle for completed events

        // Determine status based on event type
        switch (event.eventType) {
            case 'MANAGER_REJECTED':
            case 'FINANCE_REJECTED':
                status = 'rejected';
                break;
            case 'OFFER_RETRIED':
                status = 'active'; // Green for completed retry
                break;
            case 'OFFER_SUBMITTED':
                status = 'active'; // GREEN circle - submission is completed
                break;
            case 'MANAGER_ACCEPTED':
            case 'FINANCE_ACCEPTED':
                status = 'active'; // Green for completed acceptances
                break;
            case 'FINANCE_PARTIALLY_ACCEPTED':
                status = 'partial';
                break;
            default:
                status = 'active';
        }

        const step = {
            id: `timeline-${event.id}`,
            title: event.displayTitle,
            status: status,
            date: formatDate(event.eventTime),
            user: event.actionBy || 'N/A',
            dateLabel: getDateLabel(event.eventType),
            userLabel: getUserLabel(event.eventType),
            eventType: event.eventType,
            rejectionReason: event.notes,
            // Remove description for OFFER_SUBMITTED events
            description: event.eventType === 'OFFER_SUBMITTED' ? null : event.displayDescription,
            attemptNumber: event.attemptNumber
        };

        return step;
    };

    // Get appropriate date label for event type
    const getDateLabel = (eventType) => {
        switch (eventType) {
            case 'OFFER_SUBMITTED': return 'Submitted at';
            case 'MANAGER_ACCEPTED': return 'Accepted at';
            case 'MANAGER_REJECTED': return 'Rejected at';
            case 'OFFER_RETRIED': return 'Retried at';
            case 'FINANCE_ACCEPTED': return 'Approved at';
            case 'FINANCE_REJECTED': return 'Rejected at';
            case 'FINANCE_PARTIALLY_ACCEPTED': return 'Partially approved at';
            case 'OFFER_FINALIZING': return 'Finalized at';  // Changed from "Finalizing at"
            case 'OFFER_FINALIZED': return 'Finalized at';
            case 'OFFER_COMPLETED': return 'Completed at';
            default: return 'Processed at';
        }
    };

    // Get appropriate user label for event type
    const getUserLabel = (eventType) => {
        switch (eventType) {
            case 'OFFER_SUBMITTED': return 'Submitted by';
            case 'MANAGER_ACCEPTED': return 'Accepted by';
            case 'MANAGER_REJECTED': return 'Rejected by';
            case 'OFFER_RETRIED': return 'Retried by';
            case 'FINANCE_ACCEPTED': return 'Approved by';
            case 'FINANCE_REJECTED': return 'Rejected by';
            case 'FINANCE_PARTIALLY_ACCEPTED': return 'Partially approved by';
            case 'OFFER_FINALIZING': return 'Finalized by';  // Changed from "Finalizing by"
            case 'OFFER_FINALIZED': return 'Finalized by';
            case 'OFFER_COMPLETED': return 'Completed by';
            default: return 'Processed by';
        }
    };

    // Add pending steps based on current offer status
    const addPendingSteps = (steps, offer) => {
        if (!offer) return;

        console.log('addPendingSteps called with offer.status:', offer.status);

        // Get the latest timeline event to understand current state
        const latestEvent = timelineEvents.length > 0 ? timelineEvents[timelineEvents.length - 1] : null;
        console.log('latestEvent:', latestEvent);

        // 1. If offer is INPROGRESS or UNSTARTED, show procurement solutions step
        const isInProgressOrUnstarted = (offer.status === 'INPROGRESS' || offer.status === 'UNSTARTED');
        const hasNoSubmittedEvent = !timelineEvents.some(e => e.eventType === 'OFFER_SUBMITTED');

        console.log('isInProgressOrUnstarted:', isInProgressOrUnstarted);
        console.log('hasNoSubmittedEvent:', hasNoSubmittedEvent);

        if (isInProgressOrUnstarted) {
            console.log('Adding procurement solutions step');
            steps.push({
                id: 'pending-procurement-solutions',
                title: 'Adding Procurement Solutions',
                status: 'pending',
                date: '',
                user: '',
                dateLabel: '',
                userLabel: '',
                eventType: 'PENDING_PROCUREMENT_SOLUTIONS',
                description: 'Procurement team is finding and adding solutions that satisfy the required items and quantities'
            });
            return; // Don't add more steps after this
        }

        // Skip manager review step - it's already handled in getTimelineSteps()

        // 2. If manager accepted but finance hasn't processed yet
        if (offer.status === 'MANAGERACCEPTED' &&
            !timelineEvents.some(e => ['FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED'].includes(e.eventType))) {
            steps.push({
                id: 'pending-finance',
                title: 'Finance Processing',
                status: 'pending',
                date: 'Pending',
                user: 'Finance Department',
                dateLabel: 'Awaiting review',
                userLabel: 'Pending review from',
                eventType: 'FINANCE_PROCESSING',
                description: 'Finance team will review each item and approve or reject'
            });
            return; // Don't add more steps after this
        }

        // 3. If finance has completed review (any finance status) but not yet finalizing/finalized/completed
        const hasFinanceDecision = timelineEvents.some(e =>
            ['FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED'].includes(e.eventType)
        );

        const isFinanceComplete = offer.status === 'FINANCE_ACCEPTED' ||
            offer.status === 'FINANCE_REJECTED' ||
            offer.status === 'FINANCE_PARTIALLY_ACCEPTED' ||
            (offer.financeStatus && ['FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED'].includes(offer.financeStatus));

        if ((hasFinanceDecision || isFinanceComplete) &&
            !['FINALIZING', 'FINALIZED', 'COMPLETED'].includes(offer.status)) {

            // Only show finalization step if there are accepted items
            const hasAcceptedItems = offer.offerItems && offer.offerItems.some(item =>
                item.financeStatus === 'ACCEPTED'
            );

            if (hasAcceptedItems) {
                steps.push({
                    id: 'pending-finalization',
                    title: 'Awaiting Finalization',
                    status: 'pending',
                    date: '',
                    user: '',
                    dateLabel: '',
                    userLabel: '',
                    eventType: 'PENDING_FINALIZATION',
                    description: 'Procurement team will finalize accepted items and create purchase orders'
                });
            }
            return; // Don't add more steps after this
        }

        // 4. If offer is in FINALIZING status but not yet completed
        if (offer.status === 'FINALIZING' && !timelineEvents.some(e =>
            ['OFFER_FINALIZED', 'OFFER_COMPLETED'].includes(e.eventType))) {
            steps.push({
                id: 'pending-completion',
                title: 'Completing Finalization',
                status: 'pending',
                date: '',
                user: '',
                dateLabel: '',
                userLabel: '',
                eventType: 'PENDING_COMPLETION',
                description: 'Creating purchase orders and completing the offer process'
            });
        }
    };

    // Get description based on offer status and retry count
    const getDescription = () => {
        if (!offer) return 'Loading offer information...';

        const totalAttempts = offer.currentAttemptNumber || 1;
        let baseDescription = '';

        if (offer.status === 'MANAGERACCEPTED' &&
            !['FINANCE_ACCEPTED', 'FINANCE_REJECTED', 'FINANCE_PARTIALLY_ACCEPTED'].includes(offer.financeStatus)) {
            baseDescription = 'This offer has been accepted by the manager and is now being processed by finance.';
        } else if (offer.status === 'MANAGERREJECTED') {
            baseDescription = 'This offer has been rejected by the manager.';
        } else if (['FINANCE_ACCEPTED', 'FINANCE_PARTIALLY_ACCEPTED'].includes(offer.financeStatus)) {
            baseDescription = 'This offer has been processed by finance and is ready for finalization.';
        } else if (offer.financeStatus === 'FINANCE_REJECTED') {
            baseDescription = 'This offer has been rejected by finance.';
        } else if (offer.status === 'COMPLETED') {
            baseDescription = 'This offer has been completed and a purchase order has been created.';
        } else if (offer.status === 'SUBMITTED') {
            baseDescription = 'This offer has been submitted to management for review and approval.';
        } else {
            baseDescription = 'Track the progress of this offer through the approval process.';
        }

        if (totalAttempts > 1) {
            baseDescription += ` This is attempt #${totalAttempts} after ${totalAttempts - 1} previous ${totalAttempts === 2 ? 'rejection' : 'rejections'}.`;
        }

        return baseDescription;
    };

    // Get rejection reasons from timeline steps
    const getRejectionReasons = () => {
        const timelineSteps = getTimelineSteps();
        return timelineSteps.filter(step =>
            step.rejectionReason &&
            (step.eventType === 'MANAGER_REJECTED' || step.eventType === 'FINANCE_REJECTED')
        );
    };

    if (!offer) return null;

    if (loading) {
        return (
            <div className="offer-timeline">
                <div className="timeline-header">
                    <h4>Offer Timeline</h4>
                    <p>Loading timeline...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="offer-timeline">
                <div className="timeline-header">
                    <h4>Offer Timeline</h4>
                    <p className="error-message">{error}</p>
                </div>
            </div>
        );
    }

    const timelineSteps = getTimelineSteps();

    return (
        <div className={`offer-timeline offer-timeline-${variant}`}>
            <div className="timeline-header">
                <h4>Offer Timeline</h4>
                <p className="timeline-description">
                    {getDescription()}
                </p>
            </div>

            <div className="timeline-steps">
                {timelineSteps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`timeline-step timeline-step-${step.status}`}
                        data-event-type={step.eventType}
                    >
                        <div className="timeline-step-content">
                            <h5 className="timeline-step-title">
                                {step.title}
                            </h5>
                            <div className="timeline-step-meta">
                                {step.dateLabel && step.date && (
                                    <p className="timeline-step-date">
                                        <FiCalendar size={14} /> {step.dateLabel}: {step.date}
                                    </p>
                                )}
                                {step.userLabel && step.user && (
                                    <p className="timeline-step-user">
                                        <FiUser size={14} /> {step.userLabel}: {step.user}
                                    </p>
                                )}
                                {step.description && (
                                    <p className="timeline-step-description">
                                        {step.description}
                                    </p>
                                )}
                                {step.rejectionReason && (step.eventType === 'MANAGER_REJECTED' || step.eventType === 'FINANCE_REJECTED') && (
                                    <p className="timeline-rejection-reason">
                                        <strong>Rejection Reason:</strong> <span className="rejection-content">{step.rejectionReason}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OfferTimeline;