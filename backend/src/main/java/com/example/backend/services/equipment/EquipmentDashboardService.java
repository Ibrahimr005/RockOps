package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.EquipmentDashboardDTO;
import com.example.backend.dto.equipment.EquipmentDashboardDTO.*;
import com.example.backend.models.MaintenanceRecord;
import com.example.backend.models.equipment.*;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.repositories.equipment.*;
import com.example.backend.repositories.transaction.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating comprehensive equipment dashboard analytics
 */
@Service
@Slf4j
public class EquipmentDashboardService {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SarkyLogRepository sarkyLogRepository;

    @Autowired
    private ConsumableRepository consumableRepository;

    @Autowired
    private InSiteMaintenanceRepository inSiteMaintenanceRepository;

    @Autowired
    private MaintenanceRecordRepository maintenanceRecordRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private MaintenanceConsumableRepository maintenanceConsumableRepository;

    // Constants for calculations
    private static final BigDecimal EXPECTED_HOURS_PER_DAY = new BigDecimal("8");
    private static final BigDecimal EXPECTED_PRODUCTION_RATE = new BigDecimal("3.0"); // m3 per hour (default)
    private static final BigDecimal FOOD_COST_PER_PERSON_PER_DAY = new BigDecimal("50"); // EGP

    /**
     * Get comprehensive dashboard data for an equipment
     */
    public EquipmentDashboardDTO getEquipmentDashboard(UUID equipmentId, String period) {
        log.info("Generating dashboard for equipment: {} with period: {}", equipmentId, period);

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found"));

        LocalDateTime startDate = calculateStartDate(period);
        LocalDateTime endDate = LocalDateTime.now();

        return EquipmentDashboardDTO.builder()
                .solarConsumption(calculateSolarConsumption(equipmentId, startDate, endDate))
                .fuelConsumption(calculateFuelConsumption(equipmentId, startDate, endDate))
                .lastExternalMaintenance(getLastExternalMaintenance(equipmentId))
                .externalMaintenanceHistory(getExternalMaintenanceHistory(equipmentId, startDate, endDate))
                .inSiteMaintenanceHistory(getInSiteMaintenanceHistory(equipmentId, startDate, endDate))
                .consumablesHistory(getConsumablesHistory(equipmentId, startDate, endDate))
                .workingHoursMetrics(calculateWorkingHoursMetrics(equipmentId, startDate, endDate))
                .productivityMetrics(calculateProductivityMetrics(equipmentId, startDate, endDate))
                .runningCostDetails(calculateRunningCostDetails(equipment, startDate, endDate))
                .rentingPriceAnalysis(calculateRentingPriceAnalysis(equipment, startDate, endDate))
                .workingHourPriceBreakdown(calculateWorkingHourPriceBreakdown(equipment, startDate, endDate))
                .efficiencyMetrics(calculateEfficiencyMetrics(equipmentId, startDate, endDate))
                .build();
    }

    private LocalDateTime calculateStartDate(String period) {
        LocalDateTime now = LocalDateTime.now();
        switch (period.toUpperCase()) {
            case "WEEK":
                return now.minusWeeks(1);
            case "MONTH":
                return now.minusMonths(1);
            case "3MONTH":
            case "THREE_MONTH":
                return now.minusMonths(3);
            case "6MONTH":
            case "SIX_MONTH":
                return now.minusMonths(6);
            case "YEAR":
                return now.minusYears(1);
            default:
                return now.minusMonths(1); // Default to 1 month
        }
    }

    /**
     * Calculate solar consumption metrics
     */
    private ConsumptionMetrics calculateSolarConsumption(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        // Get all consumables related to solar/electricity
        List<Consumable> solarConsumables = consumableRepository.findByEquipmentId(equipmentId).stream()
                .filter(c -> c.getItemType() != null && 
                            (c.getItemType().getName().toLowerCase().contains("solar") ||
                             c.getItemType().getName().toLowerCase().contains("electric") ||
                             c.getItemType().getName().toLowerCase().contains("power")))
                .collect(Collectors.toList());

        return calculateConsumptionMetrics(solarConsumables, equipmentId);
    }

