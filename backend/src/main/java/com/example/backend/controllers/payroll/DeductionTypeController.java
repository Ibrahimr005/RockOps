package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.services.payroll.DeductionTypeService;
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
 * Controller for managing deduction types
 */
@RestController
@RequestMapping("/api/v1/payroll/deduction-types")
@RequiredArgsConstructor
@Slf4j
public class DeductionTypeController {

    private final DeductionTypeService deductionTypeService;

    /**
     * Get all active deduction types
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<DeductionTypeDTO>> getAllDeductionTypes() {
        log.info("Getting all active deduction types");
        List<DeductionTypeDTO> types = deductionTypeService.getAllActiveDeductionTypes();
        return ResponseEntity.ok(types);
    }

    /**
     * Get deduction types for a specific site
     */
    @GetMapping("/site/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<DeductionTypeDTO>> getDeductionTypesForSite(@PathVariable UUID siteId) {
        log.info("Getting deduction types for site: {}", siteId);
        List<DeductionTypeDTO> types = deductionTypeService.getDeductionTypesForSite(siteId);
        return ResponseEntity.ok(types);
    }

    /**
     * Get deduction type by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<DeductionTypeDTO> getDeductionTypeById(@PathVariable UUID id) {
        log.info("Getting deduction type by ID: {}", id);
        DeductionTypeDTO type = deductionTypeService.getById(id);
        return ResponseEntity.ok(type);
    }

    /**
     * Get deduction types by category
     */
    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<DeductionTypeDTO>> getByCategory(
            @PathVariable DeductionType.DeductionCategory category) {
        log.info("Getting deduction types by category: {}", category);
        List<DeductionTypeDTO> types = deductionTypeService.getByCategory(category);
        return ResponseEntity.ok(types);
    }

    /**
     * Get available categories
     */
    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<CategoryInfo>> getCategories() {
        log.info("Getting deduction type categories");
        List<CategoryInfo> categories = java.util.Arrays.stream(DeductionType.DeductionCategory.values())
            .map(c -> new CategoryInfo(c.name(), c.getDisplayName(), c.getDescription()))
            .toList();
        return ResponseEntity.ok(categories);
    }

    /**
     * Create a new deduction type
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DeductionTypeDTO> createDeductionType(
            @Valid @RequestBody DeductionTypeDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Creating deduction type: {} by {}", dto.getName(), username);
        DeductionTypeDTO created = deductionTypeService.create(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update a deduction type
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DeductionTypeDTO> updateDeductionType(
            @PathVariable UUID id,
            @Valid @RequestBody DeductionTypeDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Updating deduction type: {} by {}", id, username);
        DeductionTypeDTO updated = deductionTypeService.update(id, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deactivate a deduction type
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Void> deactivateDeductionType(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Deactivating deduction type: {} by {}", id, username);
        deductionTypeService.deactivate(id, username);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reactivate a deduction type
     */
    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<Void> reactivateDeductionType(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Reactivating deduction type: {} by {}", id, username);
        deductionTypeService.reactivate(id, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Initialize system deduction types (admin only)
     */
    @PostMapping("/initialize-system-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> initializeSystemTypes() {
        log.info("Initializing system deduction types");
        deductionTypeService.initializeSystemDeductionTypes();
        return ResponseEntity.ok("System deduction types initialized successfully");
    }

    /**
     * Category info record
     */
    public record CategoryInfo(String code, String displayName, String description) {}
}
