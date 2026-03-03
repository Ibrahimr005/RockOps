package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.BonusResponseDTO;
import com.example.backend.dto.payroll.BulkCreateBonusDTO;
import com.example.backend.dto.payroll.CreateBonusDTO;
import com.example.backend.services.payroll.BonusService;
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

/**
 * Controller for managing employee bonuses
 */
@RestController
@RequestMapping("/api/v1/payroll/bonuses")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class BonusController {

    private final BonusService bonusService;

    // ===================================================
    // BONUS CRUD OPERATIONS
    // ===================================================

    /**
     * Create an individual bonus
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusResponseDTO> createBonus(
            @Valid @RequestBody CreateBonusDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Creating bonus for employee {} by {}", dto.getEmployeeId(), username);
        BonusResponseDTO created = bonusService.createBonus(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Create bonuses in bulk for multiple employees
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<List<BonusResponseDTO>> createBulkBonus(
            @Valid @RequestBody BulkCreateBonusDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Creating bulk bonuses for {} employees by {}", dto.getEmployeeIds().size(), username);
        List<BonusResponseDTO> created = bonusService.createBulkBonus(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Get all bonuses (optionally filter by site, status, employee, month/year)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<BonusResponseDTO>> getAllBonuses(
            @RequestParam UUID siteId,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        log.info("Getting bonuses - siteId: {}, employeeId: {}, month: {}, year: {}",
                siteId, employeeId, month, year);

        List<BonusResponseDTO> bonuses;
        if (employeeId != null) {
            bonuses = bonusService.getBonusesByEmployee(employeeId);
        } else if (month != null && year != null) {
            bonuses = bonusService.getBonusesForPayroll(month, year, siteId);
        } else {
            bonuses = bonusService.getAllBonuses(siteId);
        }

        return ResponseEntity.ok(bonuses);
    }

    /**
     * Get bonus by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<BonusResponseDTO> getBonusById(@PathVariable UUID id) {
        log.info("Getting bonus by ID: {}", id);
        BonusResponseDTO bonus = bonusService.getBonusById(id);
        return ResponseEntity.ok(bonus);
    }

    /**
     * Get bonuses by employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<BonusResponseDTO>> getBonusesByEmployee(@PathVariable UUID employeeId) {
        log.info("Getting bonuses for employee: {}", employeeId);
        List<BonusResponseDTO> bonuses = bonusService.getBonusesByEmployee(employeeId);
        return ResponseEntity.ok(bonuses);
    }

    // ===================================================
    // HR APPROVAL WORKFLOW
    // ===================================================

    /**
     * HR approves a bonus
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusResponseDTO> hrApproveBonus(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("HR approving bonus {} by {}", id, username);
        BonusResponseDTO approved = bonusService.hrApproveBonus(id, username);
        return ResponseEntity.ok(approved);
    }

    /**
     * HR rejects a bonus
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusResponseDTO> hrRejectBonus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        String reason = body.get("reason");
        log.info("HR rejecting bonus {} by {}", id, username);
        BonusResponseDTO rejected = bonusService.hrRejectBonus(id, username, reason);
        return ResponseEntity.ok(rejected);
    }

    /**
     * Cancel a bonus
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusResponseDTO> cancelBonus(@PathVariable UUID id) {
        log.info("Cancelling bonus {}", id);
        BonusResponseDTO cancelled = bonusService.cancelBonus(id);
        return ResponseEntity.ok(cancelled);
    }

    // ===================================================
    // STATISTICS
    // ===================================================

    /**
     * Get bonus statistics for a site
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<Map<String, Object>> getStatistics(@RequestParam UUID siteId) {
        log.info("Getting bonus statistics for site: {}", siteId);
        Map<String, Object> stats = bonusService.getStatistics(siteId);
        return ResponseEntity.ok(stats);
    }
}