    /**
     * Calculate fuel consumption metrics
     */
    private ConsumptionMetrics calculateFuelConsumption(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        // Get all consumables related to fuel
        List<Consumable> fuelConsumables = consumableRepository.findByEquipmentId(equipmentId).stream()
                .filter(c -> c.getItemType() != null && 
                            (c.getItemType().getName().toLowerCase().contains("fuel") ||
                             c.getItemType().getName().toLowerCase().contains("diesel") ||
                             c.getItemType().getName().toLowerCase().contains("petrol") ||
                             c.getItemType().getName().toLowerCase().contains("gasoline")))
                .collect(Collectors.toList());

        return calculateConsumptionMetrics(fuelConsumables, equipmentId);
    }

    private ConsumptionMetrics calculateConsumptionMetrics(List<Consumable> consumables, UUID equipmentId) {
        LocalDateTime now = LocalDateTime.now();
        
        BigDecimal weeklyQty = BigDecimal.ZERO;
        BigDecimal weeklyCost = BigDecimal.ZERO;
        BigDecimal monthlyQty = BigDecimal.ZERO;
        BigDecimal monthlyCost = BigDecimal.ZERO;
        BigDecimal threeMonthQty = BigDecimal.ZERO;
        BigDecimal threeMonthCost = BigDecimal.ZERO;
        BigDecimal sixMonthQty = BigDecimal.ZERO;
        BigDecimal sixMonthCost = BigDecimal.ZERO;
        BigDecimal yearlyQty = BigDecimal.ZERO;
        BigDecimal yearlyCost = BigDecimal.ZERO;

        for (Consumable consumable : consumables) {
            LocalDateTime transactionDate = consumable.getTransaction() != null ? 
                    consumable.getTransaction().getTransactionDate() : LocalDateTime.now();
            
            BigDecimal quantity = BigDecimal.valueOf(consumable.getQuantity());
            // Note: ItemType doesn't have unitPrice field - would need to be added or fetched from pricing service
            BigDecimal cost = BigDecimal.ZERO; // Placeholder until pricing is implemented

            long daysAgo = ChronoUnit.DAYS.between(transactionDate, now);

            if (daysAgo <= 7) {
                weeklyQty = weeklyQty.add(quantity);
                weeklyCost = weeklyCost.add(cost);
            }
            if (daysAgo <= 30) {
                monthlyQty = monthlyQty.add(quantity);
                monthlyCost = monthlyCost.add(cost);
            }
            if (daysAgo <= 90) {
                threeMonthQty = threeMonthQty.add(quantity);
                threeMonthCost = threeMonthCost.add(cost);
            }
            if (daysAgo <= 180) {
                sixMonthQty = sixMonthQty.add(quantity);
                sixMonthCost = sixMonthCost.add(cost);
            }
            if (daysAgo <= 365) {
                yearlyQty = yearlyQty.add(quantity);
                yearlyCost = yearlyCost.add(cost);
            }
        }

        return ConsumptionMetrics.builder()
                .weeklyQuantity(weeklyQty)
                .weeklyCost(weeklyCost)
                .monthlyQuantity(monthlyQty)
                .monthlyCost(monthlyCost)
                .threeMonthQuantity(threeMonthQty)
                .threeMonthCost(threeMonthCost)
                .sixMonthQuantity(sixMonthQty)
                .sixMonthCost(sixMonthCost)
                .yearlyQuantity(yearlyQty)
                .yearlyCost(yearlyCost)
                .consumptionOverTime(calculateConsumptionOverTime(consumables))
                .build();
    }

