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
public class LogisticsResponseDTO {

    private UUID id;
    private String logisticsNumber;

    // Merchant info
    private UUID merchantId;
    private String merchantName;

    // Cost info
    private BigDecimal totalCost;
    private String currency;

    // Delivery info
    private String carrierCompany;
    private String driverName;
    private String driverPhone;
    private String notes;

    private LogisticsPaymentStatus paymentStatus;

    // Status info
    private LogisticsStatus status;
    private UUID paymentRequestId;
    private String paymentRequestNumber;

    // Purchase orders associated with this logistics
    private List<LogisticsPODetailDTO> purchaseOrders;

    // Audit fields
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private String approvedBy;
    private LocalDateTime rejectedAt;
    private String rejectedBy;
    private String rejectionReason;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogisticsPODetailDTO {
        private UUID purchaseOrderId;
        private String poNumber;
        private BigDecimal allocatedCost;
        private BigDecimal costPercentage;
        private BigDecimal totalItemsValue;
        private List<LogisticsItemDetailDTO> items;
    }

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