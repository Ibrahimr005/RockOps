package com.example.backend.dto.hr;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
// Summary for each contract type
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractTypeSummary {
    private String contractType;
    private Integer totalEmployees;
    private Integer presentCount;
    private Integer absentCount;
    private Double totalHours;
    private Double averageHours;
}