    private List<PeriodConsumption> calculateConsumptionOverTime(List<Consumable> consumables) {
        Map<String, PeriodConsumption> periodMap = new TreeMap<>();

        for (Consumable consumable : consumables) {
            LocalDateTime transactionDate = consumable.getTransaction() != null ? 
                    consumable.getTransaction().getTransactionDate() : LocalDateTime.now();
            
            String period = String.format("%d-%02d", transactionDate.getYear(), transactionDate.getMonthValue());
            
            BigDecimal quantity = BigDecimal.valueOf(consumable.getQuantity());
            BigDecimal cost = BigDecimal.ZERO; // Placeholder until pricing is implemented

            periodMap.compute(period, (k, v) -> {
                if (v == null) {
                    return PeriodConsumption.builder()
                            .period(period)
                            .quantity(quantity)
                            .cost(cost)
                            .startDate(transactionDate.withDayOfMonth(1).withHour(0).withMinute(0))
                            .endDate(transactionDate.withDayOfMonth(transactionDate.toLocalDate().lengthOfMonth()).withHour(23).withMinute(59))
                            .build();
                } else {
                    v.setQuantity(v.getQuantity().add(quantity));
                    v.setCost(v.getCost().add(cost));
                    return v;
                }
            });
        }

        return new ArrayList<>(periodMap.values());
    }

    /**
     * Get last external maintenance information
     */
    private ExternalMaintenanceInfo getLastExternalMaintenance(UUID equipmentId) {
        List<MaintenanceRecord> records = maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipmentId);
        
        if (records.isEmpty()) {
            return null;
        }

        MaintenanceRecord lastMaintenance = records.get(0);
        long daysAgo = ChronoUnit.DAYS.between(lastMaintenance.getCreationDate(), LocalDateTime.now());

