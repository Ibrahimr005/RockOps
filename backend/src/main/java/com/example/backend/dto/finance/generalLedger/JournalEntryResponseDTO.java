package com.example.backend.dto.finance.generalLedger;


import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class JournalEntryResponseDTO {
    private UUID id;
    private LocalDate entryDate;
    private String referenceNumber;
    private String description;
    private String status;
    private List<JournalEntryLineResponseDTO> entryLines;
    private String documentPath;
    private String createdBy;
    private boolean isBalanced;
    private String approvalComments;
    private String rejectionReason;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private boolean locked;
}
