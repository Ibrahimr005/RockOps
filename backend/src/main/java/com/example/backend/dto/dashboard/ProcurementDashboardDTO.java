package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Procurement Dashboard DTO
 * Provides procurement operations and vendor management metrics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcurementDashboardDTO {
    // Request Orders Overview
    private Long totalRequestOrders;
    private Long pendingRequestOrders;
    private Long approvedRequestOrders;
    private Long rejectedRequestOrders;
    private Long completedRequestOrders;
    private Map<String, Long> requestOrdersByStatus;
    
    // Purchase Orders Overview
    private Long totalPurchaseOrders;
    private Long pendingPurchaseOrders;
    private Long approvedPurchaseOrders;
    private Long inProgressPurchaseOrders;
    private Long completedPurchaseOrders;
    private Map<String, Long> purchaseOrdersByStatus;
    
    // Offers Management
    private Long totalOffers;
    private Long pendingOfferReviews;
    private Long acceptedOffers;
    private Long rejectedOffers;
    private List<Map<String, Object>> recentOffers;
    
    // Merchant Metrics
    private Long totalMerchants;
    private Long activeMerchants;
    private Map<String, Object> topMerchants;
    private List<Map<String, Object>> merchantPerformance;
    
    // Financial Metrics
    private Double totalProcurementValue;
    private Double pendingOrdersValue;
    private Double completedOrdersValueThisMonth;
    private Map<String, Object> spendingByCategory;
    
    // Performance Metrics
    private Double averageProcessingTime;
    private Double orderFulfillmentRate;
    private Double onTimeDeliveryRate;
    private Map<String, Object> performanceTrends;
    
    // Category Distribution
    private Map<String, Long> ordersByCategory;
    private Map<String, Double> spendingByDepartment;
    
    // Alerts and Actions
    private Long overdueOrders;
    private Long pendingApprovals;
    private Long urgentRequests;
    private List<String> procurementAlerts;
    
    // Recent Activities
    private List<Map<String, Object>> recentRequestOrders;
    private List<Map<String, Object>> recentPurchaseOrders;
    private List<Map<String, Object>> recentDeliveries;
}

