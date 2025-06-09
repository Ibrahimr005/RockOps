package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailySarkySummaryDTO {
    private UUID equipmentId;
    private LocalDate date;
    private Integer totalEntries;
    private Double totalHours;
    private Map<String, Double> workTypeBreakdown;
    private Map<String, Double> driverBreakdown;
} 