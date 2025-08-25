package com.example.backend.services.payroll;

import com.example.backend.dto.hr.attendance.AttendanceData;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.payroll.EmployeeDeductionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeductionCalculationService {

    private final DeductionTypeRepository deductionTypeRepository;
    private final EmployeeDeductionRepository employeeDeductionRepository;
    private final LoanService loanService;

    // Maximum deduction percentage of gross salary
    private static final BigDecimal MAX_DEDUCTION_PERCENTAGE = new BigDecimal("0.50"); // 50%

    /**
     * Calculate all deductions for an employee - ENHANCED VERSION
     * Merges manual and automatic deductions with 50% gross salary limit
     */
    public List<Deduction> calculateDeductions(Employee employee, BigDecimal grossSalary,
                                               AttendanceData attendanceData,
                                               LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        List<Deduction> allDeductions = new ArrayList<>();

        try {
            log.info("Calculating deductions for employee: {} for period: {} to {}",
                    employee.getFullName(), payPeriodStart, payPeriodEnd);

            // 1. Calculate mandatory deductions (taxes, social security)
            allDeductions.addAll(calculateMandatoryDeductions(employee, grossSalary));

            // 2. Calculate employee-specific manual deductions
            allDeductions.addAll(calculateEmployeeSpecificDeductions(employee, grossSalary, payPeriodStart));

            // 3. Calculate attendance-based deductions (late penalties, absences)
            if (attendanceData != null) {
                allDeductions.addAll(calculateAttendanceDeductions(employee, attendanceData, grossSalary));
            }

            // 4. Calculate loan repayment deductions (NEW: only for payslip period)
            allDeductions.addAll(calculateLoanRepaymentDeductions(employee, payPeriodStart, payPeriodEnd));

            // 5. Enforce maximum deduction limit (50% of gross salary)
            allDeductions = enforceMaximumDeductionLimit(allDeductions, grossSalary);

            log.info("Total deductions calculated: {} for employee: {} (Total: ${})",
                    allDeductions.size(), employee.getFullName(),
                    getTotalDeductionAmount(allDeductions));

        } catch (Exception e) {
            log.error("Error calculating deductions for employee {}: {}", employee.getFullName(), e.getMessage(), e);
            throw new RuntimeException("Failed to calculate deductions for employee: " + employee.getFullName(), e);
        }

        return allDeductions;
    }

    /**
     * ENHANCED: Enforce 50% maximum deduction limit with prioritization
     */
    private List<Deduction> enforceMaximumDeductionLimit(List<Deduction> deductions, BigDecimal grossSalary) {
        BigDecimal maxAllowed = grossSalary.multiply(MAX_DEDUCTION_PERCENTAGE);
        BigDecimal totalDeductions = getTotalDeductionAmount(deductions);

        if (totalDeductions.compareTo(maxAllowed) <= 0) {
            log.debug("Total deductions ${} within limit ${}", totalDeductions, maxAllowed);
            return deductions; // Within limit, return as-is
        }

        log.warn("Total deductions ${} exceed limit ${}. Applying prioritization.", totalDeductions, maxAllowed);

        // Prioritize deductions: mandatory > loans > attendance > manual
        List<Deduction> prioritizedDeductions = prioritizeDeductions(deductions);
        List<Deduction> finalDeductions = new ArrayList<>();
        BigDecimal runningTotal = BigDecimal.ZERO;

        for (Deduction deduction : prioritizedDeductions) {
            if (runningTotal.add(deduction.getAmount()).compareTo(maxAllowed) <= 0) {
                finalDeductions.add(deduction);
                runningTotal = runningTotal.add(deduction.getAmount());
            } else {
                // Check if we can partially include this deduction
                BigDecimal remainingLimit = maxAllowed.subtract(runningTotal);
                if (remainingLimit.compareTo(BigDecimal.ZERO) > 0 && isPartiallyApplicable(deduction)) {
                    // Apply partial deduction
                    Deduction partialDeduction = createPartialDeduction(deduction, remainingLimit);
                    finalDeductions.add(partialDeduction);
                    break; // Limit reached
                }
                // Deduction deferred due to limit
                log.warn("Deduction deferred due to 50% limit: {} - ${}",
                        deduction.getDescription(), deduction.getAmount());
            }
        }

        return finalDeductions;
    }

    /**
     * Prioritize deductions based on type importance
     */
    private List<Deduction> prioritizeDeductions(List<Deduction> deductions) {
        return deductions.stream()
                .sorted(Comparator.comparing(this::getDeductionPriority))
                .collect(Collectors.toList());
    }

    /**
     * Get priority order for deductions (lower number = higher priority)
     */
    private int getDeductionPriority(Deduction deduction) {
        if (deduction.getDeductionType() != null) {
            switch (deduction.getDeductionType().getType()) {
                case TAX:
                case SOCIAL_INSURANCE:
                    return 1; // Highest priority - mandatory
                case LOAN_REPAYMENT:
                    return 2; // High priority - contractual obligation
                case ATTENDANCE_PENALTY:
                    return 3; // Medium priority - attendance-based
                case ADVANCE:
                case CUSTOM:
                default:
                    return 4; // Lower priority - discretionary
            }
        }
        return 5; // Unknown type, lowest priority
    }

    /**
     * Check if deduction can be partially applied
     */
    private boolean isPartiallyApplicable(Deduction deduction) {
        // Only manual/custom deductions can be partially applied
        return deduction.getDeductionType() != null &&
                (deduction.getDeductionType().getType() == DeductionType.DeductionTypeEnum.CUSTOM ||
                        deduction.getDeductionType().getType() == DeductionType.DeductionTypeEnum.ADVANCE);
    }

    /**
     * Create partial deduction with reduced amount
     */
    private Deduction createPartialDeduction(Deduction original, BigDecimal maxAmount) {
        return Deduction.builder()
                .deductionType(original.getDeductionType())
                .description(original.getDescription() + " (Partial)")
                .amount(maxAmount)
                .isPreTax(original.getIsPreTax())
                .build();
    }

    /**
     * Calculate mandatory deductions (taxes, social security, etc.)
     */
    private List<Deduction> calculateMandatoryDeductions(Employee employee, BigDecimal grossSalary) {
        List<Deduction> deductions = new ArrayList<>();

        try {
            List<DeductionType> mandatoryTypes = deductionTypeRepository.findByIsMandatoryTrueAndIsActiveTrueOrderByName();

            for (DeductionType deductionType : mandatoryTypes) {
                BigDecimal amount = calculateDeductionAmount(deductionType, grossSalary);

                if (amount.compareTo(BigDecimal.ZERO) > 0) {
                    deductions.add(Deduction.builder()
                            .deductionType(deductionType)
                            .description(deductionType.getName())
                            .amount(amount)
                            .isPreTax(deductionType.getType() == DeductionType.DeductionTypeEnum.TAX)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Error calculating mandatory deductions for employee {}: {}", employee.getFullName(), e.getMessage());
        }

        return deductions;
    }

    /**
     * Calculate employee-specific manual deductions
     */
    private List<Deduction> calculateEmployeeSpecificDeductions(Employee employee, BigDecimal grossSalary, LocalDate payDate) {
        List<Deduction> deductions = new ArrayList<>();

        try {
            List<EmployeeDeduction> employeeDeductions = employeeDeductionRepository
                    .findActiveDeductionsForEmployee(employee.getId(), payDate);

            for (EmployeeDeduction employeeDeduction : employeeDeductions) {
                BigDecimal amount = calculateEmployeeDeductionAmount(employeeDeduction, grossSalary);

                if (amount.compareTo(BigDecimal.ZERO) > 0) {
                    deductions.add(Deduction.builder()
                            .deductionType(employeeDeduction.getDeductionType())
                            .description(buildEmployeeDeductionDescription(employeeDeduction))
                            .amount(amount)
                            .isPreTax(employeeDeduction.getDeductionType().getType() == DeductionType.DeductionTypeEnum.TAX)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Error calculating employee specific deductions for employee {}: {}", employee.getFullName(), e.getMessage());
        }

        return deductions;
    }

    /**
     * Calculate attendance-based deductions (late penalties, absences)
     */
    private List<Deduction> calculateAttendanceDeductions(Employee employee, AttendanceData attendanceData, BigDecimal grossSalary) {
        List<Deduction> deductions = new ArrayList<>();

        try {
            // Calculate absence deductions
            if (attendanceData.getDaysAbsent() > 0) {
                BigDecimal absenceDeduction = calculateAbsenceDeduction(employee, attendanceData, grossSalary);
                if (absenceDeduction.compareTo(BigDecimal.ZERO) > 0) {
                    deductions.add(Deduction.builder()
                            .description("Absence Deduction (" + attendanceData.getDaysAbsent() + " days)")
                            .amount(absenceDeduction)
                            .isPreTax(false)
                            .build());
                }
            }

            // Calculate late arrival penalties
            if (attendanceData.getLateDays() > 0) {
                BigDecimal latePenalty = calculateLatePenalty(employee, attendanceData);
                if (latePenalty.compareTo(BigDecimal.ZERO) > 0) {
                    deductions.add(Deduction.builder()
                            .description("Late Arrival Penalty (" + attendanceData.getLateDays() + " days)")
                            .amount(latePenalty)
                            .isPreTax(false)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Error calculating attendance deductions for employee {}: {}", employee.getFullName(), e.getMessage());
        }

        return deductions;
    }

    /**
     * ENHANCED: Calculate loan repayment deductions - only for payslip period
     * NEW: Loan repayments only deducted when payslip covers repayment date
     */
    private List<Deduction> calculateLoanRepaymentDeductions(Employee employee, LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        List<Deduction> deductions = new ArrayList<>();

        try {
            log.debug("Calculating loan repayment deductions for employee: {} for period: {} to {}",
                    employee.getFullName(), payPeriodStart, payPeriodEnd);

            // Validate inputs
            if (employee == null || employee.getId() == null) {
                log.warn("Invalid employee for loan repayment calculation");
                return deductions;
            }

            if (payPeriodStart == null || payPeriodEnd == null) {
                log.warn("Invalid pay period dates for loan repayment calculation");
                return deductions;
            }

            // Get ONLY repayments due within this exact payslip period
            List<RepaymentSchedule> dueRepayments = loanService.getDueRepaymentsForEmployee(
                    employee.getId(), payPeriodStart, payPeriodEnd);

            if (dueRepayments == null || dueRepayments.isEmpty()) {
                log.debug("No due loan repayments found for employee: {} in period: {} to {}",
                        employee.getFullName(), payPeriodStart, payPeriodEnd);
                return deductions;
            }

            log.info("Found {} due loan repayments for employee: {}", dueRepayments.size(), employee.getFullName());

            // Create deductions for each due repayment within the payslip period
            for (RepaymentSchedule repayment : dueRepayments) {
                try {
                    // NEW: Only include if repayment due date falls within payslip period
                    if (isRepaymentDueInPeriod(repayment, payPeriodStart, payPeriodEnd)) {
                        if (repayment.getScheduledAmount() != null && repayment.getScheduledAmount().compareTo(BigDecimal.ZERO) > 0) {

                            String loanDescription = buildLoanDeductionDescription(repayment);

                            Deduction loanDeduction = Deduction.builder()
                                    .deductionType(getLoanRepaymentDeductionType())
                                    .description(loanDescription)
                                    .amount(repayment.getScheduledAmount())
                                    .isPreTax(false) // Loan repayments are post-tax deductions
                                    .build();

                            deductions.add(loanDeduction);

                            log.debug("Added loan deduction: {} - Amount: ${}",
                                    loanDescription, repayment.getScheduledAmount());
                        }
                    } else {
                        log.debug("Loan repayment due {} is outside payslip period {} to {}, skipping",
                                repayment.getDueDate(), payPeriodStart, payPeriodEnd);
                    }
                } catch (Exception e) {
                    log.error("Error processing loan repayment {}: {}", repayment.getId(), e.getMessage());
                    // Continue with other repayments even if one fails
                }
            }

            log.info("Successfully calculated {} loan repayment deductions for employee: {}",
                    deductions.size(), employee.getFullName());

        } catch (Exception e) {
            log.error("Error calculating loan repayment deductions for employee {}: {}",
                    employee.getFullName(), e.getMessage(), e);
            // Don't fail payroll processing if loan deductions fail - just log the error
        }

        return deductions;
    }

    /**
     * NEW: Check if repayment due date falls within payslip period
     */
    private boolean isRepaymentDueInPeriod(RepaymentSchedule repayment, LocalDate periodStart, LocalDate periodEnd) {
        LocalDate dueDate = repayment.getDueDate();
        return dueDate != null &&
                !dueDate.isBefore(periodStart) &&
                !dueDate.isAfter(periodEnd);
    }

    /**
     * Get or create loan repayment deduction type
     */
    private DeductionType getLoanRepaymentDeductionType() {
        DeductionType loanType = deductionTypeRepository.findByNameIgnoreCase("Loan Repayment");
        if (loanType == null) {
            // Create default loan repayment type if not exists
            loanType = DeductionType.builder()
                    .name("Loan Repayment")
                    .type(DeductionType.DeductionTypeEnum.LOAN_REPAYMENT)
                    .isPercentage(false)
                    .isMandatory(false)
                    .isActive(true)
                    .description("Employee loan repayment deduction")
                    .build();
            loanType = deductionTypeRepository.save(loanType);
        }
        return loanType;
    }

    /**
     * Build descriptive deduction description for loan repayments
     */
    private String buildLoanDeductionDescription(RepaymentSchedule repayment) {
        try {
            StringBuilder description = new StringBuilder();
            description.append("Loan Repayment");

            // Add installment information
            if (repayment.getInstallmentNumber() != null) {
                description.append(" - Installment #").append(repayment.getInstallmentNumber());

                // Add total installments if available
                if (repayment.getLoan() != null && repayment.getLoan().getTotalInstallments() != null) {
                    description.append("/").append(repayment.getLoan().getTotalInstallments());
                }
            }

            // Add due date
            if (repayment.getDueDate() != null) {
                description.append(" (Due: ").append(repayment.getDueDate()).append(")");
            }

            return description.toString();

        } catch (Exception e) {
            log.warn("Error building loan deduction description: {}", e.getMessage());
            return "Loan Repayment - Installment #" +
                    (repayment.getInstallmentNumber() != null ? repayment.getInstallmentNumber() : "?");
        }
    }

    /**
     * Build description for employee-specific deductions
     */
    private String buildEmployeeDeductionDescription(EmployeeDeduction employeeDeduction) {
        StringBuilder description = new StringBuilder();
        description.append(employeeDeduction.getDeductionType().getName());

        // Add custom details if applicable
        if (employeeDeduction.getCustomAmount() != null) {
            description.append(" (Custom Amount)");
        } else if (employeeDeduction.getCustomPercentage() != null) {
            description.append(" (").append(employeeDeduction.getCustomPercentage()).append("%)");
        }

        return description.toString();
    }

    /**
     * ENHANCED: Get total loan deductions amount for an employee in a period
     */
    public BigDecimal getTotalLoanDeductionsForPeriod(Employee employee, LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        try {
            List<Deduction> loanDeductions = calculateLoanRepaymentDeductions(employee, payPeriodStart, payPeriodEnd);

            return loanDeductions.stream()
                    .map(Deduction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

        } catch (Exception e) {
            log.error("Error calculating total loan deductions for employee {}: {}", employee.getFullName(), e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * ENHANCED: Check if employee can afford loan deductions based on salary
     */
    public boolean canAffordLoanDeductions(Employee employee, BigDecimal grossSalary,
                                           LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        try {
            BigDecimal totalLoanDeductions = getTotalLoanDeductionsForPeriod(employee, payPeriodStart, payPeriodEnd);

            // Ensure loan deductions don't exceed 50% of gross salary (business rule)
            BigDecimal maxAllowedDeduction = grossSalary.multiply(MAX_DEDUCTION_PERCENTAGE);

            return totalLoanDeductions.compareTo(maxAllowedDeduction) <= 0;

        } catch (Exception e) {
            log.error("Error checking loan deduction affordability for employee {}: {}", employee.getFullName(), e.getMessage());
            return false;
        }
    }

    /**
     * Get loan deduction summary for an employee
     */
    public java.util.Map<String, Object> getLoanDeductionSummary(Employee employee,
                                                                 LocalDate payPeriodStart,
                                                                 LocalDate payPeriodEnd) {
        java.util.Map<String, Object> summary = new java.util.HashMap<>();

        try {
            List<Deduction> loanDeductions = calculateLoanRepaymentDeductions(employee, payPeriodStart, payPeriodEnd);
            BigDecimal totalAmount = getTotalDeductionAmount(loanDeductions);

            summary.put("totalLoanDeductions", loanDeductions.size());
            summary.put("totalAmount", totalAmount);
            summary.put("deductions", loanDeductions);
            summary.put("employeeId", employee.getId());
            summary.put("employeeName", employee.getFullName());
            summary.put("payPeriodStart", payPeriodStart);
            summary.put("payPeriodEnd", payPeriodEnd);

        } catch (Exception e) {
            log.error("Error creating loan deduction summary for employee {}: {}", employee.getFullName(), e.getMessage());
            summary.put("error", "Failed to calculate loan deduction summary");
        }

        return summary;
    }

    /**
     * Get total amount of all deductions
     */
    private BigDecimal getTotalDeductionAmount(List<Deduction> deductions) {
        return deductions.stream()
                .map(Deduction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Helper calculation methods
    private BigDecimal calculateDeductionAmount(DeductionType deductionType, BigDecimal grossSalary) {
        if (deductionType.getIsPercentage()) {
            return grossSalary.multiply(deductionType.getPercentageRate().divide(BigDecimal.valueOf(100)))
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            return deductionType.getFixedAmount();
        }
    }

    private BigDecimal calculateEmployeeDeductionAmount(EmployeeDeduction employeeDeduction, BigDecimal grossSalary) {
        if (employeeDeduction.getCustomAmount() != null) {
            return employeeDeduction.getCustomAmount();
        } else if (employeeDeduction.getCustomPercentage() != null) {
            return grossSalary.multiply(employeeDeduction.getCustomPercentage().divide(BigDecimal.valueOf(100)))
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            return calculateDeductionAmount(employeeDeduction.getDeductionType(), grossSalary);
        }
    }

    private BigDecimal calculateAbsenceDeduction(Employee employee, AttendanceData attendanceData, BigDecimal grossSalary) {
        // Calculate daily rate based on gross salary
        BigDecimal dailyRate = grossSalary.divide(BigDecimal.valueOf(attendanceData.getTotalWorkingDays()), 2, RoundingMode.HALF_UP);
        return dailyRate.multiply(BigDecimal.valueOf(attendanceData.getDaysAbsent()));
    }

    private BigDecimal calculateLatePenalty(Employee employee, AttendanceData attendanceData) {
        // Example: $10 penalty per late day
        return BigDecimal.valueOf(10.00).multiply(BigDecimal.valueOf(attendanceData.getLateDays()));
    }
}