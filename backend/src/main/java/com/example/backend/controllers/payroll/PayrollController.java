// PayrollController.java
package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.PayrollReportDTO;
import com.example.backend.dto.payroll.PayslipDTO;
import com.example.backend.services.payroll.PayrollService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
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
}

