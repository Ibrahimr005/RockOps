package com.example.backend.dto.procurement.Logistics;

import com.example.backend.models.procurement.Logistics.LogisticsPaymentStatus;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogisticsListDTO {

    private UUID id;
    private String logisticsNumber;
    private String merchantName;
    private String carrierCompany;
    private String driverName;
    private BigDecimal totalCost;
    private String currency;
    private LogisticsStatus status;
    private UUID paymentRequestId;
    private String paymentRequestNumber;
    private int purchaseOrderCount;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private String approvedBy;      // ADD THIS
    private LocalDateTime rejectedAt;
    private String rejectedBy;      // ADD THIS

    private LogisticsPaymentStatus paymentStatus;
}