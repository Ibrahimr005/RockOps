package com.example.backend.services.payroll;

import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollAttendanceSnapshot;
import com.example.backend.models.payroll.PayrollPublicHoliday;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.LeaveRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PayrollAttendanceSnapshotRepository;
import com.example.backend.repositories.payroll.PayrollPublicHolidayRepository;
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
 * FINAL COMPLETE Integration Service for Payroll
 * 
 * Integrates ALL components into EmployeePayroll:
 * 1. Public Holidays (PAID vs UNPAID) - from PayrollPublicHoliday
 * 2. Attendance - from Attendance table  
 * 3. Overtime - from Attendance.overtimeHours
 * 4. Leave - from LeaveRequest table
 * 5. Job Position Deduction Rates - from JobPosition
 * 
 * CRITICAL BUSINESS RULE:
 * - PAID public holidays: Count as working days, employee gets paid
 * - UNPAID public holidays: Count as OFF days, employee doesn't get paid
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollIntegrationService {

    private final EmployeePayrollRepository employeePayrollRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayrollPublicHolidayRepository publicHolidayRepository;
    private final PayrollAttendanceSnapshotRepository snapshotRepository;

    /**
     * Main integration method - called after attendance finalization
     * Creates snapshots for all employees in the payroll
     */
    @Transactional
    public void integrateAllDataIntoPayroll(Payroll payroll) {
        log.info("========================================");
        log.info("Integrating ALL data into payroll: {} to {}", payroll.getStartDate(), payroll.getEndDate());
        log.info("========================================");

        try {
            // Step 1: Get public holidays for the period (with isPaid status)
            Map<LocalDate, PayrollPublicHoliday> publicHolidayMap = getPublicHolidaysForPayroll(payroll);
            
            int paidHolidays = (int) publicHolidayMap.values().stream()
                    .filter(h -> Boolean.TRUE.equals(h.getIsPaid()))
                    .count();
            int unpaidHolidays = publicHolidayMap.size() - paidHolidays;
            
            log.info("Found {} public holidays: {} paid, {} unpaid", 
                    publicHolidayMap.size(), paidHolidays, unpaidHolidays);

            // Step 2: Get all employee payrolls
            List<EmployeePayroll> employeePayrolls = employeePayrollRepository
                    .findByPayrollId(payroll.getId());
            log.info("Processing {} employees", employeePayrolls.size());

            int employeesProcessed = 0;
            int totalSnapshotsCreated = 0;

            // Step 3: Process each employee
            for (EmployeePayroll ep : employeePayrolls) {
                try {
                    log.debug("Processing employee: {} (ID: {})", 
                            ep.getEmployeeName(), ep.getEmployeeId());

                    // Copy JobPosition deduction rates to EmployeePayroll
                    copyJobPositionDeductionRates(ep);

                    // Clear existing snapshots (for re-processing)
                    clearExistingSnapshots(ep);

                    // Create snapshots integrating all data
                    List<PayrollAttendanceSnapshot> snapshots = createIntegratedSnapshots(
                            ep,
                            payroll,
                            publicHolidayMap
                    );

                    // Save snapshots
                    snapshotRepository.saveAll(snapshots);
                    totalSnapshotsCreated += snapshots.size();

                    // Save EmployeePayroll with updated deduction rates
                    employeePayrollRepository.save(ep);

                    employeesProcessed++;
                    log.info("✅ Employee {}: Created {} snapshots, updated deduction rates", 
                            ep.getEmployeeName(), snapshots.size());

                } catch (Exception e) {
                    log.error("❌ Error processing employee {}: {}", 
                            ep.getEmployeeName(), e.getMessage(), e);
                }
            }

            log.info("========================================");
            log.info("✅ Integration complete!");
            log.info("Employees processed: {}", employeesProcessed);
            log.info("Total snapshots created: {}", totalSnapshotsCreated);
            log.info("========================================");

        } catch (Exception e) {
            log.error("❌ FATAL ERROR in payroll integration: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to integrate payroll data", e);
        }
    }

    /**
     * Copy deduction rates from JobPosition to EmployeePayroll
     * Creates snapshot of rates at the time of payroll processing
     */
    private void copyJobPositionDeductionRates(EmployeePayroll employeePayroll) {
        try {
            Employee employee = employeeRepository.findById(employeePayroll.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException(
                            "Employee not found: " + employeePayroll.getEmployeeId()));

            JobPosition jobPosition = employee.getJobPosition();
            
            if (jobPosition == null) {
                log.warn("⚠️ Employee {} has no job position assigned", 
                        employeePayroll.getEmployeeName());
                return;
            }

            // Copy deduction rates
            if (jobPosition.getAbsentDeduction() != null) {
                employeePayroll.setAbsentDeduction(jobPosition.getAbsentDeduction());
            }

            if (jobPosition.getLateDeduction() != null) {
                employeePayroll.setLateDeduction(jobPosition.getLateDeduction());
            }

            if (jobPosition.getLateForgivenessMinutes() != null) {
                employeePayroll.setLateForgivenessMinutes(jobPosition.getLateForgivenessMinutes());
            }

            if (jobPosition.getLateForgivenessCountPerQuarter() != null) {
                employeePayroll.setLateForgivenessCountPerQuarter(
                        jobPosition.getLateForgivenessCountPerQuarter());
            }

            if (jobPosition.getLeaveDeduction() != null) {
                employeePayroll.setLeaveDeduction(jobPosition.getLeaveDeduction());
            }

            log.debug("✅ Copied deduction rates from JobPosition for {}", 
                    employeePayroll.getEmployeeName());

        } catch (Exception e) {
            log.error("❌ Error copying deduction rates for {}: {}", 
                    employeePayroll.getEmployeeName(), e.getMessage());
        }
    }

    /**
     * Create integrated snapshots for one employee
     */
    private List<PayrollAttendanceSnapshot> createIntegratedSnapshots(
            EmployeePayroll employeePayroll,
            Payroll payroll,
            Map<LocalDate, PayrollPublicHoliday> publicHolidayMap) {

        List<PayrollAttendanceSnapshot> snapshots = new ArrayList<>();

        // Get attendance records
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndDateRange(
                        employeePayroll.getEmployeeId(),
                        payroll.getStartDate(),
                        payroll.getEndDate()
                );

        Map<LocalDate, Attendance> attendanceMap = attendances.stream()
                .collect(Collectors.toMap(Attendance::getDate, att -> att));

        // Get leave requests
        List<LeaveRequest> leaveRequests = leaveRequestRepository
                .findByEmployeeIdAndDateRange(
                        employeePayroll.getEmployeeId(),
                        payroll.getStartDate(),
                        payroll.getEndDate()
                );

        Set<LocalDate> leaveDates = new HashSet<>();
        for (LeaveRequest leave : leaveRequests) {
            if (leave.getStatus() == LeaveRequest.LeaveStatus.APPROVED) {
                leaveDates.addAll(getWorkingDatesBetween(leave.getStartDate(), leave.getEndDate()));
            }
        }

        // Create snapshot for each day
        LocalDate currentDate = payroll.getStartDate();
        while (!currentDate.isAfter(payroll.getEndDate())) {
            
            PayrollPublicHoliday publicHoliday = publicHolidayMap.get(currentDate);
            
            PayrollAttendanceSnapshot snapshot = createSnapshotForDay(
                    currentDate,
                    employeePayroll,
                    attendanceMap.get(currentDate),
                    publicHoliday,
                    leaveDates.contains(currentDate)
            );

            snapshots.add(snapshot);
            currentDate = currentDate.plusDays(1);
        }

        log.debug("Created {} snapshots for employee {}", 
                snapshots.size(), employeePayroll.getEmployeeName());

        return snapshots;
    }

    /**
     * Create a single snapshot for one day
     * CRITICAL: Handles PAID vs UNPAID public holidays correctly
     */
    private PayrollAttendanceSnapshot createSnapshotForDay(
            LocalDate date,
            EmployeePayroll employeePayroll,
            Attendance attendance,
            PayrollPublicHoliday publicHoliday,
            boolean isOnLeave) {

        PayrollAttendanceSnapshot snapshot = new PayrollAttendanceSnapshot();

        // FIX: Field is 'employeePayroll'
        snapshot.setEmployeePayroll(employeePayroll);

        // FIX: Field is 'attendanceDate', so setter is setAttendanceDate()
        snapshot.setAttendanceDate(date);

        // NOTE: Your entity does not have a 'dayOfWeek' field.
        // If you need it, add 'private DayOfWeek dayOfWeek;' to the entity.
        // snapshot.setDayOfWeek(date.getDayOfWeek());

        // Determine if this is a public holiday and if it's PAID
        boolean isPublicHoliday = (publicHoliday != null);
        boolean isPaidHoliday = isPublicHoliday && Boolean.TRUE.equals(publicHoliday.getIsPaid());
        boolean isUnpaidHoliday = isPublicHoliday && !Boolean.TRUE.equals(publicHoliday.getIsPaid());

        snapshot.setIsPublicHoliday(isPublicHoliday);

        // Store isPaid status in snapshot for later reference
        if (publicHoliday != null) {
            snapshot.setPublicHolidayPaid(publicHoliday.getIsPaid());
            snapshot.setPublicHolidayName(publicHoliday.getHolidayName());
        }

        // ATTENDANCE INTEGRATION
        if (attendance != null) {
            snapshot.setAttendanceId(attendance.getId()); // Good to link the ID
            snapshot.setStatus(attendance.getStatus());
            snapshot.setDayType(attendance.getDayType());

            // FIX: Field is 'checkIn', setter is setCheckIn()
            snapshot.setCheckIn(attendance.getCheckIn());

            // FIX: Field is 'checkOut', setter is setCheckOut()
            snapshot.setCheckOut(attendance.getCheckOut());

            snapshot.setNotes(attendance.getNotes());

            if (attendance.getHoursWorked() != null) {
                snapshot.setWorkedHours(BigDecimal.valueOf(attendance.getHoursWorked())
                        .setScale(2, RoundingMode.HALF_UP));
            }

            // OVERTIME INTEGRATION
            if (attendance.getOvertimeHours() != null && attendance.getOvertimeHours() > 0) {
                snapshot.setOvertimeHours(BigDecimal.valueOf(attendance.getOvertimeHours())
                        .setScale(2, RoundingMode.HALF_UP));
            }

            // Calculate late minutes
            if (attendance.getCheckIn() != null &&
                    attendance.getStatus() == Attendance.AttendanceStatus.LATE) {
                // Assuming calculateLateMinutes is a valid helper method in this class
                Integer lateMinutes = calculateLateMinutes(attendance, employeePayroll);
                snapshot.setLateMinutes(lateMinutes);
            }

        } else {
            // No attendance record - set default status based on day type

            if (isPaidHoliday) {
                // OPTION A: Mark as PRESENT (Simulates a working day for payroll)
                // snapshot.setStatus(Attendance.AttendanceStatus.PRESENT);

                // OPTION B (Recommended): Mark as OFF or HOLIDAY, but let isPaidPublicHoliday() handle the money logic.
                // If you mark them PRESENT, your attendance reports will look like everyone came to work.
                snapshot.setStatus(Attendance.AttendanceStatus.OFF);
                snapshot.setDayType(Attendance.DayType.PUBLIC_HOLIDAY);
                snapshot.setNotes("Paid Public Holiday: " + publicHoliday.getHolidayName());

            } else if (isUnpaidHoliday) {
                snapshot.setStatus(Attendance.AttendanceStatus.OFF);
                snapshot.setDayType(Attendance.DayType.PUBLIC_HOLIDAY);
                snapshot.setNotes("Unpaid Public Holiday: " + publicHoliday.getHolidayName());

            } else if (isWeekend(date)) { // Assuming isWeekend helper exists
                snapshot.setStatus(Attendance.AttendanceStatus.OFF);
                snapshot.setDayType(Attendance.DayType.WEEKEND);

            } else {
                snapshot.setStatus(Attendance.AttendanceStatus.ABSENT);
                snapshot.setDayType(Attendance.DayType.WORKING_DAY);
            }
        }

        // LEAVE INTEGRATION
        // FIX: Entity does not have 'isOnLeave' boolean. It has 'leaveType'.
        // You might want to set a transient boolean or use the leaveType string.
        if (isOnLeave) {
            snapshot.setStatus(Attendance.AttendanceStatus.ON_LEAVE);
            // snapshot.setLeaveType("ANNUAL"); // You might need to pass the leave object to get the type
        }

        return snapshot;
    }

    /**
     * Calculate late minutes for an attendance record
     */
    private Integer calculateLateMinutes(Attendance attendance, EmployeePayroll employeePayroll) {
        if (attendance.getCheckIn() == null) {
            return 0;
        }

        // Default expected start time (should ideally come from JobPosition)
        java.time.LocalTime expectedStartTime = java.time.LocalTime.of(9, 0);
        
        long minutesLate = java.time.Duration.between(
                expectedStartTime, 
                attendance.getCheckIn()
        ).toMinutes();

        // Apply grace period
        Integer graceMinutes = employeePayroll.getLateForgivenessMinutes();
        if (graceMinutes != null && minutesLate <= graceMinutes) {
            return 0;
        }

        return minutesLate > 0 ? (int) minutesLate : 0;
    }

    /**
     * Get public holidays for the payroll period
     * Returns map of date → PayrollPublicHoliday (with isPaid status)
     */
    private Map<LocalDate, PayrollPublicHoliday> getPublicHolidaysForPayroll(Payroll payroll) {
        try {
            List<PayrollPublicHoliday> holidays = publicHolidayRepository
                    .findByPayrollId(payroll.getId());

            Map<LocalDate, PayrollPublicHoliday> holidayMap = new HashMap<>();

            for (PayrollPublicHoliday holiday : holidays) {
                if (holiday.isSingleDay()) {
                    holidayMap.put(holiday.getStartDate(), holiday);
                } else {
                    // Multi-day holiday - add all dates
                    LocalDate current = holiday.getStartDate();
                    while (!current.isAfter(holiday.getEndDate())) {
                        holidayMap.put(current, holiday);
                        current = current.plusDays(1);
                    }
                }
            }

            return holidayMap;

        } catch (Exception e) {
            log.error("Error fetching public holidays: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * Get working dates between start and end (excludes weekends)
     */
    private List<LocalDate> getWorkingDatesBetween(LocalDate start, LocalDate end) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate current = start;
        
        while (!current.isAfter(end)) {
            if (!isWeekend(current)) {
                dates.add(current);
            }
            current = current.plusDays(1);
        }
        
        return dates;
    }

    /**
     * Check if date is weekend (Friday or Saturday)
     */
    private boolean isWeekend(LocalDate date) {
        int dayValue = date.getDayOfWeek().getValue();
        return dayValue == 5 || dayValue == 6; // Friday=5, Saturday=6
    }

    /**
     * Clear existing snapshots for re-processing
     */
    private void clearExistingSnapshots(EmployeePayroll employeePayroll) {
        List<PayrollAttendanceSnapshot> existing = snapshotRepository
                .findByEmployeePayrollId(employeePayroll.getId());
        
        if (!existing.isEmpty()) {
            snapshotRepository.deleteAll(existing);
            log.debug("Cleared {} existing snapshots for {}", 
                    existing.size(), employeePayroll.getEmployeeName());
        }
    }

    /**
     * Update overtime in snapshots after overtime processing
     */
//    public void updateOvertimeInSnapshots(Payroll payroll) {
//        log.info("Updating overtime in snapshots for payroll {}/{}",
//                payroll.getMonth(), payroll.getYear());
//
//        try {
//            // 1. Get all EmployeePayrolls for this run
//            List<EmployeePayroll> employeePayrolls = employeePayrollRepository
//                    .findByPayrollId(payroll.getId());
//
//            if (employeePayrolls.isEmpty()) return;
//
//            // Extract IDs for bulk fetching
//            List<UUID> employeeIds = employeePayrolls.stream()
//                    .map(EmployeePayroll::getEmployeeId)
//                    .toList();
//
//            List<UUID> payrollIds = employeePayrolls.stream()
//                    .map(EmployeePayroll::getId)
//                    .toList();
//
//            // 2. BULK FETCH: Get all attendance records for ALL employees in range
//            List<Attendance> allAttendances = attendanceRepository
//                    .findByEmployeeIdInAndDateBetween( // You need to add this method to Repo
//                            employeeIds,
//                            payroll.getStartDate(),
//                            payroll.getEndDate()
//                    );
//
//            // 3. BULK FETCH: Get all snapshots for ALL employees
//            List<PayrollAttendanceSnapshot> allSnapshots = snapshotRepository
//                    .findByEmployeePayrollIdIn(payrollIds); // You need to add this method to Repo
//
//            // 4. Map snapshots for fast lookup: EmployeePayrollID + Date -> Snapshot
//            // We use a String key or a nested Map to lookup efficiently
//            Map<String, PayrollAttendanceSnapshot> snapshotMap = allSnapshots.stream()
//                    .collect(Collectors.toMap(
//                            s -> s.getEmployeePayroll().getId() + "_" + s.getAttendanceDate(),
//                            s -> s
//                    ));
//
//            List<PayrollAttendanceSnapshot> toSave = new ArrayList<>();
//
//            // 5. Match Overtime
//            for (Attendance att : allAttendances) {
//                // Find the matching EmployeePayroll ID for this attendance's employee
//                // (Assuming you can map back easily, otherwise map employeeId -> employeePayrollId first)
//                UUID empPayrollId = employeePayrolls.stream()
//                        .filter(ep -> ep.getEmployeeId().equals(att.getEmployee().getId()))
//                        .findFirst()
//                        .map(EmployeePayroll::getId)
//                        .orElse(null);
//
//                if (empPayrollId != null) {
//                    String key = empPayrollId + "_" + att.getDate(); // Match the map key
//                    PayrollAttendanceSnapshot snapshot = snapshotMap.get(key);
//
//                    if (snapshot != null && att.getOvertimeHours() != null && att.getOvertimeHours() > 0) {
//                        snapshot.setOvertimeHours(BigDecimal.valueOf(att.getOvertimeHours())
//                                .setScale(2, RoundingMode.HALF_UP));
//                        toSave.add(snapshot);
//                    }
//                }
//            }
//
//            // 6. Bulk Save
//            if (!toSave.isEmpty()) {
//                snapshotRepository.saveAll(toSave);
//            }
//
//            log.info("✅ Updated overtime in {} snapshots", toSave.size());
//
//        } catch (Exception e) {
//            log.error("❌ Error updating overtime: {}", e.getMessage(), e);
//            throw new RuntimeException("Failed to update overtime in snapshots", e);
//        }
//    }
}