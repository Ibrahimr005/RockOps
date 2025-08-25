package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.PayrollReportDTO;
import com.example.backend.dto.payroll.PayslipDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Payslip;
import com.example.backend.services.payroll.PayrollService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
@Slf4j
public class PayrollController {

    private final PayrollService payrollService;

    /**
     * Generate monthly payslips for all employees
     */
    @PostMapping("/generate-monthly/{year}/{month}")
    public ResponseEntity<List<PayslipDTO>> generateMonthlyPayslips(
            @PathVariable int year,
            @PathVariable int month,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {

        YearMonth payPeriod = YearMonth.of(year, month);
        List<PayslipDTO> payslips = payrollService.generateMonthlyPayslips(payPeriod, createdBy);

        return ResponseEntity.ok(payslips);
    }

    /**
     * Alternative endpoint with YearMonth parameter
     */
    @PostMapping("/generate-monthly")
    public ResponseEntity<List<PayslipDTO>> generateMonthlyPayslipsWithParam(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth payPeriod,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {

        List<PayslipDTO> payslips = payrollService.generateMonthlyPayslips(payPeriod, createdBy);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get payroll report for a period
     */
    @GetMapping("/report")
    public ResponseEntity<PayrollReportDTO> getPayrollReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        PayrollReportDTO report = payrollService.getPayrollReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }

    /**
     * Get payroll summary (more efficient than full report)
     */
    @GetMapping("/summary")
    public ResponseEntity<PayrollReportDTO> getPayrollSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        PayrollReportDTO summary = payrollService.getPayrollSummary(startDate, endDate);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get payslips by employee
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<PayslipDTO>> getPayslipsByEmployee(@PathVariable UUID employeeId) {
        List<PayslipDTO> payslips = payrollService.getPayslipsByEmployee(employeeId);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get payslips by period
     */
    @GetMapping("/period")
    public ResponseEntity<List<PayslipDTO>> getPayslipsByPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<PayslipDTO> payslips = payrollService.getPayslipsByPeriod(startDate, endDate);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Bulk finalize payslips for a period
     */
    @PostMapping("/finalize-period")
    public ResponseEntity<List<PayslipDTO>> finalizePayslipsForPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "SYSTEM") String approvedBy) {

        List<PayslipDTO> finalizedPayslips = payrollService.finalizePayslipsForPeriod(startDate, endDate, approvedBy);
        return ResponseEntity.ok(finalizedPayslips);
    }

    /**
     * Bulk send payslips for a period
     */
    @PostMapping("/send-period")
    public ResponseEntity<List<PayslipDTO>> sendPayslipsForPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<PayslipDTO> sentPayslips = payrollService.sendPayslipsForPeriod(startDate, endDate);
        return ResponseEntity.ok(sentPayslips);
    }

    /**
     * Get payslips by status for a period
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<PayslipDTO>> getPayslipsByStatusAndPeriod(
            @PathVariable String status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        try {
            Payslip.PayslipStatus payslipStatus = Payslip.PayslipStatus.valueOf(status.toUpperCase());
            List<PayslipDTO> payslips = payrollService.getPayslipsByStatusAndPeriod(payslipStatus, startDate, endDate);
            return ResponseEntity.ok(payslips);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get payroll status summary
     */
    @GetMapping("/status-summary")
    public ResponseEntity<Map<String, Long>> getPayrollStatusSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Map<String, Long> statusSummary = payrollService.getPayrollStatusSummary(startDate, endDate);
        return ResponseEntity.ok(statusSummary);
    }

    /**
     * Check if payroll exists for a period
     */
    @GetMapping("/exists/{year}/{month}")
    public ResponseEntity<Boolean> checkPayrollExists(
            @PathVariable int year,
            @PathVariable int month) {

        YearMonth payPeriod = YearMonth.of(year, month);
        boolean exists = payrollService.payrollExistsForPeriod(payPeriod);
        return ResponseEntity.ok(exists);
    }

    /**
     * Get employees without payslips for a period
     */
    @GetMapping("/missing-payslips/{year}/{month}")
    public ResponseEntity<List<Employee>> getEmployeesWithoutPayslips(
            @PathVariable int year,
            @PathVariable int month) {

        YearMonth payPeriod = YearMonth.of(year, month);
        List<Employee> employees = payrollService.getEmployeesWithoutPayslipsForPeriod(payPeriod);
        return ResponseEntity.ok(employees);
    }

    /**
     * Generate payslips for specific employees only
     */
    @PostMapping("/generate-specific")
    public ResponseEntity<List<PayslipDTO>> generatePayslipsForEmployees(
            @RequestBody List<UUID> employeeIds,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth payPeriod,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {

        // This would require a new method in PayrollService
        // For now, return not implemented
        return ResponseEntity.status(501).build(); // Not Implemented
    }

    /**
     * Get monthly payroll statistics
     */
    @GetMapping("/monthly-stats/{year}")
    public ResponseEntity<Map<String, Object>> getMonthlyPayrollStats(@PathVariable int year) {
        // This would require a new method in PayrollService for yearly statistics
        // For now, return not implemented
        return ResponseEntity.status(501).build(); // Not Implemented
    }

    /**
     * Validate payroll data for a period
     */
    @PostMapping("/validate/{year}/{month}")
    public ResponseEntity<Map<String, Object>> validatePayrollForPeriod(
            @PathVariable int year,
            @PathVariable int month) {

        // This would require a validation method in PayrollService
        // For now, return not implemented
        return ResponseEntity.status(501).build(); // Not Implemented
    }

    /**
     * Reprocess failed payslips
     */
    @PostMapping("/reprocess-failed")
    public ResponseEntity<List<PayslipDTO>> reprocessFailedPayslips(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "SYSTEM") String reprocessedBy) {

        // This would require a reprocessing method in PayrollService
        // For now, return not implemented
        return ResponseEntity.status(501).build(); // Not Implemented
    }

    /**
     * Export payroll data
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportPayrollData(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "excel") String format) {

        // This would require an export method in PayrollService
        // For now, return not implemented
        return ResponseEntity.status(501).build(); // Not Implemented
    }
}