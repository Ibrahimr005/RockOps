package com.example.backend.dto.procurement.Logistics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLogisticsDTO {

    private UUID merchantId; // The service merchant (delivery company)
    private BigDecimal totalCost;
    private String currency;
    private String carrierCompany;
    private String driverName;
    private String driverPhone;
    private String notes;

    private List<LogisticsPurchaseOrderDTO> purchaseOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogisticsPurchaseOrderDTO {
        private UUID purchaseOrderId;
        private List<UUID> selectedItemIds; // IDs of PurchaseOrderItems
    }
}