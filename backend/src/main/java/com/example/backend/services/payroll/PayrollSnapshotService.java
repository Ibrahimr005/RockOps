package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.AttendanceImportSummaryDTO;
import com.example.backend.dto.payroll.AttendanceImportSummaryDTO.AttendanceIssueDTO;
import com.example.backend.dto.payroll.AttendanceImportSummaryDTO.ContractTypeBreakdownDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollAttendanceSnapshot;
import com.example.backend.models.payroll.PayrollPublicHoliday;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollAttendanceSnapshotRepository;
import com.example.backend.repositories.payroll.PayrollPublicHolidayRepository;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.payroll.PayrollRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service responsible for creating immutable snapshots of employee and attendance data
 * These snapshots ensure payroll calculations remain consistent even if source data changes
 * <p>
 * ⭐ UPDATED: Now supports UPSERT logic and triggers immediate calculation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollSnapshotService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeePayrollRepository employeePayrollRepository;
    private final PayrollAttendanceSnapshotRepository snapshotRepository;
    private final PayrollPublicHolidayRepository publicHolidayRepository;
    private final PayrollRepository payrollRepository;
    private final EntityIdGeneratorService entityIdGeneratorService;

    // ✅ NEW DEPENDENCY: Required to calculate money immediately after import
    private final PayrollCalculationEngine calculationEngine;

    // ========================================
    // ⭐ UPSERT IMPORT METHOD
    // ========================================

    /**
     * Import attendance with UPSERT support
     * Can be called multiple times - updates existing records
     */
    @Transactional
    public AttendanceImportSummaryDTO importAttendanceWithUpsert(Payroll payroll) {
        log.info("🔷 SNAPSHOT SERVICE: importAttendanceWithUpsert START");
        log.info("   Payroll ID: {}", payroll.getId());
        log.info("   Import count: {}", payroll.getAttendanceImportCount());

        try {
            // Validation: Check if attendance is locked
            log.info("   Checking if attendance is finalized...");
            if (payroll.getAttendanceFinalized()) {
                log.error("   ❌ Attendance is finalized");
                throw new IllegalStateException(
                        "Attendance is finalized and locked. Cannot import or modify attendance data."
                );
            }
            log.info("   ✅ Not finalized");

            // Initialize summary builder
            log.info("   Initializing summary builder...");
            AttendanceImportSummaryDTO.AttendanceImportSummaryDTOBuilder summaryBuilder =
                    AttendanceImportSummaryDTO.builder();

            List<AttendanceIssueDTO> issues = new ArrayList<>();

            // Track statistics
            int created = 0;
            int updated = 0;
            int snapshotsCreated = 0;
            int monthlyCount = 0;
            int dailyCount = 0;
            int hourlyCount = 0;

            // Get active employees
            log.info("   Fetching active employees...");
            List<Employee> activeEmployees = employeeRepository.findByStatus("ACTIVE");
            log.info("   ✅ Found {} active employees", activeEmployees.size());
            summaryBuilder.totalEmployees(activeEmployees.size());

            // Get public holidays
            log.info("   Fetching public holidays...");
            List<PayrollPublicHoliday> publicHolidays = publicHolidayRepository
                    .findByPayrollIdOrderByStartDateAsc(payroll.getId());
            log.info("   ✅ Found {} public holidays", publicHolidays.size());
            summaryBuilder.publicHolidaysCount(publicHolidays.size());

            // Calculate working days
            log.info("   Calculating working days...");
            int totalWorkingDays = calculateWorkingDays(
                    payroll.getStartDate(),
                    payroll.getEndDate(),
                    publicHolidays
            );
            log.info("   ✅ Total working days: {}", totalWorkingDays);
            summaryBuilder.totalWorkingDays(totalWorkingDays);

            // Process each employee
            log.info("   Processing {} employees...", activeEmployees.size());
            for (int i = 0; i < activeEmployees.size(); i++) {
                Employee employee = activeEmployees.get(i);
                log.info("   [{}/{}] Processing: {}", i + 1, activeEmployees.size(), employee.getFullName());

                try {
                    // UPSERT: Find existing or create new
                    Optional<EmployeePayroll> existingPayroll = employeePayrollRepository
                            .findByPayrollIdAndEmployeeId(payroll.getId(), employee.getId());

                    EmployeePayroll employeePayroll;
                    boolean isUpdate = false;

                    if (existingPayroll.isPresent()) {
                        // UPDATE existing record
                        log.info("     → UPDATING existing employee payroll");
                        employeePayroll = existingPayroll.get();
                        isUpdate = true;
                        updated++;

                        // Clear old snapshots for this employee
                        log.info("     → Deleting old snapshots...");
                        snapshotRepository.deleteByEmployeePayrollId(employeePayroll.getId());

                        // Clear the list in memory to avoid Hibernate dupes
                        if (employeePayroll.getAttendanceSnapshots() != null) {
                            employeePayroll.getAttendanceSnapshots().clear();
                        }

                    } else {
                        // CREATE new record
                        log.info("     → CREATING new employee payroll");
                        employeePayroll = createEmployeePayrollSnapshot(payroll, employee);
                        created++;
                    }

                    // Track contract types
                    switch (employee.getJobPosition().getContractType()) {
                        case MONTHLY:
                            monthlyCount++;
                            break;
                        case DAILY:
                            dailyCount++;
                            break;
                        case HOURLY:
                            hourlyCount++;
                            break;
                    }

                    // Create attendance snapshots
                    log.info("     → Fetching attendance records from {} to {}",
                            payroll.getStartDate(), payroll.getEndDate());

                    // Uses the optimized Repo method if available, or standard JPA
                    List<Attendance> attendanceRecords = attendanceRepository
                            .findByEmployeeIdAndDateBetween(
                                    employee.getId(),
                                    payroll.getStartDate(),
                                    payroll.getEndDate()
                            );
                    log.info("     → Found {} attendance records", attendanceRecords.size());

                    // Create Snapshots
                    for (Attendance attendance : attendanceRecords) {
                        PayrollAttendanceSnapshot snapshot = createAttendanceSnapshot(
                                employeePayroll,
                                attendance,
                                publicHolidays
                        );

                        employeePayroll.addAttendanceSnapshot(snapshot);
                        snapshotsCreated++;
                    }

                    // ✅ CRITICAL FIX: TRIGGER CALCULATION ENGINE
                    // This calculates Gross, Net, and Attendance stats (late days, absent days)
                    // and SAVES the entity.
                    log.info("     → Calculating financials for {}...", employee.getFullName());
                    calculationEngine.calculateEmployeePayroll(employeePayroll);

                    // We don't need explicit save() here because calculationEngine does it.
                    // But checking issues relies on the calculated data.

                    // Retrieve updated stats for issue checking
                    int lateDays = employeePayroll.getLateDays() != null ? employeePayroll.getLateDays() : 0;
                    int absentDays = employeePayroll.getAbsentDays() != null ? employeePayroll.getAbsentDays() : 0;

                    log.info("     ✅ Processed: attended={}, absent={}, late={}, snapshots={}",
                            employeePayroll.getAttendedDays(), absentDays, lateDays, attendanceRecords.size());

                    // Check for issues
                    if (lateDays > 0) {
                        issues.add(AttendanceIssueDTO.builder()
                                .employeeId(employee.getId().toString())
                                .employeeName(employee.getFullName())
                                .issueType("LATE_DAYS")
                                .description(lateDays + " late day(s) detected")
                                .severity("WARNING")
                                .build());
                    }

                    if (absentDays > 5) { // Example threshold
                        issues.add(AttendanceIssueDTO.builder()
                                .employeeId(employee.getId().toString())
                                .employeeName(employee.getFullName())
                                .issueType("EXCESSIVE_ABSENCES")
                                .description(absentDays + " absent day(s) - exceeds threshold")
                                .severity("WARNING")
                                .build());
                    }

                } catch (Exception e) {
                    log.error("     ❌ Error processing employee {}: {}", employee.getFullName(), e.getMessage(), e);

                    issues.add(AttendanceIssueDTO.builder()
                            .employeeId(employee.getId().toString())
                            .employeeName(employee.getFullName())
                            .issueType("PROCESSING_ERROR")
                            .description("Failed to process: " + e.getMessage())
                            .severity("ERROR")
                            .build());
                }
            }

            log.info("   📊 TOTALS: created={}, updated={}, snapshots={}", created, updated, snapshotsCreated);

            // Update payroll
            log.info("   Updating payroll...");
            payroll.markAttendanceImported();
            payroll.setEmployeeCount(activeEmployees.size());
            payrollRepository.save(payroll);
            log.info("   ✅ Payroll updated");

            // Build summary
            String status = issues.stream()
                    .anyMatch(i -> "ERROR".equals(i.getSeverity()))
                    ? "PARTIAL_FAILURE"
                    : issues.isEmpty() ? "SUCCESS" : "SUCCESS_WITH_WARNINGS";

            String message = String.format(
                    "Processed %d employees: %d created, %d updated. %d snapshots created.",
                    activeEmployees.size(), created, updated, snapshotsCreated
            );

            log.info("🔷 SNAPSHOT SERVICE: importAttendanceWithUpsert SUCCESS");
            log.info("   Status: {}", status);
            log.info("   Message: {}", message);

            return summaryBuilder
                    .employeePayrollsCreated(created)
                    .employeePayrollsUpdated(updated)
                    .attendanceSnapshotsCreated(snapshotsCreated)
                    .isReImport(updated > 0)
                    .importCount(payroll.getAttendanceImportCount())
                    .importedAt(LocalDateTime.now())
                    .issues(issues)
                    .status(status)
                    .message(message)
                    .breakdown(ContractTypeBreakdownDTO.builder()
                            .monthlyEmployees(monthlyCount)
                            .dailyEmployees(dailyCount)
                            .hourlyEmployees(hourlyCount)
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("🔷 SNAPSHOT SERVICE: importAttendanceWithUpsert FAILED");
            log.error("   Error: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ========================================
    // EXISTING METHODS
    // ========================================

    /**
     * Create employee payroll snapshot from current employee state
     */
    public EmployeePayroll createEmployeePayrollSnapshot(Payroll payroll, Employee employee) {
        log.info("     📸 createEmployeePayrollSnapshot START for: {}", employee.getFullName());

        JobPosition jobPosition = employee.getJobPosition();

        if (jobPosition == null) {
            throw new IllegalStateException(
                    "Employee " + employee.getFullName() + " has no job position assigned"
            );
        }

        log.info("     📸 JobPosition: {} ({})", jobPosition.getPositionName(), jobPosition.getContractType());

        // ⭐ FIX: Create entity manually instead of using Lombok builder
        log.info("     📸 Creating EmployeePayroll entity manually...");
        EmployeePayroll employeePayroll = new EmployeePayroll();
        // Generate employee payroll number
        employeePayroll.setEmployeePayrollNumber(entityIdGeneratorService.generateNextId(EntityTypeConfig.EMPLOYEE_PAYROLL));
employeePayroll.setPaymentTypeCode(employee.getPaymentType().getCode());
employeePayroll.setPaymentTypeName(employee.getPaymentType().getName());
employeePayroll.setPaymentTypeId(employee.getPaymentType().getId());
        // Set required fields
        employeePayroll.setPayroll(payroll);
        employeePayroll.setEmployeeId(employee.getId());
        employeePayroll.setEmployeeName(employee.getFullName());
        employeePayroll.setJobPositionId(jobPosition.getId());
        employeePayroll.setJobPositionName(jobPosition.getPositionName());
        employeePayroll.setDepartmentName(jobPosition.getDepartment() != null ?
                jobPosition.getDepartment().getName() : null);
        employeePayroll.setContractType(jobPosition.getContractType());

        // Initialize non-nullable BigDecimal fields
        employeePayroll.setGrossPay(BigDecimal.ZERO);
        employeePayroll.setTotalDeductions(BigDecimal.ZERO);
        employeePayroll.setNetPay(BigDecimal.ZERO);
        employeePayroll.setOvertimePay(BigDecimal.ZERO);
        employeePayroll.setAbsenceDeductionAmount(BigDecimal.ZERO);
        employeePayroll.setLateDeductionAmount(BigDecimal.ZERO);
        employeePayroll.setLeaveDeductionAmount(BigDecimal.ZERO);
        employeePayroll.setLoanDeductionAmount(BigDecimal.ZERO);
        employeePayroll.setOtherDeductionAmount(BigDecimal.ZERO);

        // Initialize collections
        employeePayroll.setAttendanceSnapshots(new ArrayList<>());
        employeePayroll.setDeductions(new ArrayList<>());

        log.info("     📸 Base fields set");

        // Set contract-specific compensation
        switch (jobPosition.getContractType()) {
            case MONTHLY:
                BigDecimal monthlySalary = employee.getMonthlySalary();
                log.info("     📸 MONTHLY: salary={}", monthlySalary);

                employeePayroll.setMonthlyBaseSalary(monthlySalary != null ? monthlySalary : BigDecimal.ZERO);

                BigDecimal absentDeduction = jobPosition.getAbsentDeduction() != null
                        ? jobPosition.getAbsentDeduction()
                        : BigDecimal.ONE;

                BigDecimal lateDeduction = jobPosition.getLateDeduction() != null
                        ? jobPosition.getLateDeduction()
                        : BigDecimal.ZERO;

                BigDecimal leaveDeduction = jobPosition.getLeaveDeduction() != null
                        ? jobPosition.getLeaveDeduction()
                        : BigDecimal.ZERO;

                employeePayroll.setAbsentDeduction(absentDeduction);
                employeePayroll.setLateDeduction(lateDeduction);
                employeePayroll.setLateForgivenessMinutes(jobPosition.getLateForgivenessMinutes());
                employeePayroll.setLateForgivenessCountPerQuarter(jobPosition.getLateForgivenessCountPerQuarter());
                employeePayroll.setLeaveDeduction(leaveDeduction);

                log.info("     📸 MONTHLY deductions set: absent={}, late={}, leave={}",
                        absentDeduction, lateDeduction, leaveDeduction);
                break;

            case DAILY:
                BigDecimal dailyRate = jobPosition.getDailyRate() != null ?
                        BigDecimal.valueOf(jobPosition.getDailyRate()) : BigDecimal.ZERO;
                employeePayroll.setDailyRate(dailyRate);
                log.info("     📸 DAILY: rate={}", dailyRate);
                break;

            case HOURLY:
                BigDecimal hourlyRate = jobPosition.getHourlyRate() != null ?
                        BigDecimal.valueOf(jobPosition.getHourlyRate()) : BigDecimal.ZERO;
                employeePayroll.setHourlyRate(hourlyRate);
                log.info("     📸 HOURLY: rate={}", hourlyRate);
                break;
        }

        log.info("     📸 ✅ EmployeePayroll created: {} - {}",
                employeePayroll.getEmployeeName(), employeePayroll.getContractType());

        return employeePayroll;
    }

    /**
     * Create attendance snapshot from actual attendance record
     * Updated to support date range public holidays
     */
    public PayrollAttendanceSnapshot createAttendanceSnapshot(
            EmployeePayroll employeePayroll,
            Attendance attendance,
            List<PayrollPublicHoliday> publicHolidays) {

        LocalDate date = attendance.getDate();

        // Check if date is a public holiday
        // Find specific holiday for metadata (name, isPaid)
        PayrollPublicHoliday holiday = publicHolidays.stream()
                .filter(h -> h.containsDate(date) && h.getIsConfirmed())
                .findFirst()
                .orElse(null);

        boolean isPublicHoliday = (holiday != null);
        boolean isPaidHoliday = isPublicHoliday && Boolean.TRUE.equals(holiday.getIsPaid());

        // Check if weekend
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        boolean isWeekend = (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.FRIDAY);

        // Calculate late minutes (snapshot only - engine does refined calc)
        Integer lateMinutes = calculateLateMinutes(attendance, employeePayroll);

        BigDecimal workedHours = attendance.getHoursWorked() != null ?
                BigDecimal.valueOf(attendance.getHoursWorked()) : null;
        BigDecimal expectedHours = attendance.getExpectedHours() != null ?
                BigDecimal.valueOf(attendance.getExpectedHours()) : null;
        BigDecimal overtimeHours = attendance.getOvertimeHours() != null ?
                BigDecimal.valueOf(attendance.getOvertimeHours()) : null;

        PayrollAttendanceSnapshot snapshot = PayrollAttendanceSnapshot.builder()
                .attendanceId(attendance.getId())
                .attendanceDate(date)
                .isPublicHoliday(isPublicHoliday)
                // Capture Paid Status
                .publicHolidayPaid(isPaidHoliday)
                .publicHolidayName(isPublicHoliday ? holiday.getHolidayName() : null)
                .isWeekend(isWeekend)
                .dayType(attendance.getDayType())
                .status(attendance.getStatus())
                .checkIn(attendance.getCheckIn())
                .checkOut(attendance.getCheckOut())
                .workedHours(workedHours)
                .expectedHours(expectedHours)
                .overtimeHours(overtimeHours)
                .lateMinutes(lateMinutes)
                .leaveType(attendance.getLeaveType())
                .isExcusedAbsence(attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE)
                .notes(attendance.getNotes())
                .build();

        // Set expected arrival time from job position
        if (employeePayroll.getContractType() == JobPosition.ContractType.MONTHLY) {
            LocalTime expectedStart = getExpectedStartTime(employeePayroll);
            snapshot.setExpectedArrivalTime(expectedStart);
        }

        return snapshot;
    }

    /**
     * Calculate late minutes for an attendance record
     */
    private Integer calculateLateMinutes(Attendance attendance, EmployeePayroll employeePayroll) {
        if (attendance.getCheckIn() == null) {
            return null;
        }

        // Only calculate for MONTHLY employees
        if (employeePayroll.getContractType() != JobPosition.ContractType.MONTHLY) {
            return null;
        }

        // Get expected start time
        LocalTime expectedStart = getExpectedStartTime(employeePayroll);
        if (expectedStart == null) {
            return null;
        }

        LocalTime actualCheckIn = attendance.getCheckIn();

        if (actualCheckIn.isAfter(expectedStart)) {
            long minutesLate = ChronoUnit.MINUTES.between(expectedStart, actualCheckIn);
            return (int) minutesLate;
        }

        return 0; // On time or early
    }

    /**
     * Get expected start time from job position
     * Default to 9:00 AM if not specified
     */
    private LocalTime getExpectedStartTime(EmployeePayroll employeePayroll) {
        // Default start time (can be enhanced to fetch from JobPosition)
        return LocalTime.of(9, 0); // 9:00 AM
    }

    /**
     * Calculate total working days (excluding public holidays)
     */
    private int calculateWorkingDays(
            LocalDate startDate,
            LocalDate endDate,
            List<PayrollPublicHoliday> publicHolidays) {

        int totalDays = 0;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            // Make it effectively final for lambda
            final LocalDate currentDate = current;

            boolean isHoliday = publicHolidays.stream()
                    .anyMatch(holiday -> holiday.containsDate(currentDate) && holiday.getIsConfirmed());

            // Check weekend
            DayOfWeek dow = currentDate.getDayOfWeek();
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

            // Simple working day calc: Not Holiday AND Not Weekend
            // Note: Engine has more complex logic for Paid/Unpaid, this is just for the SummaryDTO stats
            if (!isHoliday && !isWeekend) {
                totalDays++;
            }
            current = current.plusDays(1);
        }

        return totalDays;
    }


}