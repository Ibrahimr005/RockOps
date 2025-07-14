package com.example.backend.dto.finance.generalLedger;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class JournalEntryLineResponseDTO {
    private UUID id;
    private String accountName;
    private String accountNumber;
    private BigDecimal amount;
    private boolean debit;
    private String description;
}
