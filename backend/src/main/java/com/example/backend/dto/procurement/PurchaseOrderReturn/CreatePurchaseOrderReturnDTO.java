package com.example.backend.dto.procurement.PurchaseOrderReturn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePurchaseOrderReturnDTO {

    private String reason;
    private List<ReturnItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemRequest {
        private UUID purchaseOrderItemId;
        private Double returnQuantity;
        private String reason;
    }
}