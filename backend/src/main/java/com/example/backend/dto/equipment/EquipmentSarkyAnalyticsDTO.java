package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentSarkyAnalyticsDTO {
    private UUID equipmentId;
    private String equipmentName;
    private String equipmentType;
    
    // Summary statistics
    private Double totalWorkHours;
    private Integer totalWorkDays;
    private Double averageHoursPerDay;
    
    // Date range
    private LocalDate firstWorkDate;
    private LocalDate lastWorkDate;
    
    // Breakdown data
    private List<WorkTypeAnalyticsDTO> workTypeBreakdown;
    private List<DriverAnalyticsDTO> driverBreakdown;
    private List<MonthlyWorkHoursDTO> monthlyWorkHours;
} 