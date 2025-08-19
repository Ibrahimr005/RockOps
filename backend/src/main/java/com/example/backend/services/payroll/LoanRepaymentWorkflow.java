package com.example.backend.services.payroll;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.UUID;

/**
 * LoanRepaymentWorkflow - Documentation and orchestration of the new loan repayment process
 * 
 * NEW LOAN REPAYMENT RULES:
 * 1. NO WEEKLY LOANS - Loan repayment schedules only match payslip pay periods (monthly)
 * 2. PAYSLIP-ONLY DEDUCTIONS - Loan repayments are ONLY deducted from payslips, never paid separately
 * 3. PERIOD-MATCHING - Loan deductions happen ONLY when payslip is generated for period covering repayment date
 * 4. 50% LIMIT - Maximum loan deduction = 50% of gross salary for that payslip period
 * 5. BALANCE UPDATES - Loan balances and repayment schedules updated AFTER payslip finalization
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanRepaymentWorkflow {

    private final PayslipService payslipService;
    private final DeductionCalculationService deductionCalculationService;
    private final LoanService loanService;

    /**
     * COMPLETE LOAN REPAYMENT FLOW DOCUMENTATION
     * 
     * FLOW SEQUENCE:
     * 1. PayslipService.generatePayslip() → calls DeductionCalculationService with custom pay period
     * 2. DeductionCalculationService.calculateDeductions() → calls LoanService for due repayments
     * 3. LoanService.getDueRepaymentsForEmployee() → retrieves repayments within payslip start–end date
     * 4. DeductionCalculationService creates deductions for due repayments
     * 5. DeductionCalculationService enforces maximum loan deduction = 50% of gross salary
     * 6. PayslipService.finalizePayslip() → calls LoanService to update balances
     * 7. LoanService.processLoanDeductionsFromPayslip() → updates loan balances and schedules
     */

    /**
     * Validate loan repayment workflow for a specific payslip period
     */
    public void validateLoanRepaymentWorkflow(UUID employeeId, LocalDate payslipStart, LocalDate payslipEnd) {
        log.info("=== LOAN REPAYMENT WORKFLOW VALIDATION ===");
        log.info("Employee: {}, Payslip Period: {} to {}", employeeId, payslipStart, payslipEnd);

        try {
            // STEP 1: Check if employee has any loans
            var employeeLoans = loanService.getLoansByEmployee(employeeId);
            log.info("Employee has {} total loans", employeeLoans.size());

            // STEP 2: Check for due repayments in payslip period
            var dueRepayments = loanService.getDueRepaymentsForEmployee(employeeId, payslipStart, payslipEnd);
            log.info("Found {} repayments due in payslip period", dueRepayments.size());

            if (dueRepayments.isEmpty()) {
                log.info("✅ No loan repayments due in this payslip period - no deductions will be created");
                return;
            }

            // STEP 3: Validate period alignment
            dueRepayments.forEach(repayment -> {
                boolean isInPeriod = !repayment.getDueDate().isBefore(payslipStart) && 
                                   !repayment.getDueDate().isAfter(payslipEnd);
                log.info("Repayment due {} is {} payslip period", 
                        repayment.getDueDate(), 
                        isInPeriod ? "WITHIN" : "OUTSIDE");
            });

            // STEP 4: Calculate total deduction amount
            var totalLoanDeductions = dueRepayments.stream()
                    .map(r -> r.getScheduledAmount())
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

            log.info("Total loan deductions for period: ${}", totalLoanDeductions);

            log.info("✅ Loan repayment workflow validation completed");

        } catch (Exception e) {
            log.error("❌ Error validating loan repayment workflow: {}", e.getMessage());
        }

        log.info("=== END WORKFLOW VALIDATION ===");
    }

    /**
     * Document the key differences from old loan process
     */
    public void documentProcessChanges() {
        log.info("=== LOAN REPAYMENT PROCESS CHANGES ===");
        
        log.info("OLD PROCESS:");
        log.info("- Weekly or any frequency loans allowed");
        log.info("- Separate loan payment processing");
        log.info("- Manual loan balance updates");
        log.info("- Inconsistent timing with payroll");
        
        log.info("NEW PROCESS (IMPLEMENTED):");
        log.info("✅ 1. NO WEEKLY LOANS - Only monthly/payslip-period schedules");
        log.info("✅ 2. PAYSLIP-ONLY DEDUCTIONS - Never paid separately");
        log.info("✅ 3. PERIOD-MATCHING - Only when payslip covers repayment date");
        log.info("✅ 4. 50% SALARY LIMIT - Enforced in DeductionCalculationService");
        log.info("✅ 5. AUTOMATIC BALANCE UPDATES - After payslip finalization");
        
        log.info("=== BENEFITS ===");
        log.info("✅ Simplified administration");
        log.info("✅ Consistent timing");
        log.info("✅ Automatic processing");
        log.info("✅ Financial protection (50% limit)");
        log.info("✅ Better audit trail");
        
        log.info("=== END PROCESS DOCUMENTATION ===");
    }

    /**
     * Simulate the complete flow for testing/validation
     */
    public void simulateCompleteFlow(UUID employeeId, LocalDate payslipStart, LocalDate payslipEnd) {
        log.info("=== SIMULATING COMPLETE LOAN REPAYMENT FLOW ===");
        
        try {
            // SIMULATION STEP 1: Check what would happen in PayslipService
            log.info("STEP 1: PayslipService would call DeductionCalculationService");
            
            // SIMULATION STEP 2: Check what DeductionCalculationService would do
            log.info("STEP 2: DeductionCalculationService would call LoanService.getDueRepaymentsForEmployee()");
            var dueRepayments = loanService.getDueRepaymentsForEmployee(employeeId, payslipStart, payslipEnd);
            log.info("  → Found {} due repayments", dueRepayments.size());
            
            // SIMULATION STEP 3: Show deduction creation
            log.info("STEP 3: Deductions would be created for due repayments:");
            dueRepayments.forEach(repayment -> {
                log.info("  → Deduction: {} due {} amount ${}", 
                        repayment.getDeductionDescription(),
                        repayment.getDueDate(),
                        repayment.getScheduledAmount());
            });
            
            // SIMULATION STEP 4: Show 50% limit check
            var totalAmount = dueRepayments.stream()
                    .map(r -> r.getScheduledAmount())
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            log.info("STEP 4: 50% limit would be checked against total: ${}", totalAmount);
            
            // SIMULATION STEP 5: Show payslip finalization
            log.info("STEP 5: After payslip finalization, LoanService.processLoanDeductionsFromPayslip() would:");
            log.info("  → Update repayment schedules to PAID");
            log.info("  → Link repayments to payslip ID");
            log.info("  → Update loan remaining balances");
            log.info("  → Mark loans as COMPLETED if fully paid");
            
            log.info("✅ Flow simulation completed successfully");
            
        } catch (Exception e) {
            log.error("❌ Error simulating flow: {}", e.getMessage());
        }
        
        log.info("=== END FLOW SIMULATION ===");
    }

    /**
     * Key workflow validation points
     */
    public static class WorkflowValidation {
        
        /**
         * Validate that loan repayments only occur through payslips
         */
        public static boolean validatePayslipOnlyRule(LocalDate repaymentDueDate, 
                                                     LocalDate payslipStart, 
                                                     LocalDate payslipEnd) {
            // Repayment can only be processed if due date falls within payslip period
            return !repaymentDueDate.isBefore(payslipStart) && !repaymentDueDate.isAfter(payslipEnd);
        }
        
        /**
         * Validate 50% salary limit
         */
        public static boolean validateSalaryLimit(java.math.BigDecimal totalLoanDeductions, 
                                                 java.math.BigDecimal grossSalary) {
            java.math.BigDecimal maxAllowed = grossSalary.multiply(new java.math.BigDecimal("0.50"));
            return totalLoanDeductions.compareTo(maxAllowed) <= 0;
        }
        
        /**
         * Validate no weekly loans
         */
        public static boolean validateNoWeeklyLoans(LocalDate startDate, LocalDate endDate, Integer installments) {
            // Calculate average period between installments
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
            double avgDaysBetweenInstallments = (double) daysBetween / installments;
            
            // Should be monthly (approximately 30 days) or longer, never weekly (7 days)
            return avgDaysBetweenInstallments >= 25; // Allow some flexibility around monthly
        }
    }
}