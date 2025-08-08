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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeductionCalculationService {

    private final DeductionTypeRepository deductionTypeRepository;
    private final EmployeeDeductionRepository employeeDeductionRepository;
    private final LoanService loanService;

    /**
     * Calculate all deductions for an employee
     */
    public List<Deduction> calculateDeductions(Employee employee, BigDecimal grossSalary,
                                               AttendanceData attendanceData,
                                               LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        List<Deduction> deductions = new ArrayList<>();

        try {
            log.info("Calculating deductions for employee: {} for period: {} to {}",
                    employee.getFullName(), payPeriodStart, payPeriodEnd);

            // Calculate mandatory deductions
            deductions.addAll(calculateMandatoryDeductions(employee, grossSalary));

            // Calculate employee-specific deductions
            deductions.addAll(calculateEmployeeSpecificDeductions(employee, grossSalary, payPeriodStart));

            // Calculate attendance-based deductions
            if (attendanceData != null) {
                deductions.addAll(calculateAttendanceDeductions(employee, attendanceData, grossSalary));
            }

            // Calculate loan repayment deductions
            deductions.addAll(calculateLoanRepaymentDeductions(employee, payPeriodStart, payPeriodEnd));

            log.info("Total deductions calculated: {} for employee: {}", deductions.size(), employee.getFullName());

        } catch (Exception e) {
            log.error("Error calculating deductions for employee {}: {}", employee.getFullName(), e.getMessage(), e);
            throw new RuntimeException("Failed to calculate deductions for employee: " + employee.getFullName(), e);
        }

        return deductions;
    }

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
                            .description(employeeDeduction.getDeductionType().getName())
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
     * Calculate loan repayment deductions for the pay period
     * ENHANCED VERSION with better error handling and validation
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

            // Get due loan repayments for this period
            List<RepaymentSchedule> dueRepayments = loanService.getDueRepaymentsForEmployee(
                    employee.getId(), payPeriodStart, payPeriodEnd);

            if (dueRepayments == null || dueRepayments.isEmpty()) {
                log.debug("No due loan repayments found for employee: {} in period: {} to {}",
                        employee.getFullName(), payPeriodStart, payPeriodEnd);
                return deductions;
            }

            log.info("Found {} due loan repayments for employee: {}", dueRepayments.size(), employee.getFullName());

            // Create deductions for each due repayment
            for (RepaymentSchedule repayment : dueRepayments) {
                try {
                    if (repayment.getScheduledAmount() != null && repayment.getScheduledAmount().compareTo(BigDecimal.ZERO) > 0) {

                        // Build loan description with loan details
                        String loanDescription = buildLoanDeductionDescription(repayment);

                        Deduction loanDeduction = Deduction.builder()
                                .description(loanDescription)
                                .amount(repayment.getScheduledAmount())
                                .isPreTax(false) // Loan repayments are post-tax deductions
                                .build();

                        deductions.add(loanDeduction);

                        log.debug("Added loan deduction: {} - Amount: ${}",
                                loanDescription, repayment.getScheduledAmount());
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
     * Build a descriptive deduction description for loan repayments
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
     * Get total loan deductions amount for an employee in a period
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
     * Check if employee can afford loan deductions based on salary
     */
    public boolean canAffordLoanDeductions(Employee employee, BigDecimal grossSalary,
                                           LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        try {
            BigDecimal totalLoanDeductions = getTotalLoanDeductionsForPeriod(employee, payPeriodStart, payPeriodEnd);

            // Ensure loan deductions don't exceed 50% of gross salary (business rule)
            BigDecimal maxAllowedDeduction = grossSalary.multiply(new BigDecimal("0.50"));

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
            BigDecimal totalAmount = loanDeductions.stream()
                    .map(Deduction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

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

    // Existing helper methods remain the same
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