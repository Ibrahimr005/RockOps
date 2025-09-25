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
public class RequestOrderDTO {
    private UUID id;
    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String createdBy;
    private String status;
    private String partyType;
    private UUID requesterId;
    private String requesterName;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private LocalDateTime approvedAt;
    private String approvedBy;
    private String employeeRequestedBy;
    private LocalDateTime deadline;
    private String rejectionReason;

    // Request items - full DTOs
    private List<RequestOrderItemDTO> requestItems;

    // Purchase Order reference (minimal to avoid circular deps)
    private UUID purchaseOrderId;

    // Offers list (minimal references to avoid circular deps)
    private List<UUID> offerIds;
}