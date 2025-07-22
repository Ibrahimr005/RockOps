package com.example.backend.services.payroll;

import com.example.backend.dto.hr.attendance.AttendanceData;
import com.example.backend.models.hr.Attendance;
import com.example.backend.services.hr.AttendanceService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Specialized service for payroll-related attendance calculations
 * Leverages the existing HR AttendanceService for data access
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollAttendanceService {
    
    private final AttendanceService hrAttendanceService; // Your existing HR service
    
    /**
     * Get attendance data for payroll calculation using existing HR AttendanceService
     */
    public AttendanceData getAttendanceDataForPeriod(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        log.info("Getting attendance data for payroll calculation - employee {} from {} to {}", 
                employeeId, startDate, endDate);
        
        // Use your existing HR service to get attendance records
        List<Attendance> records = hrAttendanceService.getEmployeeAttendanceHistory(employeeId, startDate, endDate);
        
        // Calculate payroll-specific metrics
        int daysWorked = (int) records.stream()
            .filter(Attendance::isPresent) // Using your model's isPresent() method
            .count();
        
        int daysAbsent = (int) records.stream()
            .filter(r -> r.getStatus() == Attendance.AttendanceStatus.ABSENT)
            .count();
        
        int lateDays = (int) records.stream()
            .filter(r -> r.getStatus() == Attendance.AttendanceStatus.LATE)
            .count();
        
        // Calculate total hours and overtime
        BigDecimal totalHours = records.stream()
            .map(r -> r.getHoursWorked() != null ? BigDecimal.valueOf(r.getHoursWorked()) : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal overtimeHours = records.stream()
            .map(r -> r.getOvertimeHours() != null ? BigDecimal.valueOf(r.getOvertimeHours()) : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate total working days in period
        int totalWorkingDays = calculateWorkingDaysInPeriod(startDate, endDate);
        
        // Use attendance records to get more accurate working days if available
        long recordedWorkingDays = records.stream()
            .filter(Attendance::isWorkingDay) // Using your model's isWorkingDay() method
            .count();
        
        if (recordedWorkingDays > 0) {
            totalWorkingDays = (int) recordedWorkingDays;
        }
        
        log.info("Payroll attendance data - Days worked: {}, Days absent: {}, Late days: {}, Overtime hours: {}, Total hours: {}", 
                daysWorked, daysAbsent, lateDays, overtimeHours, totalHours);
        
        return AttendanceData.builder()
            .daysWorked(daysWorked)
            .daysAbsent(daysAbsent)
            .totalWorkingDays(totalWorkingDays)
            .overtimeHours(overtimeHours)
            .totalHours(totalHours)
            .lateDays(lateDays)
            .build();
    }
    
    /**
     * Calculate working days in period (excluding weekends)
     * This is a fallback when attendance records don't cover the full period
     */
    private int calculateWorkingDaysInPeriod(LocalDate startDate, LocalDate endDate) {
        int workingDays = 0;
        LocalDate current = startDate;
        
        while (!current.isAfter(endDate)) {
            // Monday to Friday (DayOfWeek.MONDAY = 1, FRIDAY = 5)
            if (current.getDayOfWeek().getValue() <= 5) {
                workingDays++;
            }
            current = current.plusDays(1);
        }
        
        return workingDays;
    }
    
    /**
     * Get attendance records for a specific period (delegated to HR service)
     */
    public List<Attendance> getAttendanceRecordsForPeriod(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return hrAttendanceService.getEmployeeAttendanceHistory(employeeId, startDate, endDate);
    }
    
    /**
     * Check if employee was present on a specific date
     */
    public boolean wasEmployeePresentOnDate(UUID employeeId, LocalDate date) {
        List<Attendance> records = hrAttendanceService.getEmployeeAttendanceHistory(employeeId, date, date);
        if (records.isEmpty()) {
            return false;
        }
        
        Attendance attendance = records.get(0);
        return attendance.isPresent(); // Using your model's isPresent() method
    }
    
    /**
     * Get detailed attendance summary for payroll reporting
     */
    public PayrollAttendanceSummary getPayrollAttendanceSummary(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        List<Attendance> records = hrAttendanceService.getEmployeeAttendanceHistory(employeeId, startDate, endDate);
        
        long presentDays = records.stream().filter(Attendance::isPresent).count();
        long absentDays = records.stream().filter(r -> r.getStatus() == Attendance.AttendanceStatus.ABSENT).count();
        long lateDays = records.stream().filter(r -> r.getStatus() == Attendance.AttendanceStatus.LATE).count();
        long leaveDays = records.stream().filter(r -> r.getStatus() == Attendance.AttendanceStatus.ON_LEAVE).count();
        long halfDays = records.stream().filter(r -> r.getStatus() == Attendance.AttendanceStatus.HALF_DAY).count();
        
        double totalHours = records.stream()
            .mapToDouble(r -> r.getHoursWorked() != null ? r.getHoursWorked() : 0.0)
            .sum();
        
        double overtimeHours = records.stream()
            .mapToDouble(r -> r.getOvertimeHours() != null ? r.getOvertimeHours() : 0.0)
            .sum();
        
        long workingDays = records.stream().filter(Attendance::isWorkingDay).count();
        
        // Calculate average daily hours
        double averageDailyHours = presentDays > 0 ? totalHours / presentDays : 0.0;
        
        // Calculate attendance efficiency metrics for payroll
        double attendanceRate = workingDays > 0 ? (double) presentDays / workingDays * 100 : 0.0;
        double punctualityRate = presentDays > 0 ? (double) (presentDays - lateDays) / presentDays * 100 : 0.0;
        
        return PayrollAttendanceSummary.builder()
            .employeeId(employeeId)
            .periodStart(startDate)
            .periodEnd(endDate)
            .totalRecords(records.size())
            .presentDays((int) presentDays)
            .absentDays((int) absentDays)
            .lateDays((int) lateDays)
            .leaveDays((int) leaveDays)
            .halfDays((int) halfDays)
            .totalHours(totalHours)
            .overtimeHours(overtimeHours)
            .averageDailyHours(averageDailyHours)
            .workingDays((int) workingDays)
            .attendanceRate(attendanceRate)
            .punctualityRate(punctualityRate)
            .build();
    }
    
    /**
     * Calculate attendance-based salary adjustments
     */
    public AttendanceSalaryAdjustment calculateSalaryAdjustments(UUID employeeId, LocalDate startDate, LocalDate endDate, BigDecimal baseSalary) {
        AttendanceData attendanceData = getAttendanceDataForPeriod(employeeId, startDate, endDate);
        
        // Calculate pro-rated salary based on attendance
        BigDecimal dailyRate = baseSalary.divide(BigDecimal.valueOf(attendanceData.getTotalWorkingDays()), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal earnedSalary = dailyRate.multiply(BigDecimal.valueOf(attendanceData.getDaysWorked()));
        
        // Calculate deductions for absent days
        BigDecimal absenceDeduction = dailyRate.multiply(BigDecimal.valueOf(attendanceData.getDaysAbsent()));
        
        // Calculate late penalty (example: $10 per late day)
        BigDecimal latePenalty = BigDecimal.valueOf(10.00).multiply(BigDecimal.valueOf(attendanceData.getLateDays()));
        
        return AttendanceSalaryAdjustment.builder()
            .baseSalary(baseSalary)
            .dailyRate(dailyRate)
            .earnedSalary(earnedSalary)
            .absenceDeduction(absenceDeduction)
            .latePenalty(latePenalty)
            .adjustedSalary(earnedSalary.subtract(latePenalty))
            .daysWorked(attendanceData.getDaysWorked())
            .daysAbsent(attendanceData.getDaysAbsent())
            .lateDays(attendanceData.getLateDays())
            .build();
    }
}



/**
 * Extended attendance summary for payroll reporting
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PayrollAttendanceSummary {
    private UUID employeeId;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private int totalRecords;
    private int presentDays;
    private int absentDays;
    private int lateDays;
    private int leaveDays;
    private int halfDays;
    private double totalHours;
    private double overtimeHours;
    private double averageDailyHours;
    private int workingDays;
    private double attendanceRate;      // % of working days present
    private double punctualityRate;     // % of present days on time
}

/**
 * Salary adjustment calculations based on attendance
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AttendanceSalaryAdjustment {
    private BigDecimal baseSalary;
    private BigDecimal dailyRate;
    private BigDecimal earnedSalary;
    private BigDecimal absenceDeduction;
    private BigDecimal latePenalty;
    private BigDecimal adjustedSalary;
    private int daysWorked;
    private int daysAbsent;
    private int lateDays;
}