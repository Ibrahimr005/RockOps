package com.example.backend.services.procurement;

import com.example.backend.models.procurement.*;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferTimelineEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class OfferTimelineService {

    private final OfferRepository offerRepository;
    private final OfferTimelineEventRepository timelineEventRepository;

    @Autowired
    public OfferTimelineService(OfferRepository offerRepository,
                                OfferTimelineEventRepository timelineEventRepository) {
        this.offerRepository = offerRepository;
        this.timelineEventRepository = timelineEventRepository;
    }

    /**
     * Submit offer for manager review
     */
    public Offer submitOffer(UUID offerId, String submittedBy) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        offer.setStatus("SUBMITTED");

        // Create timeline event - ALL submission info goes here
        createTimelineEvent(offer, TimelineEventType.OFFER_SUBMITTED, submittedBy,
                null, previousStatus, "SUBMITTED");

        return offerRepository.save(offer);
    }

    /**
     * Manager accepts the offer
     */
    public Offer acceptOfferByManager(UUID offerId, String managerName) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        offer.setStatus("MANAGERACCEPTED");

        // Create timeline event - ALL approval info goes here
        createTimelineEvent(offer, TimelineEventType.MANAGER_ACCEPTED, managerName,
                null, previousStatus, "MANAGERACCEPTED");

        return offerRepository.save(offer);
    }

    /**
     * Manager rejects the offer
     */
    public Offer rejectOfferByManager(UUID offerId, String managerName, String rejectionReason) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        offer.setStatus("MANAGERREJECTED");

        // Create timeline event with rejection reason - ALL rejection info goes here
        createTimelineEvent(offer, TimelineEventType.MANAGER_REJECTED, managerName,
                rejectionReason, previousStatus, "MANAGERREJECTED");

        return offerRepository.save(offer);
    }

    /**
     * Retry offer from any rejection point
     */
    public Offer retryOffer(UUID offerId, String retriedBy) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        if (!offer.canRetry()) {
            throw new IllegalStateException("This offer cannot be retried");
        }

        String previousStatus = offer.getStatus();

        // Create retry timeline event FIRST
        createTimelineEvent(offer, TimelineEventType.OFFER_RETRIED, retriedBy,
                "Offer retried due to previous rejection",
                previousStatus, "INPROGRESS");

        // Increment attempt and reset to in-progress
        offer.incrementAttemptNumber();
        offer.resetToInProgress();

        return offerRepository.save(offer);
    }

    /**
     * Finance processes the offer
     */
    public Offer processFinanceDecision(UUID offerId, String status,
                                        String financeUser, String notes) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getFinanceStatus();
        offer.setStatus(status);

        TimelineEventType eventType;
        switch (status) {
            case "FINANCE_ACCEPTED" -> eventType = TimelineEventType.FINANCE_ACCEPTED;
            case "FINANCE_REJECTED" -> eventType = TimelineEventType.FINANCE_REJECTED;
            case "FINANCE_PARTIALLY_ACCEPTED" -> eventType = TimelineEventType.FINANCE_PARTIALLY_ACCEPTED;
            default -> eventType = TimelineEventType.FINANCE_PROCESSING;
        }

        // Create timeline event - ALL finance info goes here
        createTimelineEvent(offer, eventType, financeUser, notes,
                previousStatus, status);

        return offerRepository.save(offer);
    }

    /**
     * Create a timeline event - this is where ALL the timeline data lives!
     */
    private OfferTimelineEvent createTimelineEvent(Offer offer, TimelineEventType eventType,
                                                   String actionBy, String notes,
                                                   String previousStatus, String newStatus) {

        String displayTitle = generateDisplayTitle(eventType, offer.getCurrentAttemptNumber());
        String displayDescription = generateDisplayDescription(eventType, offer.getCurrentAttemptNumber());

        OfferTimelineEvent event = OfferTimelineEvent.builder()
                .offer(offer)
                .eventType(eventType)
                .attemptNumber(offer.getCurrentAttemptNumber())
                .eventTime(LocalDateTime.now())
                .actionBy(actionBy)
                .notes(notes)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .displayTitle(displayTitle)
                .displayDescription(displayDescription)
                .build();

        // The @PrePersist will set canRetryFromHere automatically

        OfferTimelineEvent savedEvent = timelineEventRepository.save(event);
        offer.addTimelineEvent(savedEvent);

        return savedEvent;
    }

    /**
     * Generate display title for timeline event
     */
    private String generateDisplayTitle(TimelineEventType eventType, int attemptNumber) {
        String baseTitle = eventType.getDisplayName();

        if ((eventType.isSubmissionEvent() || eventType.isRejectionEvent() || eventType.isAcceptanceEvent())
                && attemptNumber > 1) {
            return baseTitle + " (Attempt #" + attemptNumber + ")";
        }

        return baseTitle;
    }

    /**
     * Generate display description for timeline event
     */
    private String generateDisplayDescription(TimelineEventType eventType, int attemptNumber) {
        return eventType.getDescription();
    }

    /**
     * Get complete timeline for an offer
     */
    public List<OfferTimelineEvent> getCompleteTimeline(UUID offerId) {
        return timelineEventRepository.findByOfferIdOrderByEventTimeAscCreatedAtAsc(offerId);
    }

    /**
     * Get events that can be retried from
     */
    public List<OfferTimelineEvent> getRetryableEvents(UUID offerId) {
        return timelineEventRepository.findByOfferIdOrderByEventTimeAscCreatedAtAsc(offerId)
                .stream()
                .filter(OfferTimelineEvent::isCanRetryFromHere)
                .toList();
    }
}