package com.example.backend.models.procurement;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Comparator;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Offer {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String createdBy;

    // ONLY current status - no historical data here!
    private String status; // UNSTARTED, INPROGRESS, SUBMITTED, MANAGERACCEPTED, MANAGERREJECTED, FINALIZING, COMPLETED
    private String financeStatus; // PENDING_FINANCE_REVIEW, FINANCE_ACCEPTED, FINANCE_REJECTED, FINANCE_PARTIALLY_ACCEPTED

    private LocalDateTime validUntil;
    private String notes;

    // Current attempt tracking
    private int currentAttemptNumber = 1;
    private int totalRetries = 0;

    // Timeline events - ALL historical data lives here!
    @OneToMany(mappedBy = "offer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("eventTime ASC, createdAt ASC")
    @JsonManagedReference
    private List<OfferTimelineEvent> timelineEvents = new ArrayList<>();

    // Reference to the request order
    @ManyToOne
    @JoinColumn(name = "request_order_id")
    @JsonManagedReference
    private RequestOrder requestOrder;

    // Offer items
    @OneToMany(mappedBy = "offer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<OfferItem> offerItems = new ArrayList<>();

    // Helper methods
    public void addTimelineEvent(OfferTimelineEvent event) {
        event.setOffer(this);
        this.timelineEvents.add(event);
    }

    public void incrementAttemptNumber() {
        this.currentAttemptNumber++;
        this.totalRetries++;
    }

    public void resetToInProgress() {
        this.status = "INPROGRESS";
        this.financeStatus = null;
    }

    public boolean canRetry() {
        return "MANAGERREJECTED".equals(this.status) ||
                "FINANCE_REJECTED".equals(this.financeStatus);
    }

    // Get information from timeline events instead of dedicated fields
    public LocalDateTime getSubmittedToManagerAt() {
        return getLatestEventOfType(TimelineEventType.OFFER_SUBMITTED)
                .map(OfferTimelineEvent::getEventTime)
                .orElse(null);
    }

    public String getSubmittedToManagerBy() {
        return getLatestEventOfType(TimelineEventType.OFFER_SUBMITTED)
                .map(OfferTimelineEvent::getActionBy)
                .orElse(null);
    }

    public LocalDateTime getManagerApprovedAt() {
        return getLatestEventOfType(TimelineEventType.MANAGER_ACCEPTED, TimelineEventType.MANAGER_REJECTED)
                .map(OfferTimelineEvent::getEventTime)
                .orElse(null);
    }

    public String getManagerApprovedBy() {
        return getLatestEventOfType(TimelineEventType.MANAGER_ACCEPTED, TimelineEventType.MANAGER_REJECTED)
                .map(OfferTimelineEvent::getActionBy)
                .orElse(null);
    }

    public LocalDateTime getFinanceApprovedAt() {
        return getLatestEventOfType(
                TimelineEventType.FINANCE_ACCEPTED,
                TimelineEventType.FINANCE_REJECTED,
                TimelineEventType.FINANCE_PARTIALLY_ACCEPTED)
                .map(OfferTimelineEvent::getEventTime)
                .orElse(null);
    }

    public String getFinanceApprovedBy() {
        return getLatestEventOfType(
                TimelineEventType.FINANCE_ACCEPTED,
                TimelineEventType.FINANCE_REJECTED,
                TimelineEventType.FINANCE_PARTIALLY_ACCEPTED)
                .map(OfferTimelineEvent::getActionBy)
                .orElse(null);
    }

    public String getRejectionReason() {
        return getLatestEventOfType(TimelineEventType.MANAGER_REJECTED, TimelineEventType.FINANCE_REJECTED)
                .map(OfferTimelineEvent::getNotes)
                .orElse(null);
    }

    // Helper method to get latest event of specific type(s)
    private java.util.Optional<OfferTimelineEvent> getLatestEventOfType(TimelineEventType... eventTypes) {
        return this.timelineEvents.stream()
                .filter(event -> java.util.Arrays.asList(eventTypes).contains(event.getEventType()))
                .max((e1, e2) -> e1.getEventTime().compareTo(e2.getEventTime()));
    }

    // Keep old field for backward compatibility (returns from timeline)
    public int getRetryCount() {
        return this.totalRetries;
    }
}