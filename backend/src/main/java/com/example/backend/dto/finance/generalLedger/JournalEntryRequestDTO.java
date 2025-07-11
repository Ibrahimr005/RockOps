package com.example.backend.dto.finance.generalLedger;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class JournalEntryRequestDTO {
    private LocalDate entryDate;
    private String referenceNumber;
    private String description;
    private List<JournalEntryLineDTO> entryLines;
    private String documentBase64; // For uploading supporting document
    private String documentPath;
}




