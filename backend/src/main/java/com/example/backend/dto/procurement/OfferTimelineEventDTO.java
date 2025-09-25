package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.TimelineEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferTimelineEventDTO {
    private UUID id;

    // Parent offer reference (minimal to avoid circular deps)
    private UUID offerId;

    private TimelineEventType eventType;
    private int attemptNumber;
    private LocalDateTime eventTime;
    private String actionBy;
    private String notes;
    private String additionalData;
    private String previousStatus;
    private String newStatus;
    private String displayTitle;
    private String displayDescription;
    private boolean canRetryFromHere;
    private String retryToStatus;
    private LocalDateTime createdAt;

    // Helper methods for frontend compatibility
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