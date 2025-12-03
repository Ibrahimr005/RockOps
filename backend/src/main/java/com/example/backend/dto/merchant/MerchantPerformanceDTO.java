package com.example.backend.dto.merchant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantPerformanceDTO {

    // Overall Score
    private Integer overallScore;  // 0-100
    private String performanceRating;  // EXCELLENT, GOOD, FAIR, POOR

    // Summary Stats
    private Integer totalOrders;
    private Integer totalItemsDelivered;
    private LocalDate firstOrderDate;
    private LocalDate lastOrderDate;
    private Integer daysSinceLastOrder;
    private String merchantStatus;  // ACTIVE, INACTIVE, NEW

    // Quality Metrics (Section 2)
    private Double successRate;  // %
    private Double issueRate;  // %
    private Double resolutionRate;  // %
    private Double firstTimeSuccessRate;  // % deliveries without redelivery
    private Double quantityAccuracy;  // % accuracy in quantities
    private Integer totalIssuesReported;
    private Integer issuesResolved;
    private Integer issuesPending;

    // Delivery & Operational Metrics (Section 3)
    private Double avgItemsPerDelivery;
    private Double avgIssuesPerOrder;
    private Integer recentActivity30Days;  // orders in last 30 days
    private Integer goodDeliveries;
    private Integer deliveriesWithIssues;
    private Integer redeliveries;
    private Double redeliveryRate;  // %
    private String mostOrderedItem;
    private Integer mostOrderedItemQuantity;

    // Trend Analysis
    private String performanceTrend;  // IMPROVING, STABLE, DECLINING
    private Double monthlyOrderFrequency;  // avg orders per month
    private Map<String, Integer> issueTypeBreakdown;  // issue type -> count

    // Additional Insights
    private String mostCommonIssueType;
    private Integer consecutiveGoodDeliveries;  // current streak
    private Double orderFulfillmentConsistency;  // regularity score
}