package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.IssueStatus;
import com.example.backend.models.procurement.IssueType;
import com.example.backend.models.procurement.PurchaseOrderResolutionType;  // ✅ FIXED
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
public class PurchaseOrderIssueDTO {
    private UUID id;
    private UUID purchaseOrderId;
    private UUID purchaseOrderItemId;
    private IssueType issueType;
    private IssueStatus issueStatus;
    private String reportedBy;
    private LocalDateTime reportedAt;
    private String issueDescription;
    private PurchaseOrderResolutionType resolutionType;  // ✅ FIXED
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private String resolutionNotes;
}