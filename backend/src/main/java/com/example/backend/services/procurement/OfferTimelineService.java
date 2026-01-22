package com.example.backend.services.procurement;

import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferTimelineEvent;
import com.example.backend.models.procurement.Offer.TimelineEventType;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferTimelineEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
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
        int attemptNumber = offer.getCurrentAttemptNumber();
        offer.setStatus("SUBMITTED");

        // Create timeline event - ALL submission info goes here
        createTimelineEvent(offer.getId(), TimelineEventType.OFFER_SUBMITTED, submittedBy,
                null, previousStatus, "SUBMITTED", attemptNumber);

        return offerRepository.save(offer);
    }

    /**
     * Manager accepts the offer
     */
    public Offer acceptOfferByManager(UUID offerId, String managerName) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        int attemptNumber = offer.getCurrentAttemptNumber();
        offer.setStatus("MANAGERACCEPTED");

        // Create timeline event - ALL approval info goes here
        createTimelineEvent(offer.getId(), TimelineEventType.MANAGER_ACCEPTED, managerName,
                null, previousStatus, "MANAGERACCEPTED", attemptNumber);

        return offerRepository.save(offer);
    }

    /**
     * Manager rejects the offer
     */
    public Offer rejectOfferByManager(UUID offerId, String managerName, String rejectionReason) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        int attemptNumber = offer.getCurrentAttemptNumber();
        offer.setStatus("MANAGERREJECTED");

        // Create timeline event with rejection reason - ALL rejection info goes here
        createTimelineEvent(offer.getId(), TimelineEventType.MANAGER_REJECTED, managerName,
                rejectionReason, previousStatus, "MANAGERREJECTED", attemptNumber);

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
        int attemptNumber = offer.getCurrentAttemptNumber();

        // Create retry timeline event FIRST
        createTimelineEvent(offer.getId(), TimelineEventType.OFFER_RETRIED, retriedBy,
                "Offer retried due to previous rejection",
                previousStatus, "INPROGRESS", attemptNumber);

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
        int attemptNumber = offer.getCurrentAttemptNumber();
        offer.setStatus(status);

        TimelineEventType eventType;
        switch (status) {
            case "FINANCE_ACCEPTED" -> eventType = TimelineEventType.FINANCE_ACCEPTED;
            case "FINANCE_REJECTED" -> eventType = TimelineEventType.FINANCE_REJECTED;
            case "FINANCE_PARTIALLY_ACCEPTED" -> eventType = TimelineEventType.FINANCE_PARTIALLY_ACCEPTED;
            default -> eventType = TimelineEventType.FINANCE_PROCESSING;
        }

        // Create timeline event - ALL finance info goes here
        createTimelineEvent(offer.getId(), eventType, financeUser, notes,
                previousStatus, status, attemptNumber);

        return offerRepository.save(offer);
    }

    /**
     * Create a timeline event in a NEW transaction (separate from the main transaction)
     */

    public OfferTimelineEvent createTimelineEvent(UUID offerId, TimelineEventType eventType,
                                                  String actionBy, String notes,
                                                  String previousStatus, String newStatus,
                                                  int attemptNumber) {

        System.out.println("=== CREATE TIMELINE EVENT START ===");
        System.out.println("Offer ID: " + offerId);
        System.out.println("Event Type: " + eventType);

        try {
            String displayTitle = generateDisplayTitle(eventType, attemptNumber);
            String displayDescription = generateDisplayDescription(eventType, attemptNumber);

            // Create a detached offer with just the ID
            Offer offerReference = new Offer();
            offerReference.setId(offerId);

            OfferTimelineEvent event = OfferTimelineEvent.builder()
                    .offer(offerReference)
                    .eventType(eventType)
                    .attemptNumber(attemptNumber)
                    .eventTime(LocalDateTime.now())
                    .actionBy(actionBy)
                    .notes(notes)
                    .previousStatus(previousStatus)
                    .newStatus(newStatus)
                    .displayTitle(displayTitle)
                    .displayDescription(displayDescription)
                    .build();

            OfferTimelineEvent savedEvent = timelineEventRepository.save(event);
            System.out.println("✅ Timeline event saved with ID: " + savedEvent.getId());

            return savedEvent;

        } catch (Exception e) {
            System.err.println("❌ Timeline creation failed: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to create timeline event", e);
        }
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

    /**
     * Record offer split event for continue and return functionality
     */
    public OfferTimelineEvent recordOfferSplit(UUID offerId, String actionBy, int acceptedItemsCount, int remainingItemsCount) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        String previousStatus = offer.getStatus();
        int attemptNumber = offer.getCurrentAttemptNumber();
        String notes = String.format("Offer split: %d accepted items continued to finalization, %d remaining items created in new offer",
                acceptedItemsCount, remainingItemsCount);

        // Create timeline event for the split action
        return createTimelineEvent(offer.getId(), TimelineEventType.OFFER_SPLIT, actionBy, notes,
                previousStatus, "PROCESSED_SPLIT", attemptNumber);
    }

    /**
     * Save timeline event
     */
    public void saveTimelineEvent(OfferTimelineEvent event) {
        timelineEventRepository.save(event);
    }
}