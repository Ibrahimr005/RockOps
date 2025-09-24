package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferDTO {
    private UUID id;
    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String createdBy;
    private String status;
    private String financeStatus;
    private LocalDateTime validUntil;
    private String notes;
    private int currentAttemptNumber;
    private int totalRetries;
    private int retryCount; // For backward compatibility

    // Request Order reference (minimal to avoid circular deps)
    private UUID requestOrderId;
    private RequestOrderDTO requestOrder;

    // Offer Items (full DTOs)
    private List<OfferItemDTO> offerItems;

    // Timeline Events (full DTOs)
    private List<OfferTimelineEventDTO> timelineEvents;

    // Derived fields from timeline (for frontend compatibility)
    private LocalDateTime submittedToManagerAt;
    private String submittedToManagerBy;
    private LocalDateTime managerApprovedAt;
    private String managerApprovedBy;
    private LocalDateTime financeApprovedAt;
    private String financeApprovedBy;
    private String rejectionReason;

    // For creation/updates
    private LocalDateTime updatedAt;
    private String updatedBy;
}