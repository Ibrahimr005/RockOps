package com.example.backend.dto.finance.payables;

import com.example.backend.models.finance.payables.InvoiceStatus;
import com.example.backend.models.finance.payables.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponseDTO {
    private UUID id;
    private String invoiceNumber;
    private String vendorName;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingBalance;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String description;
    private InvoiceStatus status;
    private boolean isOverdue;

    // List of payments made against this invoice
    private List<PaymentSummary> payments;

    // Audit info
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private String deletedBy;
    private LocalDateTime deletedAt;

    // Nested class for payment summary
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentSummary {
        private UUID id;
        private BigDecimal amount;
        private LocalDate paymentDate;
        private String paymentMethod;
        private String referenceNumber;
        private PaymentStatus status;
    }
}