package com.example.backend.dto.hr;

import com.example.backend.models.hr.JobPosition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPositionDetailsDTO {
    private UUID id;
    private String positionName;
    private Double baseSalary;
    private JobPosition.ContractType contractType;
    private Long employeeCount;
    private Long vacancyCount;
    private Long promotionsFromCount;
    private Long promotionsToCount;
}