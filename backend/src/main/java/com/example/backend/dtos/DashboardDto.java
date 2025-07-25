package com.example.backend.dtos;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardDto {
    
    // Summary statistics
    private Integer activeRecords;
    private Integer overdueRecords;
    private Integer recordsNeedingFollowUp;
    private BigDecimal totalCost;
    private Double averageCompletionTime;
    
    // Status breakdown
    private Map<String, Integer> recordsByStatus;
    
    // Cost analysis
    private Map<String, BigDecimal> costByEquipmentType;
    private Map<String, BigDecimal> costByStepType;
    
    // Performance metrics
    private List<MaintenanceRecordDto> recentRecords;
    private List<MaintenanceRecordDto> overdueRecordsList;
    private List<MaintenanceRecordDto> recordsNeedingFollowUpList;
    
    // Contact statistics
    private Integer totalContacts;
    private Integer successfulContacts;
    private Integer pendingFollowUps;
    private Double contactSuccessRate;
    
    // Time-based metrics
    private Map<String, Integer> recordsByMonth;
    private Map<String, Double> averageDurationByStepType;
    
    // Alerts and notifications
    private Integer criticalAlerts;
    private Integer warningAlerts;
    private List<String> alertMessages;
} 