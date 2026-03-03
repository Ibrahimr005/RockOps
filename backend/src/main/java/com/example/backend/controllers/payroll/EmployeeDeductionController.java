package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.services.payroll.EmployeeDeductionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Controller for managing employee deductions
 */
@RestController
@RequestMapping("/api/v1/payroll/employee-deductions")
@RequiredArgsConstructor
@Slf4j
public class EmployeeDeductionController {

    private final EmployeeDeductionService employeeDeductionService;

    /**
     * Get all deductions for an employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<EmployeeDeductionDTO>> getDeductionsByEmployee(@PathVariable UUID employeeId) {
        log.info("Getting deductions for employee: {}", employeeId);
        List<EmployeeDeductionDTO> deductions = employeeDeductionService.getDeductionsByEmployee(employeeId);
        return ResponseEntity.ok(deductions);
    }

    /**
     * Get active deductions for an employee
     */
    @GetMapping("/employee/{employeeId}/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<EmployeeDeductionDTO>> getActiveDeductionsByEmployee(@PathVariable UUID employeeId) {
        log.info("Getting active deductions for employee: {}", employeeId);
        List<EmployeeDeductionDTO> deductions = employeeDeductionService.getActiveDeductionsByEmployee(employeeId);
        return ResponseEntity.ok(deductions);
    }

    /**
     * Get deduction by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<EmployeeDeductionDTO> getDeductionById(@PathVariable UUID id) {
        log.info("Getting deduction by ID: {}", id);
        EmployeeDeductionDTO deduction = employeeDeductionService.getById(id);
        return ResponseEntity.ok(deduction);
    }

    /**
     * Get deductions for a payroll period
     */
    @GetMapping("/employee/{employeeId}/period")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<EmployeeDeductionDTO>> getDeductionsForPayrollPeriod(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("Getting deductions for employee {} for period {} to {}", employeeId, startDate, endDate);
        List<EmployeeDeductionDTO> deductions = employeeDeductionService
            .getDeductionsForPayrollPeriod(employeeId, startDate, endDate);
        return ResponseEntity.ok(deductions);
    }

    /**
     * Create a new employee deduction
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<EmployeeDeductionDTO> createDeduction(
            @Valid @RequestBody EmployeeDeductionDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Creating deduction for employee {} by {}", dto.getEmployeeId(), username);
        EmployeeDeductionDTO created = employeeDeductionService.create(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update an employee deduction
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<EmployeeDeductionDTO> updateDeduction(
            @PathVariable UUID id,
            @Valid @RequestBody EmployeeDeductionDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Updating deduction {} by {}", id, username);
        EmployeeDeductionDTO updated = employeeDeductionService.update(id, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deactivate a deduction
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Void> deactivateDeduction(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Deactivating deduction {} by {}", id, username);
        employeeDeductionService.deactivate(id, username);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reactivate a deduction
     */
    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Void> reactivateDeduction(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Reactivating deduction {} by {}", id, username);
        employeeDeductionService.reactivate(id, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Hard delete a deduction (admin only)
     */
    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDeduction(@PathVariable UUID id) {
        log.info("Permanently deleting deduction: {}", id);
        employeeDeductionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get available calculation methods
     */
    @GetMapping("/calculation-methods")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<MethodInfo>> getCalculationMethods() {
        log.info("Getting calculation methods");
        List<MethodInfo> methods = java.util.Arrays.stream(EmployeeDeduction.CalculationMethod.values())
            .map(m -> new MethodInfo(m.name(), m.getDisplayName(), m.getDescription()))
            .toList();
        return ResponseEntity.ok(methods);
    }

    /**
     * Get available frequencies
     */
    @GetMapping("/frequencies")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<FrequencyInfo>> getFrequencies() {
        log.info("Getting deduction frequencies");
        List<FrequencyInfo> frequencies = java.util.Arrays.stream(EmployeeDeduction.DeductionFrequency.values())
            .map(f -> new FrequencyInfo(f.name(), f.getDisplayName(), f.getDescription()))
            .toList();
        return ResponseEntity.ok(frequencies);
    }

    /**
     * Calculate deductions for preview (without applying)
     */
    @PostMapping("/calculate-preview")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<EmployeeDeductionService.CalculatedDeduction>> calculateDeductionsPreview(
            @RequestBody DeductionCalculationRequest request) {
        log.info("Calculating deduction preview for employee: {}", request.employeeId());
        List<EmployeeDeductionService.CalculatedDeduction> calculated = employeeDeductionService
            .calculateDeductionsForPayroll(
                request.employeeId(),
                request.periodStart(),
                request.periodEnd(),
                request.grossSalary(),
                request.basicSalary()
            );
        return ResponseEntity.ok(calculated);
    }

    /**
     * Method info record
     */
    public record MethodInfo(String code, String displayName, String description) {}

    /**
     * Frequency info record
     */
    public record FrequencyInfo(String code, String displayName, String description) {}

    /**
     * Deduction calculation request
     */
    public record DeductionCalculationRequest(
        UUID employeeId,
        LocalDate periodStart,
        LocalDate periodEnd,
        java.math.BigDecimal grossSalary,
        java.math.BigDecimal basicSalary
    ) {}
}
