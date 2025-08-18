package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.RepaymentScheduleDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.RepaymentSchedule;
import com.example.backend.models.payroll.Deduction;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.repositories.payroll.RepaymentScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanService {

    private final LoanRepository loanRepository;
    private final RepaymentScheduleRepository repaymentScheduleRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * ENHANCED: Create loan with payslip-period-aligned repayment schedule
     * NO WEEKLY LOANS - Only monthly/payroll period schedules
     */
    // Key changes needed in LoanService.java createLoan method

    @Transactional
    public LoanDTO createLoan(LoanDTO loanDTO, String createdBy) {
        log.info("Creating loan for employee: {}", loanDTO.getEmployeeId());

        try {
            // Validate loan data
            validateLoanData(loanDTO);

            // Validate employee exists and is active
            Employee employee = employeeRepository.findById(loanDTO.getEmployeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + loanDTO.getEmployeeId()));

            // Check if employee has any pending loans
            List<Loan> pendingLoans = loanRepository.findByEmployeeIdAndStatus(employee.getId(), Loan.LoanStatus.PENDING);
            if (!pendingLoans.isEmpty()) {
                throw new IllegalArgumentException("Employee already has a pending loan. Only one pending loan is allowed at a time.");
            }

            // Check outstanding balance limits
            BigDecimal existingOutstanding = getTotalOutstandingBalanceByEmployee(employee.getId());
            BigDecimal newTotalOutstanding = existingOutstanding.add(loanDTO.getLoanAmount());
            BigDecimal maxAllowed = new BigDecimal("100000"); // $100k limit

            if (newTotalOutstanding.compareTo(maxAllowed) > 0) {
                throw new IllegalArgumentException(
                        String.format("Total outstanding balance would exceed limit. Current: $%s, New: $%s, Max: $%s",
                                existingOutstanding, newTotalOutstanding, maxAllowed));
            }

            // Calculate monthly payment if not provided
            BigDecimal monthlyPayment = loanDTO.getInstallmentAmount();
            if (monthlyPayment == null || monthlyPayment.compareTo(BigDecimal.ZERO) <= 0) {
                monthlyPayment = calculateMonthlyPayment(
                        loanDTO.getLoanAmount(),
                        loanDTO.getInterestRate(),
                        loanDTO.getTotalInstallments()
                );
                log.info("Calculated monthly payment: {} for loan amount: {}", monthlyPayment, loanDTO.getLoanAmount());
            }

            // Create loan entity
            Loan loan = Loan.builder()
                    .employee(employee)
                    .loanAmount(loanDTO.getLoanAmount())
                    .remainingBalance(loanDTO.getLoanAmount())
                    .interestRate(loanDTO.getInterestRate())
                    .totalInstallments(loanDTO.getTotalInstallments())
                    .installmentAmount(monthlyPayment)  // FIX: Ensure this field is set
                    .installmentFrequency(Loan.InstallmentFrequency.MONTHLY) // Set frequency
                    .startDate(loanDTO.getStartDate())
                    .endDate(calculateEndDate(loanDTO.getStartDate(), loanDTO.getTotalInstallments()))
                    .status(Loan.LoanStatus.PENDING)
                    .description(loanDTO.getDescription())
                    .createdBy(createdBy)
                    .build();

            // Validate that installment amount is set
            if (loan.getInstallmentAmount() == null || loan.getInstallmentAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Invalid installment amount calculated: " + loan.getInstallmentAmount());
            }

            // Save loan first to get ID
            loan = loanRepository.save(loan);

            // ENHANCED: Generate payslip-period-aligned repayment schedule
            List<RepaymentSchedule> repaymentSchedules = generatePayslipAlignedRepaymentSchedule(loan);

            // Set loan reference and save schedules
            Loan finalLoan = loan;
            repaymentSchedules.forEach(schedule -> schedule.setLoan(finalLoan));
            repaymentSchedules = repaymentScheduleRepository.saveAll(repaymentSchedules);

            // Set schedules on loan
            loan.setRepaymentSchedules(repaymentSchedules);
            loan = loanRepository.save(loan);

            log.info("Loan created successfully: {} with {} payslip-aligned installments",
                    loan.getId(), repaymentSchedules.size());

            return convertToDTO(loan);

        } catch (Exception e) {
            log.error("Error creating loan for employee {}: {}", loanDTO.getEmployeeId(), e.getMessage());
            throw e;
        }
    }

    /**
     * NEW: Generate repayment schedule aligned with payslip periods
     * Ensures repayments only occur when payslips are generated
     */
    private List<RepaymentSchedule> generatePayslipAlignedRepaymentSchedule(Loan loan) {
        List<RepaymentSchedule> schedules = new ArrayList<>();

        try {
            log.info("Generating payslip-aligned repayment schedule for loan: {}", loan.getId());

            BigDecimal principal = loan.getLoanAmount();
            BigDecimal interestRate = loan.getInterestRate().divide(new BigDecimal("100")); // Convert percentage
            Integer installments = loan.getTotalInstallments();

            // Calculate monthly payment using loan payment formula
            BigDecimal monthlyPayment = calculateMonthlyPayment(principal, interestRate, installments);

            LocalDate currentDueDate = getNextPayslipDate(loan.getStartDate());
            BigDecimal remainingBalance = principal;

            for (int i = 1; i <= installments; i++) {
                // Calculate interest and principal portions
                BigDecimal interestPortion = remainingBalance.multiply(interestRate.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP));
                BigDecimal principalPortion = monthlyPayment.subtract(interestPortion);

                // Calculate the actual payment amount for this installment
                BigDecimal actualPaymentAmount = monthlyPayment;

                // Adjust for final payment
                if (i == installments) {
                    principalPortion = remainingBalance; // Pay off remaining balance
                    actualPaymentAmount = principalPortion.add(interestPortion);
                }

                RepaymentSchedule schedule = RepaymentSchedule.builder()
                        .loan(loan)
                        .installmentNumber(i)
                        .dueDate(currentDueDate)
                        .scheduledAmount(actualPaymentAmount.setScale(2, RoundingMode.HALF_UP))
                        .principalAmount(principalPortion.setScale(2, RoundingMode.HALF_UP))
                        .interestAmount(interestPortion.setScale(2, RoundingMode.HALF_UP))
                        .status(RepaymentSchedule.RepaymentStatus.PENDING)
                        .build();

                schedules.add(schedule);

                // Update remaining balance
                remainingBalance = remainingBalance.subtract(principalPortion);

                // Move to next payslip date (monthly)
                currentDueDate = currentDueDate.plusMonths(1);
            }

            log.info("Generated {} payslip-aligned repayment schedules", schedules.size());

        } catch (Exception e) {
            log.error("Error generating repayment schedule for loan {}: {}", loan.getId(), e.getMessage());
            throw new RuntimeException("Failed to generate repayment schedule", e);
        }

        return schedules;
    }

    /**
     * NEW: Get next payslip date (assuming monthly payslips on last day of month)
     */
    private LocalDate getNextPayslipDate(LocalDate startDate) {
        // Align with payslip generation - typically last day of month
        return startDate.withDayOfMonth(startDate.lengthOfMonth());
    }

    /**
     * ENHANCED: Get due repayments for employee within payslip period
     * ONLY returns repayments due within the exact payslip start-end dates
     */
    public List<RepaymentSchedule> getDueRepaymentsForEmployee(UUID employeeId,
                                                               LocalDate payslipStart,
                                                               LocalDate payslipEnd) {
        try {
            log.debug("Getting due repayments for employee: {} within payslip period: {} to {}",
                    employeeId, payslipStart, payslipEnd);

            // Get ONLY active loans for the employee
            List<Loan> activeLoans = loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.ACTIVE);

            if (activeLoans.isEmpty()) {
                log.debug("No active loans found for employee: {}", employeeId);
                return new ArrayList<>();
            }

            List<RepaymentSchedule> dueRepayments = new ArrayList<>();

            for (Loan loan : activeLoans) {
                // Get repayments due within the payslip period
                List<RepaymentSchedule> loanRepayments = repaymentScheduleRepository
                        .findByLoanIdAndDueDateBetweenAndStatus(
                                loan.getId(),
                                payslipStart,
                                payslipEnd,
                                RepaymentSchedule.RepaymentStatus.PENDING
                        );

                // Additional validation: ensure due date falls within payslip period
                List<RepaymentSchedule> validRepayments = loanRepayments.stream()
                        .filter(repayment -> !repayment.getDueDate().isBefore(payslipStart) &&
                                !repayment.getDueDate().isAfter(payslipEnd))
                        .collect(Collectors.toList());

                dueRepayments.addAll(validRepayments);

                log.debug("Loan {} has {} repayments due in payslip period",
                        loan.getId(), validRepayments.size());
            }

            log.info("Found {} total due repayments for employee: {} in payslip period",
                    dueRepayments.size(), employeeId);

            return dueRepayments;

        } catch (Exception e) {
            log.error("Error getting due repayments for employee {}: {}", employeeId, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * NEW: Process loan deductions from payslip finalization
     * Updates loan balances and repayment schedules after payslip is finalized
     */
    @Transactional
    public void processLoanDeductionsFromPayslip(UUID payslipId,
                                                 List<Deduction> loanDeductions,
                                                 LocalDate payslipStart,
                                                 LocalDate payslipEnd) {
        try {
            log.info("Processing {} loan deductions from payslip: {}", loanDeductions.size(), payslipId);

            for (Deduction loanDeduction : loanDeductions) {
                // Find the corresponding repayment schedule
                RepaymentSchedule repayment = findRepaymentForDeduction(loanDeduction, payslipStart, payslipEnd);

                if (repayment != null) {
                    // Update repayment schedule
                    repayment.setActualAmount(loanDeduction.getAmount());
                    repayment.setPaidDate(LocalDate.now());
                    repayment.setStatus(RepaymentSchedule.RepaymentStatus.PAID);
                    repayment.setPayslipId(payslipId); // Link to payslip

                    repaymentScheduleRepository.save(repayment);

                    // Update loan balance
                    Loan loan = repayment.getLoan();
                    BigDecimal newBalance = loan.getRemainingBalance().subtract(repayment.getPrincipalAmount());
                    loan.setRemainingBalance(newBalance.max(BigDecimal.ZERO)); // Ensure non-negative

                    // Check if loan is fully paid
                    if (loan.getRemainingBalance().compareTo(BigDecimal.ZERO) == 0) {
                        loan.setStatus(Loan.LoanStatus.COMPLETED);
                        // Note: Using existing endDate field since actualEndDate doesn't exist in model
                        log.info("Loan {} marked as completed", loan.getId());
                    }

                    loanRepository.save(loan);

                    log.debug("Updated loan {} balance to ${} after repayment of ${}",
                            loan.getId(), loan.getRemainingBalance(), loanDeduction.getAmount());
                }
            }

            log.info("Successfully processed loan deductions from payslip: {}", payslipId);

        } catch (Exception e) {
            log.error("Error processing loan deductions from payslip {}: {}", payslipId, e.getMessage());
            throw new RuntimeException("Failed to process loan deductions", e);
        }
    }

    /**
     * Find repayment schedule for a loan deduction
     */
    private RepaymentSchedule findRepaymentForDeduction(Deduction loanDeduction,
                                                        LocalDate payslipStart,
                                                        LocalDate payslipEnd) {
        try {
            // Extract loan info from deduction description or use other logic
            // This is a simplified approach - you might need more sophisticated matching
            List<RepaymentSchedule> pendingRepayments = repaymentScheduleRepository
                    .findByDueDateBetweenAndStatus(payslipStart, payslipEnd, RepaymentSchedule.RepaymentStatus.PENDING);

            // Find repayment with matching amount
            return pendingRepayments.stream()
                    .filter(repayment -> repayment.getScheduledAmount().compareTo(loanDeduction.getAmount()) == 0)
                    .findFirst()
                    .orElse(null);

        } catch (Exception e) {
            log.warn("Could not find matching repayment for deduction: {}", e.getMessage());
            return null;
        }
    }

    /**
     * ENHANCED: Check if employee can afford loan with 50% salary limit
     */
    public boolean canAffordLoan(UUID employeeId, BigDecimal loanAmount,
                                 Integer installments, BigDecimal monthlyGrossSalary) {
        try {
            // Calculate proposed monthly payment
            BigDecimal monthlyPayment = loanAmount.divide(new BigDecimal(installments), 2, RoundingMode.HALF_UP);

            // Get existing loan obligations
            BigDecimal existingMonthlyPayments = getMonthlyLoanPayments(employeeId);

            // Total monthly loan payments
            BigDecimal totalMonthlyPayments = existingMonthlyPayments.add(monthlyPayment);

            // Check against 50% of gross salary
            BigDecimal maxAllowedPayments = monthlyGrossSalary.multiply(new BigDecimal("0.50"));

            boolean canAfford = totalMonthlyPayments.compareTo(maxAllowedPayments) <= 0;

            log.debug("Loan affordability check for employee {}: Monthly payment ${}, Total ${}, Max allowed ${}, Can afford: {}",
                    employeeId, monthlyPayment, totalMonthlyPayments, maxAllowedPayments, canAfford);

            return canAfford;

        } catch (Exception e) {
            log.error("Error checking loan affordability for employee {}: {}", employeeId, e.getMessage());
            return false;
        }
    }

    /**
     * Get current monthly loan payments for employee
     */
    private BigDecimal getMonthlyLoanPayments(UUID employeeId) {
        try {
            List<Loan> activeLoans = loanRepository.findByEmployeeIdAndStatus(employeeId, Loan.LoanStatus.ACTIVE);

            return activeLoans.stream()
                    .map(this::calculateMonthlyPaymentForLoan)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

        } catch (Exception e) {
            log.error("Error calculating monthly loan payments for employee {}: {}", employeeId, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Calculate monthly payment for a loan
     */
    private BigDecimal calculateMonthlyPaymentForLoan(Loan loan) {
        if (loan.getTotalInstallments() == null || loan.getTotalInstallments() == 0) {
            return BigDecimal.ZERO;
        }

        return loan.getLoanAmount().divide(new BigDecimal(loan.getTotalInstallments()), 2, RoundingMode.HALF_UP);
    }

    /**
     * Approve loan and activate it
     */
    @Transactional
    public LoanDTO approveLoan(UUID loanId, String approvedBy) {
        log.info("Approving loan: {}", loanId);

        try {
            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (loan.getStatus() != Loan.LoanStatus.PENDING) {
                throw new IllegalStateException("Only pending loans can be approved");
            }

            loan.setStatus(Loan.LoanStatus.ACTIVE);
            loan.setApprovedBy(approvedBy);
            loan.setApprovalDate(LocalDateTime.now()); // Using approvalDate instead of approvedAt

            loan = loanRepository.save(loan);

            log.info("Loan approved successfully: {}", loanId);

            return convertToDTO(loan);

        } catch (Exception e) {
            log.error("Error approving loan {}: {}", loanId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get loan by ID
     */
    public LoanDTO getLoanById(UUID loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

        return convertToDTO(loan);
    }

    /**
     * Get loans by employee
     */
    public List<LoanDTO> getLoansByEmployee(UUID employeeId) {
        List<Loan> loans = loanRepository.findByEmployeeIdOrderByStartDateDesc(employeeId);
        return loans.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    /**
     * Get total outstanding balance by employee
     */
    public BigDecimal getTotalOutstandingBalanceByEmployee(UUID employeeId) {
        BigDecimal balance = loanRepository.getTotalOutstandingBalanceByEmployee(employeeId);
        return balance != null ? balance : BigDecimal.ZERO;
    }

    /**
     * Update loan
     */
    @Transactional
    public LoanDTO updateLoan(UUID loanId, LoanDTO loanDTO) {
        log.info("Updating loan: {}", loanId);

        try {
            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            // Only allow updates to pending loans
            if (loan.getStatus() != Loan.LoanStatus.PENDING) {
                throw new IllegalStateException("Only pending loans can be updated");
            }

            // Update fields if provided
            if (loanDTO.getLoanAmount() != null) {
                loan.setLoanAmount(loanDTO.getLoanAmount());
                loan.setRemainingBalance(loanDTO.getLoanAmount()); // Reset remaining balance
            }
            if (loanDTO.getInterestRate() != null) {
                loan.setInterestRate(loanDTO.getInterestRate());
            }
            if (loanDTO.getTotalInstallments() != null) {
                loan.setTotalInstallments(loanDTO.getTotalInstallments());
            }
            if (loanDTO.getStartDate() != null) {
                loan.setStartDate(loanDTO.getStartDate());
                loan.setEndDate(calculateEndDate(loanDTO.getStartDate(), loan.getTotalInstallments()));
            }
            if (loanDTO.getDescription() != null) {
                loan.setDescription(loanDTO.getDescription());
            }

            // Validate updated data
            validateLoanData(convertToDTO(loan));

            // Regenerate repayment schedule if loan details changed
            if (loanDTO.getLoanAmount() != null || loanDTO.getTotalInstallments() != null ||
                    loanDTO.getStartDate() != null || loanDTO.getInterestRate() != null) {

                // Delete existing schedules
                repaymentScheduleRepository.deleteByLoanId(loan.getId());

                // Generate new schedules
                List<RepaymentSchedule> newSchedules = generatePayslipAlignedRepaymentSchedule(loan);
                Loan finalLoan = loan;
                newSchedules.forEach(schedule -> schedule.setLoan(finalLoan));
                repaymentScheduleRepository.saveAll(newSchedules);
                loan.setRepaymentSchedules(newSchedules);
            }

            loan = loanRepository.save(loan);

            log.info("Loan updated successfully: {}", loanId);
            return convertToDTO(loan);

        } catch (Exception e) {
            log.error("Error updating loan {}: {}", loanId, e.getMessage());
            throw e;
        }
    }

    /**
     * Cancel loan
     */
    @Transactional
    public void cancelLoan(UUID loanId) {
        log.info("Cancelling loan: {}", loanId);

        try {
            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (!loan.canBeCancelled()) {
                throw new IllegalStateException("Loan cannot be cancelled in current status: " + loan.getStatus());
            }

            loan.cancel();
            loanRepository.save(loan);

            log.info("Loan cancelled successfully: {}", loanId);

        } catch (Exception e) {
            log.error("Error cancelling loan {}: {}", loanId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get active loans
     */
    public List<LoanDTO> getActiveLoans() {
        log.debug("Getting all active loans");

        List<Loan> activeLoans = loanRepository.findByStatus(Loan.LoanStatus.ACTIVE);
        return activeLoans.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get overdue loans
     */
    public List<LoanDTO> getOverdueLoans() {
        log.debug("Getting overdue loans");

        List<Loan> allLoans = loanRepository.findByStatus(Loan.LoanStatus.ACTIVE);
        return allLoans.stream()
                .filter(Loan::isOverdue)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get loans by status
     */
    public List<LoanDTO> getLoansByStatus(String status) {
        log.debug("Getting loans by status: {}", status);

        try {
            Loan.LoanStatus loanStatus = Loan.LoanStatus.valueOf(status.toUpperCase());
            List<Loan> loans = loanRepository.findByStatus(loanStatus);
            return loans.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid loan status: " + status);
        }
    }

    /**
     * Get loan statistics
     */
    public Map<String, Object> getLoanStatistics() {
        log.debug("Getting loan statistics");

        Map<String, Object> statistics = new java.util.HashMap<>();

        try {
            // Basic counts
            long totalLoans = loanRepository.count();
            long activeLoans = loanRepository.countByStatus(Loan.LoanStatus.ACTIVE);
            long completedLoans = loanRepository.countByStatus(Loan.LoanStatus.COMPLETED);
            long pendingLoans = loanRepository.countByStatus(Loan.LoanStatus.PENDING);

            // Financial data
            BigDecimal totalOutstanding = loanRepository.getTotalOutstandingAmount();
            BigDecimal averageLoanAmount = loanRepository.getAverageLoanAmount();

            // Overdue analysis
            List<Loan> activeLoanList = loanRepository.findByStatus(Loan.LoanStatus.ACTIVE);
            long overdueLoans = activeLoanList.stream()
                    .filter(Loan::isOverdue)
                    .count();

            // Compile statistics
            statistics.put("totalLoans", totalLoans);
            statistics.put("activeLoans", activeLoans);
            statistics.put("completedLoans", completedLoans);
            statistics.put("pendingLoans", pendingLoans);
            statistics.put("overdueLoans", overdueLoans);
            statistics.put("totalOutstandingAmount", totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO);
            statistics.put("averageLoanAmount", averageLoanAmount != null ? averageLoanAmount : BigDecimal.ZERO);
            statistics.put("generatedAt", LocalDateTime.now());

        } catch (Exception e) {
            log.error("Error generating loan statistics: {}", e.getMessage());
            statistics.put("error", "Failed to generate loan statistics");
        }

        return statistics;
    }

    /**
     * Get repayment schedule for a loan
     */
    public List<RepaymentScheduleDTO> getRepaymentSchedule(UUID loanId) {
        log.debug("Getting repayment schedule for loan: {}", loanId);

        // Verify loan exists
        if (!loanRepository.existsById(loanId)) {
            throw new IllegalArgumentException("Loan not found with ID: " + loanId);
        }

        List<RepaymentSchedule> schedules = repaymentScheduleRepository.findByLoanIdOrderByInstallmentNumberAsc(loanId);
        return schedules.stream()
                .map(this::convertRepaymentScheduleToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Reject loan
     */
    @Transactional
    public LoanDTO rejectLoan(UUID loanId, String rejectedBy, String reason) {
        log.info("Rejecting loan: {} by: {} with reason: {}", loanId, rejectedBy, reason);

        try {
            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (!loan.canBeApproved()) {
                throw new IllegalStateException("Only pending loans can be rejected");
            }

            loan.reject(rejectedBy, reason);
            loan = loanRepository.save(loan);

            log.info("Loan rejected successfully: {}", loanId);
            return convertToDTO(loan);

        } catch (Exception e) {
            log.error("Error rejecting loan {}: {}", loanId, e.getMessage());
            throw e;
        }
    }

    /**
     * Process loan repayment manually
     */
    @Transactional
    public void processLoanRepayment(UUID scheduleId, BigDecimal amount) {
        log.info("Processing manual loan repayment for schedule: {} amount: ${}", scheduleId, amount);

        try {
            RepaymentSchedule repayment = repaymentScheduleRepository.findById(scheduleId)
                    .orElseThrow(() -> new IllegalArgumentException("Repayment schedule not found with ID: " + scheduleId));

            if (repayment.getStatus() != RepaymentSchedule.RepaymentStatus.PENDING) {
                throw new IllegalStateException("Only pending repayments can be processed");
            }

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Repayment amount must be greater than zero");
            }

            // Update repayment schedule
            repayment.setActualAmount(amount);
            repayment.setPaidDate(LocalDate.now());
            repayment.setStatus(RepaymentSchedule.RepaymentStatus.PAID);
            repaymentScheduleRepository.save(repayment);

            // Update loan balance
            Loan loan = repayment.getLoan();
            loan.processRepayment(amount);
            loanRepository.save(loan);

            log.info("Loan repayment processed successfully for schedule: {}", scheduleId);

        } catch (Exception e) {
            log.error("Error processing loan repayment for schedule {}: {}", scheduleId, e.getMessage());
            throw e;
        }
    }

    // Helper methods
    private void validateLoanData(LoanDTO loanDTO) {
        if (loanDTO.getLoanAmount() == null || loanDTO.getLoanAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Loan amount must be greater than zero");
        }
        if (loanDTO.getTotalInstallments() == null || loanDTO.getTotalInstallments() <= 0) {
            throw new IllegalArgumentException("Total installments must be greater than zero");
        }
        if (loanDTO.getStartDate() == null) {
            throw new IllegalArgumentException("Start date is required");
        }

        // NEW: Validate no weekly loans
        validateNoWeeklyLoans(loanDTO);
    }

    /**
     * NEW: Validate that no weekly loans are created
     * According to new requirements: "NO WEEKLY LOANS"
     */
    private void validateNoWeeklyLoans(LoanDTO loanDTO) {
        // Check if this would result in a weekly schedule
        if (loanDTO.getStartDate() != null && loanDTO.getTotalInstallments() != null) {
            LocalDate endDate = calculateEndDate(loanDTO.getStartDate(), loanDTO.getTotalInstallments());
            long daysBetween = ChronoUnit.DAYS.between(loanDTO.getStartDate(), endDate);
            double avgDaysBetweenInstallments = (double) daysBetween / loanDTO.getTotalInstallments();

            // If average days between installments is less than 25 days, it's likely weekly
            if (avgDaysBetweenInstallments < 25) {
                throw new IllegalArgumentException("Weekly loans are not allowed. Only monthly or longer repayment periods are supported.");
            }
        }

        // Additional check if installment frequency is provided
        // Note: This assumes your LoanDTO has installmentFrequency field
        // If not, you can remove this check
        /*
        if (loanDTO.getInstallmentFrequency() == Loan.InstallmentFrequency.WEEKLY) {
            throw new IllegalArgumentException("Weekly loan frequency is not allowed. Only monthly repayment schedules are supported.");
        }
        */
    }

    private LocalDate calculateEndDate(LocalDate startDate, Integer installments) {
        return startDate.plusMonths(installments).minusDays(1);
    }

    private BigDecimal calculateMonthlyPayment(BigDecimal principal, BigDecimal annualRate, Integer months) {
        if (annualRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(new BigDecimal(months), 2, RoundingMode.HALF_UP);
        }

        BigDecimal monthlyRate = annualRate.divide(new BigDecimal("12"), 8, RoundingMode.HALF_UP);
        BigDecimal factor = BigDecimal.ONE.add(monthlyRate).pow(months);

        return principal.multiply(monthlyRate).multiply(factor)
                .divide(factor.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
    }

    private LoanDTO convertToDTO(Loan loan) {
        return LoanDTO.builder()
                .id(loan.getId())
                .employeeId(loan.getEmployee().getId())
                .employeeName(loan.getEmployee().getFullName())
                .loanAmount(loan.getLoanAmount())
                .remainingBalance(loan.getRemainingBalance())
                .interestRate(loan.getInterestRate())
                .totalInstallments(loan.getTotalInstallments())
                .startDate(loan.getStartDate())
                .endDate(loan.getEndDate())
                .status(loan.getStatus().name())
                .description(loan.getDescription())
                .createdBy(loan.getCreatedBy())
                .approvedBy(loan.getApprovedBy())
                .createdAt(loan.getCreatedAt())
                .approvedAt(loan.getApprovalDate()) // Using approvalDate instead of approvedAt
                .build();
    }

    /**
     * Convert RepaymentSchedule to DTO
     */
    private RepaymentScheduleDTO convertRepaymentScheduleToDTO(RepaymentSchedule schedule) {
        return RepaymentScheduleDTO.builder()
                .id(schedule.getId())
                .loanId(schedule.getLoan().getId())
                .installmentNumber(schedule.getInstallmentNumber())
                .dueDate(schedule.getDueDate())
                .scheduledAmount(schedule.getScheduledAmount())
                .principalAmount(schedule.getPrincipalAmount())
                .interestAmount(schedule.getInterestAmount())
                .actualAmount(schedule.getActualAmount())
                .paidDate(schedule.getPaidDate())
                .payslipId(schedule.getPayslipId())
                .status(schedule.getStatus().name())
                .notes(schedule.getNotes())
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .build();
    }
}