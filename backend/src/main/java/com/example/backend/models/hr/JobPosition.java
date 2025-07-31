package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
@EqualsAndHashCode(exclude = {"employees", "vacancies"})
@ToString(exclude = {"employees", "vacancies"})
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

    // NEW: Time fields for MONTHLY contracts
    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonBackReference("job-employee")
    private List<Employee> employees;

    @OneToMany(mappedBy = "jobPosition", cascade = CascadeType.ALL)
    @JsonBackReference("vacancy-jobposition")
    private List<Vacancy> vacancies;

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
                // For monthly contracts, calculate daily rate based on working days per month
                Integer workingDays = workingDaysPerMonth != null ? workingDaysPerMonth : 22;
                return (monthlyBaseSalary != null && workingDays > 0)
                        ? monthlyBaseSalary / workingDays : 0.0;
            default:
                return 0.0;
        }
    }

    public Double calculateMonthlySalary() {
        if (contractType == null) {
            return 0.0;
        }

        switch (contractType) {
            case HOURLY:
                // For hourly contracts: hourly rate * hours per shift * working days per week * 4 weeks
                if (hourlyRate != null && hoursPerShift != null && workingDaysPerWeek != null) {
                    return hourlyRate * hoursPerShift * workingDaysPerWeek * 4;
                }
                return 0.0;
            case DAILY:
                // For daily contracts: daily rate * working days per month
                if (dailyRate != null && workingDaysPerMonth != null) {
                    return dailyRate * workingDaysPerMonth;
                }
                return 0.0;
            case MONTHLY:
                // For monthly contracts: use the monthly base salary directly
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

    // NEW: Helper method to calculate working hours from start and end time
    public Integer calculateWorkingHoursFromTime() {
        if (contractType == ContractType.MONTHLY && startTime != null && endTime != null) {
            // Calculate duration in hours between start and end time
            long hours = java.time.Duration.between(startTime, endTime).toHours();
            return (int) hours;
        }
        return workingHours;
    }

    // NEW: Helper method to format time range as string
    public String getWorkingTimeRange() {
        if (contractType == ContractType.MONTHLY && startTime != null && endTime != null) {
            return startTime.toString() + " - " + endTime.toString();
        }
        return null;
    }

    // Validation methods
    public boolean isValidConfiguration() {
        switch (contractType) {
            case HOURLY:
                return hourlyRate != null && hourlyRate > 0
                        && hoursPerShift != null && hoursPerShift > 0
                        && workingDaysPerWeek != null && workingDaysPerWeek > 0;
            case DAILY:
                return dailyRate != null && dailyRate > 0
                        && workingDaysPerMonth != null && workingDaysPerMonth > 0;
            case MONTHLY:
                boolean basicValidation = monthlyBaseSalary != null && monthlyBaseSalary > 0
                        && workingDaysPerMonth != null && workingDaysPerMonth > 0;

                // NEW: Additional validation for time fields
                if (startTime != null && endTime != null) {
                    // Validate that end time is after start time
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
                // Handle legacy values or set default
                this.contractType = ContractType.MONTHLY;
            }
        }
    }

    // Override baseSalary getter to use contract-specific calculation
    public Double getBaseSalary() {
        // If baseSalary is explicitly set, use it (for backward compatibility)
        if (baseSalary != null) {
            return baseSalary;
        }
        // Otherwise, calculate based on contract type
        return calculateMonthlySalary();
    }

    // Setter for baseSalary that also updates the appropriate contract-specific field
    public void setBaseSalary(Double baseSalary) {
        this.baseSalary = baseSalary;

        // If this is a monthly contract and no monthlyBaseSalary is set, use this value
        if (contractType == ContractType.MONTHLY && monthlyBaseSalary == null) {
            this.monthlyBaseSalary = baseSalary;
        }
    }

    @OneToMany(mappedBy = "currentJobPosition", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonBackReference("current-position-promotions")
    private List<PromotionRequest> promotionsFromThisPosition;

    @OneToMany(mappedBy = "promotedToJobPosition", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonBackReference("promoted-position-promotions")
    private List<PromotionRequest> promotionsToThisPosition;

// Add these helper methods to the JobPosition class:

    /**
     * Get promotions FROM this position
     */
    public List<PromotionRequest> getPromotionsFromThisPosition() {
        return promotionsFromThisPosition != null ? promotionsFromThisPosition : new ArrayList<>();
    }

    /**
     * Get promotions TO this position
     */
    public List<PromotionRequest> getPromotionsToThisPosition() {
        return promotionsToThisPosition != null ? promotionsToThisPosition : new ArrayList<>();
    }

    /**
     * Get count of employees promoted from this position
     * @return Number of implemented promotions from this position
     */
    public long getPromotionsFromCount() {
        return getPromotionsFromThisPosition().stream()
                .filter(request -> request.getStatus() == PromotionRequest.PromotionStatus.IMPLEMENTED)
                .count();
    }

    /**
     * Get count of employees promoted to this position
     * @return Number of implemented promotions to this position
     */
    public long getPromotionsToCount() {
        return getPromotionsToThisPosition().stream()
                .filter(request -> request.getStatus() == PromotionRequest.PromotionStatus.IMPLEMENTED)
                .count();
    }

    /**
     * Get pending promotion requests from this position
     * @return List of pending promotion requests from this position
     */
    public List<PromotionRequest> getPendingPromotionsFrom() {
        return getPromotionsFromThisPosition().stream()
                .filter(request -> request.getStatus() == PromotionRequest.PromotionStatus.PENDING ||
                        request.getStatus() == PromotionRequest.PromotionStatus.UNDER_REVIEW)
                .collect(Collectors.toList());
    }

    /**
     * Get pending promotion requests to this position
     * @return List of pending promotion requests to this position
     */
    public List<PromotionRequest> getPendingPromotionsTo() {
        return getPromotionsToThisPosition().stream()
                .filter(request -> request.getStatus() == PromotionRequest.PromotionStatus.PENDING ||
                        request.getStatus() == PromotionRequest.PromotionStatus.UNDER_REVIEW)
                .collect(Collectors.toList());
    }

    /**
     * Check if this position has career progression opportunities
     * @return true if employees have been promoted from this position
     */
    public boolean hasCareerProgression() {
        return getPromotionsFromCount() > 0;
    }

    /**
     * Check if this position is a destination for promotions
     * @return true if employees have been promoted to this position
     */
    public boolean isPromotionDestination() {
        return getPromotionsToCount() > 0;
    }

    /**
     * Get average salary increase from promotions from this position
     * @return Average salary increase as BigDecimal
     */
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
     * Get most common promotion destinations from this position
     * @return Map of position names to promotion counts
     */
    public Map<String, Long> getCommonPromotionDestinations() {
        if (getPromotionsFromThisPosition() == null || getPromotionsFromThisPosition().isEmpty()) {
            return new HashMap<>();
        }
        
        return getPromotionsFromThisPosition().stream()
                .filter(request -> request != null && request.getStatus() == PromotionRequest.PromotionStatus.IMPLEMENTED)
                .collect(Collectors.groupingBy(
                        request -> {
                            try {
                                return request.getPromotedToPositionName();
                            } catch (Exception e) {
                                return "Unknown Position";
                            }
                        },
                        Collectors.counting()
                ));
    }

    /**
     * Get promotion statistics for this position
     * @return Map containing promotion-related statistics
     */
    public Map<String, Object> getPromotionStatistics() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("promotionsFromCount", getPromotionsFromCount());
        stats.put("promotionsToCount", getPromotionsToCount());
        stats.put("pendingPromotionsFromCount", getPendingPromotionsFrom().size());
        stats.put("pendingPromotionsToCount", getPendingPromotionsTo().size());
        stats.put("hasCareerProgression", hasCareerProgression());
        stats.put("isPromotionDestination", isPromotionDestination());
        stats.put("averageSalaryIncrease", getAverageSalaryIncreaseFromPosition());
        stats.put("averageTimeBeforePromotion", getAverageTimeBeforePromotion());
        stats.put("commonPromotionDestinations", getCommonPromotionDestinations());

        return stats;
    }

    /**
     * Check if this position is eligible as a promotion source
     * @return true if position can be a source for promotions
     */
    public boolean isEligibleForPromotionFrom() {
        // Basic checks for promotion eligibility
        return active != null && active &&
                getEmployees() != null && !getEmployees().isEmpty();
    }

    /**
     * Check if this position is eligible as a promotion destination
     * @return true if position can be a destination for promotions
     */
    public boolean isEligibleForPromotionTo() {
        // Basic checks for promotion destination eligibility
        return active != null && active;
    }

    /**
     * Get promotion rate from this position (promotions / total employees who held this position)
     * @return Promotion rate as percentage
     */
    public double getPromotionRateFromPosition() {
        long totalEmployeesEverInPosition = getPromotionsFromCount() +
                (getEmployees() != null ? getEmployees().size() : 0);

        if (totalEmployeesEverInPosition == 0) {
            return 0.0;
        }

        return (double) getPromotionsFromCount() / totalEmployeesEverInPosition * 100.0;
    }

    /**
     * Check if there are employees ready for promotion from this position
     * @return true if there are employees eligible for promotion
     */
    public boolean hasEmployeesReadyForPromotion() {
        if (getEmployees() == null || getEmployees().isEmpty()) {
            return false;
        }

        return getEmployees().stream()
                .filter(employee -> employee != null)
                .anyMatch(Employee::isEligibleForPromotion);
    }

    /**
     * Get employees eligible for promotion from this position
     * @return List of employees eligible for promotion
     */
    public List<Employee> getEmployeesEligibleForPromotion() {
        if (getEmployees() == null || getEmployees().isEmpty()) {
            return Collections.emptyList();
        }

        return getEmployees().stream()
                .filter(employee -> employee != null)
                .filter(Employee::isEligibleForPromotion)
                .collect(Collectors.toList());
    }

    /**
     * Check if this position requires specific qualifications for promotion
     * @return true if position has high requirements (senior level, high salary, etc.)
     */
    public boolean isHighLevelPosition() {
        // Determine if this is a high-level position based on various factors
        String positionNameLower = positionName != null ? positionName.toLowerCase() : "";
        String experienceLevelLower = experienceLevel != null ? experienceLevel.toLowerCase() : "";

        // Check for senior/management keywords
        boolean hasSeniorKeywords = positionNameLower.contains("manager") ||
                positionNameLower.contains("director") ||
                positionNameLower.contains("senior") ||
                positionNameLower.contains("lead") ||
                positionNameLower.contains("supervisor") ||
                positionNameLower.contains("head") ||
                positionNameLower.contains("chief");

        // Check experience level
        boolean isSeniorLevel = experienceLevelLower.contains("senior") ||
                experienceLevelLower.contains("expert") ||
                experienceLevelLower.contains("lead");

        // Check salary threshold (assuming positions with base salary > 50000 are high-level)
        boolean hasHighSalary = baseSalary != null && baseSalary > 50000.0;

        return hasSeniorKeywords || isSeniorLevel || hasHighSalary;
    }

    /**
     * Get career path suggestions from this position
     * @return List of suggested next positions based on promotion history
     */
    public List<String> getCareerPathSuggestions() {
        Map<String, Long> destinations = getCommonPromotionDestinations();

        return destinations.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5) // Top 5 destinations
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * Get employees in this position
     */
    public List<Employee> getEmployees() {
        return employees != null ? employees : new ArrayList<>();
    }
}