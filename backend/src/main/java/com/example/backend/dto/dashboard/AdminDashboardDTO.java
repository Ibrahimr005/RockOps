package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Admin Dashboard DTO
 * Provides comprehensive system-wide metrics and analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDTO {
    // User Management Metrics
    private Long totalUsers;
    private Long activeUsers;
    private Long inactiveUsers;
    private Map<String, Long> usersByRole;
    
    // Site Metrics
    private Long totalSites;
    private Long activeSites;
    private Map<String, Object> siteUtilization;
    
    // Equipment Metrics
    private Long totalEquipment;
    private Long availableEquipment;
    private Long inMaintenanceEquipment;
    private Map<String, Long> equipmentByStatus;
    
    // Warehouse Metrics
    private Long totalWarehouses;
    private Long totalWarehouseItems;
    private Map<String, Long> warehouseItemsByStatus;
    
    // HR Metrics
    private Long totalEmployees;
    private Long activeEmployees;
    private Long pendingVacancies;
    private Long pendingLeaveRequests;
    
    // Financial Metrics
    private Double totalPayables;
    private Double totalAssets;
    private Long pendingInvoices;
    
    // Maintenance Metrics
    private Long totalMaintenanceRecords;
    private Long ongoingMaintenance;
    private Long pendingMaintenance;
    
    // Procurement Metrics
    private Long totalRequestOrders;
    private Long pendingRequestOrders;
    private Long totalPurchaseOrders;
    
    // Recent Activity
    private java.util.List<String> recentActivities;
    
    // System Health
    private String systemStatus;
    private Map<String, Object> systemMetrics;
}

