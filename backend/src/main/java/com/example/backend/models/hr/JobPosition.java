package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Entity
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employees", "vacancies", "promotionsFromThisPosition", "promotionsToThisPosition", "parentJobPosition", "childPositions"})
@ToString(exclude = {"employees", "vacancies", "promotionsFromThisPosition", "promotionsToThisPosition", "parentJobPosition", "childPositions"})
public class JobPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String positionName;

    @ManyToOne
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"jobPositions"})
    private Department department;

    private String head;
    private Double baseSalary;
    private Integer probationPeriod;

    // Enhanced contract type field
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContractType contractType;

    private String experienceLevel;
    private Boolean active;

    // HOURLY contract specific fields
    private Integer workingDaysPerWeek;
    private Integer hoursPerShift;
    private Double hourlyRate;
    private Double overtimeMultiplier;
    private Boolean trackBreaks;
    private Integer breakDurationMinutes;

    // DAILY contract specific fields
    private Double dailyRate;
    private Integer workingDaysPerMonth;
    private Boolean includesWeekends;

    // MONTHLY contract specific fields
    private Double monthlyBaseSalary;
    private String shifts;
    private Integer workingHours;
    private String vacations;

    // Time fields for MONTHLY contracts
    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    // =====================================================
    // NEW: Monthly Contract Deduction Fields
    // =====================================================

    /**
     * Amount deducted when attendance status is Absent (unexcused leave/leave without notice)
     */
    @Column(name = "absent_deduction", precision = 10, scale = 2)
    private BigDecimal absentDeduction;

    /**
     * Amount deducted when attendance status is Late (after grace period expires)
     */
    @Column(name = "late_deduction", precision = 10, scale = 2)
    private BigDecimal lateDeduction;

    /**
     * Grace period in minutes before late deduction is applied
     * Employee arrivals within this time window are forgiven
     */
    @Column(name = "late_forgiveness_minutes")
    private Integer lateForgivenessMinutes;

    /**
     * Number of late occurrences forgiven per quarter before deductions apply
     * Counter resets at the start of each quarter (Jan 1, Apr 1, Jul 1, Oct 1)
     */
    @Column(name = "late_forgiveness_count_per_quarter")
    private Integer lateForgivenessCountPerQuarter;

    /**
     * Amount deducted per day when employee exceeds their allocated annual leave
     * Example: If allowed 21 days and took 25 days, 4 extra days × this amount is deducted
     */
    @Column(name = "leave_deduction", precision = 10, scale = 2)
    private BigDecimal leaveDeduction;

    // =====================================================
    // END: Monthly Contract Deduction Fields
    // =====================================================

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Employee> employees;

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Vacancy> vacancies;

    public boolean isActive() {
        return this.active;
    }

    // Enum for contract types
    @Getter
    public enum ContractType {
        HOURLY("Hourly Contract"),
        DAILY("Daily Contract"),
        MONTHLY("Monthly Contract");

        private final String displayName;

        ContractType(String displayName) {
            this.displayName = displayName;
        }
    }

    // Helper methods for contract-specific calculations
    public Double calculateDailySalary() {
        if (contractType == null) {
            return 0.0;
        }

        switch (contractType) {
            case HOURLY:
                return (hourlyRate != null && hoursPerShift != null)
                        ? hourlyRate * hoursPerShift : 0.0;
            case DAILY:
                return dailyRate != null ? dailyRate : 0.0;
            case MONTHLY:
                // Daily salary = monthly salary / working days per month (default 22)
                int days = workingDaysPerMonth != null && workingDaysPerMonth > 0 ? workingDaysPerMonth : 22;
                return monthlyBaseSalary != null ? monthlyBaseSalary / days : 0.0;
            default:
                return 0.0;
        }
    }

    public Double calculateMonthlySalary() {
        if (contractType == null) {
            return baseSalary != null ? baseSalary : 0.0;
        }

        switch (contractType) {
            case HOURLY:
                // Monthly = hourly rate * hours per shift * working days per week * 4 weeks
                if (hourlyRate != null && hoursPerShift != null && workingDaysPerWeek != null) {
                    return hourlyRate * hoursPerShift * workingDaysPerWeek * 4;
                }
                return 0.0;
            case DAILY:
                // Monthly = daily rate * working days per month
                if (dailyRate != null && workingDaysPerMonth != null) {
                    return dailyRate * workingDaysPerMonth;
                }
                return 0.0;
            case MONTHLY:
                return monthlyBaseSalary != null ? monthlyBaseSalary : 0.0;
            default:
                return 0.0;
        }
    }

    public boolean isHourlyTracking() {
        return contractType == ContractType.HOURLY;
    }

    public boolean isDailyTracking() {
        return contractType == ContractType.DAILY;
    }

    public boolean isMonthlyTracking() {
        return contractType == ContractType.MONTHLY;
    }

    // Helper method to calculate working hours from start and end time
    public Integer calculateWorkingHoursFromTime() {
        if (contractType == ContractType.MONTHLY && startTime != null && endTime != null) {
            long hours = java.time.Duration.between(startTime, endTime).toHours();
            return (int) hours;
        }
        return workingHours;
    }

    // Helper method to format time range as string
    public String getWorkingTimeRange() {
        if (contractType == ContractType.MONTHLY && startTime != null && endTime != null) {
            return startTime + " - " + endTime;
        }
        return null;
    }

    // =====================================================
    // NEW: Deduction Calculation Helper Methods
    // =====================================================

    /**
     * Check if absent deduction is configured
     */
    public boolean hasAbsentDeduction() {
        return contractType == ContractType.MONTHLY &&
                absentDeduction != null &&
                absentDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if late deduction is configured
     */
    public boolean hasLateDeduction() {
        return contractType == ContractType.MONTHLY &&
                lateDeduction != null &&
                lateDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if leave deduction is configured
     */
    public boolean hasLeaveDeduction() {
        return contractType == ContractType.MONTHLY &&
                leaveDeduction != null &&
                leaveDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Get effective late forgiveness minutes (default to 0 if not set)
     */
    public int getEffectiveLateForgivenessMinutes() {
        return lateForgivenessMinutes != null ? lateForgivenessMinutes : 0;
    }

    /**
     * Get effective late forgiveness count per quarter (default to 0 if not set)
     */
    public int getEffectiveLateForgivenessCountPerQuarter() {
        return lateForgivenessCountPerQuarter != null ? lateForgivenessCountPerQuarter : 0;
    }

    /**
     * Calculate absent deduction amount (returns 0 if not configured)
     */
    public BigDecimal calculateAbsentDeductionAmount() {
        return hasAbsentDeduction() ? absentDeduction : BigDecimal.ZERO;
    }

    /**
     * Calculate late deduction amount (returns 0 if not configured)
     */
    public BigDecimal calculateLateDeductionAmount() {
        return hasLateDeduction() ? lateDeduction : BigDecimal.ZERO;
    }

    /**
     * Calculate leave excess deduction for a number of excess days
     */
    public BigDecimal calculateLeaveExcessDeduction(int excessDays) {
        if (!hasLeaveDeduction() || excessDays <= 0) {
            return BigDecimal.ZERO;
        }
        return leaveDeduction.multiply(BigDecimal.valueOf(excessDays));
    }

    // =====================================================
    // END: Deduction Calculation Helper Methods
    // =====================================================

    // Validation methods
    public boolean isValidConfiguration() {
        switch (contractType) {
            case HOURLY:
                return hourlyRate != null && hourlyRate > 0
                        && hoursPerShift != null && hoursPerShift > 0
                        && workingDaysPerWeek != null && workingDaysPerWeek > 0;
            case DAILY:
                return dailyRate != null && dailyRate > 0;
            case MONTHLY:
                boolean basicValidation = monthlyBaseSalary != null && monthlyBaseSalary > 0;

                // Additional validation for time fields
                if (startTime != null && endTime != null) {
                    return basicValidation && endTime.isAfter(startTime);
                }
                return basicValidation;
            default:
                return false;
        }
    }

    // Legacy compatibility
    public String getType() {
        return contractType != null ? contractType.name() : null;
    }

    public void setType(String type) {
        if (type != null) {
            try {
                this.contractType = ContractType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                this.contractType = ContractType.MONTHLY;
            }
        }
    }

    // Override baseSalary getter to use contract-specific calculation
    public Double getBaseSalary() {
        if (baseSalary != null) {
            return baseSalary;
        }
        return calculateMonthlySalary();
    }

    // Setter for baseSalary
    public void setBaseSalary(Double baseSalary) {
        this.baseSalary = baseSalary;
        if (contractType == ContractType.MONTHLY && monthlyBaseSalary == null) {
            this.monthlyBaseSalary = baseSalary;
        }
    }

    @OneToMany(mappedBy = "currentJobPosition", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<PromotionRequest> promotionsFromThisPosition;

    @OneToMany(mappedBy = "promotedToJobPosition", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<PromotionRequest> promotionsToThisPosition;

    @JsonIgnore
    public List<PromotionRequest> getPromotionsFromThisPosition() {
        return promotionsFromThisPosition != null ? promotionsFromThisPosition : new ArrayList<>();
    }

    @JsonIgnore
    public List<PromotionRequest> getPromotionsToThisPosition() {
        return promotionsToThisPosition != null ? promotionsToThisPosition : new ArrayList<>();
    }

    // Hierarchy fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_job_position_id")
    @JsonIgnoreProperties({"childPositions", "employees", "vacancies", "promotionsFromThisPosition", "promotionsToThisPosition"})
    private JobPosition parentJobPosition;

    @OneToMany(mappedBy = "parentJobPosition", cascade = CascadeType.ALL)
    @JsonIgnore
    @Builder.Default
    private List<JobPosition> childPositions = new ArrayList<>();

    // Hierarchy helper methods
    public boolean isRootPosition() {
        return parentJobPosition == null;
    }

    public int getHierarchyLevel() {
        int level = 0;
        JobPosition current = this.parentJobPosition;
        while (current != null) {
            level++;
            current = current.getParentJobPosition();
        }
        return level;
    }

    public String getHierarchyPath() {
        List<String> path = new ArrayList<>();
        JobPosition current = this;
        while (current != null) {
            path.add(0, current.getPositionName());
            current = current.getParentJobPosition();
        }
        return String.join(" > ", path);
    }

    @JsonIgnore
    public List<Employee> getEmployees() {
        return employees != null ? employees : new ArrayList<>();
    }

    // Promotion statistics and helper methods
    @JsonIgnore
    public long getPromotionsFromCount() {
        return promotionsFromThisPosition != null ? promotionsFromThisPosition.size() : 0;
    }

    @JsonIgnore
    public long getPromotionsToCount() {
        return promotionsToThisPosition != null ? promotionsToThisPosition.size() : 0;
    }

    @JsonIgnore
    public List<PromotionRequest> getPendingPromotionsFrom() {
        if (promotionsFromThisPosition == null) return new ArrayList<>();
        return promotionsFromThisPosition.stream()
                .filter(p -> p.getStatus() == PromotionRequest.PromotionStatus.PENDING)
                .collect(Collectors.toList());
    }

    @JsonIgnore
    public List<PromotionRequest> getPendingPromotionsTo() {
        if (promotionsToThisPosition == null) return new ArrayList<>();
        return promotionsToThisPosition.stream()
                .filter(p -> p.getStatus() == PromotionRequest.PromotionStatus.PENDING)
                .collect(Collectors.toList());
    }

    @JsonIgnore
    public boolean isHighLevelPosition() {
        String positionNameLower = positionName != null ? positionName.toLowerCase() : "";
        String experienceLevelLower = experienceLevel != null ? experienceLevel.toLowerCase() : "";

        boolean hasSeniorKeywords = positionNameLower.contains("manager") ||
                positionNameLower.contains("director") ||
                positionNameLower.contains("senior") ||
                positionNameLower.contains("lead") ||
                positionNameLower.contains("supervisor") ||
                positionNameLower.contains("head") ||
                positionNameLower.contains("chief");

        boolean isSeniorLevel = experienceLevelLower.contains("senior") ||
                experienceLevelLower.contains("expert") ||
                experienceLevelLower.contains("lead");

        boolean hasHighSalary = baseSalary != null && baseSalary > 50000.0;

        return hasSeniorKeywords || isSeniorLevel || hasHighSalary;
    }

    @JsonIgnore
    public Map<String, Object> getPromotionStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("promotionsFromCount", getPromotionsFromCount());
        stats.put("promotionsToCount", getPromotionsToCount());
        stats.put("pendingPromotionsFromCount", getPendingPromotionsFrom().size());
        stats.put("pendingPromotionsToCount", getPendingPromotionsTo().size());
        return stats;
    }

    @JsonIgnore
    public Map<String, Long> getCommonPromotionDestinations() {
        if (promotionsFromThisPosition == null || promotionsFromThisPosition.isEmpty()) {
            return new HashMap<>();
        }

        return promotionsFromThisPosition.stream()
                .filter(p -> p.getPromotedToJobPosition() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getPromotedToJobPosition().getPositionName(),
                        Collectors.counting()
                ));
    }

    @JsonIgnore
    public boolean hasCareerProgression() {
        return !getCommonPromotionDestinations().isEmpty() || parentJobPosition != null;
    }

    @JsonIgnore
    public boolean isEligibleForPromotionFrom() {
        return active != null && active && employees != null && !employees.isEmpty();
    }

    @JsonIgnore
    public boolean isEligibleForPromotionTo() {
        return active != null && active;
    }

    @JsonIgnore
    public boolean isPromotionDestination() {
        return promotionsToThisPosition != null && !promotionsToThisPosition.isEmpty();
    }

    @JsonIgnore
    public boolean hasEmployeesReadyForPromotion() {
        if (employees == null || employees.isEmpty()) return false;
        return employees.stream().anyMatch(e ->
                e.getStatus() != null && e.getStatus().equals("ACTIVE")
        );
    }

    @JsonIgnore
    public List<String> getCareerPathSuggestions() {
        Map<String, Long> destinations = getCommonPromotionDestinations();
        return destinations.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }


    /**
     * Get average salary increase from promotions from this position
     * @return Average salary increase as BigDecimal
     */
    @JsonIgnore  // ✅ Fixed: Added @JsonIgnore to prevent serialization
    public BigDecimal getAverageSalaryIncreaseFromPosition() {
        List<PromotionRequest> implementedPromotions = getPromotionsFromThisPosition().stream()
                .filter(request -> request != null &&
                        request.getStatus() == PromotionRequest.PromotionStatus.IMPLEMENTED &&
                        request.getApprovedSalary() != null &&
                        request.getCurrentSalary() != null)
                .collect(Collectors.toList());

        if (implementedPromotions.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalIncrease = implementedPromotions.stream()
                .map(PromotionRequest::getSalaryIncrease)
                .filter(increase -> increase != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalIncrease.divide(BigDecimal.valueOf(implementedPromotions.size()), 2, RoundingMode.HALF_UP);
    }

    /**
     * Get average time employees spend in this position before promotion
     * @return Average months in position before promotion
     */
    @JsonIgnore  // ✅ Fixed: Added @JsonIgnore to prevent serialization
    public double getAverageTimeBeforePromotion() {
        List<PromotionRequest> implementedPromotions = getPromotionsFromThisPosition().stream()
                .filter(request -> request != null && request.getStatus() == PromotionRequest.PromotionStatus.IMPLEMENTED)
                .collect(Collectors.toList());

        if (implementedPromotions.isEmpty()) {
            return 0.0;
        }

        return implementedPromotions.stream()
                .filter(request -> request.getYearsInCurrentPosition() != null)
                .mapToInt(request -> request.getYearsInCurrentPosition() * 12) // Convert years to months
                .average()
                .orElse(0.0);
    }


    /**
     * Get promotion rate from this position (promotions / total employees who held this position)
     * @return Promotion rate as percentage
     */
    @JsonIgnore  // ✅ Fixed: Added @JsonIgnore to prevent serialization
    public double getPromotionRateFromPosition() {
        long totalEmployeesEverInPosition = getPromotionsFromCount() +
                (getEmployees() != null ? getEmployees().size() : 0);

        if (totalEmployeesEverInPosition == 0) {
            return 0.0;
        }

        return (double) getPromotionsFromCount() / totalEmployeesEverInPosition * 100.0;
    }


    /**
     * Get employees eligible for promotion from this position
     * @return List of employees eligible for promotion
     */
    @JsonIgnore  // ✅ Fixed: Added @JsonIgnore to prevent serialization
    public List<Employee> getEmployeesEligibleForPromotion() {
        if (getEmployees() == null || getEmployees().isEmpty()) {
            return Collections.emptyList();
        }

        return getEmployees().stream()
                .filter(employee -> employee != null)
                .filter(Employee::isEligibleForPromotion)
                .collect(Collectors.toList());
    }
}