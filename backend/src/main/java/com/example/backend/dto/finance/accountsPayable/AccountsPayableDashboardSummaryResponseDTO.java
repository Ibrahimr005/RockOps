package com.example.backend.dto.finance.accountsPayable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountsPayableDashboardSummaryResponseDTO {
    // Pending Offers
    private long pendingOffersCount;
    private BigDecimal pendingOffersAmount;

    // Pending Payment Requests
    private long pendingPaymentRequestsCount;
    private BigDecimal pendingPaymentRequestsAmount;

    // Ready to Pay
    private long readyToPayCount;
    private BigDecimal readyToPayAmount;

    // Paid Today
    private long paidTodayCount;
    private BigDecimal paidTodayAmount;

    // Balances
    private BigDecimal availableBalance;
    private BigDecimal totalBalance;
}