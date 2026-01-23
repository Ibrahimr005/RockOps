package com.example.backend.dto.finance.refunds;

import com.example.backend.models.finance.balances.AccountType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmRefundRequestDTO {
    private AccountType balanceType;
    private UUID balanceAccountId;
    private LocalDate dateReceived;
    private String financeNotes;
}