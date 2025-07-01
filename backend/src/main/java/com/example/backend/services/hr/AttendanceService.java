package com.example.backend.services.hr;

import com.example.backend.dto.hr.*;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Generate monthly attendance sheet for a site
     */
    @Transactional
    public List<EmployeeMonthlyAttendanceDTO> generateMonthlyAttendanceSheet(UUID siteId, int year, int month) {
        log.info("Generating monthly attendance sheet for site: {} for {}/{}", siteId, month, year);

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
        boolean isWeekend = (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY);

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

        // Update attendance based on contract type
        updateAttendanceByContractType(attendance, requestDTO, employee);

        // Save and return
        Attendance savedAttendance = attendanceRepository.save(attendance);
        return convertToResponseDTO(savedAttendance);
    }

    /**
     * Bulk update attendance for multiple employees
     */
    @Transactional
    public List<AttendanceResponseDTO> bulkUpdateAttendance(BulkAttendanceDTO bulkDTO) {
        log.info("Bulk updating attendance for {} employees",
                bulkDTO.getAttendanceRecords().size());

        List<AttendanceResponseDTO> responses = new ArrayList<>();

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
                // You might want to continue processing other records or throw the exception
                // For now, we'll continue and log the error
            }
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

                    // Determine if late
                    if (requestDTO.getCheckIn() != null) {
                        LocalTime expectedCheckIn = LocalTime.of(9, 0); // 9 AM default
                        if (requestDTO.getCheckIn().isAfter(expectedCheckIn.plusMinutes(15))) {
                            attendance.setStatus(Attendance.AttendanceStatus.LATE);
                        }
                    }
                }
                break;

            case HOURLY:
                // For HOURLY, track hours worked
                if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                    attendance.setHoursWorked(requestDTO.getHoursWorked());

                    // Calculate overtime if applicable
                    if (attendance.getExpectedHours() != null && requestDTO.getHoursWorked() != null) {
                        double overtime = requestDTO.getHoursWorked() - attendance.getExpectedHours();
                        attendance.setOvertimeHours(overtime > 0 ? overtime : 0.0);
                    }

                    // Optionally track check-in/out for hourly as well
                    attendance.setCheckIn(requestDTO.getCheckIn());
                    attendance.setCheckOut(requestDTO.getCheckOut());
                }
                break;

            case DAILY:
                // For DAILY, simple status tracking
                // Status is already set above, no additional fields needed
                if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                    // Daily workers work full day if present
                    attendance.setHoursWorked(8.0); // Standard 8 hours
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
        attendanceRepository.deleteById(attendanceId);
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
}