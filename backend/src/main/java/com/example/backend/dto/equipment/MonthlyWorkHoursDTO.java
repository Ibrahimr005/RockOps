package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyWorkHoursDTO {
    private String month; // Format: YYYY-MM
    private Double totalHours;
    private Integer workDays;
    private Double averageHoursPerDay;
} 