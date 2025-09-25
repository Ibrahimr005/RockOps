package com.example.backend.dto.hr.vacancy;

import com.example.backend.dto.hr.jobposition.MinimalJobPositionDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacancyDTO {
    private UUID id;
    private String title;
    private String description;
    private String status;
    private LocalDate postingDate;
    private LocalDate closingDate;
    private int numberOfPositions;
    private int hiredCount;
    private String priority;
    private String requirements;
    private String responsibilities;
    private MinimalJobPositionDTO jobPosition;
}
