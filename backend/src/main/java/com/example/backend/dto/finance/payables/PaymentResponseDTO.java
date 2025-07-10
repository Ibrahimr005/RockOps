package com.example.backend.dto.finance.payables;

import com.example.backend.models.finance.payables.PaymentMethod;
import com.example.backend.models.finance.payables.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDTO {
    private UUID id;

    // Basic payment info
    private BigDecimal amount;
    private LocalDate paymentDate;
    private PaymentMethod paymentMethod;
    private String referenceNumber;
    private String notes;
    private PaymentStatus status;

    // Invoice info (nested)
    private InvoiceSummary invoice;

    // Audit info
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Nested class for invoice summary
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceSummary {
        private UUID id;
        private String invoiceNumber;
        private String vendorName;
        private BigDecimal totalAmount;
        private BigDecimal remainingBalance;
    }
}