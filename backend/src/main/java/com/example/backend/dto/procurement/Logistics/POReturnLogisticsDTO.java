package com.example.backend.dto.procurement.Logistics;

import com.example.backend.models.procurement.Logistics.LogisticsPaymentStatus;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class POReturnLogisticsDTO {
    private UUID logisticsId;
    private String logisticsNumber;
    private String merchantName;
    private String carrierCompany;
    private String driverName;
    private String driverPhone;
    private BigDecimal allocatedCost;
    private BigDecimal costPercentage;
    private String currency;
    private BigDecimal totalLogisticsCost;
    private LogisticsStatus status;
    private LogisticsPaymentStatus paymentStatus;
    private UUID paymentRequestId;
    private List<LogisticsItemDetailDTO> items;
    private String notes;
    private LocalDateTime createdAt;
    private String createdBy;

    @Data
    @Builder
    public static class LogisticsItemDetailDTO {
        private UUID purchaseOrderReturnItemId;
        private String itemTypeName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalValue;
    }
}