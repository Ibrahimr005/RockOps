package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Comprehensive Equipment Dashboard DTO
 * Contains all metrics requested for equipment performance tracking
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentDashboardDTO {
    
    // Solar/Fuel Consumption Metrics
    private ConsumptionMetrics solarConsumption;
    private ConsumptionMetrics fuelConsumption;
    
    // Maintenance Metrics
    private ExternalMaintenanceInfo lastExternalMaintenance;
    private List<ExternalMaintenanceHistoryItem> externalMaintenanceHistory;
    private List<InSiteMaintenanceHistoryItem> inSiteMaintenanceHistory;
    
    // Consumables Metrics
    private List<ConsumableTypeHistory> consumablesHistory;
    
    // Working Hours & Productivity
    private WorkingHoursMetrics workingHoursMetrics;
    private ProductivityMetrics productivityMetrics;
    
    // Cost Analysis
    private RunningCostDetails runningCostDetails;
    private RentingPriceAnalysis rentingPriceAnalysis;
    private WorkingHourPriceBreakdown workingHourPriceBreakdown;
    
    // Efficiency Metrics
    private EfficiencyMetrics efficiencyMetrics;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsumptionMetrics {
        private BigDecimal weeklyQuantity;
        private BigDecimal weeklyCost;
        private BigDecimal monthlyQuantity;
        private BigDecimal monthlyCost;
        private BigDecimal threeMonthQuantity;
        private BigDecimal threeMonthCost;
        private BigDecimal sixMonthQuantity;
        private BigDecimal sixMonthCost;
        private BigDecimal yearlyQuantity;
        private BigDecimal yearlyCost;
        private List<PeriodConsumption> consumptionOverTime;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodConsumption {
        private String period; // e.g., "2025-01", "Week 1"
        private BigDecimal quantity;
        private BigDecimal cost;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExternalMaintenanceInfo {
        private String maintenanceId;
        private LocalDateTime maintenanceDate;
        private String description;
        private BigDecimal cost;
        private String merchantName;
        private String status;
        private Integer daysAgo;
        private List<String> issuesResolved;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExternalMaintenanceHistoryItem {
        private String maintenanceId;
        private LocalDateTime maintenanceDate;
        private String description;
        private BigDecimal cost;
        private String merchantName;
        private String status;
        private Integer durationDays;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InSiteMaintenanceHistoryItem {
        private String maintenanceId;
        private LocalDateTime maintenanceDate;
        private String maintenanceType;
        private String technicianName;
        private String description;
        private String status;
        private List<ConsumableUsed> consumablesUsed;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsumableUsed {
        private String itemName;
        private Integer quantity;
        private BigDecimal unitCost;
        private BigDecimal totalCost;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsumableTypeHistory {
        private String itemTypeName;
        private String category;
        private BigDecimal totalQuantityUsed;
        private BigDecimal totalCost;
        private BigDecimal averageMonthlyConsumption;
        private List<ConsumptionPeriod> consumptionByPeriod;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsumptionPeriod {
        private String period;
        private BigDecimal quantity;
        private BigDecimal cost;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkingHoursMetrics {
        private BigDecimal totalWorkingHours;
        private BigDecimal weeklyWorkingHours;
        private BigDecimal monthlyWorkingHours;
        private BigDecimal threeMonthWorkingHours;
        private BigDecimal sixMonthWorkingHours;
        private BigDecimal yearlyWorkingHours;
        private BigDecimal averageDailyHours;
        private List<WorkingHoursPeriod> workingHoursOverTime;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkingHoursPeriod {
        private String period;
        private BigDecimal hours;
        private BigDecimal productionRate;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductivityMetrics {
        private BigDecimal totalProduction; // in cubic meters
        private BigDecimal productionRate; // m3 per hour
        private BigDecimal weeklyProduction;
        private BigDecimal monthlyProduction;
        private BigDecimal threeMonthProduction;
        private BigDecimal sixMonthProduction;
        private BigDecimal yearlyProduction;
        private List<ProductionPeriod> productionOverTime;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductionPeriod {
        private String period;
        private BigDecimal production;
        private BigDecimal hours;
        private BigDecimal rate;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RunningCostDetails {
        private BigDecimal totalRunningCost;
        private BigDecimal driverSalaryCost;
        private BigDecimal driverSalaryPercentage;
        private BigDecimal subDriverSalaryCost;
        private BigDecimal subDriverSalaryPercentage;
        private BigDecimal fuelCost;
        private BigDecimal fuelCostPercentage;
        private BigDecimal consumablesCost;
        private BigDecimal consumablesPercentage;
        private BigDecimal inSiteMaintenanceCost;
        private BigDecimal inSiteMaintenancePercentage;
        private BigDecimal externalMaintenanceCost;
        private BigDecimal externalMaintenancePercentage;
        private BigDecimal foodCost;
        private BigDecimal foodCostPercentage;
        private BigDecimal otherCosts;
        private BigDecimal otherCostsPercentage;
        private List<CostBreakdownItem> costBreakdown;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CostBreakdownItem {
        private String category;
        private BigDecimal amount;
        private BigDecimal percentage;
        private String description;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RentingPriceAnalysis {
        private BigDecimal rentingPricePerHour;
        private BigDecimal totalWorkingHours;
        private BigDecimal totalRentingRevenue;
        private BigDecimal profitMargin;
        private String notes;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkingHourPriceBreakdown {
        private BigDecimal workingHourPrice;
        private BigDecimal inSiteMaintenancePerHour;
        private BigDecimal externalMaintenancePerHour;
        private BigDecimal driverSalaryPerHour;
        private BigDecimal subDriverSalaryPerHour;
        private BigDecimal foodPerHour;
        private BigDecimal fuelPerHour;
        private BigDecimal consumablesPerHour;
        private BigDecimal otherCostsPerHour;
        private BigDecimal productivityPerHour; // m3 per hour
        private BigDecimal pricePerCubicMeter; // EGP per m3
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EfficiencyMetrics {
        private BigDecimal workingHoursEfficiency; // (Actual Hours / Expected Hours) * 100
        private BigDecimal productivityEfficiency; // (Actual Production / Expected Production) * 100
        private BigDecimal expectedTotalHours;
        private BigDecimal actualTotalHours;
        private BigDecimal expectedProductivity;
        private BigDecimal actualProductivity;
        private String efficiencyStatus; // EXCELLENT, GOOD, AVERAGE, POOR
    }
}

