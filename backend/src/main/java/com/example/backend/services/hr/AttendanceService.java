package com.example.backend.services.hr;

import com.example.backend.dto.hr.AttendanceDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.AttendanceStatus;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    /**
     * Record attendance based on employee's contract type
     */
    @Transactional
    public AttendanceDTO recordAttendance(AttendanceDTO attendanceDTO) {
        Employee employee = employeeRepository.findById(attendanceDTO.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        JobPosition jobPosition = employee.getJobPosition();
        if (jobPosition == null) {
            throw new RuntimeException("Employee has no job position assigned");
        }

        // Determine contract type from job position
        Attendance.ContractType contractType = Attendance.ContractType.valueOf(
                jobPosition.getContractType().name()
        );

        // Check if attendance already exists for this date
        Optional<Attendance> existingAttendance = attendanceRepository
                .findByEmployeeIdAndDate(employee.getId(), attendanceDTO.getDate());

        Attendance attendance;
        if (existingAttendance.isPresent()) {
            attendance = existingAttendance.get();
            updateExistingAttendance(attendance, attendanceDTO, contractType);
        } else {
            attendance = createNewAttendance(employee, attendanceDTO, contractType);
        }

        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }

    private Attendance createNewAttendance(Employee employee, AttendanceDTO dto,
                                           Attendance.ContractType contractType) {
        Attendance attendance = Attendance.builder()
                .employee(employee)
                .date(dto.getDate())
                .contractType(contractType)
                .notes(dto.getNotes())
                .location(dto.getLocation())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .isHoliday(dto.getIsHoliday())
                .isLeave(dto.getIsLeave())
                .build();

        setContractSpecificFields(attendance, dto, contractType);
        return attendance;
    }

    private void updateExistingAttendance(Attendance attendance, AttendanceDTO dto,
                                          Attendance.ContractType contractType) {
        // Update common fields
        if (dto.getNotes() != null) attendance.setNotes(dto.getNotes());
        if (dto.getLocation() != null) attendance.setLocation(dto.getLocation());
        if (dto.getLatitude() != null) attendance.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) attendance.setLongitude(dto.getLongitude());

        setContractSpecificFields(attendance, dto, contractType);
    }

    private void setContractSpecificFields(Attendance attendance, AttendanceDTO dto,
                                           Attendance.ContractType contractType) {
        switch (contractType) {
            case HOURLY:
                if (dto.getCheckInTime() != null) {
                    attendance.setCheckInTime(dto.getCheckInTime());
                }
                if (dto.getCheckOutTime() != null) {
                    attendance.setCheckOutTime(dto.getCheckOutTime());
                }
                if (dto.getBreakDurationMinutes() != null) {
                    attendance.setBreakDurationMinutes(dto.getBreakDurationMinutes());
                }
                break;

            case DAILY:
                if (dto.getDailyStatus() != null) {
                    attendance.setDailyStatus(dto.getDailyStatus());
                }
                break;

            case MONTHLY:
                if (dto.getStatus() != null) {
                    attendance.setStatus(dto.getStatus());
                }
                break;
        }
    }

    /**
     * Check in an hourly employee
     */
    @Transactional
    public AttendanceDTO checkIn(UUID employeeId, LocalTime checkInTime,
                                 String location, Double latitude, Double longitude) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (!employee.getJobPosition().getContractType().equals(JobPosition.ContractType.HOURLY)) {
            throw new RuntimeException("Check-in is only available for hourly employees");
        }

        LocalDate today = LocalDate.now();

        // Check if already checked in today
        Optional<Attendance> existingAttendance = attendanceRepository
                .findByEmployeeIdAndDate(employeeId, today);

        Attendance attendance;
        if (existingAttendance.isPresent()) {
            attendance = existingAttendance.get();
            if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() == null) {
                throw new RuntimeException("Employee is already checked in");
            }
            attendance.setCheckInTime(checkInTime);
            attendance.setCheckOutTime(null); // Reset checkout for new checkin
        } else {
            attendance = Attendance.builder()
                    .employee(employee)
                    .date(today)
                    .contractType(Attendance.ContractType.HOURLY)
                    .checkInTime(checkInTime)
                    .location(location)
                    .latitude(latitude)
                    .longitude(longitude)
                    .build();
        }

        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }

    /**
     * Check out an hourly employee
     */
    @Transactional
    public AttendanceDTO checkOut(UUID employeeId, LocalTime checkOutTime) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        LocalDate today = LocalDate.now();
        Attendance attendance = attendanceRepository
                .findByEmployeeIdAndDate(employeeId, today)
                .orElseThrow(() -> new RuntimeException("No check-in record found for today"));

        if (attendance.getCheckInTime() == null) {
            throw new RuntimeException("Employee has not checked in today");
        }

        if (attendance.getCheckOutTime() != null) {
            throw new RuntimeException("Employee has already checked out today");
        }

        attendance.setCheckOutTime(checkOutTime);
        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }

    /**
     * Mark daily attendance for daily contract employees
     */
    @Transactional
    public AttendanceDTO markDailyAttendance(UUID employeeId, LocalDate date,
                                             Attendance.DailyAttendanceStatus status, String notes) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (!employee.getJobPosition().getContractType().equals(JobPosition.ContractType.DAILY)) {
            throw new RuntimeException("Daily attendance marking is only available for daily contract employees");
        }

        Optional<Attendance> existingAttendance = attendanceRepository
                .findByEmployeeIdAndDate(employeeId, date);

        Attendance attendance;
        if (existingAttendance.isPresent()) {
            attendance = existingAttendance.get();
            attendance.setDailyStatus(status);
            if (notes != null) attendance.setNotes(notes);
        } else {
            attendance = Attendance.builder()
                    .employee(employee)
                    .date(date)
                    .contractType(Attendance.ContractType.DAILY)
                    .dailyStatus(status)
                    .notes(notes)
                    .build();
        }

        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }

    /**
     * Generate monthly attendance for monthly contract employees
     */
    @Transactional
    public List<AttendanceDTO> generateMonthlyAttendance(UUID employeeId, int year, int month) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (!employee.getJobPosition().getContractType().equals(JobPosition.ContractType.MONTHLY)) {
            throw new RuntimeException("Monthly attendance generation is only available for monthly contract employees");
        }

        List<LocalDate> workingDates = generateWorkingDatesForMonth(year, month);
        List<Attendance> attendances = new ArrayList<>();

        for (LocalDate date : workingDates) {
            Optional<Attendance> existing = attendanceRepository.findByEmployeeIdAndDate(employeeId, date);

            if (existing.isEmpty()) {
                Attendance attendance = Attendance.builder()
                        .employee(employee)
                        .date(date)
                        .contractType(Attendance.ContractType.MONTHLY)
                        .status(AttendanceStatus.ABSENT) // Default to absent
                        .isHoliday(false)
                        .isLeave(false)
                        .build();
                attendances.add(attendance);
            }
        }

        List<Attendance> savedAttendances = attendanceRepository.saveAll(attendances);
        return savedAttendances.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get attendance records by employee and date range
     */
    public List<AttendanceDTO> getAttendanceByEmployeeAndDateRange(UUID employeeId,
                                                                   LocalDate startDate,
                                                                   LocalDate endDate) {
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndDateBetween(employeeId, startDate, endDate);

        return attendances.stream()
                .map(this::convertToDTO)
                .sorted(Comparator.comparing(AttendanceDTO::getDate).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Get monthly attendance summary for an employee
     */
    public Map<String, Object> getMonthlyAttendanceSummary(UUID employeeId, int year, int month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndDateBetween(employeeId, startDate, endDate);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return generateAttendanceSummary(employee, attendances, startDate, endDate);
    }

    /**
     * Get daily attendance summary for all employees
     */
    public Map<String, Object> getDailyAttendanceSummary(LocalDate date) {
        List<Employee> allEmployees = employeeRepository.findAll();
        Map<String, Object> summary = new HashMap<>();

        Map<String, List<AttendanceDTO>> categorizedAttendance = new HashMap<>();
        categorizedAttendance.put("present", new ArrayList<>());
        categorizedAttendance.put("absent", new ArrayList<>());
        categorizedAttendance.put("late", new ArrayList<>());
        categorizedAttendance.put("checkedIn", new ArrayList<>());

        for (Employee employee : allEmployees) {
            Optional<Attendance> attendance = attendanceRepository
                    .findByEmployeeIdAndDate(employee.getId(), date);

            AttendanceDTO dto = attendance.map(this::convertToDTO)
                    .orElse(createAbsentRecord(employee, date));

            categorizeAttendance(dto, categorizedAttendance);
        }

        summary.putAll(categorizedAttendance);
        summary.put("totalEmployees", allEmployees.size());
        summary.put("date", date);

        return summary;
    }

    /**
     * Update attendance status (for monthly employees)
     */
    @Transactional
    public AttendanceDTO updateAttendanceStatus(UUID attendanceId, AttendanceStatus status) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        if (attendance.getContractType() != Attendance.ContractType.MONTHLY) {
            throw new RuntimeException("Status update is only available for monthly contract employees");
        }

        attendance.setStatus(status);
        attendance = attendanceRepository.save(attendance);
        return convertToDTO(attendance);
    }

    /**
     * Get attendance statistics for an employee
     */
    public Map<String, Object> getAttendanceStatistics(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndDateBetween(employeeId, startDate, endDate);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return generateAttendanceStatistics(employee, attendances, startDate, endDate);
    }

    // Helper methods
    private List<LocalDate> generateWorkingDatesForMonth(int year, int month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<LocalDate> workingDates = new ArrayList<>();
        LocalDate currentDate = startDate;

        while (!currentDate.isAfter(endDate)) {
            // Exclude weekends (Friday and Saturday in some regions, Saturday and Sunday in others)
            if (currentDate.getDayOfWeek() != DayOfWeek.FRIDAY &&
                    currentDate.getDayOfWeek() != DayOfWeek.SATURDAY) {
                workingDates.add(currentDate);
            }
            currentDate = currentDate.plusDays(1);
        }

        return workingDates;
    }

    private AttendanceDTO convertToDTO(Attendance attendance) {
        AttendanceDTO dto = AttendanceDTO.builder()
                .id(attendance.getId())
                .employeeId(attendance.getEmployee().getId())
                .employeeName(attendance.getEmployee().getFullName())
                .date(attendance.getDate())
                .contractType(attendance.getContractType())
                .checkInTime(attendance.getCheckInTime())
                .checkOutTime(attendance.getCheckOutTime())
                .breakDurationMinutes(attendance.getBreakDurationMinutes())
                .hoursWorked(attendance.getHoursWorked())
                .overtimeHours(attendance.getOvertimeHours())
                .regularHours(attendance.getRegularHours())
                .isLate(attendance.getIsLate())
                .lateMinutes(attendance.getLateMinutes())
                .dailyStatus(attendance.getDailyStatus())
                .status(attendance.getStatus())
                .notes(attendance.getNotes())
                .isHoliday(attendance.getIsHoliday())
                .isLeave(attendance.getIsLeave())
                .location(attendance.getLocation())
                .latitude(attendance.getLatitude())
                .longitude(attendance.getLongitude())
                .dailyEarnings(attendance.getDailyEarnings())
                .build();

        dto.formatDisplayFields();
        dto.validateRecord();
        return dto;
    }

    private AttendanceDTO createAbsentRecord(Employee employee, LocalDate date) {
        JobPosition.ContractType contractType = employee.getJobPosition() != null
                ? employee.getJobPosition().getContractType()
                : JobPosition.ContractType.MONTHLY;

        return AttendanceDTO.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .date(date)
                .contractType(Attendance.ContractType.valueOf(contractType.name()))
                .status(AttendanceStatus.ABSENT)
                .dailyStatus(Attendance.DailyAttendanceStatus.ABSENT)
                .build();
    }

    private void categorizeAttendance(AttendanceDTO dto, Map<String, List<AttendanceDTO>> categorized) {
        String displayStatus = dto.getDisplayStatus();

        switch (displayStatus) {
            case "PRESENT":
            case "PRESENT_LATE":
                categorized.get("present").add(dto);
                if ("PRESENT_LATE".equals(displayStatus)) {
                    categorized.get("late").add(dto);
                }
                break;
            case "CHECKED_IN":
                categorized.get("checkedIn").add(dto);
                break;
            case "ABSENT":
            default:
                categorized.get("absent").add(dto);
                break;
        }
    }

    private Map<String, Object> generateAttendanceSummary(Employee employee, List<Attendance> attendances,
                                                          LocalDate startDate, LocalDate endDate) {
        Map<String, Object> summary = new HashMap<>();

        JobPosition.ContractType contractType = employee.getJobPosition().getContractType();

        summary.put("employeeId", employee.getId());
        summary.put("employeeName", employee.getFullName());
        summary.put("contractType", contractType);
        summary.put("startDate", startDate);
        summary.put("endDate", endDate);
        summary.put("totalRecords", attendances.size());

        switch (contractType) {
            case HOURLY:
                generateHourlySummary(summary, attendances);
                break;
            case DAILY:
                generateDailySummary(summary, attendances);
                break;
            case MONTHLY:
                generateMonthlySummary(summary, attendances);
                break;
        }

        return summary;
    }

    private void generateHourlySummary(Map<String, Object> summary, List<Attendance> attendances) {
        double totalHours = 0;
        double totalOvertimeHours = 0;
        int daysWorked = 0;
        int lateDays = 0;
        double totalEarnings = 0;

        for (Attendance attendance : attendances) {
            if (attendance.getHoursWorked() != null) {
                totalHours += attendance.getHoursWorked();
                daysWorked++;
            }
            if (attendance.getOvertimeHours() != null) {
                totalOvertimeHours += attendance.getOvertimeHours();
            }
            if (attendance.getIsLate() != null && attendance.getIsLate()) {
                lateDays++;
            }
            if (attendance.getDailyEarnings() != null) {
                totalEarnings += attendance.getDailyEarnings();
            }
        }

        summary.put("totalHours", Math.round(totalHours * 100.0) / 100.0);
        summary.put("totalOvertimeHours", Math.round(totalOvertimeHours * 100.0) / 100.0);
        summary.put("averageHoursPerDay", daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100.0) / 100.0 : 0);
        summary.put("daysWorked", daysWorked);
        summary.put("lateDays", lateDays);
        summary.put("totalEarnings", Math.round(totalEarnings * 100.0) / 100.0);
    }

    private void generateDailySummary(Map<String, Object> summary, List<Attendance> attendances) {
        long presentDays = attendances.stream()
                .filter(a -> a.getDailyStatus() == Attendance.DailyAttendanceStatus.PRESENT)
                .count();
        long absentDays = attendances.stream()
                .filter(a -> a.getDailyStatus() == Attendance.DailyAttendanceStatus.ABSENT)
                .count();
        long leaveDays = attendances.stream()
                .filter(a -> a.getDailyStatus() == Attendance.DailyAttendanceStatus.LEAVE)
                .count();

        double totalEarnings = attendances.stream()
                .filter(a -> a.getDailyEarnings() != null)
                .mapToDouble(Attendance::getDailyEarnings)
                .sum();

        summary.put("presentDays", presentDays);
        summary.put("absentDays", absentDays);
        summary.put("leaveDays", leaveDays);
        summary.put("attendancePercentage",
                attendances.size() > 0 ? Math.round((presentDays * 100.0 / attendances.size()) * 100.0) / 100.0 : 0);
        summary.put("totalEarnings", Math.round(totalEarnings * 100.0) / 100.0);
    }

    private void generateMonthlySummary(Map<String, Object> summary, List<Attendance> attendances) {
        Map<AttendanceStatus, Long> statusCounts = attendances.stream()
                .filter(a -> a.getStatus() != null)
                .collect(Collectors.groupingBy(Attendance::getStatus, Collectors.counting()));

        summary.put("statusCounts", statusCounts);
        summary.put("presentDays", statusCounts.getOrDefault(AttendanceStatus.PRESENT, 0L));
        summary.put("absentDays", statusCounts.getOrDefault(AttendanceStatus.ABSENT, 0L));
        summary.put("lateDays", statusCounts.getOrDefault(AttendanceStatus.LATE, 0L));
        summary.put("leaveDays", statusCounts.getOrDefault(AttendanceStatus.ON_LEAVE, 0L));

        long presentDays = statusCounts.getOrDefault(AttendanceStatus.PRESENT, 0L);
        summary.put("attendancePercentage",
                attendances.size() > 0 ? Math.round((presentDays * 100.0 / attendances.size()) * 100.0) / 100.0 : 0);
    }

    private Map<String, Object> generateAttendanceStatistics(Employee employee, List<Attendance> attendances,
                                                             LocalDate startDate, LocalDate endDate) {
        Map<String, Object> stats = generateAttendanceSummary(employee, attendances, startDate, endDate);

        // Add additional statistics
        stats.put("totalDays", attendances.size());
        stats.put("dateRange", Map.of("start", startDate, "end", endDate));

        return stats;
    }
}