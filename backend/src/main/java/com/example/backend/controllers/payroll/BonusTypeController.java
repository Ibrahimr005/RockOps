package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.BonusTypeDTO;
import com.example.backend.services.payroll.BonusTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Controller for managing bonus types
 */
@RestController
@RequestMapping("/api/v1/payroll/bonus-types")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class BonusTypeController {

    private final BonusTypeService bonusTypeService;

    /**
     * Create a new bonus type
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusTypeDTO> create(
            @Valid @RequestBody BonusTypeDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Creating bonus type: {} by {}", dto.getName(), username);
        BonusTypeDTO created = bonusTypeService.create(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Get all bonus types
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<BonusTypeDTO>> getAll() {
        log.info("Getting all bonus types");
        List<BonusTypeDTO> types = bonusTypeService.getAllBonusTypes();
        return ResponseEntity.ok(types);
    }

    /**
     * Get active bonus types
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<BonusTypeDTO>> getActive() {
        log.info("Getting active bonus types");
        List<BonusTypeDTO> types = bonusTypeService.getActiveBonusTypes();
        return ResponseEntity.ok(types);
    }

    /**
     * Get bonus type by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<BonusTypeDTO> getById(@PathVariable UUID id) {
        log.info("Getting bonus type by ID: {}", id);
        BonusTypeDTO type = bonusTypeService.getById(id);
        return ResponseEntity.ok(type);
    }

    /**
     * Update a bonus type
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<BonusTypeDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody BonusTypeDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Updating bonus type: {} by {}", id, username);
        BonusTypeDTO updated = bonusTypeService.update(id, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deactivate a bonus type (soft delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Deactivating bonus type: {} by {}", id, username);
        bonusTypeService.deactivate(id, username);
        return ResponseEntity.noContent().build();
    }
}
