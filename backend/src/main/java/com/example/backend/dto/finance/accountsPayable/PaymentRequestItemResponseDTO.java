package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestItemStatus;
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
public class PaymentRequestItemResponseDTO {
    private UUID id;
    private UUID paymentRequestId;
    private UUID itemId;
    private String itemName;
    private String itemDescription;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private PaymentRequestItemStatus status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}