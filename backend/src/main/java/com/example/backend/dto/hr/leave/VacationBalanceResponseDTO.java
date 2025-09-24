package com.example.backend.dto.hr.leave;

import lombok.Data;
import lombok.Builder;

import java.util.UUID;

@Data
@Builder
public class VacationBalanceResponseDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private Integer year;
    
    // Balance details
    private Integer totalAllocated;
    private Integer usedDays;
    private Integer pendingDays;
    private Integer carriedForward;
    private Integer bonusDays;
    
    // Computed fields
    private Integer remainingDays;
    private Integer availableDays;
    private Double utilizationRate;
    
    // Status indicators
    private boolean hasLowBalance;
    private boolean hasUnusedDays;
    
    // Breakdown
    private Integer vacationDays;
    private Integer sickDays;
    private Integer personalDays;
}