package com.example.backend.dto.finance.payables;

import com.example.backend.models.finance.payables.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSearchRequestDTO {

    private String vendorName;
    private String referenceNumber;
    private PaymentStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;

    // Pagination
    private int page = 0;
    private int size = 20;
}
