package com.example.backend.services.hr;

import com.example.backend.dto.hr.attendance.AttendanceRequestDTO;
import com.example.backend.dto.hr.attendance.AttendanceResponseDTO;
import com.example.backend.dto.hr.attendance.BulkAttendanceDTO;
import com.example.backend.dto.hr.employee.EmployeeMonthlyAttendanceDTO;
import com.example.backend.dto.hr.attendance.DailyAttendanceDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationService notificationService;

    /**
     * Generate monthly attendance sheet for a site
     */
    @Transactional
    public List<EmployeeMonthlyAttendanceDTO> generateMonthlyAttendanceSheet(UUID siteId, int year, int month) {
        log.info("Generating monthly attendance sheet for site: {} for {}/{}", siteId, month, year);

        try {
            // Get all active employees for the site
            List<Employee> employees = employeeRepository.findBySiteId(siteId).stream()
                    .filter(emp -> "ACTIVE".equalsIgnoreCase(emp.getStatus()))
                    .collect(Collectors.toList());

            YearMonth yearMonth = YearMonth.of(year, month);
            LocalDate startDate = yearMonth.atDay(1);
            LocalDate endDate = yearMonth.atEndOfMonth();

            List<EmployeeMonthlyAttendanceDTO> monthlySheets = new ArrayList<>();

            for (Employee employee : employees) {
                // Get existing attendance records for the month
                List<Attendance> existingAttendance = attendanceRepository.findByEmployeeIdAndDateRange(
                        employee.getId(), startDate, endDate
                );

                // Create attendance map for quick lookup
                Map<LocalDate, Attendance> attendanceMap = existingAttendance.stream()
                        .collect(Collectors.toMap(Attendance::getDate, a -> a));

                // Generate or update attendance for each day
                List<DailyAttendanceDTO> dailyAttendance = new ArrayList<>();
                LocalDate currentDate = startDate;

                while (!currentDate.isAfter(endDate)) {
                    Attendance attendance = attendanceMap.get(currentDate);

                    if (attendance == null && employee.getJobPosition() != null) {
                        // Create new attendance record based on contract type
                        attendance = createDefaultAttendance(employee, currentDate);
                        attendance = attendanceRepository.save(attendance);
                        // Send notification to HR users about sheet generation

                    }

                    if (attendance != null) {
                        dailyAttendance.add(convertToDailyDTO(attendance));
                    }

                    currentDate = currentDate.plusDays(1);
                }

                // Create monthly DTO
                EmployeeMonthlyAttendanceDTO monthlyDTO = buildMonthlyAttendanceDTO(employee, dailyAttendance, yearMonth);
                monthlySheets.add(monthlyDTO);
            }



            return monthlySheets;

        } catch (Exception e) {
            log.error("Error generating monthly attendance sheet", e);

            // Send error notification to HR users
            notificationService.sendNotificationToHRUsers(
                    "Attendance Sheet Generation Failed",
                    "Failed to generate monthly attendance sheet for " + month + "/" + year + ": " + e.getMessage(),
                    NotificationType.ERROR,
                    "/attendance/monthly",
                    "attendance-error-" + siteId + "-" + year + "-" + month
            );

            throw e;
        }
    }

    /**
     * Create default attendance record based on contract type and day
     */
    private Attendance createDefaultAttendance(Employee employee, LocalDate date) {
        JobPosition jobPosition = employee.getJobPosition();
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .date(date)
                .build();

        // Determine if it's a working day
        boolean isWeekend = (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.FRIDAY);

        if (isWeekend) {
            attendance.setDayType(Attendance.DayType.WEEKEND);
            attendance.setStatus(Attendance.AttendanceStatus.OFF);
        } else {
            attendance.setDayType(Attendance.DayType.WORKING_DAY);
            attendance.setStatus(Attendance.AttendanceStatus.ABSENT); // Default to absent
        }

        // Set expected hours for HOURLY employees
        if (jobPosition.getContractType() == JobPosition.ContractType.HOURLY) {
            if (!isWeekend && jobPosition.getHoursPerShift() != null) {
                attendance.setExpectedHours(jobPosition.getHoursPerShift().doubleValue());
            }
        }

        return attendance;
    }

    /**
     * Update attendance for a single employee and date
     */
    @Transactional
    public AttendanceResponseDTO updateAttendance(AttendanceRequestDTO requestDTO) {
        log.info("Updating attendance for employee: {} on date: {}", requestDTO.getEmployeeId(), requestDTO.getDate());

        try {
            // Find the employee
            Employee employee = employeeRepository.findById(requestDTO.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + requestDTO.getEmployeeId()));

            // Find or create attendance record
            Attendance attendance = attendanceRepository.findByEmployeeIdAndDate(
                    requestDTO.getEmployeeId(), requestDTO.getDate()
            ).orElseGet(() -> {
                Attendance newAttendance = new Attendance();
                newAttendance.setEmployee(employee);
                newAttendance.setDate(requestDTO.getDate());
                newAttendance.setDayType(determineDayType(requestDTO.getDate()));
                return newAttendance;
            });

            Attendance.AttendanceStatus oldStatus = attendance.getStatus();

            // Update attendance based on contract type
            updateAttendanceByContractType(attendance, requestDTO, employee);

            // Save and return
            Attendance savedAttendance = attendanceRepository.save(attendance);

            // Send notifications for significant status changes
            sendAttendanceNotifications(employee, savedAttendance, oldStatus);

            return convertToResponseDTO(savedAttendance);

        } catch (Exception e) {
            log.error("Error updating attendance", e);

            // Send error notification to HR users
            notificationService.sendNotificationToHRUsers(
                    "Attendance Update Failed",
                    "Failed to update attendance for employee: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/attendance",
                    "attendance-error-" + requestDTO.getEmployeeId()
            );

            throw e;
        }
    }

    /**
     * Send notifications for attendance status changes
     */
    private void sendAttendanceNotifications(Employee employee, Attendance attendance, Attendance.AttendanceStatus oldStatus) {
        String employeeName = employee.getFullName();
        String date = attendance.getDate().toString();

        // Notify HR for significant status changes
        if (oldStatus != attendance.getStatus()) {
            switch (attendance.getStatus()) {
                case ABSENT:
                    if (oldStatus == Attendance.AttendanceStatus.PRESENT || oldStatus == null) {
                        notificationService.sendNotificationToHRUsers(
                                "Employee Marked Absent",
                                employeeName + " has been marked as absent on " + date,
                                NotificationType.WARNING,
                                "/attendance/employee/" + employee.getId(),
                                "absent-" + employee.getId() + "-" + date
                        );
                    }
                    break;

                case LATE:
                    notificationService.sendNotificationToHRUsers(
                            "Employee Late",
                            employeeName + " arrived late on " + date,
                            NotificationType.WARNING,
                            "/attendance/employee/" + employee.getId(),
                            "late-" + employee.getId() + "-" + date
                    );
                    break;

                case ON_LEAVE:
                    if (attendance.getLeaveApproved() == null || !attendance.getLeaveApproved()) {
                        notificationService.sendNotificationToHRUsers(
                                "Leave Approval Required",
                                employeeName + " has requested leave on " + date + " - approval needed",
                                NotificationType.INFO,
                                "/attendance/leave-requests",
                                "leave-request-" + employee.getId() + "-" + date
                        );
                    }
                    break;
            }
        }

        // Check for overtime and notify
        if (attendance.getOvertimeHours() != null && attendance.getOvertimeHours() > 0) {
            notificationService.sendNotificationToHRUsers(
                    "Overtime Recorded",
                    employeeName + " worked " + attendance.getOvertimeHours() + " hours overtime on " + date,
                    NotificationType.INFO,
                    "/attendance/overtime",
                    "overtime-" + employee.getId() + "-" + date
            );
        }
    }

    /**
     * Bulk update attendance for multiple employees
     */
    @Transactional
    public List<AttendanceResponseDTO> bulkUpdateAttendance(BulkAttendanceDTO bulkDTO) {
        log.info("Bulk updating attendance for {} employees", bulkDTO.getAttendanceRecords().size());

        List<AttendanceResponseDTO> responses = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (AttendanceRequestDTO record : bulkDTO.getAttendanceRecords()) {
            try {
                // CRITICAL FIX: Don't overwrite the date if it's already set in the record
                // Only set the date from bulkDTO if the record doesn't have one
                if (record.getDate() == null && bulkDTO.getDate() != null) {
                    record.setDate(bulkDTO.getDate());
                }

                // Validate that we have a date before proceeding
                if (record.getDate() == null) {
                    log.error("No date provided for employee: {} in bulk update", record.getEmployeeId());
                    throw new RuntimeException("Date is required for attendance record for employee: " + record.getEmployeeId());
                }

                AttendanceResponseDTO response = updateAttendance(record);
                responses.add(response);
            } catch (Exception e) {
                log.error("Error updating attendance for employee: {}", record.getEmployeeId(), e);
                errors.add("Employee " + record.getEmployeeId() + ": " + e.getMessage());
            }
        }

        // Send notification about bulk update results
        if (!errors.isEmpty()) {
            notificationService.sendNotificationToHRUsers(
                    "Bulk Attendance Update Completed with Errors",
                    "Bulk attendance update completed. " + responses.size() + " successful, " + errors.size() + " errors occurred.",
                    NotificationType.WARNING,
                    "/attendance/bulk-update",
                    "bulk-update-" + System.currentTimeMillis()
            );
        } else {
            notificationService.sendNotificationToHRUsers(
                    "Bulk Attendance Update Completed",
                    "Successfully updated attendance for " + responses.size() + " employees",
                    NotificationType.SUCCESS,
                    "/attendance",
                    "bulk-update-success-" + System.currentTimeMillis()
            );
        }

        return responses;
    }

    /**
     * Get monthly attendance view for employees
     */
    public List<EmployeeMonthlyAttendanceDTO> getMonthlyAttendance(UUID siteId, int year, int month) {
        log.info("Fetching monthly attendance for site: {} for {}/{}", siteId, month, year);

        // First generate/ensure attendance records exist
        List<EmployeeMonthlyAttendanceDTO> monthlyAttendance = generateMonthlyAttendanceSheet(siteId, year, month);

        return monthlyAttendance;
    }

    /**
     * Update attendance based on contract type
     */
    private void updateAttendanceByContractType(Attendance attendance, AttendanceRequestDTO requestDTO, Employee employee) {
        JobPosition jobPosition = employee.getJobPosition();
        if (jobPosition == null) {
            throw new RuntimeException("Employee has no job position assigned");
        }

        // Update status if provided
        if (requestDTO.getStatus() != null) {
            try {
                attendance.setStatus(Attendance.AttendanceStatus.valueOf(requestDTO.getStatus()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status provided: {}", requestDTO.getStatus());
            }
        }

        JobPosition.ContractType contractType = jobPosition.getContractType();

        switch (contractType) {
            case MONTHLY:
                // For MONTHLY (Full-time), track status and optionally time
                if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT ||
                        attendance.getStatus() == Attendance.AttendanceStatus.LATE ||
                        attendance.getStatus() == Attendance.AttendanceStatus.HALF_DAY) {

                    attendance.setCheckIn(requestDTO.getCheckIn());
                    attendance.setCheckOut(requestDTO.getCheckOut());

                    // Determine if late based on JobPosition's start time
                    if (requestDTO.getCheckIn() != null) {
                        LocalTime expectedCheckIn = getExpectedStartTime(jobPosition);
                        LocalTime lateThreshold = expectedCheckIn.plusMinutes(15); // 15 minutes grace period

                        if (requestDTO.getCheckIn().isAfter(lateThreshold)) {
                            attendance.setStatus(Attendance.AttendanceStatus.LATE);
                            log.info("Employee {} marked as LATE. Expected: {}, Actual: {}, Threshold: {}",
                                    employee.getId(), expectedCheckIn, requestDTO.getCheckIn(), lateThreshold);
                        }
                    }

                    // Calculate expected and actual working hours for monthly employees
                    if (requestDTO.getCheckIn() != null && requestDTO.getCheckOut() != null) {
                        double actualHours = calculateWorkingHours(requestDTO.getCheckIn(), requestDTO.getCheckOut());
                        attendance.setHoursWorked(actualHours);

                        // Set expected hours from job position
                        Integer expectedHours = jobPosition.getWorkingHours();
                        if (expectedHours != null) {
                            attendance.setExpectedHours(expectedHours.doubleValue());

                            // Calculate overtime for monthly employees if they work more than expected
                            double overtime = actualHours - expectedHours;
                            attendance.setOvertimeHours(overtime > 0 ? overtime : 0.0);
                        }
                    }
                }
                break;

            case HOURLY:
                // For HOURLY, track hours worked with more precision
                if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                    attendance.setHoursWorked(requestDTO.getHoursWorked());

                    // Calculate overtime if applicable
                    if (attendance.getExpectedHours() != null && requestDTO.getHoursWorked() != null) {
                        double overtime = requestDTO.getHoursWorked() - attendance.getExpectedHours();
                        attendance.setOvertimeHours(overtime > 0 ? overtime : 0.0);
                    }

                    // Track check-in/out for hourly workers
                    attendance.setCheckIn(requestDTO.getCheckIn());
                    attendance.setCheckOut(requestDTO.getCheckOut());

                    // Check if hourly worker is late (they might have fixed schedules too)
                    if (requestDTO.getCheckIn() != null) {
                        LocalTime expectedCheckIn = getExpectedStartTime(jobPosition);
                        LocalTime lateThreshold = expectedCheckIn.plusMinutes(15);

                        if (requestDTO.getCheckIn().isAfter(lateThreshold)) {
                            attendance.setStatus(Attendance.AttendanceStatus.LATE);
                            log.info("Hourly employee {} marked as LATE. Expected: {}, Actual: {}",
                                    employee.getId(), expectedCheckIn, requestDTO.getCheckIn());
                        }
                    }
                }
                break;

            case DAILY:
                // For DAILY, simple status tracking with late detection
                if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                    // Daily workers work full day if present
                    attendance.setHoursWorked(8.0); // Standard 8 hours

                    // Check if daily worker is late
                    if (requestDTO.getCheckIn() != null) {
                        LocalTime expectedCheckIn = getExpectedStartTime(jobPosition);
                        LocalTime lateThreshold = expectedCheckIn.plusMinutes(15);

                        if (requestDTO.getCheckIn().isAfter(lateThreshold)) {
                            attendance.setStatus(Attendance.AttendanceStatus.LATE);
                            log.info("Daily employee {} marked as LATE. Expected: {}, Actual: {}",
                                    employee.getId(), expectedCheckIn, requestDTO.getCheckIn());
                        }
                    }

                    attendance.setCheckIn(requestDTO.getCheckIn());
                    attendance.setCheckOut(requestDTO.getCheckOut());
                }
                break;
        }

        // Common fields
        attendance.setNotes(requestDTO.getNotes());

        // Handle leave information
        if (attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE) {
            attendance.setLeaveType(requestDTO.getLeaveType());
            attendance.setLeaveApproved(requestDTO.getLeaveApproved());
        }
    }

    /**
     * Helper method to get the expected start time for an employee based on their job position
     * Falls back to default times if job position doesn't have start time configured
     */
    private LocalTime getExpectedStartTime(JobPosition jobPosition) {
        // Use the job position's start time if available
        if (jobPosition.getStartTime() != null) {
            return jobPosition.getStartTime();
        }

        // Fallback based on contract type and shift information
        JobPosition.ContractType contractType = jobPosition.getContractType();
        String shifts = jobPosition.getShifts();

        if (shifts != null) {
            switch (shifts.toLowerCase()) {
                case "night shift":
                    return LocalTime.of(22, 0); // 10:00 PM
                case "early morning shift":
                    return LocalTime.of(6, 0);  // 6:00 AM
                case "evening shift":
                    return LocalTime.of(14, 0); // 2:00 PM
                case "day shift":
                default:
                    return LocalTime.of(9, 0);  // 9:00 AM
            }
        }

        // Default fallback based on contract type
        switch (contractType) {
            case HOURLY:
                return LocalTime.of(8, 0);  // 8:00 AM for hourly workers
            case DAILY:
                return LocalTime.of(7, 0);  // 7:00 AM for daily workers
            case MONTHLY:
            default:
                return LocalTime.of(9, 0);  // 9:00 AM for monthly workers
        }
    }

    /**
     * Helper method to calculate working hours between check-in and check-out times
     * Handles overnight shifts and break deductions
     */
    private double calculateWorkingHours(LocalTime checkIn, LocalTime checkOut) {
        if (checkIn == null || checkOut == null) {
            return 0.0;
        }

        long minutes;

        // Handle overnight shifts (check-out is next day)
        if (checkOut.isBefore(checkIn)) {
            // Calculate time until midnight + time from midnight to check-out
            minutes = java.time.Duration.between(checkIn, LocalTime.MAX).toMinutes() + 1 +
                    java.time.Duration.between(LocalTime.MIN, checkOut).toMinutes();
        } else {
            // Normal same-day shift
            minutes = java.time.Duration.between(checkIn, checkOut).toMinutes();
        }

        double hours = minutes / 60.0;

        // Deduct standard break time for shifts longer than 6 hours
        if (hours > 6.0) {
            hours -= 1.0; // Deduct 1-hour break
        } else if (hours > 4.0) {
            hours -= 0.5; // Deduct 30-minute break
        }

        return Math.round(hours * 100.0) / 100.0; // Round to 2 decimal places
    }

    /**
     * Helper method to determine if an employee should be marked as late
     * Can be used for additional late-checking logic
     */
    private boolean isEmployeeLate(LocalTime checkIn, LocalTime expectedStartTime, int graceMinutes) {
        if (checkIn == null || expectedStartTime == null) {
            return false;
        }

        LocalTime lateThreshold = expectedStartTime.plusMinutes(graceMinutes);
        return checkIn.isAfter(lateThreshold);
    }

    /**
     * Enhanced method that also considers job position's break settings for hourly workers
     */
    private double calculateWorkingHoursWithBreaks(LocalTime checkIn, LocalTime checkOut, JobPosition jobPosition) {
        double baseHours = calculateWorkingHours(checkIn, checkOut);

        // For hourly workers with break tracking enabled
        if (jobPosition.getContractType() == JobPosition.ContractType.HOURLY &&
                Boolean.TRUE.equals(jobPosition.getTrackBreaks()) &&
                jobPosition.getBreakDurationMinutes() != null) {

            // Deduct configured break time
            double breakHours = jobPosition.getBreakDurationMinutes() / 60.0;
            baseHours = Math.max(0, baseHours - breakHours);
        }

        return Math.round(baseHours * 100.0) / 100.0;
    }

    /**
     * Determine day type based on date
     */
    private Attendance.DayType determineDayType(LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();

        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            return Attendance.DayType.WEEKEND;
        }

        // TODO: Check for public holidays from a holiday calendar

        return Attendance.DayType.WORKING_DAY;
    }

    /**
     * Build monthly attendance DTO
     */
    private EmployeeMonthlyAttendanceDTO buildMonthlyAttendanceDTO(
            Employee employee,
            List<DailyAttendanceDTO> dailyAttendance,
            YearMonth yearMonth) {

        JobPosition jobPosition = employee.getJobPosition();

        // Calculate summary statistics
        long presentDays = dailyAttendance.stream()
                .filter(d -> d.getStatus() != null && d.getStatus().startsWith("PRESENT"))
                .count();

        long absentDays = dailyAttendance.stream()
                .filter(d -> "ABSENT".equals(d.getStatus()))
                .count();

        long leaveDays = dailyAttendance.stream()
                .filter(d -> "ON_LEAVE".equals(d.getStatus()))
                .count();

        long offDays = dailyAttendance.stream()
                .filter(d -> "OFF".equals(d.getStatus()))
                .count();

        double totalHours = dailyAttendance.stream()
                .mapToDouble(d -> d.getHoursWorked() != null ? d.getHoursWorked() : 0.0)
                .sum();

        double overtimeHours = dailyAttendance.stream()
                .mapToDouble(d -> d.getOvertimeHours() != null ? d.getOvertimeHours() : 0.0)
                .sum();

        return EmployeeMonthlyAttendanceDTO.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .employeePhoto(employee.getPhotoUrl())
                .jobPosition(jobPosition != null ? jobPosition.getPositionName() : "N/A")
                .department(jobPosition != null && jobPosition.getDepartment() != null ?
                        jobPosition.getDepartment().getName() : "N/A")
                .contractType(jobPosition != null && jobPosition.getContractType() != null ?
                        jobPosition.getContractType().name() : "MONTHLY")
                .year(yearMonth.getYear())
                .month(yearMonth.getMonthValue())
                .dailyAttendance(dailyAttendance)
                .totalDays(dailyAttendance.size())
                .presentDays((int) presentDays)
                .absentDays((int) absentDays)
                .leaveDays((int) leaveDays)
                .offDays((int) offDays)
                .totalHours(totalHours)
                .overtimeHours(overtimeHours)
                .attendancePercentage(calculateAttendancePercentage(presentDays, dailyAttendance.size() - offDays))
                .build();
    }

    /**
     * Convert attendance to daily DTO
     */
    private DailyAttendanceDTO convertToDailyDTO(Attendance attendance) {
        return DailyAttendanceDTO.builder()
                .attendanceId(attendance.getId())
                .date(attendance.getDate())
                .dayOfWeek(attendance.getDate().getDayOfWeek().name())
                .dayType(attendance.getDayType() != null ? attendance.getDayType().name() : null)
                .status(attendance.getStatus() != null ? attendance.getStatus().name() : null)
                .checkIn(attendance.getCheckIn())
                .checkOut(attendance.getCheckOut())
                .hoursWorked(attendance.getHoursWorked())
                .expectedHours(attendance.getExpectedHours())
                .overtimeHours(attendance.getOvertimeHours())
                .leaveType(attendance.getLeaveType())
                .notes(attendance.getNotes())
                .isEditable(!attendance.getDate().isAfter(LocalDate.now()))
                .build();
    }

    /**
     * Get employee attendance history
     */
    public List<Attendance> getEmployeeAttendanceHistory(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching attendance history for employee: {} from {} to {}", employeeId, startDate, endDate);
        return attendanceRepository.findByEmployeeIdAndDateRange(employeeId, startDate, endDate);
    }

    /**
     * Delete attendance record
     */
    @Transactional
    public void deleteAttendance(UUID attendanceId) {
        log.info("Deleting attendance record: {}", attendanceId);

        try {
            attendanceRepository.deleteById(attendanceId);

            // Send notification about deletion
            notificationService.sendNotificationToHRUsers(
                    "Attendance Record Deleted",
                    "An attendance record has been deleted",
                    NotificationType.INFO,
                    "/attendance",
                    "attendance-deleted-" + attendanceId
            );

        } catch (Exception e) {
            log.error("Error deleting attendance record", e);

            notificationService.sendNotificationToHRUsers(
                    "Attendance Deletion Failed",
                    "Failed to delete attendance record: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/attendance",
                    "attendance-delete-error-" + attendanceId
            );

            throw e;
        }
    }

    /**
     * Convert to response DTO
     */
    private AttendanceResponseDTO convertToResponseDTO(Attendance attendance) {
        Employee employee = attendance.getEmployee();
        JobPosition jobPosition = employee.getJobPosition();

        return AttendanceResponseDTO.builder()
                .id(attendance.getId())
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .employeePhoto(employee.getPhotoUrl())
                .jobPosition(jobPosition != null ? jobPosition.getPositionName() : null)
                .department(jobPosition != null && jobPosition.getDepartment() != null ?
                        jobPosition.getDepartment().getName() : null)
                .contractType(jobPosition != null && jobPosition.getContractType() != null ?
                        jobPosition.getContractType().name() : null)
                .date(attendance.getDate())
                .checkIn(attendance.getCheckIn())
                .checkOut(attendance.getCheckOut())
                .hoursWorked(attendance.getHoursWorked())
                .overtimeHours(attendance.getOvertimeHours())
                .status(attendance.getStatus() != null ? attendance.getStatus().name() : null)
                .notes(attendance.getNotes())
                .totalHours(attendance.calculateTotalHours())
                .build();
    }

    /**
     * Calculate attendance percentage
     */
    private double calculateAttendancePercentage(long presentDays, long totalWorkingDays) {
        if (totalWorkingDays <= 0) return 0.0;
        return (double) presentDays / totalWorkingDays * 100.0;
    }

    /**
     * Get employee monthly attendance
     */
    public List<AttendanceResponseDTO> getEmployeeMonthlyAttendance(UUID employeeId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        List<Attendance> attendanceList = attendanceRepository.findByEmployeeIdAndDateRange(employeeId, startDate, endDate);
        return attendanceList.stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }
    public void markLeaveDay(UUID employeeId, LocalDate date, String leaveType, boolean approved) {
        try {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            // Check if attendance record already exists
            Optional<Attendance> existingAttendance = attendanceRepository
                    .findByEmployeeIdAndDate(employeeId, date);

            Attendance attendance;
            if (existingAttendance.isPresent()) {
                attendance = existingAttendance.get();
            } else {
                attendance = Attendance.builder()
                        .employee(employee)
                        .date(date)
                        .dayType(Attendance.DayType.WORKING_DAY)
                        .build();
            }

            // Update attendance for leave
            attendance.setStatus(Attendance.AttendanceStatus.ON_LEAVE);
            attendance.setLeaveType(leaveType);
            attendance.setLeaveApproved(approved);
            attendance.setUpdatedAt(LocalDateTime.now());

            attendanceRepository.save(attendance);
            log.info("Marked {} as {} leave for employee {}", date, leaveType, employeeId);

        } catch (Exception e) {
            log.error("Error marking leave day for employee {} on {}: {}", employeeId, date, e.getMessage());
            throw e;
        }
    }

    /**
     * Remove leave marking from attendance (when leave is cancelled/rejected)
     */
    public void removeLeaveMarking(UUID employeeId, LocalDate date) {
        try {
            Optional<Attendance> attendance = attendanceRepository
                    .findByEmployeeIdAndDate(employeeId, date);

            if (attendance.isPresent()) {
                Attendance record = attendance.get();
                if (record.getStatus() == Attendance.AttendanceStatus.ON_LEAVE) {
                    record.setStatus(Attendance.AttendanceStatus.ABSENT);
                    record.setLeaveType(null);
                    record.setLeaveApproved(null);
                    record.setUpdatedAt(LocalDateTime.now());
                    attendanceRepository.save(record);

                    log.info("Removed leave marking for employee {} on {}", employeeId, date);
                }
            }
        } catch (Exception e) {
            log.error("Error removing leave marking for employee {} on {}: {}", employeeId, date, e.getMessage());
        }
    }
}