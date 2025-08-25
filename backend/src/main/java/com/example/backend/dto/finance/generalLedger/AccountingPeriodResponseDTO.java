package com.example.backend.dto.finance.generalLedger;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AccountingPeriodResponseDTO {
    private UUID id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String closedBy;
    private LocalDateTime closedAt;
    private String closingNotes;
}
