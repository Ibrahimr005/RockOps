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
public class ProcessDeliveryRequestDTO {
    private UUID purchaseOrderId;
    private List<DeliveryItemDTO> items;
    private String generalNotes;
    private LocalDateTime receivedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryItemDTO {
        private UUID purchaseOrderItemId;
        private Double receivedGood;
        private List<IssueDTO> issues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IssueDTO {
        private String type; // "DAMAGED", "NEVER_ARRIVED", "WRONG_ITEM", "OTHER"
        private Double quantity;
        private String notes;
    }
}