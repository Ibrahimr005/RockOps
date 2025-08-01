package com.example.backend.dto.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.MatchType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class TransactionMatchResponseDTO {

    private UUID id;
    private BankStatementEntryResponseDTO bankStatementEntry;
    private List<InternalTransactionResponseDTO> internalTransactions;
    private MatchType matchType;
    private Double confidenceScore;
    private Boolean isAutomatic;
    private String matchNotes;
    private LocalDateTime matchedAt;
    private String matchedBy;
    private Boolean isConfirmed;
    private LocalDateTime confirmedAt;
    private String confirmedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Helper fields
    private String confidenceLevel; // "HIGH", "MEDIUM", "LOW"
    private String matchStatusText; // "Confirmed", "Pending Review", etc.
    private Integer daysSinceMatched;
}