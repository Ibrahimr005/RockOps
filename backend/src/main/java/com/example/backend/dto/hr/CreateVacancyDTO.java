package com.example.backend.dto.hr;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateVacancyDTO {
    private String title;
    private String description;
    private String requirements;
    private String responsibilities;
    private LocalDate postingDate;
    private LocalDate closingDate;
    private String status; // e.g. "OPEN"
    private Integer numberOfPositions;
    private String priority; // e.g. "HIGH"

    // Nested JobPosition reference by ID
    private UUID jobPositionId;
}
