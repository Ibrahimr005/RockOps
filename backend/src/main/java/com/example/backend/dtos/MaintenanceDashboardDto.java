package com.example.backend.dtos;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MaintenanceDashboardDto {
    
    // Summary statistics
    private Long totalRecords;
    private Long activeRecords;
    private Long overdueRecords;
    private Long completedRecords;
    
    // Recent records for dashboard display
    private List<MaintenanceRecordDto> recentRecords;
    
    // Performance metrics
    private Double averageCompletionTime;
    private Double completionRate;
    
    // Cost metrics
    private Double totalCost;
    private Double averageCost;
    
    // Step metrics
    private Long totalSteps;
    private Long completedSteps;
    private Long activeSteps;
    
    // Contact metrics
    private Long totalContacts;
    private Long activeContacts;
    
    // Equipment metrics
    private Long equipmentInMaintenance;
    private Long equipmentAvailable;
} 