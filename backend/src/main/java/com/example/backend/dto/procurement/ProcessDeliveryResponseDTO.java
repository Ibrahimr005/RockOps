package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessDeliveryResponseDTO {
    private boolean success;
    private String message;
    private UUID purchaseOrderId;
    private String poNumber;
    private String poStatus;
    private double totalAmount;
    private String currency;
    private List<ProcessedItemDTO> processedItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcessedItemDTO {
        private UUID itemId;
        private String itemTypeName;
        private String merchantName;
        private double orderedQuantity;
        private double totalReceivedQuantity;
        private double thisDeliveryGoodQuantity;
        private String itemStatus;
        private List<CreatedIssueDTO> createdIssues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatedIssueDTO {
        private UUID issueId;
        private String issueType;
        private double affectedQuantity;
        private String description;
    }
}