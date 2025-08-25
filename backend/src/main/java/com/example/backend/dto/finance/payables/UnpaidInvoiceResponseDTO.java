package com.example.backend.dto.finance.payables;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
public class UnpaidInvoiceResponseDTO {

    private UUID id;
    private String invoiceNumber;
    private String vendorName;
    private BigDecimal totalAmount;
    private BigDecimal remainingBalance;
    private LocalDate dueDate;
    private boolean isOverdue;

    // Constructor for easy creation
    public UnpaidInvoiceResponseDTO(UUID id, String invoiceNumber, String vendorName,
                                 BigDecimal totalAmount, BigDecimal remainingBalance,
                                 LocalDate dueDate, boolean isOverdue) {
        this.id = id;
        this.invoiceNumber = invoiceNumber;
        this.vendorName = vendorName;
        this.totalAmount = totalAmount;
        this.remainingBalance = remainingBalance;
        this.dueDate = dueDate;
        this.isOverdue = isOverdue;
    }
}
