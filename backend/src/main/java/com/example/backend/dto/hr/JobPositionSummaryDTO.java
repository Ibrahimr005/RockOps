package com.example.backend.dto.hr;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPositionSummaryDTO {
    private UUID id;
    private String positionName;
    private String departmentName;
    private String contractType;
    private String experienceLevel;
    private Double baseSalary;
    private Boolean active;
    private Integer employeeCount;
    private Integer vacancyCount;
    private Boolean isHighLevel;
}
