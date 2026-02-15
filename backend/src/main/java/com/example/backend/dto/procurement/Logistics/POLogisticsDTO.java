package com.example.backend.dto.procurement.Logistics;

import com.example.backend.models.procurement.Logistics.LogisticsPaymentStatus;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class POLogisticsDTO {

    private UUID logisticsId;
    private String logisticsNumber;
    private String merchantName;
    private String carrierCompany;
    private String driverName;
    private String driverPhone;

    // Cost allocated to THIS purchase order
    private BigDecimal allocatedCost;
    private BigDecimal costPercentage;
    private String currency;

    // Total logistics cost (for reference)
    private BigDecimal totalLogisticsCost;

    private LogisticsStatus status;
    private LogisticsPaymentStatus paymentStatus;  // ✅ ADD THIS
    private UUID paymentRequestId;

    // Items from this PO included in the logistics
    private List<LogisticsItemDetailDTO> items;

    private String notes;
    private LocalDateTime createdAt;
    private String createdBy;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogisticsItemDetailDTO {
        private UUID purchaseOrderItemId;
        private String itemTypeName;
        private String itemCategoryName;
        private BigDecimal quantity;
        private String measuringUnit;
        private BigDecimal unitPrice;
        private BigDecimal totalValue;
    }
}