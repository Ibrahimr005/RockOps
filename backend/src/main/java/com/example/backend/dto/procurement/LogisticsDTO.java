package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogisticsDTO {
    private UUID id;
    private UUID purchaseOrderId;
    private UUID deliverySessionId; // nullable - for standalone logistics
    private Double deliveryFee;
    private String currency;
    private String carrierCompany;
    private String driverName;
    private String driverPhone;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    // For display purposes
    private String deliverySessionInfo; // e.g., "Delivery on Jan 10, 2026"
}