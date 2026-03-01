package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.salary.*;
import com.example.backend.models.hr.SalaryIncreaseRequest;
import com.example.backend.services.hr.SalaryIncreaseRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/salary-increase-requests")
@RequiredArgsConstructor
@Slf4j
public class SalaryIncreaseRequestController {

    private final SalaryIncreaseRequestService salaryIncreaseRequestService;

    /**
     * Create a new salary increase request
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<SalaryIncreaseRequestDTO> createRequest(
            @Valid @RequestBody SalaryIncreaseCreateDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        SalaryIncreaseRequestDTO result = salaryIncreaseRequestService.createRequest(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Get all salary increase requests with optional filters
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<SalaryIncreaseRequestDTO>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String employeeId) {
        log.info("GET /salary-increase-requests called with status={}, employeeId={}", status, employeeId);

        if (employeeId != null && !employeeId.isBlank()) {
            try {
                UUID empId = UUID.fromString(employeeId);
                return ResponseEntity.ok(salaryIncreaseRequestService.getByEmployee(empId));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid employeeId: {}", employeeId);
            }
        }
        if (status != null && !status.isBlank()) {
            try {
                SalaryIncreaseRequest.Status statusEnum = SalaryIncreaseRequest.Status.valueOf(status);
                return ResponseEntity.ok(salaryIncreaseRequestService.getByStatus(statusEnum));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }
        return ResponseEntity.ok(salaryIncreaseRequestService.getAll());
    }

    /**
     * Get a single request by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<SalaryIncreaseRequestDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(salaryIncreaseRequestService.getById(id));
    }

    /**
     * Get statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        return ResponseEntity.ok(salaryIncreaseRequestService.getStatistics());
    }

    /**
     * Get salary history for an employee
     */
    @GetMapping("/employee/{employeeId}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<SalaryHistoryDTO>> getEmployeeSalaryHistory(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(salaryIncreaseRequestService.getEmployeeSalaryHistory(employeeId));
    }

    /**
     * HR approve/reject a request
     */
    @PutMapping("/{id}/hr-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<SalaryIncreaseRequestDTO> hrDecision(
            @PathVariable UUID id,
            @RequestBody SalaryIncreaseReviewDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        SalaryIncreaseRequestDTO result = salaryIncreaseRequestService.hrDecision(id, dto, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Finance approve/reject a request
     */
    @PutMapping("/{id}/finance-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<SalaryIncreaseRequestDTO> financeDecision(
            @PathVariable UUID id,
            @RequestBody SalaryIncreaseReviewDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        SalaryIncreaseRequestDTO result = salaryIncreaseRequestService.financeDecision(id, dto, username);
        return ResponseEntity.ok(result);
    }
}
