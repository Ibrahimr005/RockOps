package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.dto.payroll.CreateManualDeductionRequest;
import com.example.backend.dto.payroll.UpdateManualDeductionRequest;
import com.example.backend.services.payroll.ManualDeductionService;
import com.example.backend.services.payroll.DeductionTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll/deductions")
@RequiredArgsConstructor
@Slf4j
public class DeductionController {

    private final ManualDeductionService manualDeductionService;
    private final DeductionTypeService deductionTypeService;

    // ===== MANUAL DEDUCTION MANAGEMENT =====

    /**
     * Create new manual deduction for an employee
     */
    @PostMapping("/manual")
    public ResponseEntity<EmployeeDeductionDTO> createManualDeduction(
            @Valid @RequestBody CreateManualDeductionRequest request,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {
        
        log.info("Creating manual deduction for employee: {}", request.getEmployeeId());
        
        EmployeeDeductionDTO createdDeduction = manualDeductionService.createManualDeduction(request, createdBy);
        return ResponseEntity.ok(createdDeduction);
    }

    /**
     * Get manual deduction by ID
     */
    @GetMapping("/manual/{deductionId}")
    public ResponseEntity<EmployeeDeductionDTO> getManualDeductionById(@PathVariable UUID deductionId) {
        log.debug("Getting manual deduction by ID: {}", deductionId);
        
        EmployeeDeductionDTO deduction = manualDeductionService.getManualDeductionById(deductionId);
        return ResponseEntity.ok(deduction);
    }

    /**
     * Update manual deduction
     */
    @PutMapping("/manual/{deductionId}")
    public ResponseEntity<EmployeeDeductionDTO> updateManualDeduction(
            @PathVariable UUID deductionId,
            @Valid @RequestBody UpdateManualDeductionRequest request) {
        
        log.info("Updating manual deduction: {}", deductionId);
        
        EmployeeDeductionDTO updatedDeduction = manualDeductionService.updateManualDeduction(deductionId, request);
        return ResponseEntity.ok(updatedDeduction);
    }

    /**
     * Deactivate manual deduction
     */
    @PutMapping("/manual/{deductionId}/deactivate")
    public ResponseEntity<Void> deactivateManualDeduction(@PathVariable UUID deductionId) {
        log.info("Deactivating manual deduction: {}", deductionId);
        
        manualDeductionService.deactivateManualDeduction(deductionId);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete manual deduction
     */
    @DeleteMapping("/manual/{deductionId}")
    public ResponseEntity<Void> deleteManualDeduction(@PathVariable UUID deductionId) {
        log.info("Deleting manual deduction: {}", deductionId);
        
        manualDeductionService.deleteManualDeduction(deductionId);
        return ResponseEntity.ok().build();
    }

    // ===== EMPLOYEE DEDUCTION QUERIES =====

    /**
     * Get all manual deductions for an employee
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeDeductionDTO>> getEmployeeManualDeductions(@PathVariable UUID employeeId) {
        log.debug("Getting manual deductions for employee: {}", employeeId);
        
        List<EmployeeDeductionDTO> deductions = manualDeductionService.getEmployeeManualDeductions(employeeId);
        return ResponseEntity.ok(deductions);
    }

    /**
     * Get active manual deductions for an employee on a specific date
     */
    @GetMapping("/employee/{employeeId}/active")
    public ResponseEntity<List<EmployeeDeductionDTO>> getActiveEmployeeDeductions(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        
        LocalDate date = asOfDate != null ? asOfDate : LocalDate.now();
        log.debug("Getting active deductions for employee: {} as of: {}", employeeId, date);
        
        List<EmployeeDeductionDTO> deductions = manualDeductionService.getActiveEmployeeDeductions(employeeId, date);
        return ResponseEntity.ok(deductions);
    }

    /**
     * Get deduction summary for an employee in a period
     */
    @GetMapping("/employee/{employeeId}/summary")
    public ResponseEntity<Map<String, Object>> getEmployeeDeductionSummary(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd) {
        
        log.debug("Getting deduction summary for employee: {} from {} to {}", employeeId, periodStart, periodEnd);
        
        Map<String, Object> summary = manualDeductionService.getEmployeeDeductionSummary(employeeId, periodStart, periodEnd);
        return ResponseEntity.ok(summary);
    }

    // ===== ADMIN QUERIES =====

    /**
     * Get all manual deductions with pagination
     */
    @GetMapping("/manual")
    public ResponseEntity<Page<EmployeeDeductionDTO>> getAllManualDeductions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        log.debug("Getting all manual deductions with pagination: page={}, size={}", page, size);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<EmployeeDeductionDTO> deductions = manualDeductionService.getAllManualDeductions(pageable);
        return ResponseEntity.ok(deductions);
    }

    // ===== DEDUCTION TYPE MANAGEMENT =====

    /**
     * Get all deduction types
     */
    @GetMapping("/types")
    public ResponseEntity<List<DeductionTypeDTO>> getAllDeductionTypes() {
        log.debug("Getting all deduction types");
        
        List<DeductionTypeDTO> deductionTypes = deductionTypeService.getAllDeductionTypes();
        return ResponseEntity.ok(deductionTypes);
    }

    /**
     * Get active deduction types
     */
    @GetMapping("/types/active")
    public ResponseEntity<List<DeductionTypeDTO>> getActiveDeductionTypes() {
        log.debug("Getting active deduction types");
        
        List<DeductionTypeDTO> deductionTypes = deductionTypeService.getActiveDeductionTypes();
        return ResponseEntity.ok(deductionTypes);
    }

    /**
     * Get deduction types by category
     */
    @GetMapping("/types/category/{category}")
    public ResponseEntity<List<DeductionTypeDTO>> getDeductionTypesByCategory(@PathVariable String category) {
        log.debug("Getting deduction types by category: {}", category);
        
        List<DeductionTypeDTO> deductionTypes = deductionTypeService.getDeductionTypesByCategory(category);
        return ResponseEntity.ok(deductionTypes);
    }

    /**
     * Create new deduction type
     */
    @PostMapping("/types")
    public ResponseEntity<DeductionTypeDTO> createDeductionType(
            @Valid @RequestBody DeductionTypeDTO deductionTypeDTO,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {
        
        log.info("Creating new deduction type: {}", deductionTypeDTO.getName());
        
        DeductionTypeDTO createdType = deductionTypeService.createDeductionType(deductionTypeDTO, createdBy);
        return ResponseEntity.ok(createdType);
    }

    /**
     * Update deduction type
     */
    @PutMapping("/types/{typeId}")
    public ResponseEntity<DeductionTypeDTO> updateDeductionType(
            @PathVariable UUID typeId,
            @Valid @RequestBody DeductionTypeDTO deductionTypeDTO) {
        
        log.info("Updating deduction type: {}", typeId);
        
        DeductionTypeDTO updatedType = deductionTypeService.updateDeductionType(typeId, deductionTypeDTO);
        return ResponseEntity.ok(updatedType);
    }

    /**
     * Deactivate deduction type
     */
    @PutMapping("/types/{typeId}/deactivate")
    public ResponseEntity<Void> deactivateDeductionType(@PathVariable UUID typeId) {
        log.info("Deactivating deduction type: {}", typeId);
        
        deductionTypeService.deactivateDeductionType(typeId);
        return ResponseEntity.ok().build();
    }

    // ===== BULK OPERATIONS =====

    /**
     * Bulk create manual deductions for multiple employees
     */
    @PostMapping("/manual/bulk")
    public ResponseEntity<List<EmployeeDeductionDTO>> bulkCreateManualDeductions(
            @Valid @RequestBody List<CreateManualDeductionRequest> requests,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {
        
        log.info("Bulk creating {} manual deductions", requests.size());
        
        List<EmployeeDeductionDTO> createdDeductions = requests.stream()
                .map(request -> manualDeductionService.createManualDeduction(request, createdBy))
                .collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(createdDeductions);
    }

    /**
     * Bulk deactivate manual deductions
     */
    @PutMapping("/manual/bulk/deactivate")
    public ResponseEntity<Void> bulkDeactivateManualDeductions(@RequestBody List<UUID> deductionIds) {
        log.info("Bulk deactivating {} manual deductions", deductionIds.size());
        
        deductionIds.forEach(manualDeductionService::deactivateManualDeduction);
        return ResponseEntity.ok().build();
    }

    // ===== REPORTING ENDPOINTS =====

    /**
     * Get deduction statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getDeductionStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusMonths(1);
        LocalDate to = toDate != null ? toDate : LocalDate.now();
        
        log.debug("Getting deduction statistics from {} to {}", from, to);
        
        Map<String, Object> statistics = deductionTypeService.getDeductionStatistics(from, to);
        return ResponseEntity.ok(statistics);
    }

    /**
     * Export employee deductions for a period
     */
    @GetMapping("/export")
    public ResponseEntity<List<Map<String, Object>>> exportEmployeeDeductions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd,
            @RequestParam(required = false) List<UUID> employeeIds) {
        
        log.info("Exporting employee deductions from {} to {}", periodStart, periodEnd);
        
        List<Map<String, Object>> exportData = deductionTypeService.exportEmployeeDeductions(
                periodStart, periodEnd, employeeIds);
        
        return ResponseEntity.ok(exportData);
    }
}