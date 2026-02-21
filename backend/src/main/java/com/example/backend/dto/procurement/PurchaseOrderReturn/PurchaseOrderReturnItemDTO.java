package com.example.backend.dto.procurement.PurchaseOrderReturn;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderReturnItemDTO {

    private UUID id;
    private UUID purchaseOrderItemId;
    private String itemTypeName;
    private Double returnQuantity;
    private BigDecimal unitPrice;
    private BigDecimal totalReturnAmount;
    private String reason;
    private LocalDateTime createdAt;
}