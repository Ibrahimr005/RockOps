package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.RepaymentScheduleDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Loan;
import com.example.backend.models.payroll.RepaymentSchedule;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.repositories.payroll.RepaymentScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
     * Create a new loan for an employee - FIXED VERSION WITH COMPREHENSIVE ERROR HANDLING
     */
    @Transactional
    public LoanDTO createLoan(LoanDTO loanDTO, String createdBy) {
        log.info("Creating loan for employee: {}", loanDTO.getEmployeeId());

        try {
            // Step 1: Comprehensive validation
            validateLoanData(loanDTO);

            // Step 2: Validate employee exists and is active
            Employee employee = employeeRepository.findById(loanDTO.getEmployeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + loanDTO.getEmployeeId()));

            log.info("Employee found: {} {}", employee.getFirstName(), employee.getLastName());

            // Step 3: Check if employee has any pending loans
            List<Loan> pendingLoans = loanRepository.findByEmployeeIdAndStatus(employee.getId(), Loan.LoanStatus.PENDING);
            if (!pendingLoans.isEmpty()) {
                throw new IllegalArgumentException("Employee already has a pending loan. Only one pending loan is allowed at a time.");
            }

            // Step 4: Check outstanding balance limits
            BigDecimal existingOutstanding = getTotalOutstandingBalanceByEmployee(employee.getId());
            BigDecimal newTotalOutstanding = existingOutstanding.add(loanDTO.getLoanAmount());
            BigDecimal maxAllowed = new BigDecimal("100000"); // $100k limit

            if (newTotalOutstanding.compareTo(maxAllowed) > 0) {
                throw new IllegalArgumentException(
                        String.format("Total outstanding balance would exceed limit. Current: $%.2f, Requested: $%.2f, Limit: $%.2f",
                                existingOutstanding, loanDTO.getLoanAmount(), maxAllowed));
            }

            // Step 5: Create loan entity with safe defaults
            Loan loan = new Loan();
            loan.setEmployee(employee);
            loan.setLoanAmount(loanDTO.getLoanAmount());
            loan.setRemainingBalance(loanDTO.getLoanAmount());
            loan.setInterestRate(loanDTO.getInterestRate() != null ? loanDTO.getInterestRate() : BigDecimal.ZERO);
            loan.setStartDate(loanDTO.getStartDate());
            loan.setEndDate(loanDTO.getEndDate());
            loan.setInstallmentAmount(loanDTO.getInstallmentAmount());

            // Safe enum conversion with validation
            if (loanDTO.getInstallmentFrequency() != null) {
                try {
                    loan.setInstallmentFrequency(Loan.InstallmentFrequency.valueOf(loanDTO.getInstallmentFrequency().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.error("Invalid installment frequency: {}", loanDTO.getInstallmentFrequency());
                    throw new IllegalArgumentException("Invalid installment frequency: " + loanDTO.getInstallmentFrequency());
                }
            } else {
                loan.setInstallmentFrequency(Loan.InstallmentFrequency.MONTHLY);
            }

            loan.setTotalInstallments(loanDTO.getTotalInstallments());
            loan.setPaidInstallments(0);
            loan.setStatus(Loan.LoanStatus.PENDING);
            loan.setDescription(loanDTO.getDescription() != null ? loanDTO.getDescription() : "");
            loan.setCreatedBy(createdBy != null ? createdBy : "SYSTEM");
            loan.setCreatedAt(LocalDateTime.now());
            loan.setUpdatedAt(LocalDateTime.now());

            // Initialize empty list to avoid lazy loading issues
            loan.setRepaymentSchedules(new ArrayList<>());

            log.info("Saving loan to database...");

            // Step 6: Save loan FIRST
            loan = loanRepository.save(loan);
            log.info("Loan saved successfully with ID: {}", loan.getId());

            // Step 7: Generate repayment schedule AFTER loan is saved (with better error handling)
            try {
                generateRepaymentScheduleSecurely(loan);
                log.info("Repayment schedule generated successfully");
            } catch (Exception e) {
                log.error("Error generating repayment schedule: {}", e.getMessage(), e);
                // Instead of failing, we'll create the loan without schedule and let it be generated later
                log.warn("Continuing with loan creation without repayment schedule. Schedule can be generated later.");
            }

            // Step 8: Convert to DTO safely and return
            LoanDTO result = convertToDTOSafely(loan);
            log.info("Loan creation completed successfully");

            return result;

        } catch (IllegalArgumentException e) {
            log.error("Validation error creating loan: {}", e.getMessage());
            throw e; // Re-throw validation errors as-is
        } catch (Exception e) {
            log.error("Unexpected error creating loan: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create loan: " + e.getMessage(), e);
        }
    }

    /**
     * Generate repayment schedule with enhanced error handling and validation
     */
    private void generateRepaymentScheduleSecurely(Loan loan) {
        if (loan == null || loan.getId() == null) {
            throw new IllegalArgumentException("Loan must be saved before generating repayment schedule");
        }

        try {
            log.info("Generating repayment schedule for loan ID: {}", loan.getId());

            // Validate loan data for schedule generation
            if (loan.getTotalInstallments() == null || loan.getTotalInstallments() <= 0) {
                throw new IllegalArgumentException("Invalid total installments: " + loan.getTotalInstallments());
            }

            if (loan.getInstallmentAmount() == null || loan.getInstallmentAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Invalid installment amount: " + loan.getInstallmentAmount());
            }

            if (loan.getStartDate() == null) {
                throw new IllegalArgumentException("Start date is required for schedule generation");
            }

            if (loan.getInstallmentFrequency() == null) {
                throw new IllegalArgumentException("Installment frequency is required for schedule generation");
            }

            List<RepaymentSchedule> schedules = new ArrayList<>();

            for (int i = 1; i <= loan.getTotalInstallments(); i++) {
                try {
                    RepaymentSchedule schedule = new RepaymentSchedule();
                    schedule.setLoan(loan);
                    schedule.setInstallmentNumber(i);

                    // Calculate due date with error handling
                    LocalDate dueDate = calculateDueDateSafely(loan.getStartDate(), loan.getInstallmentFrequency(), i);
                    schedule.setDueDate(dueDate);
                    schedule.setScheduledAmount(loan.getInstallmentAmount());
                    schedule.setPaidAmount(BigDecimal.ZERO);
                    schedule.setStatus(RepaymentSchedule.RepaymentStatus.PENDING);
                    schedule.setCreatedAt(LocalDateTime.now());

                    schedules.add(schedule);
                } catch (Exception e) {
                    log.error("Error creating repayment schedule item {}: {}", i, e.getMessage());
                    throw new RuntimeException("Failed to create repayment schedule item " + i, e);
                }
            }

            if (schedules.isEmpty()) {
                throw new RuntimeException("No repayment schedules were generated");
            }

            // Save all schedules in batch with error handling
            try {
                List<RepaymentSchedule> savedSchedules = repaymentScheduleRepository.saveAll(schedules);
                log.info("Successfully saved {} repayment schedules", savedSchedules.size());

                // Update loan with schedules
                loan.setRepaymentSchedules(savedSchedules);

                log.info("Generated {} repayment schedules for loan {}", savedSchedules.size(), loan.getId());
            } catch (Exception e) {
                log.error("Error saving repayment schedules: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to save repayment schedules", e);
            }

        } catch (Exception e) {
            log.error("Error in generateRepaymentScheduleSecurely for loan {}: {}", loan.getId(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Calculate due date with enhanced error handling
     */
    private LocalDate calculateDueDateSafely(LocalDate startDate, Loan.InstallmentFrequency frequency, int installmentNumber) {
        try {
            if (startDate == null) {
                throw new IllegalArgumentException("Start date cannot be null");
            }
            if (frequency == null) {
                throw new IllegalArgumentException("Frequency cannot be null");
            }
            if (installmentNumber <= 0) {
                throw new IllegalArgumentException("Installment number must be positive");
            }

            switch (frequency) {
                case WEEKLY:
                    return startDate.plusWeeks(installmentNumber);
                case MONTHLY:
                    return startDate.plusMonths(installmentNumber);
                default:
                    log.warn("Unknown frequency {}, defaulting to MONTHLY", frequency);
                    return startDate.plusMonths(installmentNumber);
            }
        } catch (Exception e) {
            log.error("Error calculating due date: start={}, frequency={}, installment={}",
                    startDate, frequency, installmentNumber);
            throw new RuntimeException("Failed to calculate due date", e);
        }
    }

    /**
     * Comprehensive validation for loan data
     */
    private void validateLoanData(LoanDTO loanDTO) {
        List<String> errors = new ArrayList<>();

        // Required fields
        if (loanDTO.getEmployeeId() == null) {
            errors.add("Employee ID is required");
        }

        if (loanDTO.getLoanAmount() == null || loanDTO.getLoanAmount().compareTo(BigDecimal.ZERO) <= 0) {
            errors.add("Loan amount must be greater than 0");
        }

        if (loanDTO.getInterestRate() == null || loanDTO.getInterestRate().compareTo(BigDecimal.ZERO) < 0) {
            errors.add("Interest rate must be 0 or greater");
        }

        if (loanDTO.getStartDate() == null) {
            errors.add("Start date is required");
        }

        if (loanDTO.getEndDate() == null) {
            errors.add("End date is required");
        }

        if (loanDTO.getInstallmentAmount() == null || loanDTO.getInstallmentAmount().compareTo(BigDecimal.ZERO) <= 0) {
            errors.add("Installment amount must be greater than 0");
        }

        if (loanDTO.getTotalInstallments() == null || loanDTO.getTotalInstallments() <= 0) {
            errors.add("Total installments must be greater than 0");
        }

        // Business rules validation
        if (loanDTO.getLoanAmount() != null) {
            if (loanDTO.getLoanAmount().compareTo(new BigDecimal("100")) < 0) {
                errors.add("Minimum loan amount is $100");
            }
            if (loanDTO.getLoanAmount().compareTo(new BigDecimal("50000")) > 0) {
                errors.add("Maximum loan amount is $50,000");
            }
        }

        if (loanDTO.getInterestRate() != null && loanDTO.getInterestRate().compareTo(new BigDecimal("30")) > 0) {
            errors.add("Maximum interest rate is 30%");
        }

        if (loanDTO.getTotalInstallments() != null) {
            if (loanDTO.getTotalInstallments() > 60) {
                errors.add("Maximum 60 installments allowed");
            }
        }

        // Date validation
        if (loanDTO.getStartDate() != null && loanDTO.getEndDate() != null) {
            if (loanDTO.getStartDate().isAfter(loanDTO.getEndDate()) || loanDTO.getStartDate().equals(loanDTO.getEndDate())) {
                errors.add("End date must be after start date");
            }
        }

        if (loanDTO.getStartDate() != null && loanDTO.getStartDate().isBefore(LocalDate.now())) {
            errors.add("Start date cannot be in the past");
        }

        // Installment frequency validation
        if (loanDTO.getInstallmentFrequency() != null) {
            try {
                Loan.InstallmentFrequency.valueOf(loanDTO.getInstallmentFrequency().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid installment frequency. Must be MONTHLY or WEEKLY");
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Validation failed: " + String.join(", ", errors));
        }
    }

    /**
     * Convert Loan entity to DTO with comprehensive null safety
     */
    private LoanDTO convertToDTOSafely(Loan loan) {
        if (loan == null) {
            throw new IllegalArgumentException("Loan cannot be null");
        }

        try {
            List<RepaymentScheduleDTO> schedules = new ArrayList<>();
            if (loan.getRepaymentSchedules() != null) {
                schedules = loan.getRepaymentSchedules().stream()
                        .map(this::convertToScheduleDTOSafely)
                        .filter(dto -> dto != null) // Filter out any null DTOs
                        .collect(Collectors.toList());
            }

            String employeeName = "";
            if (loan.getEmployee() != null) {
                employeeName = (loan.getEmployee().getFirstName() != null ? loan.getEmployee().getFirstName() : "") +
                        " " +
                        (loan.getEmployee().getLastName() != null ? loan.getEmployee().getLastName() : "");
                employeeName = employeeName.trim();
            }

            return LoanDTO.builder()
                    .id(loan.getId())
                    .employeeId(loan.getEmployee() != null ? loan.getEmployee().getId() : null)
                    .employeeName(employeeName)
                    .loanAmount(loan.getLoanAmount() != null ? loan.getLoanAmount() : BigDecimal.ZERO)
                    .remainingBalance(loan.getRemainingBalance() != null ? loan.getRemainingBalance() : BigDecimal.ZERO)
                    .interestRate(loan.getInterestRate() != null ? loan.getInterestRate() : BigDecimal.ZERO)
                    .startDate(loan.getStartDate())
                    .endDate(loan.getEndDate())
                    .installmentAmount(loan.getInstallmentAmount() != null ? loan.getInstallmentAmount() : BigDecimal.ZERO)
                    .installmentFrequency(loan.getInstallmentFrequency() != null ? loan.getInstallmentFrequency().name() : "MONTHLY")
                    .totalInstallments(loan.getTotalInstallments() != null ? loan.getTotalInstallments() : 0)
                    .paidInstallments(loan.getPaidInstallments() != null ? loan.getPaidInstallments() : 0)
                    .status(loan.getStatus() != null ? loan.getStatus().name() : "PENDING")
                    .description(loan.getDescription() != null ? loan.getDescription() : "")
                    .createdBy(loan.getCreatedBy() != null ? loan.getCreatedBy() : "")
                    .approvedBy(loan.getApprovedBy())
                    .approvalDate(loan.getApprovalDate())
                    .rejectedBy(loan.getRejectedBy())
                    .rejectionReason(loan.getRejectionReason())
                    .rejectionDate(loan.getRejectionDate())
                    .repaymentSchedules(schedules)
                    .build();

        } catch (Exception e) {
            log.error("Error converting loan to DTO: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to convert loan to DTO", e);
        }
    }

    /**
     * Convert RepaymentSchedule entity to DTO with null safety
     */
    private RepaymentScheduleDTO convertToScheduleDTOSafely(RepaymentSchedule schedule) {
        if (schedule == null) {
            log.warn("Received null repayment schedule, skipping conversion");
            return null;
        }

        try {
            return RepaymentScheduleDTO.builder()
                    .id(schedule.getId())
                    .installmentNumber(schedule.getInstallmentNumber() != null ? schedule.getInstallmentNumber() : 0)
                    .dueDate(schedule.getDueDate())
                    .scheduledAmount(schedule.getScheduledAmount() != null ? schedule.getScheduledAmount() : BigDecimal.ZERO)
                    .paidAmount(schedule.getPaidAmount() != null ? schedule.getPaidAmount() : BigDecimal.ZERO)
                    .paymentDate(schedule.getPaymentDate())
                    .status(schedule.getStatus() != null ? schedule.getStatus().name() : "PENDING")
                    .build();
        } catch (Exception e) {
            log.error("Error converting repayment schedule to DTO: {}", e.getMessage(), e);
            return null; // Return null so it gets filtered out
        }
    }

    // Rest of the existing methods remain the same but with enhanced error handling...
    // (I'll include key methods with improvements)

    /**
     * Get total outstanding balance for employee with validation
     */
    public BigDecimal getTotalOutstandingBalanceByEmployee(UUID employeeId) {
        try {
            if (employeeId == null) {
                return BigDecimal.ZERO;
            }

            BigDecimal balance = loanRepository.getTotalOutstandingBalanceByEmployee(employeeId);
            return balance != null ? balance : BigDecimal.ZERO;

        } catch (Exception e) {
            log.error("Error getting outstanding balance for employee {}: {}", employeeId, e.getMessage(), e);
            return BigDecimal.ZERO;
        }
    }

    /**
     * Get loan statistics with enhanced error handling
     */
    public Map<String, Object> getLoanStatistics() {
        log.info("Getting loan statistics");

        try {
            // Get total outstanding amount with fallback
            BigDecimal totalOutstanding = BigDecimal.ZERO;
            try {
                totalOutstanding = loanRepository.getTotalOutstandingAmount();
                if (totalOutstanding == null) {
                    totalOutstanding = BigDecimal.ZERO;
                }
            } catch (Exception e) {
                log.error("Error getting total outstanding amount: {}", e.getMessage());
            }

            // Count loans by status with fallbacks
            long activeLoans = 0;
            long pendingLoans = 0;
            long completedLoans = 0;
            long rejectedLoans = 0;
            long cancelledLoans = 0;

            try {
                activeLoans = loanRepository.countByStatus(Loan.LoanStatus.ACTIVE);
                pendingLoans = loanRepository.countByStatus(Loan.LoanStatus.PENDING);
                completedLoans = loanRepository.countByStatus(Loan.LoanStatus.COMPLETED);
                rejectedLoans = loanRepository.countByStatus(Loan.LoanStatus.REJECTED);
                cancelledLoans = loanRepository.countByStatus(Loan.LoanStatus.CANCELLED);
            } catch (Exception e) {
                log.error("Error getting loan counts: {}", e.getMessage());
            }

            // Count overdue loans with fallback
            long overdueLoans = 0;
            try {
                overdueLoans = getOverdueLoans().size();
            } catch (Exception e) {
                log.error("Error getting overdue loans count: {}", e.getMessage());
            }

            // Calculate additional metrics with fallbacks
            BigDecimal averageLoanAmount = BigDecimal.ZERO;
            try {
                averageLoanAmount = loanRepository.getAverageLoanAmount();
                if (averageLoanAmount == null) {
                    averageLoanAmount = BigDecimal.ZERO;
                }
            } catch (Exception e) {
                log.error("Error getting average loan amount: {}", e.getMessage());
            }

            long totalLoans = activeLoans + pendingLoans + completedLoans + rejectedLoans + cancelledLoans;

            // Create comprehensive statistics map
            java.util.Map<String, Object> statistics = new java.util.HashMap<>();
            statistics.put("totalOutstanding", totalOutstanding);
            statistics.put("activeLoans", activeLoans);
            statistics.put("overdueLoans", overdueLoans);
            statistics.put("pendingLoans", pendingLoans);
            statistics.put("completedLoans", completedLoans);
            statistics.put("rejectedLoans", rejectedLoans);
            statistics.put("cancelledLoans", cancelledLoans);
            statistics.put("totalLoans", totalLoans);
            statistics.put("averageLoanAmount", averageLoanAmount);
            statistics.put("generatedAt", LocalDateTime.now());

            return statistics;

        } catch (Exception e) {
            log.error("Error getting loan statistics: {}", e.getMessage(), e);
            // Return default statistics on error
            java.util.Map<String, Object> defaultStats = new java.util.HashMap<>();
            defaultStats.put("totalOutstanding", BigDecimal.ZERO);
            defaultStats.put("activeLoans", 0L);
            defaultStats.put("overdueLoans", 0L);
            defaultStats.put("pendingLoans", 0L);
            defaultStats.put("completedLoans", 0L);
            defaultStats.put("rejectedLoans", 0L);
            defaultStats.put("cancelledLoans", 0L);
            defaultStats.put("totalLoans", 0L);
            defaultStats.put("averageLoanAmount", BigDecimal.ZERO);
            defaultStats.put("generatedAt", LocalDateTime.now());
            defaultStats.put("error", "Failed to calculate statistics");

            return defaultStats;
        }
    }

    /**
     * Get overdue loans with enhanced error handling
     */
    public List<LoanDTO> getOverdueLoans() {
        try {
            LocalDate today = LocalDate.now();
            List<RepaymentSchedule> overdueSchedules = repaymentScheduleRepository.findOverdueRepayments(today);

            // Get unique loans from overdue schedules
            List<Loan> overdueLoans = overdueSchedules.stream()
                    .map(RepaymentSchedule::getLoan)
                    .distinct()
                    .collect(Collectors.toList());

            return overdueLoans.stream()
                    .map(this::convertToDTOSafely)
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting overdue loans: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get active loans with error handling
     */
    public List<LoanDTO> getActiveLoans() {
        try {
            return loanRepository.findByStatusOrderByStartDateDesc(Loan.LoanStatus.ACTIVE)
                    .stream()
                    .map(this::convertToDTOSafely)
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting active loans: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get loan by ID with enhanced error handling
     */
    public LoanDTO getLoanById(UUID loanId) {
        log.info("Getting loan by ID: {}", loanId);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));
            return convertToDTOSafely(loan);

        } catch (IllegalArgumentException e) {
            log.error("Validation error getting loan by ID: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error getting loan by ID: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get loan: " + e.getMessage(), e);
        }
    }

    /**
     * Update loan with enhanced validation
     */
    @Transactional
    public LoanDTO updateLoan(UUID loanId, LoanDTO loanDTO) {
        log.info("Updating loan with ID: {}", loanId);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            Loan existingLoan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            // Only allow updates if loan is still pending
            if (existingLoan.getStatus() != Loan.LoanStatus.PENDING) {
                throw new IllegalArgumentException("Only pending loans can be updated. Current status: " + existingLoan.getStatus());
            }

            // Validate updated data
            validateLoanData(loanDTO);

            // Update allowed fields
            existingLoan.setLoanAmount(loanDTO.getLoanAmount());
            existingLoan.setRemainingBalance(loanDTO.getLoanAmount()); // Reset remaining balance
            existingLoan.setInterestRate(loanDTO.getInterestRate());
            existingLoan.setStartDate(loanDTO.getStartDate());
            existingLoan.setEndDate(loanDTO.getEndDate());
            existingLoan.setInstallmentAmount(loanDTO.getInstallmentAmount());

            // Safe enum conversion
            if (loanDTO.getInstallmentFrequency() != null) {
                try {
                    existingLoan.setInstallmentFrequency(Loan.InstallmentFrequency.valueOf(loanDTO.getInstallmentFrequency().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid installment frequency: " + loanDTO.getInstallmentFrequency());
                }
            }

            existingLoan.setTotalInstallments(loanDTO.getTotalInstallments());
            existingLoan.setDescription(loanDTO.getDescription() != null ? loanDTO.getDescription() : "");
            existingLoan.setUpdatedAt(LocalDateTime.now());

            Loan updatedLoan = loanRepository.save(existingLoan);

            // Regenerate repayment schedule for pending loans
            try {
                // Delete existing schedules
                repaymentScheduleRepository.deleteByLoanId(loanId);
                // Generate new ones
                generateRepaymentScheduleSecurely(updatedLoan);
            } catch (Exception e) {
                log.error("Error regenerating repayment schedule: {}", e.getMessage());
                throw new RuntimeException("Failed to update repayment schedule: " + e.getMessage());
            }

            return convertToDTOSafely(updatedLoan);

        } catch (IllegalArgumentException e) {
            log.error("Validation error updating loan: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error updating loan: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update loan: " + e.getMessage(), e);
        }
    }

    /**
     * Cancel loan with validation
     */
    @Transactional
    public void cancelLoan(UUID loanId) {
        log.info("Cancelling loan with ID: {}", loanId);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (loan.getStatus() == Loan.LoanStatus.COMPLETED) {
                throw new IllegalArgumentException("Cannot cancel completed loan");
            }

            if (loan.getStatus() == Loan.LoanStatus.CANCELLED) {
                throw new IllegalArgumentException("Loan is already cancelled");
            }

            loan.setStatus(Loan.LoanStatus.CANCELLED);
            loan.setUpdatedAt(LocalDateTime.now());
            loanRepository.save(loan);

            log.info("Loan {} cancelled successfully", loanId);

        } catch (IllegalArgumentException e) {
            log.error("Validation error cancelling loan: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error cancelling loan: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to cancel loan: " + e.getMessage(), e);
        }
    }

    /**
     * Get loans by employee with validation
     */
    public List<LoanDTO> getLoansByEmployee(UUID employeeId) {
        log.info("Getting loans for employee: {}", employeeId);

        try {
            if (employeeId == null) {
                throw new IllegalArgumentException("Employee ID cannot be null");
            }

            // Verify employee exists
            if (!employeeRepository.existsById(employeeId)) {
                throw new IllegalArgumentException("Employee not found with ID: " + employeeId);
            }

            return loanRepository.findByEmployeeIdOrderByStartDateDesc(employeeId)
                    .stream()
                    .map(this::convertToDTOSafely)
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

        } catch (IllegalArgumentException e) {
            log.error("Validation error getting loans by employee: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error getting loans by employee: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get repayment schedule for a loan with validation
     */
    public List<RepaymentScheduleDTO> getRepaymentSchedule(UUID loanId) {
        log.info("Getting repayment schedule for loan: {}", loanId);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (loan.getRepaymentSchedules() == null || loan.getRepaymentSchedules().isEmpty()) {
                log.warn("No repayment schedules found for loan: {}, attempting to generate", loanId);

                // Try to generate schedule if it doesn't exist (for older loans)
                if (loan.getStatus() == Loan.LoanStatus.PENDING) {
                    try {
                        generateRepaymentScheduleSecurely(loan);
                        loan = loanRepository.findById(loanId).orElse(loan); // Refresh
                    } catch (Exception e) {
                        log.error("Failed to generate missing repayment schedule: {}", e.getMessage());
                        return new ArrayList<>();
                    }
                } else {
                    return new ArrayList<>();
                }
            }

            return loan.getRepaymentSchedules().stream()
                    .sorted((rs1, rs2) -> rs1.getInstallmentNumber().compareTo(rs2.getInstallmentNumber()))
                    .map(this::convertToScheduleDTOSafely)
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

        } catch (IllegalArgumentException e) {
            log.error("Validation error getting repayment schedule: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error getting repayment schedule: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get repayment schedule: " + e.getMessage(), e);
        }
    }

    /**
     * Approve loan with validation
     */
    @Transactional
    public LoanDTO approveLoan(UUID loanId, String approvedBy) {
        log.info("Approving loan: {} by: {}", loanId, approvedBy);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            if (approvedBy == null || approvedBy.trim().isEmpty()) {
                approvedBy = "SYSTEM";
            }

            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (loan.getStatus() != Loan.LoanStatus.PENDING) {
                throw new IllegalArgumentException("Only pending loans can be approved. Current status: " + loan.getStatus());
            }

            loan.setStatus(Loan.LoanStatus.ACTIVE);
            loan.setApprovedBy(approvedBy);
            loan.setApprovalDate(LocalDateTime.now());
            loan.setUpdatedAt(LocalDateTime.now());

            Loan savedLoan = loanRepository.save(loan);
            log.info("Loan {} approved successfully by {}", loanId, approvedBy);

            return convertToDTOSafely(savedLoan);

        } catch (IllegalArgumentException e) {
            log.error("Validation error approving loan: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error approving loan: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to approve loan: " + e.getMessage(), e);
        }
    }

    /**
     * Reject loan with validation
     */
    @Transactional
    public LoanDTO rejectLoan(UUID loanId, String rejectedBy, String reason) {
        log.info("Rejecting loan: {} by: {} reason: {}", loanId, rejectedBy, reason);

        try {
            if (loanId == null) {
                throw new IllegalArgumentException("Loan ID cannot be null");
            }

            if (rejectedBy == null || rejectedBy.trim().isEmpty()) {
                rejectedBy = "SYSTEM";
            }

            if (reason == null) {
                reason = "";
            }

            Loan loan = loanRepository.findById(loanId)
                    .orElseThrow(() -> new IllegalArgumentException("Loan not found with ID: " + loanId));

            if (loan.getStatus() != Loan.LoanStatus.PENDING) {
                throw new IllegalArgumentException("Only pending loans can be rejected. Current status: " + loan.getStatus());
            }

            loan.setStatus(Loan.LoanStatus.REJECTED);
            loan.setRejectedBy(rejectedBy);
            loan.setRejectionReason(reason);
            loan.setRejectionDate(LocalDateTime.now());
            loan.setUpdatedAt(LocalDateTime.now());

            Loan savedLoan = loanRepository.save(loan);
            log.info("Loan {} rejected successfully by {}", loanId, rejectedBy);

            return convertToDTOSafely(savedLoan);

        } catch (IllegalArgumentException e) {
            log.error("Validation error rejecting loan: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error rejecting loan: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to reject loan: " + e.getMessage(), e);
        }
    }

    /**
     * Process loan repayment with enhanced validation
     */
    @Transactional
    public void processLoanRepayment(UUID repaymentScheduleId, BigDecimal paidAmount) {
        log.info("Processing repayment for schedule: {} amount: {}", repaymentScheduleId, paidAmount);

        try {
            if (repaymentScheduleId == null) {
                throw new IllegalArgumentException("Repayment schedule ID cannot be null");
            }

            if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Paid amount must be greater than 0");
            }

            RepaymentSchedule schedule = repaymentScheduleRepository.findById(repaymentScheduleId)
                    .orElseThrow(() -> new IllegalArgumentException("Repayment schedule not found"));

            if (schedule.getStatus() == RepaymentSchedule.RepaymentStatus.PAID) {
                throw new IllegalArgumentException("This installment has already been paid");
            }

            Loan loan = schedule.getLoan();

            if (loan.getStatus() != Loan.LoanStatus.ACTIVE) {
                throw new IllegalArgumentException("Cannot process repayment for inactive loan. Status: " + loan.getStatus());
            }

            // Update repayment schedule
            schedule.setPaidAmount(paidAmount);
            schedule.setStatus(RepaymentSchedule.RepaymentStatus.PAID);
            schedule.setPaymentDate(LocalDateTime.now());

            // Update loan
            loan.setRemainingBalance(loan.getRemainingBalance().subtract(paidAmount));
            loan.setPaidInstallments(loan.getPaidInstallments() + 1);

            // Check if loan is completed
            if (loan.getRemainingBalance().compareTo(BigDecimal.ZERO) <= 0 ||
                    loan.getPaidInstallments() >= loan.getTotalInstallments()) {
                loan.setStatus(Loan.LoanStatus.COMPLETED);
                loan.setRemainingBalance(BigDecimal.ZERO);
            }

            loan.setUpdatedAt(LocalDateTime.now());

            repaymentScheduleRepository.save(schedule);
            loanRepository.save(loan);

            log.info("Repayment processed successfully for loan: {}", loan.getId());

        } catch (IllegalArgumentException e) {
            log.error("Validation error processing repayment: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error processing repayment: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process repayment: " + e.getMessage(), e);
        }
    }

    /**
     * Get due repayments for an employee within a date range
     */
    public List<RepaymentSchedule> getDueRepaymentsForEmployee(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        try {
            if (employeeId == null) {
                throw new IllegalArgumentException("Employee ID cannot be null");
            }

            if (startDate == null || endDate == null) {
                throw new IllegalArgumentException("Start date and end date cannot be null");
            }

            if (startDate.isAfter(endDate)) {
                throw new IllegalArgumentException("Start date cannot be after end date");
            }

            return repaymentScheduleRepository.findDueRepaymentsForEmployee(employeeId, startDate, endDate);

        } catch (IllegalArgumentException e) {
            log.error("Validation error getting due repayments: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error getting due repayments: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get due repayments for current month
     */
    public List<RepaymentSchedule> getDueRepaymentsForEmployeeThisMonth(UUID employeeId) {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = startOfMonth.plusMonths(1).minusDays(1);
        return getDueRepaymentsForEmployee(employeeId, startOfMonth, endOfMonth);
    }

    /**
     * Get upcoming repayments for an employee (next 30 days)
     */
    public List<RepaymentSchedule> getUpcomingRepaymentsForEmployee(UUID employeeId) {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysFromNow = today.plusDays(30);
        return getDueRepaymentsForEmployee(employeeId, today, thirtyDaysFromNow);
    }

    /**
     * Get overdue repayments for a specific employee
     */
    public List<RepaymentSchedule> getOverdueRepaymentsForEmployee(UUID employeeId) {
        try {
            if (employeeId == null) {
                throw new IllegalArgumentException("Employee ID cannot be null");
            }

            LocalDate today = LocalDate.now();
            return repaymentScheduleRepository.findDueRepaymentsForEmployee(employeeId, LocalDate.of(2000, 1, 1), today.minusDays(1))
                    .stream()
                    .filter(rs -> rs.getStatus() == RepaymentSchedule.RepaymentStatus.PENDING)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting overdue repayments for employee {}: {}", employeeId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Get loans by status with validation
     */
    public List<LoanDTO> getLoansByStatus(String status) {
        try {
            if (status == null || status.trim().isEmpty()) {
                return getActiveLoans(); // Default to active loans
            }

            Loan.LoanStatus loanStatus;
            try {
                loanStatus = Loan.LoanStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.error("Invalid loan status: {}", status);
                return new ArrayList<>();
            }

            return loanRepository.findByStatusOrderByStartDateDesc(loanStatus)
                    .stream()
                    .map(this::convertToDTOSafely)
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting loans by status: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}