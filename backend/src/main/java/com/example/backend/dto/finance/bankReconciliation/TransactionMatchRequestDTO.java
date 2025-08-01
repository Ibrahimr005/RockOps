package com.example.backend.dto.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.MatchType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class TransactionMatchRequestDTO {

    @NotNull(message = "Bank statement entry ID is required")
    private UUID bankStatementEntryId;

    @NotNull(message = "At least one internal transaction is required")
    private List<UUID> internalTransactionIds;

    @NotNull(message = "Match type is required")
    private MatchType matchType;

    private Double confidenceScore;
    private Boolean isAutomatic = false;
    private String matchNotes;

    @NotBlank(message = "Matched by is required")
    private String matchedBy;
}