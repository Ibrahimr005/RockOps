package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.OfferTimelineEvent;
import com.example.backend.models.procurement.TimelineEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfferTimelineEventRepository extends JpaRepository<OfferTimelineEvent, UUID> {

    // Get all events for an offer, ordered by time
    List<OfferTimelineEvent> findByOfferIdOrderByEventTimeAscCreatedAtAsc(UUID offerId);

    // Get events for a specific attempt
    List<OfferTimelineEvent> findByOfferIdAndAttemptNumberOrderByEventTimeAsc(UUID offerId, int attemptNumber);

    // Get events of a specific type for an offer
    List<OfferTimelineEvent> findByOfferIdAndEventTypeOrderByEventTimeDesc(UUID offerId, TimelineEventType eventType);

    // Get the latest event of a specific type for an offer
    Optional<OfferTimelineEvent> findFirstByOfferIdAndEventTypeOrderByEventTimeDesc(UUID offerId, TimelineEventType eventType);

    // Get the latest event for a specific attempt
    Optional<OfferTimelineEvent> findFirstByOfferIdAndAttemptNumberOrderByEventTimeDesc(UUID offerId, int attemptNumber);

    // Count events by type
    long countByOfferIdAndEventType(UUID offerId, TimelineEventType eventType);

    // Count total submissions
    @Query("SELECT COUNT(e) FROM OfferTimelineEvent e WHERE e.offer.id = :offerId AND e.eventType = 'OFFER_SUBMITTED'")
    long countSubmissionsByOfferId(@Param("offerId") UUID offerId);

    // Count total rejections
    @Query("SELECT COUNT(e) FROM OfferTimelineEvent e WHERE e.offer.id = :offerId AND (e.eventType = 'MANAGER_REJECTED' OR e.eventType = 'FINANCE_REJECTED')")
    long countRejectionsByOfferId(@Param("offerId") UUID offerId);

    // Count total retries
    @Query("SELECT COUNT(e) FROM OfferTimelineEvent e WHERE e.offer.id = :offerId AND e.eventType = 'OFFER_RETRIED'")
    long countRetriesByOfferId(@Param("offerId") UUID offerId);

    // Get events within a date range
    List<OfferTimelineEvent> findByOfferIdAndEventTimeBetweenOrderByEventTimeAsc(
            UUID offerId, LocalDateTime startTime, LocalDateTime endTime);

    // Get all events for offers in a specific status
    @Query("SELECT e FROM OfferTimelineEvent e WHERE e.offer.status = :status ORDER BY e.eventTime DESC")
    List<OfferTimelineEvent> findByOfferStatusOrderByEventTimeDesc(@Param("status") String status);

    // Find the last submission event for an offer
    @Query("SELECT e FROM OfferTimelineEvent e WHERE e.offer.id = :offerId AND e.eventType = 'OFFER_SUBMITTED' ORDER BY e.eventTime DESC LIMIT 1")
    Optional<OfferTimelineEvent> findLatestSubmissionByOfferId(@Param("offerId") UUID offerId);
}