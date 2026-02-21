package com.example.backend.dto.finance.incomingPayments;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncomingPaymentRequestItemResponseDTO {

    private UUID id;
    private UUID purchaseOrderItemId;
    private UUID issueId; // Nullable - only for REFUNDs
    private String itemName;
    private Double affectedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal totalAmount;
    private String issueType;
    private String issueDescription;
}