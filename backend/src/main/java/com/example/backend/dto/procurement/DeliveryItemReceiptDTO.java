package com.example.backend.dto.procurement;

import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderIssueDTO;
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
public class DeliveryItemReceiptDTO {
    private UUID id;
    private UUID deliverySessionId;
    private UUID purchaseOrderItemId;
    private String itemTypeName;

    // ADD THESE:
    private String itemCategoryName;
    private UUID itemCategoryId;

    private String measuringUnit;
    private Double goodQuantity;
    private Boolean isRedelivery;
    private String processedBy;           // ADD THIS
    private LocalDateTime processedAt;    // ADD THIS
    private List<PurchaseOrderIssueDTO> issues;
}