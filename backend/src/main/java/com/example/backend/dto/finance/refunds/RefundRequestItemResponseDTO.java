package com.example.backend.dto.finance.refunds;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestItemResponseDTO {
    private UUID id;
    private UUID purchaseOrderItemId;
    private UUID issueId;
    private String itemName;
    private Double affectedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal totalRefundAmount;
    private String issueType;
    private String issueDescription;
}