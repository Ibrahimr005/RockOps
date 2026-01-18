package com.example.backend.services.payroll;

import com.example.backend.models.payroll.Loan;
import com.example.backend.repositories.payroll.LoanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service to calculate loan deductions for payroll
 * Integrates with existing Loan entity
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollLoanService {

    private final LoanRepository loanRepository;

    /**
     * Calculate total loan deduction for an employee in a payroll period
     */
    public BigDecimal calculateLoanDeductionForPayroll(UUID employeeId,
                                                       LocalDate periodStart,
                                                       LocalDate periodEnd) {
        // Get all active loans for employee
        List<Loan> activeLoans = loanRepository.findByEmployeeIdAndStatus(
            employeeId,
            Loan.LoanStatus.APPROVED
        );

        if (activeLoans.isEmpty()) {
            log.debug("No active loans for employee {}", employeeId);
            return BigDecimal.ZERO;
        }

        BigDecimal totalDeduction = BigDecimal.ZERO;

        for (Loan loan : activeLoans) {
            // Check if loan is active during this period
            if (isLoanActiveInPeriod(loan, periodStart, periodEnd)) {
                BigDecimal installment = calculateInstallmentAmount(loan);
                totalDeduction = totalDeduction.add(installment);

                log.debug("Loan {} deduction: {}", loan.getId(), installment);
            }
        }

        log.info("Total loan deduction for employee {}: {}", employeeId, totalDeduction);
        return totalDeduction.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Check if loan is active during the payroll period
     */
    private boolean isLoanActiveInPeriod(Loan loan, LocalDate periodStart, LocalDate periodEnd) {
        LocalDate loanStart = loan.getDisbursementDate();

        // Loan hasn't started yet
        if (loanStart == null || loanStart.isAfter(periodEnd)) {
            return false;
        }

        // Check if loan is fully paid
        if (loan.getRemainingBalance() != null &&
            loan.getRemainingBalance().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        // Check loan status
        if (loan.getStatus() != Loan.LoanStatus.APPROVED) {
            return false;
        }

        return true;
    }

    /**
     * Calculate installment amount based on loan terms
     */
    private BigDecimal calculateInstallmentAmount(Loan loan) {
        // Use the monthly installment from the loan
        if (loan.getMonthlyInstallment() != null) {
            return loan.getMonthlyInstallment();
        }

        // Fallback: calculate from total and term
        if (loan.getLoanAmount() != null && loan.getRepaymentPeriod() != null && loan.getRepaymentPeriod() > 0) {
            return loan.getLoanAmount()
                .divide(BigDecimal.valueOf(loan.getRepaymentPeriod()),
                       2, RoundingMode.HALF_UP);
        }

        log.warn("Cannot calculate installment for loan {}: missing data", loan.getId());
        return BigDecimal.ZERO;
    }

    /**
     * Get all active loans for an employee
     */
    public List<Loan> getActiveLoans(UUID employeeId) {
        return loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.APPROVED);
    }

    /**
     * Get total remaining loan balance for an employee
     */
    public BigDecimal getTotalRemainingBalance(UUID employeeId) {
        List<Loan> activeLoans = getActiveLoans(employeeId);

        return activeLoans.stream()
            .map(loan -> loan.getRemainingBalance() != null ?
                         loan.getRemainingBalance() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }
}