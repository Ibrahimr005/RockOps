package com.example.backend.dto.procurement.PurchaseOrder;

import com.example.backend.models.procurement.IssueStatus;
import com.example.backend.models.procurement.IssueType;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
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

    // Issue details
    private IssueType issueType;
    private IssueStatus issueStatus;
    private Double affectedQuantity;
    private String issueDescription;

    // Reporter info
    private String reportedBy;
    private LocalDateTime reportedAt;

    // Resolution info
    private PurchaseOrderResolutionType resolutionType;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private String resolutionNotes;

    // Item details (for display)
    private String itemTypeName;
    private String measuringUnit;
    private String itemTypeCategoryName;

    // Merchant details ← ADD THESE (matching actual Merchant entity fields)
    private UUID merchantId;
    private String merchantName;
    private String merchantContactPhone;
    private String merchantContactSecondPhone;
    private String merchantContactEmail;
    private String merchantContactPersonName;
    private String merchantAddress;
    private String merchantPhotoUrl;
}