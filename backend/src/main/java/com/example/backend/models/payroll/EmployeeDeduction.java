package com.example.backend.models.payroll;

import com.example.backend.models.hr.Employee;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * EmployeeDeduction Entity - Configurable recurring deductions for employees
 * These are deductions that should be automatically applied during payroll calculation
 * Examples: Insurance premiums, pension contributions, salary advances, etc.
 */
@Entity
@Table(name = "employee_deductions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDeduction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Human-readable deduction ID
    @Column(name = "deduction_number", unique = true, nullable = false, length = 20)
    private String deductionNumber;

    // Employee relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // Deduction Type relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deduction_type_id", nullable = false)
    private DeductionType deductionType;

    // Custom name override (optional - uses deduction type name if null)
    @Column(length = 100)
    private String customName;

    // Description/notes for this specific deduction
    @Column(length = 500)
    private String description;

    // Deduction amount
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    // Calculation method
    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_method", nullable = false)
    @Builder.Default
    private CalculationMethod calculationMethod = CalculationMethod.FIXED_AMOUNT;

    // For percentage-based calculations
    @Column(name = "percentage_value", precision = 5, scale = 2)
    private BigDecimal percentageValue;

    // Maximum deduction cap (optional)
    @Column(name = "max_amount", precision = 15, scale = 2)
    private BigDecimal maxAmount;

    // Deduction frequency
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DeductionFrequency frequency = DeductionFrequency.MONTHLY;

    // Effective dates
    @Column(name = "effective_start_date", nullable = false)
    private LocalDate effectiveStartDate;

    @Column(name = "effective_end_date")
    private LocalDate effectiveEndDate;

    // Status
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Reference to external entity (e.g., loan ID, insurance policy ID)
    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    // Total amount deducted so far (for tracking)
    @Column(name = "total_deducted", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalDeducted = BigDecimal.ZERO;

    // Number of times deducted
    @Column(name = "deduction_count")
    @Builder.Default
    private Integer deductionCount = 0;

    // Last deduction date
    @Column(name = "last_deduction_date")
    private LocalDate lastDeductionDate;

    // Priority (lower number = higher priority for deduction order)
    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 100;

    // Audit fields
    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Calculation Method for deductions
     */
    public enum CalculationMethod {
        FIXED_AMOUNT("Fixed Amount", "A fixed amount deducted each period"),
        PERCENTAGE_OF_GROSS("Percentage of Gross", "Percentage of gross salary"),
        PERCENTAGE_OF_BASIC("Percentage of Basic", "Percentage of basic salary"),
        PERCENTAGE_OF_NET("Percentage of Net", "Percentage of net salary (after other deductions)");

        private final String displayName;
        private final String description;

        CalculationMethod(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Deduction Frequency
     */
    public enum DeductionFrequency {
        PER_PAYROLL("Every Payroll", "Deducted every payroll cycle"),
        MONTHLY("Monthly", "Deducted once per month"),
        QUARTERLY("Quarterly", "Deducted once per quarter"),
        SEMI_ANNUAL("Semi-Annual", "Deducted twice per year"),
        ANNUAL("Annual", "Deducted once per year"),
        ONE_TIME("One-Time", "Single deduction only");

        private final String displayName;
        private final String description;

        DeductionFrequency(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }
    }

    // ===================================================
    // BUSINESS LOGIC METHODS
    // ===================================================

    /**
     * Get the display name for this deduction
     */
    public String getDisplayName() {
        return customName != null && !customName.isBlank()
            ? customName
            : (deductionType != null ? deductionType.getName() : "Unknown Deduction");
    }

    /**
     * Check if this deduction is active for a given payroll period
     */
    public boolean isActiveForPeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (!isActive) {
            return false;
        }

        // Check if effective start date is before or during the period
        if (effectiveStartDate.isAfter(periodEnd)) {
            return false;
        }

        // Check if effective end date is after or during the period
        if (effectiveEndDate != null && effectiveEndDate.isBefore(periodStart)) {
            return false;
        }

        return true;
    }

    /**
     * Check if this deduction should be applied based on frequency
     */
    public boolean shouldApplyForPeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (!isActiveForPeriod(periodStart, periodEnd)) {
            return false;
        }

        switch (frequency) {
            case PER_PAYROLL:
                return true;

            case MONTHLY:
                // Apply if this is the first payroll of the month or no deduction yet this month
                if (lastDeductionDate == null) {
                    return true;
                }
                return !lastDeductionDate.getMonth().equals(periodStart.getMonth())
                    || lastDeductionDate.getYear() != periodStart.getYear();

            case QUARTERLY:
                // Apply if this is first payroll of quarter or no deduction yet this quarter
                if (lastDeductionDate == null) {
                    return true;
                }
                int lastQuarter = (lastDeductionDate.getMonthValue() - 1) / 3;
                int currentQuarter = (periodStart.getMonthValue() - 1) / 3;
                return lastQuarter != currentQuarter || lastDeductionDate.getYear() != periodStart.getYear();

            case SEMI_ANNUAL:
                if (lastDeductionDate == null) {
                    return true;
                }
                int lastHalf = lastDeductionDate.getMonthValue() <= 6 ? 1 : 2;
                int currentHalf = periodStart.getMonthValue() <= 6 ? 1 : 2;
                return lastHalf != currentHalf || lastDeductionDate.getYear() != periodStart.getYear();

            case ANNUAL:
                if (lastDeductionDate == null) {
                    return true;
                }
                return lastDeductionDate.getYear() != periodStart.getYear();

            case ONE_TIME:
                // Only apply if never deducted before
                return deductionCount == 0;

            default:
                return true;
        }
    }

    /**
     * Calculate the deduction amount based on calculation method
     */
    public BigDecimal calculateDeductionAmount(BigDecimal grossSalary, BigDecimal basicSalary, BigDecimal netSalary) {
        BigDecimal calculatedAmount;

        switch (calculationMethod) {
            case FIXED_AMOUNT:
                calculatedAmount = amount;
                break;

            case PERCENTAGE_OF_GROSS:
                if (percentageValue == null || grossSalary == null) {
                    calculatedAmount = BigDecimal.ZERO;
                } else {
                    calculatedAmount = grossSalary.multiply(percentageValue)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                }
                break;

            case PERCENTAGE_OF_BASIC:
                if (percentageValue == null || basicSalary == null) {
                    calculatedAmount = BigDecimal.ZERO;
                } else {
                    calculatedAmount = basicSalary.multiply(percentageValue)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                }
                break;

            case PERCENTAGE_OF_NET:
                if (percentageValue == null || netSalary == null) {
                    calculatedAmount = BigDecimal.ZERO;
                } else {
                    calculatedAmount = netSalary.multiply(percentageValue)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                }
                break;

            default:
                calculatedAmount = amount;
        }

        // Apply maximum cap if set
        if (maxAmount != null && calculatedAmount.compareTo(maxAmount) > 0) {
            calculatedAmount = maxAmount;
        }

        return calculatedAmount;
    }

    /**
     * Record that a deduction was applied
     */
    public void recordDeduction(BigDecimal deductedAmount, LocalDate deductionDate) {
        this.totalDeducted = (this.totalDeducted != null ? this.totalDeducted : BigDecimal.ZERO)
            .add(deductedAmount);
        this.deductionCount = (this.deductionCount != null ? this.deductionCount : 0) + 1;
        this.lastDeductionDate = deductionDate;

        // Auto-deactivate one-time deductions
        if (frequency == DeductionFrequency.ONE_TIME) {
            this.isActive = false;
            this.effectiveEndDate = deductionDate;
        }
    }

    /**
     * Check if this is a loan-related deduction
     */
    public boolean isLoanDeduction() {
        return deductionType != null
            && deductionType.getCategory() == DeductionType.DeductionCategory.LOANS;
    }

    /**
     * Deactivate this deduction
     */
    public void deactivate(String updatedBy) {
        this.isActive = false;
        this.effectiveEndDate = LocalDate.now();
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Generate deduction number using deduction type code
     */
    public static String generateDeductionNumber(String typeCode, long sequenceNumber) {
        return String.format("%s-%06d", typeCode, sequenceNumber);
    }

    // ===================================================
    // LIFECYCLE CALLBACKS
    // ===================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
        if (totalDeducted == null) {
            totalDeducted = BigDecimal.ZERO;
        }
        if (deductionCount == null) {
            deductionCount = 0;
        }
        if (calculationMethod == null) {
            calculationMethod = CalculationMethod.FIXED_AMOUNT;
        }
        if (frequency == null) {
            frequency = DeductionFrequency.MONTHLY;
        }
        if (priority == null) {
            priority = 100;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
