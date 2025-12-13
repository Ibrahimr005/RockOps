package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Maintenance Dashboard DTO
 * Provides maintenance operations and equipment service metrics
 * Used for both MAINTENANCE_MANAGER and MAINTENANCE_EMPLOYEE roles
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceDashboardDTO {
    // Maintenance Overview
    private Long totalMaintenanceRecords;
    private Long scheduledMaintenance;
    private Long ongoingMaintenance;
    private Long completedMaintenance;
    private Long pendingMaintenance;
    private Long overdueMaintenance;
    
    // Maintenance Distribution
    private Map<String, Long> maintenanceByType;
    private Map<String, Long> maintenanceBySite;
    private Map<String, Long> maintenanceByEquipmentType;
    private Map<String, Long> maintenanceByStatus;
    
    // Equipment Status
    private Long totalEquipment;
    private Long equipmentInMaintenance;
    private Long equipmentAvailable;
    private List<Map<String, Object>> equipmentRequiringMaintenance;
    
    // Technician Metrics
    private Long totalTechnicians;
    private Long availableTechnicians;
    private Long busyTechnicians;
    private Map<String, Object> technicianWorkload;
    
    // Performance Metrics
    private Double averageMaintenanceDuration;
    private Double maintenanceCompletionRate;
    private Double equipmentDowntimeRate;
    private Map<String, Object> performanceTrends;
    
    // Parts and Consumables
    private Long totalConsumables;
    private Long lowStockConsumables;
    private Long usedConsumablesThisMonth;
    private List<Map<String, Object>> consumableUsage;
    
    // Upcoming Maintenance
    private Long upcomingThisWeek;
    private Long upcomingThisMonth;
    private List<Map<String, Object>> upcomingSchedule;
    
    // Costs
    private Double maintenanceCostThisMonth;
    private Double averageCostPerMaintenance;
    private Map<String, Object> costBreakdown;
    
    // Alerts and Priorities
    private Long criticalMaintenanceAlerts;
    private Long highPriorityTasks;
    private List<String> urgentActions;
    
    // Recent Activities
    private List<Map<String, Object>> recentMaintenanceRecords;
    private List<Map<String, Object>> completedToday;
}

