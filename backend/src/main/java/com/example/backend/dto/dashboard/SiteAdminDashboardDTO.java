package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Site Admin Dashboard DTO
 * Provides site-specific management metrics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SiteAdminDashboardDTO {
    // Site Overview
    private String siteName;
    private String siteId;
    private String siteStatus;
    
    // Employee Metrics
    private Long totalEmployees;
    private Long activeEmployees;
    private Map<String, Long> employeesByDepartment;
    private Map<String, Long> employeesByJobPosition;
    
    // Equipment Metrics
    private Long totalEquipment;
    private Long availableEquipment;
    private Long inUseEquipment;
    private Long inMaintenanceEquipment;
    private Map<String, Long> equipmentByType;
    
    // Warehouse Metrics
    private Long totalWarehouses;
    private Long totalInventoryItems;
    private Map<String, Object> inventoryStatus;
    
    // Operational Metrics
    private Long activeProjects;
    private Double siteUtilizationRate;
    private Double equipmentUtilizationRate;
    
    // Recent Activities
    private List<Map<String, Object>> recentActivities;
    
    // Alerts and Issues
    private Long criticalAlerts;
    private Long pendingApprovals;
    private List<String> topIssues;
}

