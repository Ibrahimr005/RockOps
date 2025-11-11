package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Equipment Manager Dashboard DTO
 * Provides equipment-specific metrics and maintenance insights
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentManagerDashboardDTO {
    // Equipment Overview
    private Long totalEquipment;
    private Long availableEquipment;
    private Long inUseEquipment;
    private Long inMaintenanceEquipment;
    private Long outOfServiceEquipment;
    
    // Equipment Distribution
    private Map<String, Long> equipmentByType;
    private Map<String, Long> equipmentByBrand;
    private Map<String, Long> equipmentBySite;
    private Map<String, Long> equipmentByStatus;
    
    // Utilization Metrics
    private Double overallUtilizationRate;
    private Map<String, Double> utilizationByType;
    private List<Map<String, Object>> mostUtilizedEquipment;
    private List<Map<String, Object>> leastUtilizedEquipment;
    
    // Maintenance Metrics
    private Long totalMaintenanceRecords;
    private Long scheduledMaintenance;
    private Long ongoingMaintenance;
    private Long completedMaintenanceThisMonth;
    private Double averageMaintenanceDuration;
    private Map<String, Long> maintenanceByType;
    
    // Driver Assignment
    private Long totalDrivers;
    private Long assignedDrivers;
    private Long unassignedDrivers;
    private List<Map<String, Object>> driverAssignments;
    
    // Consumables
    private Long lowStockConsumables;
    private Long criticalStockConsumables;
    private Map<String, Object> consumableStatus;
    
    // Alerts and Actions
    private Long upcomingMaintenanceCount;
    private Long overdueMaintenanceCount;
    private List<String> criticalAlerts;
    
    // Recent Activities
    private List<Map<String, Object>> recentMaintenanceRecords;
    private List<Map<String, Object>> recentEquipmentChanges;
}

