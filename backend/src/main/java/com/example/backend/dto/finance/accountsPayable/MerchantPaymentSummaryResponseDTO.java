package com.example.backend.dto.finance.accountsPayable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantPaymentSummaryResponseDTO {
    private UUID merchantId;
    private String merchantName;
    private BigDecimal totalPaid;
    private long numberOfPayments;
    private LocalDate lastPaymentDate;
    private BigDecimal lastPaymentAmount;
}