package com.example.backend.dto.procurement.Logistics;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateLogisticsForReturnDTO {
    private UUID merchantId;
    private BigDecimal totalCost;
    private String currency;
    private String carrierCompany;
    private String driverName;
    private String driverPhone;
    private String notes;
    private List<LogisticsPurchaseOrderReturnDTO> purchaseOrderReturns;

    @Data
    public static class LogisticsPurchaseOrderReturnDTO {
        private UUID purchaseOrderReturnId;
        private List<UUID> selectedItemIds;
    }
}