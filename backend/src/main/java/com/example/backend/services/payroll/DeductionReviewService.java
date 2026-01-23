package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.DeductionReviewSummaryDTO;
import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollDeduction;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for processing and reviewing deductions in the payroll workflow.
 * This service handles the DEDUCTION_REVIEW phase of the payroll cycle.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeductionReviewService {

    private final EmployeePayrollRepository employeePayrollRepository;
    private final PayrollCalculationEngine calculationEngine;
    private final EmployeeDeductionService employeeDeductionService;
    private final PayrollLoanService loanService;
    private final LoanRepository loanRepository;
    private final ObjectMapper objectMapper;

    /**
     * Process deduction review for a payroll period.
     * This method calculates all deductions for each employee and creates a summary.
     *
     * @param payroll The payroll to process deductions for
     * @return Summary of the deduction review processing
     */
    @Transactional
    public DeductionReviewSummaryDTO processDeductionReview(Payroll payroll) {
        log.info("Processing deduction review for payroll period: {} to {}",
                payroll.getStartDate(), payroll.getEndDate());

        try {
            List<EmployeePayroll> employeePayrolls = employeePayrollRepository
                    .findByPayrollId(payroll.getId());

            log.info("Found {} employees in payroll", employeePayrolls.size());

            BigDecimal totalDeductions = BigDecimal.ZERO;
            BigDecimal totalAbsence = BigDecimal.ZERO;
            BigDecimal totalLate = BigDecimal.ZERO;
            BigDecimal totalLeave = BigDecimal.ZERO;
            BigDecimal totalLoan = BigDecimal.ZERO;
            BigDecimal totalOther = BigDecimal.ZERO;

            int employeesWithDeductions = 0;
            int activeLoans = 0;
            int loanDeductionsApplied = 0;

            List<DeductionReviewSummaryDTO.DeductionIssueDTO> issues = new ArrayList<>();

            // Track unique loans
            Set<UUID> processedLoanIds = new HashSet<>();

            for (EmployeePayroll ep : employeePayrolls) {
                try {
                    log.debug("Processing deductions for employee: {}", ep.getEmployeeName());

                    // Calculate deductions using the calculation engine
                    calculationEngine.calculateEmployeePayroll(ep);

                    // Aggregate totals
                    BigDecimal epTotal = ep.getTotalDeductions() != null ?
                            ep.getTotalDeductions() : BigDecimal.ZERO;

                    if (epTotal.compareTo(BigDecimal.ZERO) > 0) {
                        employeesWithDeductions++;
                    }

                    totalDeductions = totalDeductions.add(epTotal);

                    // Add to category totals
                    if (ep.getAbsenceDeductionAmount() != null) {
                        totalAbsence = totalAbsence.add(ep.getAbsenceDeductionAmount());
                    }
                    if (ep.getLateDeductionAmount() != null) {
                        totalLate = totalLate.add(ep.getLateDeductionAmount());
                    }
                    if (ep.getLeaveDeductionAmount() != null) {
                        totalLeave = totalLeave.add(ep.getLeaveDeductionAmount());
                    }
                    if (ep.getLoanDeductionAmount() != null) {
                        totalLoan = totalLoan.add(ep.getLoanDeductionAmount());
                        if (ep.getLoanDeductionAmount().compareTo(BigDecimal.ZERO) > 0) {
                            loanDeductionsApplied++;
                        }
                    }
                    if (ep.getOtherDeductionAmount() != null) {
                        totalOther = totalOther.add(ep.getOtherDeductionAmount());
                    }

                    // Track loans for this employee
                    List<UUID> employeeLoans = loanRepository.findActiveEmployeeLoanIds(ep.getEmployeeId());
                    processedLoanIds.addAll(employeeLoans);

                    // Check for warning conditions
                    checkDeductionWarnings(ep, issues);

                    // Save employee payroll with updated deductions
                    employeePayrollRepository.save(ep);

                } catch (Exception e) {
                    log.error("Error processing deductions for employee {}: {}",
                            ep.getEmployeeName(), e.getMessage(), e);

                    issues.add(DeductionReviewSummaryDTO.DeductionIssueDTO.builder()
                            .employeeId(ep.getEmployeeId().toString())
                            .employeeName(ep.getEmployeeName())
                            .severity("ERROR")
                            .deductionType("ALL")
                            .description("Failed to process deductions: " + e.getMessage())
                            .build());
                }
            }

            activeLoans = processedLoanIds.size();

            // Mark as processed
            payroll.markDeductionProcessed();

            // Create and store summary JSON
            String summaryJson = createSummaryJson(
                    employeePayrolls.size(), employeesWithDeductions, totalDeductions,
                    totalAbsence, totalLate, totalLeave, totalLoan, totalOther,
                    activeLoans, loanDeductionsApplied
            );
            payroll.setDeductionSummary(summaryJson);

            // Build response
            String status = issues.isEmpty() ? "SUCCESS" :
                    issues.stream().anyMatch(i -> "ERROR".equals(i.getSeverity())) ?
                            "SUCCESS_WITH_ERRORS" : "SUCCESS_WITH_WARNINGS";

            String message = String.format(
                    "Processed deductions for %d employee(s). Total: %s. " +
                            "%d employee(s) with deductions. %d active loan(s) deducted.",
                    employeePayrolls.size(),
                    formatCurrency(totalDeductions),
                    employeesWithDeductions,
                    loanDeductionsApplied
            );

            log.info("Deduction review completed: {}", message);

            return DeductionReviewSummaryDTO.builder()
                    .status(status)
                    .message(message)
                    .totalEmployees(employeePayrolls.size())
                    .employeesWithDeductions(employeesWithDeductions)
                    .totalDeductionAmount(totalDeductions.setScale(2, RoundingMode.HALF_UP))
                    .totalAbsenceDeductions(totalAbsence.setScale(2, RoundingMode.HALF_UP))
                    .totalLateDeductions(totalLate.setScale(2, RoundingMode.HALF_UP))
                    .totalLeaveDeductions(totalLeave.setScale(2, RoundingMode.HALF_UP))
                    .totalLoanDeductions(totalLoan.setScale(2, RoundingMode.HALF_UP))
                    .totalOtherDeductions(totalOther.setScale(2, RoundingMode.HALF_UP))
                    .activeLoansCount(activeLoans)
                    .loanDeductionsApplied(loanDeductionsApplied)
                    .issues(issues)
                    .build();

        } catch (Exception e) {
            log.error("Error processing deduction review", e);
            return DeductionReviewSummaryDTO.builder()
                    .status("FAILURE")
                    .message("Failed to process deduction review: " + e.getMessage())
                    .totalEmployees(0)
                    .employeesWithDeductions(0)
                    .totalDeductionAmount(BigDecimal.ZERO)
                    .totalAbsenceDeductions(BigDecimal.ZERO)
                    .totalLateDeductions(BigDecimal.ZERO)
                    .totalLeaveDeductions(BigDecimal.ZERO)
                    .totalLoanDeductions(BigDecimal.ZERO)
                    .totalOtherDeductions(BigDecimal.ZERO)
                    .activeLoansCount(0)
                    .loanDeductionsApplied(0)
                    .issues(new ArrayList<>())
                    .build();
        }
    }

    /**
     * Get deduction summary for a specific employee in the payroll period.
     *
     * @param employeeId The employee ID
     * @param periodStart Start date of the payroll period
     * @param periodEnd End date of the payroll period
     * @return List of deductions configured for this employee
     */
    public List<EmployeeDeductionDTO> getEmployeeDeductionsForPeriod(
            UUID employeeId, LocalDate periodStart, LocalDate periodEnd) {
        return employeeDeductionService.getDeductionsForPayrollPeriod(employeeId, periodStart, periodEnd);
    }

    /**
     * Get all deductions applied in a payroll for reporting.
     *
     * @param payrollId The payroll ID
     * @return List of employee deduction summaries
     */
    public List<DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO> getPayrollDeductionSummaries(UUID payrollId) {
        List<EmployeePayroll> employeePayrolls = employeePayrollRepository.findByPayrollId(payrollId);

        return employeePayrolls.stream()
                .filter(ep -> ep.getTotalDeductions() != null && ep.getTotalDeductions().compareTo(BigDecimal.ZERO) > 0)
                .map(ep -> DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO.builder()
                        .employeeId(ep.getEmployeeId().toString())
                        .employeeName(ep.getEmployeeName())
                        .totalDeductions(ep.getTotalDeductions())
                        .absenceDeduction(ep.getAbsenceDeductionAmount())
                        .lateDeduction(ep.getLateDeductionAmount())
                        .leaveDeduction(ep.getLeaveDeductionAmount())
                        .loanDeduction(ep.getLoanDeductionAmount())
                        .otherDeduction(ep.getOtherDeductionAmount())
                        .deductionCount(countDeductions(ep))
                        .build())
                .sorted(Comparator.comparing(DeductionReviewSummaryDTO.EmployeeDeductionSummaryDTO::getTotalDeductions).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Get loan deductions applied in a payroll.
     *
     * @param payrollId The payroll ID
     * @return List of loan deductions
     */
    public List<Map<String, Object>> getLoanDeductionsForPayroll(UUID payrollId) {
        List<EmployeePayroll> employeePayrolls = employeePayrollRepository.findByPayrollId(payrollId);
        List<Map<String, Object>> loanDeductions = new ArrayList<>();

        for (EmployeePayroll ep : employeePayrolls) {
            if (ep.getLoanDeductionAmount() != null && ep.getLoanDeductionAmount().compareTo(BigDecimal.ZERO) > 0) {
                // Get loan details
                List<PayrollDeduction> loanDeductionRecords = ep.getDeductions().stream()
                        .filter(d -> d.getDeductionType() == PayrollDeduction.DeductionType.LOAN_REPAYMENT)
                        .collect(Collectors.toList());

                for (PayrollDeduction pd : loanDeductionRecords) {
                    Map<String, Object> record = new HashMap<>();
                    record.put("employeeId", ep.getEmployeeId());
                    record.put("employeeName", ep.getEmployeeName());
                    record.put("amount", pd.getDeductionAmount());
                    record.put("description", pd.getDescription());
                    record.put("referenceId", pd.getReferenceId());
                    loanDeductions.add(record);
                }
            }
        }

        return loanDeductions;
    }

    // Helper methods

    private void checkDeductionWarnings(EmployeePayroll ep,
                                        List<DeductionReviewSummaryDTO.DeductionIssueDTO> issues) {
        BigDecimal totalDeductions = ep.getTotalDeductions() != null ?
                ep.getTotalDeductions() : BigDecimal.ZERO;
        BigDecimal grossPay = ep.getGrossPay() != null ?
                ep.getGrossPay() : BigDecimal.ZERO;

        // Warning if deductions exceed 50% of gross
        if (grossPay.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal deductionRatio = totalDeductions.divide(grossPay, 4, RoundingMode.HALF_UP);
            if (deductionRatio.compareTo(new BigDecimal("0.5")) > 0) {
                issues.add(DeductionReviewSummaryDTO.DeductionIssueDTO.builder()
                        .employeeId(ep.getEmployeeId().toString())
                        .employeeName(ep.getEmployeeName())
                        .severity("WARNING")
                        .deductionType("TOTAL")
                        .description(String.format(
                                "High deduction ratio: %.1f%% of gross pay (%s of %s)",
                                deductionRatio.multiply(new BigDecimal("100")).doubleValue(),
                                formatCurrency(totalDeductions),
                                formatCurrency(grossPay)))
                        .amount(totalDeductions)
                        .build());
            }
        }

        // Warning if loan deduction is significant
        if (ep.getLoanDeductionAmount() != null &&
                ep.getLoanDeductionAmount().compareTo(new BigDecimal("1000")) > 0) {
            issues.add(DeductionReviewSummaryDTO.DeductionIssueDTO.builder()
                    .employeeId(ep.getEmployeeId().toString())
                    .employeeName(ep.getEmployeeName())
                    .severity("INFO")
                    .deductionType("LOAN_REPAYMENT")
                    .description(String.format("Loan deduction applied: %s",
                            formatCurrency(ep.getLoanDeductionAmount())))
                    .amount(ep.getLoanDeductionAmount())
                    .build());
        }

        // Info about net pay being low
        BigDecimal netPay = ep.getNetPay() != null ? ep.getNetPay() : BigDecimal.ZERO;
        if (netPay.compareTo(BigDecimal.ZERO) <= 0) {
            issues.add(DeductionReviewSummaryDTO.DeductionIssueDTO.builder()
                    .employeeId(ep.getEmployeeId().toString())
                    .employeeName(ep.getEmployeeName())
                    .severity("ERROR")
                    .deductionType("NET_PAY")
                    .description("Net pay is zero or negative after deductions")
                    .amount(netPay)
                    .build());
        }
    }

    private int countDeductions(EmployeePayroll ep) {
        int count = 0;
        if (ep.getAbsenceDeductionAmount() != null && ep.getAbsenceDeductionAmount().compareTo(BigDecimal.ZERO) > 0) count++;
        if (ep.getLateDeductionAmount() != null && ep.getLateDeductionAmount().compareTo(BigDecimal.ZERO) > 0) count++;
        if (ep.getLeaveDeductionAmount() != null && ep.getLeaveDeductionAmount().compareTo(BigDecimal.ZERO) > 0) count++;
        if (ep.getLoanDeductionAmount() != null && ep.getLoanDeductionAmount().compareTo(BigDecimal.ZERO) > 0) count++;
        if (ep.getOtherDeductionAmount() != null && ep.getOtherDeductionAmount().compareTo(BigDecimal.ZERO) > 0) count++;
        return count;
    }

    private String createSummaryJson(int totalEmployees, int employeesWithDeductions,
                                     BigDecimal totalDeductions, BigDecimal totalAbsence,
                                     BigDecimal totalLate, BigDecimal totalLeave,
                                     BigDecimal totalLoan, BigDecimal totalOther,
                                     int activeLoans, int loanDeductionsApplied) {
        try {
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("totalEmployees", totalEmployees);
            summary.put("employeesWithDeductions", employeesWithDeductions);
            summary.put("totalDeductionAmount", totalDeductions);
            summary.put("totalAbsenceDeductions", totalAbsence);
            summary.put("totalLateDeductions", totalLate);
            summary.put("totalLeaveDeductions", totalLeave);
            summary.put("totalLoanDeductions", totalLoan);
            summary.put("totalOtherDeductions", totalOther);
            summary.put("activeLoansCount", activeLoans);
            summary.put("loanDeductionsApplied", loanDeductionsApplied);
            return objectMapper.writeValueAsString(summary);
        } catch (Exception e) {
            log.error("Error creating summary JSON", e);
            return "{}";
        }
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0.00";
        return amount.setScale(2, RoundingMode.HALF_UP).toString();
    }
}
