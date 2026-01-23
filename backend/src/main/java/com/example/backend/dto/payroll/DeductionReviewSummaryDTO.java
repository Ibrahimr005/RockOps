package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for deduction review summary response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionReviewSummaryDTO {
    private String status; // SUCCESS, SUCCESS_WITH_WARNINGS, FAILURE
    private String message;

    // Payroll-level totals
    private Integer totalEmployees;
    private Integer employeesWithDeductions;
    private BigDecimal totalDeductionAmount;

    // Deduction breakdown
    private BigDecimal totalAbsenceDeductions;
    private BigDecimal totalLateDeductions;
    private BigDecimal totalLeaveDeductions;
    private BigDecimal totalLoanDeductions;
    private BigDecimal totalOtherDeductions;

    // Loan specific
    private Integer activeLoansCount;
    private Integer loanDeductionsApplied;

    // Issues detected
    private List<DeductionIssueDTO> issues;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeductionIssueDTO {
        private String employeeId;
        private String employeeName;
        private String severity; // INFO, WARNING, ERROR
        private String deductionType;
        private String description;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeDeductionSummaryDTO {
        private String employeeId;
        private String employeeName;
        private BigDecimal totalDeductions;
        private BigDecimal absenceDeduction;
        private BigDecimal lateDeduction;
        private BigDecimal leaveDeduction;
        private BigDecimal loanDeduction;
        private BigDecimal otherDeduction;
        private Integer deductionCount;
    }
}
