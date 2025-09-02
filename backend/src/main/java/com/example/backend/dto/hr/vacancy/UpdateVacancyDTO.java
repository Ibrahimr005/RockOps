package com.example.backend.dto.hr.vacancy;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateVacancyDTO {
    private String title;
    private String description;
    private String requirements;
    private String responsibilities;
    private LocalDate postingDate;
    private LocalDate closingDate;
    private String status;
    private Integer numberOfPositions;
    private String priority;
    private UUID jobPositionId;
}