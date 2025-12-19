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
public class BalanceSummaryResponseDTO {
    private BigDecimal totalBalance;
    private BigDecimal availableBalance;
    private BigDecimal reservedBalance;

    // Breakdown by account type
    private BigDecimal bankAccountsBalance;
    private BigDecimal cashSafesBalance;
    private BigDecimal cashWithPersonsBalance;

    // Counts
    private long totalBankAccounts;
    private long totalCashSafes;
    private long totalCashWithPersons;
    private long activeBankAccounts;
    private long activeCashSafes;
    private long activeCashWithPersons;
}