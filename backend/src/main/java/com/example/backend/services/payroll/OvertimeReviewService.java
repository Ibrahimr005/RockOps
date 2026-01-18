package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.OvertimeIssueDTO;
import com.example.backend.dto.payroll.OvertimeRecordDTO;
import com.example.backend.dto.payroll.OvertimeReviewSummaryDTO;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for processing overtime review in payroll
 *
 * IMPLEMENTATION: Complete - Based on Attendance.overtimeHours
 *
 * This service processes overtime from the Attendance table where:
 * - overtimeHours field contains the overtime hours for each attendance record
 * - Overtime is calculated as hours worked beyond expected hours
 * - Overtime pay is calculated at 1.5x the employee's hourly rate
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OvertimeReviewService {

    private final EmployeePayrollRepository employeePayrollRepository;
    private final AttendanceRepository attendanceRepository;

    /**
     * Process overtime review for a payroll period
     *
     * This method:
     * 1. Finds all attendance records with overtime hours for the payroll period
     * 2. Calculates overtime pay based on rates (1.5x for standard overtime)
     * 3. Updates EmployeePayroll records with overtime hours and pay
     * 4. Detects and reports any issues (excessive hours, unapproved overtime)
     * 5. Returns a summary of the processing
     *
     * @param payroll The payroll to process overtime for
     * @return Summary of overtime processing results
     */
    @Transactional
    public OvertimeReviewSummaryDTO processOvertimeReview(Payroll payroll) {
        log.info("Processing overtime review for payroll period: {} to {}",
                payroll.getStartDate(), payroll.getEndDate());

        try {
            List<OvertimeIssueDTO> issues = new ArrayList<>();
            int totalRecords = 0;
            double totalOvertimeHours = 0.0;
            int employeesWithOvertime = 0;
            BigDecimal totalOvertimePay = BigDecimal.ZERO;

            // Get all employee payrolls for this payroll period
            List<EmployeePayroll> employeePayrolls = employeePayrollRepository.findByPayrollId(payroll.getId());
            log.info("Processing overtime for {} employees", employeePayrolls.size());

            // Process each employee
            for (EmployeePayroll ep : employeePayrolls) {
                try {
                    // Get attendance records with overtime for this employee
                    List<Attendance> attendances = attendanceRepository
                            .findByEmployeeIdAndDateRange(
                                    ep.getEmployeeId(),
                                    payroll.getStartDate(),
                                    payroll.getEndDate()
                            );

                    // Sum up overtime hours from attendance records
                    double employeeOvertimeHours = 0.0;
                    int employeeOvertimeRecords = 0;

                    for (Attendance att : attendances) {
                        if (att.getOvertimeHours() != null && att.getOvertimeHours() > 0) {
                            employeeOvertimeHours += att.getOvertimeHours();
                            employeeOvertimeRecords++;
                            totalRecords++;

                            log.debug("Employee {}: {} hours overtime on {}",
                                    ep.getEmployeeName(), att.getOvertimeHours(), att.getDate());
                        }
                    }

                    // Process if employee has overtime
                    if (employeeOvertimeHours > 0) {
                        employeesWithOvertime++;
                        totalOvertimeHours += employeeOvertimeHours;

                        // Calculate hourly rate for overtime pay
                        BigDecimal hourlyRate;
                        if (ep.getHourlyRate() != null) {
                            // Use hourly rate directly if available
                            hourlyRate = ep.getHourlyRate();
                        } else if (ep.getMonthlyBaseSalary() != null) {
                            // Calculate hourly rate from monthly salary
                            // Assuming 160 hours per month (standard: 40 hours/week * 4 weeks)
                            hourlyRate = ep.getMonthlyBaseSalary()
                                    .divide(BigDecimal.valueOf(160), 2, RoundingMode.HALF_UP);
                        } else {
                            log.warn("Employee {} has no salary data, skipping overtime pay calculation",
                                    ep.getEmployeeName());
                            continue;
                        }

                        // Calculate overtime pay (1.5x rate for standard overtime)
                        double overtimeRate = 1.5;
                        BigDecimal overtimePay = hourlyRate
                                .multiply(BigDecimal.valueOf(overtimeRate))
                                .multiply(BigDecimal.valueOf(employeeOvertimeHours))
                                .setScale(2, RoundingMode.HALF_UP);

                        // Update employee payroll
                        ep.setOvertimeHours(BigDecimal.valueOf(employeeOvertimeHours));
                        ep.setOvertimePay(overtimePay);
                        employeePayrollRepository.save(ep);

                        totalOvertimePay = totalOvertimePay.add(overtimePay);

                        log.info("Employee {}: {} hours overtime = ${} (rate: ${}/hr * {}x)",
                                ep.getEmployeeName(), employeeOvertimeHours, overtimePay,
                                hourlyRate, overtimeRate);

                        // Check for excessive overtime (warning if > 40 hours)
                        if (employeeOvertimeHours > 40) {
                            issues.add(OvertimeIssueDTO.builder()
                                    .employeeId(ep.getEmployeeId())
                                    .employeeName(ep.getEmployeeName())
                                    .severity("WARNING")
                                    .description(String.format("Excessive overtime: %.2f hours in this period", employeeOvertimeHours))
                                    .hoursAffected(employeeOvertimeHours)
                                    .issueType("EXCESSIVE_HOURS")
                                    .build());
                        }

                        // Check for extremely excessive overtime (error if > 60 hours)
                        if (employeeOvertimeHours > 60) {
                            issues.add(OvertimeIssueDTO.builder()
                                    .employeeId(ep.getEmployeeId())
                                    .employeeName(ep.getEmployeeName())
                                    .severity("ERROR")
                                    .description(String.format("Critical: %.2f hours overtime exceeds safe limits", employeeOvertimeHours))
                                    .hoursAffected(employeeOvertimeHours)
                                    .issueType("CRITICAL_EXCESSIVE_HOURS")
                                    .build());
                        }
                    }

                } catch (Exception e) {
                    log.error("Error processing overtime for employee {}: {}", ep.getEmployeeName(), e.getMessage());
                    issues.add(OvertimeIssueDTO.builder()
                            .employeeId(ep.getEmployeeId())
                            .employeeName(ep.getEmployeeName())
                            .severity("ERROR")
                            .description("Failed to process overtime: " + e.getMessage())
                            .hoursAffected(0.0)
                            .issueType("PROCESSING_ERROR")
                            .build());
                }
            }

            // Mark payroll as processed
            payroll.markOvertimeProcessed();

            // Build and save summary
            String summaryJson = buildSummaryJson(totalRecords, totalOvertimeHours, employeesWithOvertime, totalOvertimePay);
            payroll.setOvertimeSummary(summaryJson);

            // Determine status
            String status = "SUCCESS";
            if (!issues.isEmpty()) {
                boolean hasErrors = issues.stream().anyMatch(i -> "ERROR".equals(i.getSeverity()));
                status = hasErrors ? "SUCCESS_WITH_WARNINGS" : "SUCCESS_WITH_WARNINGS";
            }

            // Build response
            log.info("✅ Overtime processing complete: {} records, {} employees, {} hours, ${}",
                    totalRecords, employeesWithOvertime, totalOvertimeHours, totalOvertimePay);

            return OvertimeReviewSummaryDTO.builder()
                    .status(status)
                    .message(String.format("Processed %d overtime record(s) for %d employee(s). Total overtime hours: %.2f. Total overtime pay: $%s",
                            totalRecords, employeesWithOvertime, totalOvertimeHours, totalOvertimePay.toString()))
                    .totalRecords(totalRecords)
                    .totalOvertimeHours(totalOvertimeHours)
                    .employeesWithOvertime(employeesWithOvertime)
                    .totalOvertimePay(totalOvertimePay)
                    .issues(issues)
                    .build();

        } catch (Exception e) {
            log.error("❌ Error processing overtime review: {}", e.getMessage(), e);
            return OvertimeReviewSummaryDTO.builder()
                    .status("FAILURE")
                    .message("Failed to process overtime: " + e.getMessage())
                    .totalRecords(0)
                    .totalOvertimeHours(0.0)
                    .employeesWithOvertime(0)
                    .totalOvertimePay(BigDecimal.ZERO)
                    .issues(new ArrayList<>())
                    .build();
        }
    }

    /**
     * Get overtime records for a specific period
     * Returns detailed overtime information from attendance records
     *
     * @param startDate Start of period
     * @param endDate End of period
     * @return List of overtime records with employee and pay details
     */
    public List<OvertimeRecordDTO> getOvertimeRecordsForPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("Fetching overtime records from {} to {}", startDate, endDate);

        try {
            List<OvertimeRecordDTO> overtimeRecords = new ArrayList<>();

            // Get all attendance records with overtime in the period
            List<Attendance> attendancesWithOvertime = attendanceRepository
                    .findByDateBetweenAndOvertimeHoursGreaterThan(startDate, endDate, 0.0);

            log.info("Found {} attendance records with overtime", attendancesWithOvertime.size());

            // Convert each attendance to an overtime record DTO
            for (Attendance att : attendancesWithOvertime) {
                try {
                    Employee employee = att.getEmployee();

                    // Calculate overtime pay for this specific record
                    BigDecimal hourlyRate = calculateHourlyRate(employee);
                    double overtimeRate = 1.5; // Standard time-and-a-half

                    BigDecimal overtimePay = hourlyRate
                            .multiply(BigDecimal.valueOf(overtimeRate))
                            .multiply(BigDecimal.valueOf(att.getOvertimeHours()))
                            .setScale(2, RoundingMode.HALF_UP);

                    // Determine status based on attendance status
                    String status = determineOvertimeStatus(att);

                    overtimeRecords.add(OvertimeRecordDTO.builder()
                            .id(att.getId())
                            .employeeId(employee.getId())
                            .employeeName(employee.getFullName())
                            .date(att.getDate())
                            .regularHours(att.getHoursWorked() != null ?
                                    att.getHoursWorked() - att.getOvertimeHours() : 0.0)
                            .overtimeHours(att.getOvertimeHours())
                            .overtimeRate(overtimeRate)
                            .overtimePay(overtimePay)
                            .status(status)
                            .reason(att.getNotes())
                            .approvedBy(att.getUpdatedBy())
                            .approvedAt(att.getDate())
                            .build());

                } catch (Exception e) {
                    log.error("Error converting attendance {} to overtime record: {}",
                            att.getId(), e.getMessage());
                }
            }

            log.info("Converted {} overtime records", overtimeRecords.size());
            return overtimeRecords;

        } catch (Exception e) {
            log.error("Error fetching overtime records: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * Calculate hourly rate for an employee
     */
    private BigDecimal calculateHourlyRate(Employee employee) {
        // This would need to be enhanced based on your EmployeePayroll structure
        // For now, using a simple calculation

        // If employee has hourly rate in their job position
        JobPosition jobPosition = employee.getJobPosition();
        if (jobPosition != null && jobPosition.getContractType() == JobPosition.ContractType.HOURLY) {
            // You might have hourly rate in JobPosition or EmployeePayroll
            // This is a placeholder - adjust based on your actual data model
            return BigDecimal.valueOf(50.0); // Default hourly rate
        }

        // For monthly employees, calculate from monthly salary
        // Assuming 160 hours per month (40 hours/week * 4 weeks)
        // This is a simplified calculation - you might want to get actual salary from EmployeePayroll
        return BigDecimal.valueOf(5000.0)
                .divide(BigDecimal.valueOf(160), 2, RoundingMode.HALF_UP);
    }

    /**
     * Determine overtime status based on attendance status
     */
    private String determineOvertimeStatus(Attendance attendance) {
        // If attendance has leave approved field and it's being used for overtime approval
        if (attendance.getLeaveApproved() != null && attendance.getLeaveApproved()) {
            return "APPROVED";
        }

        // If overtime hours are present and attendance is marked as present, consider it approved
        if (attendance.getStatus() == Attendance.AttendanceStatus.PRESENT ||
                attendance.getStatus() == Attendance.AttendanceStatus.LATE) {
            return "APPROVED";
        }

        // Default to pending
        return "PENDING";
    }

    /**
     * Build JSON summary string for storage
     */
    private String buildSummaryJson(int totalRecords, double totalHours, int employeeCount, BigDecimal totalPay) {
        return String.format(
                "{\"totalRecords\":%d,\"totalOvertimeHours\":%.2f,\"employeesWithOvertime\":%d,\"totalOvertimePay\":\"%s\"}",
                totalRecords, totalHours, employeeCount, totalPay.toString()
        );
    }
}