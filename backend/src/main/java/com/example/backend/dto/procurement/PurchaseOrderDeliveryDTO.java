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
public class PurchaseOrderDeliveryDTO {
    private UUID id;
    private UUID purchaseOrderId;
    private UUID purchaseOrderItemId;

    private Double receivedGoodQuantity;
    private LocalDateTime deliveredAt;
    private String processedBy;
    private String deliveryNotes;

    private Boolean isRedelivery;
    private UUID redeliveryForIssueId;

    // Issues reported in this delivery
    private List<PurchaseOrderIssueDTO> issues;
}