        return ExternalMaintenanceInfo.builder()
                .maintenanceId(lastMaintenance.getId().toString())
                .maintenanceDate(lastMaintenance.getCreationDate())
                .description(lastMaintenance.getInitialIssueDescription())
                .cost(lastMaintenance.getTotalCost())
                .merchantName(lastMaintenance.getCurrentResponsiblePersonName())
                .status(lastMaintenance.getStatus().name())
                .daysAgo((int) daysAgo)
                .issuesResolved(List.of(lastMaintenance.getFinalDescription() != null ? 
                        lastMaintenance.getFinalDescription() : "In Progress"))
                .build();
    }

    /**
     * Get external maintenance history
     */
    private List<ExternalMaintenanceHistoryItem> getExternalMaintenanceHistory(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        List<MaintenanceRecord> records = maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipmentId);
        
        return records.stream()
                .filter(r -> r.getCreationDate().isAfter(startDate) && r.getCreationDate().isBefore(endDate))
                .map(r -> ExternalMaintenanceHistoryItem.builder()
                        .maintenanceId(r.getId().toString())
                        .maintenanceDate(r.getCreationDate())
                        .description(r.getInitialIssueDescription())
                        .cost(r.getTotalCost())
                        .merchantName(r.getCurrentResponsiblePersonName())
                        .status(r.getStatus().name())
                        .durationDays(r.getActualCompletionDate() != null ? 
                                (int) ChronoUnit.DAYS.between(r.getCreationDate(), r.getActualCompletionDate()) : null)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get in-site maintenance history
     */
    private List<InSiteMaintenanceHistoryItem> getInSiteMaintenanceHistory(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        List<InSiteMaintenance> maintenances = inSiteMaintenanceRepository.findByEquipmentId(equipmentId);
        
        return maintenances.stream()
                .filter(m -> m.getMaintenanceDate().isAfter(startDate) && m.getMaintenanceDate().isBefore(endDate))
                .map(m -> {
                    List<ConsumableUsed> consumablesUsed = maintenanceConsumableRepository.findByMaintenanceId(m.getId())
                            .stream()
                            .map(mc -> ConsumableUsed.builder()
                                    .itemName(mc.getItemType() != null ? mc.getItemType().getName() : "Unknown")
                                    .quantity(mc.getQuantity())
                                    .unitCost(BigDecimal.ZERO) // Placeholder until pricing is implemented
                                    .totalCost(BigDecimal.ZERO) // Placeholder until pricing is implemented
                                    .build())
                            .collect(Collectors.toList());

                    return InSiteMaintenanceHistoryItem.builder()
                            .maintenanceId(m.getId().toString())
                            .maintenanceDate(m.getMaintenanceDate())
                            .maintenanceType(m.getMaintenanceType() != null ? m.getMaintenanceType().getName() : "General")
                            .technicianName(m.getTechnician() != null ? m.getTechnician().getFullName() : "Unknown")
                            .description(m.getDescription())
                            .status(m.getStatus())
                            .consumablesUsed(consumablesUsed)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get consumables history by type
     */
    private List<ConsumableTypeHistory> getConsumablesHistory(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        List<Consumable> consumables = consumableRepository.findByEquipmentId(equipmentId);
        
        Map<String, List<Consumable>> groupedByType = consumables.stream()
                .filter(c -> c.getItemType() != null)
                .collect(Collectors.groupingBy(c -> c.getItemType().getName()));

        return groupedByType.entrySet().stream()
                .map(entry -> {
                    String typeName = entry.getKey();
                    List<Consumable> typeConsumables = entry.getValue();
                    
                    BigDecimal totalQty = typeConsumables.stream()
                            .map(c -> BigDecimal.valueOf(c.getQuantity()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    BigDecimal totalCost = BigDecimal.ZERO; // Placeholder until pricing is implemented

                    long monthsInPeriod = ChronoUnit.MONTHS.between(startDate, endDate);
                    BigDecimal avgMonthly = monthsInPeriod > 0 ? 
                            totalQty.divide(BigDecimal.valueOf(monthsInPeriod), 2, RoundingMode.HALF_UP) : 
                            BigDecimal.ZERO;

                    return                     ConsumableTypeHistory.builder()
                            .itemTypeName(typeName)
                            .category(typeConsumables.get(0).getItemType().getItemCategory() != null ? 
                                    typeConsumables.get(0).getItemType().getItemCategory().getName() : "General")
                            .totalQuantityUsed(totalQty)
                            .totalCost(totalCost)
                            .averageMonthlyConsumption(avgMonthly)
                            .consumptionByPeriod(calculateConsumptionByPeriod(typeConsumables))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<ConsumptionPeriod> calculateConsumptionByPeriod(List<Consumable> consumables) {
        Map<String, ConsumptionPeriod> periodMap = new TreeMap<>();

        for (Consumable consumable : consumables) {
            LocalDateTime transactionDate = consumable.getTransaction() != null ? 
                    consumable.getTransaction().getTransactionDate() : LocalDateTime.now();
            
            String period = String.format("%d-%02d", transactionDate.getYear(), transactionDate.getMonthValue());
            
            BigDecimal quantity = BigDecimal.valueOf(consumable.getQuantity());
            BigDecimal cost = BigDecimal.ZERO; // Placeholder until pricing is implemented

            periodMap.compute(period, (k, v) -> {
                if (v == null) {
                    return ConsumptionPeriod.builder()
                            .period(period)
                            .quantity(quantity)
                            .cost(cost)
                            .build();
                } else {
                    v.setQuantity(v.getQuantity().add(quantity));
                    v.setCost(v.getCost().add(cost));
                    return v;
                }
            });
        }

        return new ArrayList<>(periodMap.values());
    }

    /**
     * Calculate working hours metrics
     */
    private WorkingHoursMetrics calculateWorkingHoursMetrics(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        List<SarkyLog> sarkyLogs = sarkyLogRepository.findByEquipmentIdAndDateBetween(
                equipmentId, 
                startDate.toLocalDate(), 
                endDate.toLocalDate()
        );

        BigDecimal totalHours = sarkyLogs.stream()
                .map(s -> BigDecimal.valueOf(s.getWorkedHours()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime now = LocalDateTime.now();
        BigDecimal weeklyHours = calculateHoursForPeriod(sarkyLogs, now.minusWeeks(1), now);
        BigDecimal monthlyHours = calculateHoursForPeriod(sarkyLogs, now.minusMonths(1), now);
        BigDecimal threeMonthHours = calculateHoursForPeriod(sarkyLogs, now.minusMonths(3), now);
        BigDecimal sixMonthHours = calculateHoursForPeriod(sarkyLogs, now.minusMonths(6), now);
        BigDecimal yearlyHours = calculateHoursForPeriod(sarkyLogs, now.minusYears(1), now);

        long daysInPeriod = ChronoUnit.DAYS.between(startDate, endDate);
        BigDecimal avgDaily = daysInPeriod > 0 ? 
                totalHours.divide(BigDecimal.valueOf(daysInPeriod), 2, RoundingMode.HALF_UP) : 
                BigDecimal.ZERO;

        return WorkingHoursMetrics.builder()
                .totalWorkingHours(totalHours)
                .weeklyWorkingHours(weeklyHours)
                .monthlyWorkingHours(monthlyHours)
                .threeMonthWorkingHours(threeMonthHours)
                .sixMonthWorkingHours(sixMonthHours)
                .yearlyWorkingHours(yearlyHours)
                .averageDailyHours(avgDaily)
                .workingHoursOverTime(calculateWorkingHoursOverTime(sarkyLogs))
                .build();
    }

    private BigDecimal calculateHoursForPeriod(List<SarkyLog> sarkyLogs, LocalDateTime start, LocalDateTime end) {
        return sarkyLogs.stream()
                .filter(s -> {
                    LocalDateTime logDate = s.getDate().atStartOfDay();
                    return logDate.isAfter(start) && logDate.isBefore(end);
                })
                .map(s -> BigDecimal.valueOf(s.getWorkedHours()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<WorkingHoursPeriod> calculateWorkingHoursOverTime(List<SarkyLog> sarkyLogs) {
        Map<String, WorkingHoursPeriod> periodMap = new TreeMap<>();

        for (SarkyLog log : sarkyLogs) {
            String period = String.format("%d-%02d", log.getDate().getYear(), log.getDate().getMonthValue());
            BigDecimal hours = BigDecimal.valueOf(log.getWorkedHours());

            periodMap.compute(period, (k, v) -> {
                if (v == null) {
                    return WorkingHoursPeriod.builder()
                            .period(period)
                            .hours(hours)
                            .productionRate(BigDecimal.ZERO)
                            .build();
                } else {
                    v.setHours(v.getHours().add(hours));
                    return v;
                }
            });
        }

        return new ArrayList<>(periodMap.values());
    }

    /**
     * Calculate productivity metrics
     * Note: This is a placeholder. Actual production data should come from work entries or sarky logs
     */
    private ProductivityMetrics calculateProductivityMetrics(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        List<SarkyLog> sarkyLogs = sarkyLogRepository.findByEquipmentIdAndDateBetween(
                equipmentId, 
                startDate.toLocalDate(), 
                endDate.toLocalDate()
        );

        BigDecimal totalHours = sarkyLogs.stream()
                .map(s -> BigDecimal.valueOf(s.getWorkedHours()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Assuming a default production rate of 3 m3/hour
        // This should be replaced with actual production data from work entries
        BigDecimal totalProduction = totalHours.multiply(EXPECTED_PRODUCTION_RATE);
        BigDecimal productionRate = totalHours.compareTo(BigDecimal.ZERO) > 0 ? 
                totalProduction.divide(totalHours, 2, RoundingMode.HALF_UP) : 
                BigDecimal.ZERO;

        return ProductivityMetrics.builder()
                .totalProduction(totalProduction)
                .productionRate(productionRate)
                .weeklyProduction(totalProduction.multiply(new BigDecimal("0.14"))) // Approximate
                .monthlyProduction(totalProduction.multiply(new BigDecimal("0.6"))) // Approximate
                .threeMonthProduction(totalProduction)
                .sixMonthProduction(totalProduction)
                .yearlyProduction(totalProduction)
                .productionOverTime(new ArrayList<>())
                .build();
    }

    /**
     * Calculate running cost details
     */
    private RunningCostDetails calculateRunningCostDetails(Equipment equipment, LocalDateTime startDate, LocalDateTime endDate) {
        // Calculate driver salaries
        BigDecimal driverSalary = equipment.getMainDriver() != null ? 
                equipment.getMainDriver().getMonthlySalary() : BigDecimal.ZERO;
        BigDecimal subDriverSalary = equipment.getSubDriver() != null ? 
                equipment.getSubDriver().getMonthlySalary() : BigDecimal.ZERO;

        // Calculate fuel costs
        BigDecimal fuelCost = calculateFuelConsumption(equipment.getId(), startDate, endDate).getMonthlyCost();

        // Calculate consumables costs
        List<Consumable> consumables = consumableRepository.findByEquipmentId(equipment.getId());
        BigDecimal consumablesCost = BigDecimal.ZERO; // Placeholder until pricing is implemented

        // Calculate maintenance costs
        List<InSiteMaintenance> inSiteMaintenances = inSiteMaintenanceRepository.findByEquipmentId(equipment.getId());
        BigDecimal inSiteMaintenanceCost = BigDecimal.ZERO; // Placeholder until pricing is implemented

        List<MaintenanceRecord> externalMaintenances = maintenanceRecordRepository.findByEquipmentIdOrderByCreationDateDesc(equipment.getId());
        BigDecimal externalMaintenanceCost = externalMaintenances.stream()
                .map(MaintenanceRecord::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate food costs (assuming 2 people - driver and sub-driver)
        long daysInPeriod = ChronoUnit.DAYS.between(startDate, endDate);
        BigDecimal foodCost = FOOD_COST_PER_PERSON_PER_DAY
                .multiply(BigDecimal.valueOf(2))
                .multiply(BigDecimal.valueOf(daysInPeriod));

        BigDecimal totalCost = driverSalary.add(subDriverSalary).add(fuelCost)
                .add(consumablesCost).add(inSiteMaintenanceCost)
                .add(externalMaintenanceCost).add(foodCost);

        // Calculate percentages
        BigDecimal driverPercentage = calculatePercentage(driverSalary, totalCost);
        BigDecimal subDriverPercentage = calculatePercentage(subDriverSalary, totalCost);
        BigDecimal fuelPercentage = calculatePercentage(fuelCost, totalCost);
        BigDecimal consumablesPercentage = calculatePercentage(consumablesCost, totalCost);
        BigDecimal inSiteMaintenancePercentage = calculatePercentage(inSiteMaintenanceCost, totalCost);
        BigDecimal externalMaintenancePercentage = calculatePercentage(externalMaintenanceCost, totalCost);
        BigDecimal foodPercentage = calculatePercentage(foodCost, totalCost);

        List<CostBreakdownItem> breakdown = Arrays.asList(
                CostBreakdownItem.builder().category("Driver Salary").amount(driverSalary).percentage(driverPercentage).build(),
                CostBreakdownItem.builder().category("Sub-Driver Salary").amount(subDriverSalary).percentage(subDriverPercentage).build(),
                CostBreakdownItem.builder().category("Fuel").amount(fuelCost).percentage(fuelPercentage).build(),
                CostBreakdownItem.builder().category("Consumables").amount(consumablesCost).percentage(consumablesPercentage).build(),
                CostBreakdownItem.builder().category("In-Site Maintenance").amount(inSiteMaintenanceCost).percentage(inSiteMaintenancePercentage).build(),
                CostBreakdownItem.builder().category("External Maintenance").amount(externalMaintenanceCost).percentage(externalMaintenancePercentage).build(),
                CostBreakdownItem.builder().category("Food").amount(foodCost).percentage(foodPercentage).build()
        );

        return RunningCostDetails.builder()
                .totalRunningCost(totalCost)
                .driverSalaryCost(driverSalary)
                .driverSalaryPercentage(driverPercentage)
                .subDriverSalaryCost(subDriverSalary)
                .subDriverSalaryPercentage(subDriverPercentage)
                .fuelCost(fuelCost)
                .fuelCostPercentage(fuelPercentage)
                .consumablesCost(consumablesCost)
                .consumablesPercentage(consumablesPercentage)
                .inSiteMaintenanceCost(inSiteMaintenanceCost)
                .inSiteMaintenancePercentage(inSiteMaintenancePercentage)
                .externalMaintenanceCost(externalMaintenanceCost)
                .externalMaintenancePercentage(externalMaintenancePercentage)
                .foodCost(foodCost)
                .foodCostPercentage(foodPercentage)
                .otherCosts(BigDecimal.ZERO)
                .otherCostsPercentage(BigDecimal.ZERO)
                .costBreakdown(breakdown)
                .build();
    }

    private BigDecimal calculatePercentage(BigDecimal part, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return part.divide(total, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
    }

    /**
     * Calculate renting price analysis
     */
    private RentingPriceAnalysis calculateRentingPriceAnalysis(Equipment equipment, LocalDateTime startDate, LocalDateTime endDate) {
        // This should come from equipment configuration or site-specific pricing
        // For now, using a placeholder value
        BigDecimal rentingPricePerHour = new BigDecimal("500"); // EGP per hour

        WorkingHoursMetrics hoursMetrics = calculateWorkingHoursMetrics(equipment.getId(), startDate, endDate);
        BigDecimal totalRevenue = rentingPricePerHour.multiply(hoursMetrics.getTotalWorkingHours());

        RunningCostDetails costDetails = calculateRunningCostDetails(equipment, startDate, endDate);
        BigDecimal profitMargin = totalRevenue.subtract(costDetails.getTotalRunningCost());

        return RentingPriceAnalysis.builder()
                .rentingPricePerHour(rentingPricePerHour)
                .totalWorkingHours(hoursMetrics.getTotalWorkingHours())
                .totalRentingRevenue(totalRevenue)
                .profitMargin(profitMargin)
                .notes("Renting price should be adjusted based on site and market conditions")
                .build();
    }

    /**
     * Calculate working hour price breakdown
     */
    private WorkingHourPriceBreakdown calculateWorkingHourPriceBreakdown(Equipment equipment, LocalDateTime startDate, LocalDateTime endDate) {
        RunningCostDetails costDetails = calculateRunningCostDetails(equipment, startDate, endDate);
        WorkingHoursMetrics hoursMetrics = calculateWorkingHoursMetrics(equipment.getId(), startDate, endDate);
        ProductivityMetrics productivityMetrics = calculateProductivityMetrics(equipment.getId(), startDate, endDate);

        BigDecimal totalHours = hoursMetrics.getTotalWorkingHours();
        
        if (totalHours.compareTo(BigDecimal.ZERO) == 0) {
            return WorkingHourPriceBreakdown.builder()
                    .workingHourPrice(BigDecimal.ZERO)
                    .productivityPerHour(BigDecimal.ZERO)
                    .pricePerCubicMeter(BigDecimal.ZERO)
                    .build();
        }

        BigDecimal driverSalaryPerHour = costDetails.getDriverSalaryCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal subDriverSalaryPerHour = costDetails.getSubDriverSalaryCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal fuelPerHour = costDetails.getFuelCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal consumablesPerHour = costDetails.getConsumablesCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal inSiteMaintenancePerHour = costDetails.getInSiteMaintenanceCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal externalMaintenancePerHour = costDetails.getExternalMaintenanceCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal foodPerHour = costDetails.getFoodCost().divide(totalHours, 2, RoundingMode.HALF_UP);

        BigDecimal workingHourPrice = costDetails.getTotalRunningCost().divide(totalHours, 2, RoundingMode.HALF_UP);
        BigDecimal productivityPerHour = productivityMetrics.getProductionRate();
        
        BigDecimal pricePerCubicMeter = productivityPerHour.compareTo(BigDecimal.ZERO) > 0 ?
                workingHourPrice.divide(productivityPerHour, 2, RoundingMode.HALF_UP) : 
                BigDecimal.ZERO;

        return WorkingHourPriceBreakdown.builder()
                .workingHourPrice(workingHourPrice)
                .inSiteMaintenancePerHour(inSiteMaintenancePerHour)
                .externalMaintenancePerHour(externalMaintenancePerHour)
                .driverSalaryPerHour(driverSalaryPerHour)
                .subDriverSalaryPerHour(subDriverSalaryPerHour)
                .foodPerHour(foodPerHour)
                .fuelPerHour(fuelPerHour)
                .consumablesPerHour(consumablesPerHour)
                .otherCostsPerHour(BigDecimal.ZERO)
                .productivityPerHour(productivityPerHour)
                .pricePerCubicMeter(pricePerCubicMeter)
                .build();
    }

    /**
     * Calculate efficiency metrics
     */
    private EfficiencyMetrics calculateEfficiencyMetrics(UUID equipmentId, LocalDateTime startDate, LocalDateTime endDate) {
        WorkingHoursMetrics hoursMetrics = calculateWorkingHoursMetrics(equipmentId, startDate, endDate);
        ProductivityMetrics productivityMetrics = calculateProductivityMetrics(equipmentId, startDate, endDate);

        long daysInPeriod = ChronoUnit.DAYS.between(startDate, endDate);
        BigDecimal expectedTotalHours = EXPECTED_HOURS_PER_DAY.multiply(BigDecimal.valueOf(daysInPeriod));
        BigDecimal actualTotalHours = hoursMetrics.getTotalWorkingHours();

        BigDecimal workingHoursEfficiency = expectedTotalHours.compareTo(BigDecimal.ZERO) > 0 ?
                actualTotalHours.divide(expectedTotalHours, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                BigDecimal.ZERO;

        BigDecimal expectedProductivity = expectedTotalHours.multiply(EXPECTED_PRODUCTION_RATE);
        BigDecimal actualProductivity = productivityMetrics.getTotalProduction();

        BigDecimal productivityEfficiency = expectedProductivity.compareTo(BigDecimal.ZERO) > 0 ?
                actualProductivity.divide(expectedProductivity, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")) :
                BigDecimal.ZERO;

        String efficiencyStatus;
        BigDecimal avgEfficiency = workingHoursEfficiency.add(productivityEfficiency).divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
        
        if (avgEfficiency.compareTo(new BigDecimal("90")) >= 0) {
            efficiencyStatus = "EXCELLENT";
        } else if (avgEfficiency.compareTo(new BigDecimal("75")) >= 0) {
            efficiencyStatus = "GOOD";
        } else if (avgEfficiency.compareTo(new BigDecimal("60")) >= 0) {
            efficiencyStatus = "AVERAGE";
        } else {
            efficiencyStatus = "POOR";
        }

        return EfficiencyMetrics.builder()
                .workingHoursEfficiency(workingHoursEfficiency)
                .productivityEfficiency(productivityEfficiency)
                .expectedTotalHours(expectedTotalHours)
                .actualTotalHours(actualTotalHours)
                .expectedProductivity(expectedProductivity)
                .actualProductivity(actualProductivity)
                .efficiencyStatus(efficiencyStatus)
                .build();
    }
}

