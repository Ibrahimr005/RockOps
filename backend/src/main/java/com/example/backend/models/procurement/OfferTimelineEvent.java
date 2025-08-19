package com.example.backend.models.procurement;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "offer_timeline_events")
public class OfferTimelineEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offer_id", nullable = false)
    @JsonBackReference
    private Offer offer;

    // Event identification
    @Enumerated(EnumType.STRING)
    private TimelineEventType eventType;

    private int attemptNumber; // Which attempt this event belongs to

    // Event details - ALL timeline info goes here!
    private LocalDateTime eventTime; // When this event happened
    private String actionBy; // Who performed this action

    // Additional context
    private String notes; // Rejection reason, comments, etc.
    private String additionalData; // JSON field for any extra data

    // Status tracking
    private String previousStatus; // What the status was before this event
    private String newStatus; // What the status became after this event

    // Display information
    private String displayTitle; // "Offer Submitted (Attempt #2)"
    private String displayDescription; // "Submitted for manager review"

    // Retry capability flags
    private boolean canRetryFromHere = false; // Can user retry from this point?
    private String retryToStatus; // What status to go to when retrying (INPROGRESS, UNSTARTED)

    // Metadata
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (eventTime == null) {
            eventTime = LocalDateTime.now();
        }

        // Set retry capability based on event type
        if (eventType == TimelineEventType.MANAGER_REJECTED ||
                eventType == TimelineEventType.FINANCE_REJECTED) {
            canRetryFromHere = true;
            retryToStatus = "INPROGRESS";
        }
    }

    // Helper methods
    public boolean isRejectionEvent() {
        return eventType == TimelineEventType.MANAGER_REJECTED ||
                eventType == TimelineEventType.FINANCE_REJECTED;
    }

    public boolean isSubmissionEvent() {
        return eventType == TimelineEventType.OFFER_SUBMITTED;
    }

    public boolean isAcceptanceEvent() {
        return eventType == TimelineEventType.MANAGER_ACCEPTED ||
                eventType == TimelineEventType.FINANCE_ACCEPTED ||
                eventType == TimelineEventType.FINANCE_PARTIALLY_ACCEPTED;
    }

    public boolean isRetryEvent() {
        return eventType == TimelineEventType.OFFER_RETRIED;
    }
}