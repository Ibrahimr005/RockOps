package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Warehouse Manager Dashboard DTO
 * Provides warehouse operations and inventory metrics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseManagerDashboardDTO {
    // Warehouse Overview
    private Long totalWarehouses;
    private Long activeWarehouses;
    private List<Map<String, Object>> warehouseList;
    
    // Inventory Metrics
    private Long totalItems;
    private Long inStockItems;
    private Long pendingItems;
    private Long deliveryItems;
    private Long missingItems;
    private Long overReceivedItems;
    private Map<String, Long> itemsByStatus;
    
    // Category Distribution
    private Map<String, Long> itemsByCategory;
    private Map<String, Long> itemsByType;
    private List<Map<String, Object>> topCategories;
    
    // Capacity Metrics
    private Double totalCapacity;
    private Double usedCapacity;
    private Double availableCapacity;
    private Double utilizationRate;
    private Map<String, Object> capacityByWarehouse;
    
    // Transaction Metrics
    private Long totalTransactions;
    private Long pendingTransactions;
    private Long completedTransactionsToday;
    private Long completedTransactionsThisWeek;
    private Map<String, Long> transactionsByType;
    
    // Stock Alerts
    private Long lowStockItems;
    private Long outOfStockItems;
    private Long overstockItems;
    private List<Map<String, Object>> stockAlerts;
    
    // Team Metrics
    private Long totalEmployees;
    private Long activeEmployees;
    private Map<String, Long> employeesByWarehouse;
    
    // Performance Metrics
    private Double inventoryAccuracy;
    private Double orderFulfillmentRate;
    private Double averageProcessingTime;
    
    // Recent Activities
    private List<Map<String, Object>> recentTransactions;
    private List<Map<String, Object>> recentIssues;
}

