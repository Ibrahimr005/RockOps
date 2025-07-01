package com.example.backend.dto.finance;

import com.example.backend.models.finance.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceSearchRequestDTO {

    private String vendorName;
    private String invoiceNumber;
    private String description;
    private InvoiceStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;

    // Pagination
    private int page = 0;
    private int size = 20;
}
