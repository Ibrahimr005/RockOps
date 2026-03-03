package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusReviewSummaryDTO;
import com.example.backend.dto.payroll.PayrollDTO;
import com.example.backend.dto.payroll.PublicHolidayDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Bonus;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollPublicHoliday;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.payroll.PayrollRepository;
import com.example.backend.services.hr.AttendanceService;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final PayrollRepository payrollRepository;
    private final EmployeePayrollRepository employeePayrollRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceService attendanceService;
    private final PayrollStateMachine stateMachine;
    private final PayrollCalculationEngine calculationEngine;
    private final PayrollSnapshotService snapshotService;
    private final BonusRepository bonusRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;

    public Optional<Payroll> getLastPayroll() {
        return payrollRepository.findFirstByOrderByEndDateDesc();
    }

    /**
     * Create a new payroll for a given period
     */
    @Transactional
    public Payroll createPayroll(LocalDate startDate, LocalDate endDate, String createdBy) {
        log.info("Creating payroll from {} to {}", startDate, endDate);

        // Validate period
        validatePayrollPeriod(startDate, endDate);

        // Check for existing payroll with overlapping dates
        if (payrollRepository.existsByDateRange(startDate, endDate)) {
            throw new IllegalStateException(
                    String.format("Payroll already exists for period %s to %s", startDate, endDate)
            );
        }

        // Check continuity with previous payroll
        Payroll previousPayroll = payrollRepository.findFirstByOrderByEndDateDesc().orElse(null);

        // Create payroll
        Payroll payroll = Payroll.builder()
                .startDate(startDate)
                .endDate(endDate)
                .payrollNumber(entityIdGeneratorService.generateNextId(EntityTypeConfig.PAYROLL))
                .status(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW)
                .totalGrossAmount(BigDecimal.ZERO)
                .totalDeductions(BigDecimal.ZERO)
                .totalNetAmount(BigDecimal.ZERO)
                .employeeCount(0)
                .createdBy(createdBy)
                .overrideContinuity(false)
                .build();

        Payroll savedPayroll = payrollRepository.save(payroll);

        log.info("Payroll created successfully: ID={}, Period={} to {}",
                savedPayroll.getId(), startDate, endDate);

        return savedPayroll;
    }

    /**
     * Create payroll with continuity override
     */
    @Transactional
    public Payroll createPayrollWithOverride(LocalDate startDate, LocalDate endDate,
                                             String createdBy, String overrideReason) {
        log.info("Creating payroll with continuity override: {}", overrideReason);

        if (overrideReason == null || overrideReason.trim().isEmpty()) {
            throw new IllegalArgumentException("Override reason is required");
        }

        validatePayrollPeriod(startDate, endDate);

        if (payrollRepository.existsByDateRange(startDate, endDate)) {
            throw new IllegalStateException(
                    String.format("Payroll already exists for period %s to %s", startDate, endDate)
            );
        }

        Payroll payroll = Payroll.builder()
                .startDate(startDate)
                .endDate(endDate)
                .payrollNumber(entityIdGeneratorService.generateNextId(EntityTypeConfig.PAYROLL))
                .status(PayrollStatus.PUBLIC_HOLIDAYS_REVIEW)
                .totalGrossAmount(BigDecimal.ZERO)
                .totalDeductions(BigDecimal.ZERO)
                .totalNetAmount(BigDecimal.ZERO)
                .employeeCount(0)
                .createdBy(createdBy)
                .overrideContinuity(true)
                .continuityOverrideReason(overrideReason)
                .build();

        return payrollRepository.save(payroll);
    }


    /**
     * Add public holidays to payroll
     */
    @Transactional
    public void addPublicHolidays(UUID payrollId, List<PublicHolidayDTO> holidays, String username) {
        log.info("Adding {} public holidays to payroll {}", holidays != null ? holidays.size() : 0, payrollId);

        log.info("Step 1: Fetching payroll...");
        Payroll payroll = getPayrollById(payrollId);
        log.info("Step 1: Done - payroll fetched");

        log.info("Step 2: Getting status...");
        PayrollStatus status = payroll.getStatus();
        log.info("Step 2: Done - status = {}", status);

        // Status check
        if (status != PayrollStatus.PUBLIC_HOLIDAYS_REVIEW) {
            throw new IllegalStateException(
                    "Can only add holidays during 'Public Holidays Review' phase. Current status: "
                            + status.getDisplayName()
            );
        }
        log.info("Step 3: Status check passed");

        // Validate holidays
        log.info("Step 4: Validating {} holidays...", holidays.size());
        List<String> errors = new ArrayList<>();
        for (int i = 0; i < holidays.size(); i++) {
            PublicHolidayDTO h = holidays.get(i);
            String ref = h.getName() != null ? h.getName() : "Holiday #" + (i + 1);

            if (h.getStartDate() == null) {
                errors.add(ref + ": Start date is required");
                continue;
            }

            if (h.getEndDate() != null && h.getEndDate().isBefore(h.getStartDate())) {
                errors.add(ref + ": End date cannot be before start date");
            }

            if (h.getStartDate().isBefore(payroll.getStartDate()) || h.getStartDate().isAfter(payroll.getEndDate())) {
                errors.add(ref + ": Start date is outside payroll period");
            }

            if (h.getEndDate() != null && h.getEndDate().isAfter(payroll.getEndDate())) {
                errors.add(ref + ": End date extends beyond payroll period");
            }
        }
        log.info("Step 4: Done - {} validation errors", errors.size());

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Validation failed: " + String.join(", ", errors));
        }

        // Create and add holiday entities
        log.info("Step 5: Creating holiday entities...");
        for (PublicHolidayDTO dto : holidays) {
            log.info("  Creating holiday: {}", dto.getName());

            PayrollPublicHoliday holiday = new PayrollPublicHoliday();
            holiday.setStartDate(dto.getStartDate());
            holiday.setEndDate(dto.getEndDate());
            holiday.setHolidayName(dto.getName());
            holiday.setIsPaid(dto.getIsPaid() != null ? dto.getIsPaid() : true);
            holiday.setIsConfirmed(true);
            holiday.setPayroll(payroll);

            log.info("  Adding to payroll...");
            payroll.addPublicHoliday(holiday);
            log.info("  Done");
        }
        log.info("Step 5: Done");

        log.info("Step 6: Saving payroll...");
        payrollRepository.save(payroll);
        log.info("Step 6: Done");

        log.info("Added {} public holidays to payroll {}", holidays.size(), payrollId);
    }    /**
     * Transition to ATTENDANCE_IMPORT and create employee payroll records
     */
    @Transactional
    public void importAttendance(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);

        // Transition state
        stateMachine.transitionTo(payroll, PayrollStatus.ATTENDANCE_IMPORT, username);

        // Get all active employees
        List<Employee> activeEmployees = employeeRepository.findByStatus("ACTIVE");

        log.info("Importing attendance for {} active employees", activeEmployees.size());

        int importCount = 0;
        for (Employee employee : activeEmployees) {
            try {
                // Create employee payroll record with snapshot
                EmployeePayroll employeePayroll = snapshotService.createEmployeePayrollSnapshot(
                        payroll,
                        employee
                );

                // Import attendance records
                List<Attendance> attendanceRecords = attendanceService.getEmployeeAttendanceHistory(
                        employee.getId(),
                        payroll.getStartDate(),
                        payroll.getEndDate()
                );

                // Create attendance snapshots
                for (Attendance attendance : attendanceRecords) {
                    com.example.backend.models.payroll.PayrollAttendanceSnapshot snapshot =
                            snapshotService.createAttendanceSnapshot(
                                    employeePayroll,
                                    attendance,
                                    payroll.getPublicHolidays()
                            );
                    employeePayroll.addAttendanceSnapshot(snapshot);
                }

                payroll.addEmployeePayroll(employeePayroll);
                importCount++;

            } catch (Exception e) {
                log.error("Failed to import attendance for employee {}: {}",
                        employee.getId(), e.getMessage(), e);
                // Continue with other employees
            }
        }

        payroll.setEmployeeCount(importCount);

        // ⭐ Calculate totals after import
        calculateAndUpdateTotals(payroll);

        payrollRepository.save(payroll);

        log.info("Attendance import completed: {} employees processed", importCount);
    }


    /**
     * Transition to LEAVE_REVIEW
     */
    @Transactional
    public void moveToLeaveReview(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);
        stateMachine.transitionTo(payroll, PayrollStatus.LEAVE_REVIEW, username);

        // ⭐ Recalculate totals when moving to leave review
        calculateAndUpdateTotals(payroll);

        payrollRepository.save(payroll);

        log.info("Payroll {} moved to LEAVE_REVIEW", payrollId);
    }

    /**
     * Transition to OVERTIME_REVIEW
     */
    @Transactional
    public void moveToOvertimeReview(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);
        stateMachine.transitionTo(payroll, PayrollStatus.OVERTIME_REVIEW, username);

        // ⭐ Recalculate totals when moving to overtime review
        calculateAndUpdateTotals(payroll);

        payrollRepository.save(payroll);

        log.info("Payroll {} moved to OVERTIME_REVIEW", payrollId);
    }

    /**
     * Move payroll to deduction review phase
     */
    @Transactional
    public void moveToDeductionReview(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);
        stateMachine.transitionTo(payroll, PayrollStatus.DEDUCTION_REVIEW, username);

        // Recalculate totals when moving to deduction review
        calculateAndUpdateTotals(payroll);

        payrollRepository.save(payroll);

        log.info("Payroll {} moved to DEDUCTION_REVIEW", payrollId);
    }

    /**
     * Confirm and lock payroll - triggers calculations
     */
    @Transactional
    public void confirmAndLock(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);

        log.info("Confirming and locking payroll {}", payrollId);

        // ⭐ Final calculation using helper method
        calculateAndUpdateTotals(payroll);

        // Transition to locked state
        stateMachine.transitionTo(payroll, PayrollStatus.CONFIRMED_AND_LOCKED, username);

        payrollRepository.save(payroll);

        log.info("Payroll {} confirmed and locked. Total Net: {}", payrollId, payroll.getTotalNetAmount());
    }

    /**
     * Get payroll by ID
     */
    public Payroll getPayrollById(UUID payrollId) {
        return payrollRepository.findById(payrollId)
                .orElseThrow(() -> new PayrollNotFoundException("Payroll not found: " + payrollId));
    }

    /**
     * Get all payrolls (ordered by most recent first)
     */
    public List<Payroll> getAllPayrolls() {
        return payrollRepository.findAllByOrderByEndDateDesc();
    }

    /**
     * Get payroll by date range
     */
    public Payroll getPayrollByDateRange(LocalDate startDate, LocalDate endDate) {
        return payrollRepository.findByStartDateAndEndDate(startDate, endDate)
                .orElseThrow(() -> new PayrollNotFoundException(
                        String.format("Payroll not found for period %s to %s", startDate, endDate)
                ));
    }

    /**
     * Get employee payroll details
     */
    public EmployeePayroll getEmployeePayroll(UUID payrollId, UUID employeeId) {
        return employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, employeeId)
                .orElseThrow(() -> new PayrollNotFoundException(
                        String.format("Employee payroll not found: payroll=%s, employee=%s",
                                payrollId, employeeId)
                ));
    }

    /**
     * Get all employee payrolls for a payroll
     */
    public List<EmployeePayroll> getEmployeePayrolls(UUID payrollId) {
        return employeePayrollRepository.findByPayrollId(payrollId);
    }

    /**
     * Get payroll history for a specific employee across all payroll cycles
     */
    public List<EmployeePayroll> getPayrollHistoryByEmployee(UUID employeeId) {
        return employeePayrollRepository.findByEmployeeIdWithPayrollDetails(employeeId);
    }

    /**
     * Delete payroll (only if not locked)
     */
    @Transactional
    public void deletePayroll(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);

        if (payroll.isLocked()) {
            throw new IllegalStateException("Cannot delete locked payroll");
        }

        log.info("Deleting payroll {} by user {}", payrollId, username);
        payrollRepository.delete(payroll);
    }

    // Validation helpers

    private void validatePayrollPeriod(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must be before end date");
        }

        if (startDate.isBefore(LocalDate.of(2020, 1, 1))) {
            throw new IllegalArgumentException("Payroll period cannot start before 2020");
        }
    }

    // Custom exceptions

    public static class PayrollNotFoundException extends RuntimeException {
        public PayrollNotFoundException(String message) {
            super(message);
        }
    }

    public static class PayrollContinuityException extends RuntimeException {
        public PayrollContinuityException(String message) {
            super(message);
        }
    }

    // ========================================
    // BONUS REVIEW WORKFLOW
    // ========================================

    /**
     * Process bonus review for a payroll period.
     * Fetches bonuses for the payroll month/year with status HR_APPROVED or PAID,
     * links them to the payroll, and updates EmployeePayroll.bonusAmount.
     *
     * @param payrollId The payroll to process bonuses for
     * @return Summary of the bonus review processing
     */
    @Transactional
    public BonusReviewSummaryDTO processBonusReview(UUID payrollId) {
        log.info("Processing bonus review for payroll: {}", payrollId);

        Payroll payroll = getPayrollById(payrollId);

        // Validate status
        if (payroll.getStatus() != PayrollStatus.BONUS_REVIEW) {
            throw new IllegalStateException(
                    "Cannot process bonus review. Payroll must be in BONUS_REVIEW status. Current: " + payroll.getStatus());
        }

        // Determine month/year from payroll period
        int month = payroll.getStartDate().getMonthValue();
        int year = payroll.getStartDate().getYear();

        // Fetch bonuses for the payroll period with eligible statuses
        List<Bonus.BonusStatus> eligibleStatuses = List.of(
                Bonus.BonusStatus.HR_APPROVED,
                Bonus.BonusStatus.PENDING_PAYMENT,
                Bonus.BonusStatus.PAID
        );

        // We need to find bonuses across all sites for this month/year
        // Use the status-based query since payroll is not site-specific
        List<Bonus> bonuses = bonusRepository.findByStatusIn(eligibleStatuses).stream()
                .filter(b -> b.getEffectiveMonth() != null && b.getEffectiveYear() != null)
                .filter(b -> b.getEffectiveMonth() == month && b.getEffectiveYear() == year)
                .collect(Collectors.toList());

        log.info("Found {} eligible bonuses for period {}/{}", bonuses.size(), month, year);

        // Get employee payrolls
        List<EmployeePayroll> employeePayrolls = employeePayrollRepository.findByPayrollId(payrollId);

        // Build a map of employeeId -> EmployeePayroll for fast lookup
        Map<UUID, EmployeePayroll> employeePayrollMap = new HashMap<>();
        for (EmployeePayroll ep : employeePayrolls) {
            employeePayrollMap.put(ep.getEmployeeId(), ep);
        }

        // Summary tracking
        int totalBonusCount = 0;
        BigDecimal totalBonusAmount = BigDecimal.ZERO;
        int paidBonusCount = 0;
        BigDecimal paidBonusAmount = BigDecimal.ZERO;
        int pendingBonusCount = 0;
        BigDecimal pendingBonusAmount = BigDecimal.ZERO;

        Map<String, BonusReviewSummaryDTO.BonusTypeSummary> typeSummaryMap = new HashMap<>();
        Map<UUID, BonusReviewSummaryDTO.EmployeeBonusSummary> employeeSummaryMap = new HashMap<>();
        List<String> issues = new ArrayList<>();

        // Process each bonus
        for (Bonus bonus : bonuses) {
            try {
                // Link bonus to payroll
                bonus.setPayroll(payroll);
                bonusRepository.save(bonus);

                totalBonusCount++;
                totalBonusAmount = totalBonusAmount.add(bonus.getAmount());

                if (bonus.getStatus() == Bonus.BonusStatus.PAID) {
                    paidBonusCount++;
                    paidBonusAmount = paidBonusAmount.add(bonus.getAmount());
                } else {
                    pendingBonusCount++;
                    pendingBonusAmount = pendingBonusAmount.add(bonus.getAmount());
                }

                // Update employee payroll bonus amount
                UUID employeeId = bonus.getEmployee().getId();
                EmployeePayroll ep = employeePayrollMap.get(employeeId);
                if (ep != null) {
                    BigDecimal currentBonus = ep.getBonusAmount() != null ? ep.getBonusAmount() : BigDecimal.ZERO;
                    ep.setBonusAmount(currentBonus.add(bonus.getAmount()));
                    employeePayrollRepository.save(ep);
                } else {
                    issues.add("No employee payroll found for employee: " +
                            bonus.getEmployee().getFirstName() + " " + bonus.getEmployee().getLastName() +
                            " (bonus " + bonus.getBonusNumber() + ")");
                }

                // Track by type
                String typeKey = bonus.getBonusType().getCode();
                typeSummaryMap.compute(typeKey, (k, v) -> {
                    if (v == null) {
                        return BonusReviewSummaryDTO.BonusTypeSummary.builder()
                                .typeName(bonus.getBonusType().getName())
                                .typeCode(bonus.getBonusType().getCode())
                                .count(1)
                                .amount(bonus.getAmount())
                                .build();
                    }
                    v.setCount(v.getCount() + 1);
                    v.setAmount(v.getAmount().add(bonus.getAmount()));
                    return v;
                });

                // Track by employee
                employeeSummaryMap.compute(employeeId, (k, v) -> {
                    String empName = bonus.getEmployee().getFirstName() + " " + bonus.getEmployee().getLastName();
                    if (v == null) {
                        return BonusReviewSummaryDTO.EmployeeBonusSummary.builder()
                                .employeeId(employeeId)
                                .employeeName(empName)
                                .count(1)
                                .amount(bonus.getAmount())
                                .build();
                    }
                    v.setCount(v.getCount() + 1);
                    v.setAmount(v.getAmount().add(bonus.getAmount()));
                    return v;
                });

            } catch (Exception e) {
                log.error("Failed to process bonus {}: {}", bonus.getBonusNumber(), e.getMessage());
                issues.add("Failed to process bonus " + bonus.getBonusNumber() + ": " + e.getMessage());
            }
        }

        // Mark bonus as processed
        payroll.markBonusProcessed();
        payrollRepository.save(payroll);

        log.info("Bonus review processed: {} bonuses, total amount: {}", totalBonusCount, totalBonusAmount);

        return BonusReviewSummaryDTO.builder()
                .message(String.format("Processed %d bonuses totaling %s", totalBonusCount, totalBonusAmount))
                .totalBonusCount(totalBonusCount)
                .totalBonusAmount(totalBonusAmount)
                .paidBonusCount(paidBonusCount)
                .paidBonusAmount(paidBonusAmount)
                .pendingBonusCount(pendingBonusCount)
                .pendingBonusAmount(pendingBonusAmount)
                .byType(new ArrayList<>(typeSummaryMap.values()))
                .byEmployee(new ArrayList<>(employeeSummaryMap.values()))
                .issues(issues)
                .build();
    }

    /**
     * Finalize bonus review and transition to DEDUCTION_REVIEW
     *
     * @param payrollId The payroll ID
     * @param username The user finalizing the review
     * @return Updated payroll
     */
    @Transactional
    public Payroll finalizeBonusReview(UUID payrollId, String username) {
        log.info("Finalizing bonus review for payroll: {} by {}", payrollId, username);

        Payroll payroll = getPayrollById(payrollId);

        // Validate can finalize
        if (!payroll.canFinalizeBonus()) {
            throw new IllegalStateException(
                    "Cannot finalize bonus review. Ensure bonuses have been processed and review is not already finalized.");
        }

        // Finalize
        payroll.finalizeBonusReview(username);

        // Transition to DEDUCTION_REVIEW
        payroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);

        Payroll saved = payrollRepository.save(payroll);

        log.info("Bonus review finalized for payroll {}, moved to DEDUCTION_REVIEW", payrollId);

        return saved;
    }

    /**
     * Move payroll to bonus review phase
     */
    @Transactional
    public void moveToBonusReview(UUID payrollId, String username) {
        Payroll payroll = getPayrollById(payrollId);
        stateMachine.transitionTo(payroll, PayrollStatus.BONUS_REVIEW, username);

        // Recalculate totals when moving to bonus review
        calculateAndUpdateTotals(payroll);

        payrollRepository.save(payroll);

        log.info("Payroll {} moved to BONUS_REVIEW", payrollId);
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Save payroll entity
     * Used by controller when updating payroll state
     */
    @Transactional
    public Payroll save(Payroll payroll) {
        return payrollRepository.save(payroll);
    }

    /**
     * Reset attendance data for a payroll
     * Deletes all employee payrolls and their snapshots
     * DANGER: This is a destructive operation
     *
     * @param payroll The payroll to reset
     */
    @Transactional
    public void resetAttendanceData(Payroll payroll) {
        log.warn("Resetting attendance data for payroll {}", payroll.getId());

        // Delete all employee payrolls (cascade will delete snapshots)
        List<EmployeePayroll> employeePayrolls = employeePayrollRepository
                .findByPayrollId(payroll.getId());

        log.info("Deleting {} employee payroll records", employeePayrolls.size());
        employeePayrollRepository.deleteAll(employeePayrolls);

        // Clear the collection
        payroll.getEmployeePayrolls().clear();
        payroll.setEmployeeCount(0);

        // ⭐ Reset totals to zero
        payroll.setTotalGrossAmount(BigDecimal.ZERO);
        payroll.setTotalDeductions(BigDecimal.ZERO);
        payroll.setTotalNetAmount(BigDecimal.ZERO);

        log.info("Attendance data reset completed for payroll {}", payroll.getId());
    }

    // ========================================
    // ⭐ PRIVATE HELPER METHOD FOR CALCULATIONS
    // ========================================

    /**
     * Calculate and update payroll totals
     * This method:
     * 1. Calculates each employee's payroll (gross, deductions, net)
     * 2. Sums up totals for the entire payroll
     *
     * Called internally after each workflow step to keep totals updated.
     *
     * @param payroll The payroll to calculate totals for
     */
    private void calculateAndUpdateTotals(Payroll payroll) {
        log.info("Calculating totals for payroll: {}", payroll.getId());

        // Fetch employee payrolls from DB if in-memory collection is empty
        List<EmployeePayroll> employeePayrolls = payroll.getEmployeePayrolls();
        if (employeePayrolls == null || employeePayrolls.isEmpty()) {
            log.info("In-memory collection empty, fetching from database...");
            employeePayrolls = employeePayrollRepository.findByPayrollId(payroll.getId());
        }

        if (employeePayrolls.isEmpty()) {
            log.info("No employee payrolls to calculate");
            payroll.setTotalGrossAmount(BigDecimal.ZERO);
            payroll.setTotalDeductions(BigDecimal.ZERO);
            payroll.setTotalNetAmount(BigDecimal.ZERO);
            return;
        }

        // Calculate each employee payroll
        for (EmployeePayroll employeePayroll : employeePayrolls) {
            try {
                calculationEngine.calculateEmployeePayroll(employeePayroll);
            } catch (Exception e) {
                log.error("Failed to calculate payroll for employee {}: {}",
                        employeePayroll.getEmployeeName(), e.getMessage());
                // Continue with other employees - don't fail the whole batch
            }
        }

        // Sum up totals (null-safe)
        BigDecimal totalGross = employeePayrolls.stream()
                .map(ep -> ep.getGrossPay() != null ? ep.getGrossPay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDeductions = employeePayrolls.stream()
                .map(ep -> ep.getTotalDeductions() != null ? ep.getTotalDeductions() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalNet = employeePayrolls.stream()
                .map(ep -> ep.getNetPay() != null ? ep.getNetPay() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        payroll.setTotalGrossAmount(totalGross);
        payroll.setTotalDeductions(totalDeductions);
        payroll.setTotalNetAmount(totalNet);

        log.info("Payroll totals calculated - Gross: {}, Deductions: {}, Net: {}, Employees: {}",
                totalGross, totalDeductions, totalNet, payroll.getEmployeeCount());
    }

    /**
     * Recalculate totals for a payroll (public method for controller use)
     * Use this when you need to trigger recalculation from outside the service
     *
     * @param payrollId The payroll ID to recalculate
     */
    @Transactional
    public void recalculateTotals(UUID payrollId) {
        Payroll payroll = getPayrollById(payrollId);

        if (payroll.isLocked()) {
            throw new IllegalStateException("Cannot recalculate locked payroll");
        }

        calculateAndUpdateTotals(payroll);
        payrollRepository.save(payroll);

        log.info("Payroll {} totals recalculated successfully", payrollId);
    }
}