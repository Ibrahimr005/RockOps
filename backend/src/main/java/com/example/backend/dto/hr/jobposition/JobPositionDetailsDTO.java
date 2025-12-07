package com.example.backend.dto.hr.jobposition;

import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPositionDetailsDTO {

    // ======================================
    // BASIC INFORMATION
    // ======================================
    private UUID id;
    private String positionName;
    private String departmentName;
    private String head;
    private double baseSalary;
    private Integer probationPeriod;
    private String contractType;
    private String experienceLevel;
    private Boolean active;

    // ======================================
    // CONTRACT-SPECIFIC FIELDS
    // ======================================

    // HOURLY contract fields
    private Integer workingDaysPerWeek;
    private Integer hoursPerShift;
    private BigDecimal hourlyRate;
    private BigDecimal overtimeMultiplier;
    private Boolean trackBreaks;
    private Integer breakDurationMinutes;

    // DAILY contract fields
    private BigDecimal dailyRate;
    private Boolean includesWeekends;

    // MONTHLY contract fields
    private BigDecimal monthlyBaseSalary;
    private String shifts;
    private Integer workingHours;
    private String vacations;
    private LocalTime startTime;
    private LocalTime endTime;

    // ======================================
    // NEW: MONTHLY DEDUCTION FIELDS
    // ======================================

    /**
     * Amount deducted when attendance status is Absent (unexcused leave/leave without notice)
     */
    private BigDecimal absentDeduction;

    /**
     * Amount deducted when attendance status is Late (after grace period expires)
     */
    private BigDecimal lateDeduction;

    /**
     * Grace period in minutes before late deduction is applied
     * Employee arriving within this time window after start time won't be marked as late
     */
    private Integer lateForgivenessMinutes;

    /**
     * Number of late occurrences forgiven per quarter before deductions apply
     * Counter resets at the start of each quarter (Jan 1, Apr 1, Jul 1, Oct 1)
     */
    private Integer lateForgivenessCountPerQuarter;

    /**
     * Amount deducted per day when employee exceeds their annual leave allocation
     * Example: If allowed 21 days and took 25 days, deduction = 4 * leaveDeduction
     */
    private BigDecimal leaveDeduction;

    // ======================================
    // CALCULATED FIELDS
    // ======================================
    private Double calculatedMonthlySalary;
    private Double calculatedDailySalary;
    private Boolean isValidConfiguration;
    private String workingTimeRange;

    // ======================================
    // HIERARCHY FIELDS
    // ======================================
    private UUID parentJobPositionId;
    private String parentJobPositionName;
    private Boolean isRootPosition;
    private Integer hierarchyLevel;
    private String hierarchyPath;

    // ======================================
    // EMPLOYEE DATA
    // ======================================
    private Integer employeeCount;
    private List<EmployeeSummaryDTO> employees;

    // ======================================
    // PROMOTION DATA
    // ======================================
    private PromotionStatsDTO promotionStats;
    private List<PromotionSummaryDTO> promotionsFrom;
    private List<PromotionSummaryDTO> promotionsTo;

    // ======================================
    // HELPER METHODS
    // ======================================

    /**
     * Check if this position has absent deduction configured
     */
    public boolean hasAbsentDeduction() {
        return absentDeduction != null && absentDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if this position has late deduction configured
     */
    public boolean hasLateDeduction() {
        return lateDeduction != null && lateDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if this position has leave excess deduction configured
     */
    public boolean hasLeaveDeduction() {
        return leaveDeduction != null && leaveDeduction.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if any deduction is configured for this position
     */
    public boolean hasAnyDeduction() {
        return hasAbsentDeduction() || hasLateDeduction() || hasLeaveDeduction();
    }

    /**
     * Get effective late forgiveness minutes (defaults to 0 if not set)
     */
    public int getEffectiveLateForgivenessMinutes() {
        return lateForgivenessMinutes != null ? lateForgivenessMinutes : 0;
    }

    /**
     * Get effective late forgiveness count per quarter (defaults to 0 if not set)
     */
    public int getEffectiveLateForgivenessCountPerQuarter() {
        return lateForgivenessCountPerQuarter != null ? lateForgivenessCountPerQuarter : 0;
    }

    /**
     * Format working time range as string
     */
    public String getFormattedWorkingTimeRange() {
        if (startTime != null && endTime != null) {
            return startTime.toString() + " - " + endTime.toString();
        }
        return workingTimeRange;
    }

    /**
     * Check if this is a monthly contract type
     */
    public boolean isMonthlyContract() {
        return "MONTHLY".equalsIgnoreCase(contractType);
    }

    /**
     * Check if this is an hourly contract type
     */
    public boolean isHourlyContract() {
        return "HOURLY".equalsIgnoreCase(contractType);
    }

    /**
     * Check if this is a daily contract type
     */
    public boolean isDailyContract() {
        return "DAILY".equalsIgnoreCase(contractType);
    }



    // ======================================
    // NESTED DTOs
    // ======================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromotionStatsDTO {
        private Integer totalPromotionsFrom;
        private Integer totalPromotionsTo;
        private Double averageTenureBeforePromotion;
        private String mostCommonDestination;
        private String mostCommonSource;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromotionSummaryDTO {
        private UUID promotionId;
        private UUID employeeId;
        private String employeeName;
        private String fromPosition;
        private String toPosition;
        private String promotionDate;
        private String reason;
    }
}