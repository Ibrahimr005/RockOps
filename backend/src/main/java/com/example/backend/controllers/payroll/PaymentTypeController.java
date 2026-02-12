package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.PaymentTypeDTO;
import com.example.backend.services.payroll.PaymentTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller for managing payment types.
 * Both HR and Finance can create/manage payment types.
 */
@RestController
@RequestMapping("/api/v1/payment-types")
@RequiredArgsConstructor
public class PaymentTypeController {

    private final PaymentTypeService paymentTypeService;

    /**
     * Get all active payment types
     */
    @GetMapping
    public ResponseEntity<List<PaymentTypeDTO>> getAllActive() {
        return ResponseEntity.ok(paymentTypeService.getAllActive());
    }

    /**
     * Get all payment types including inactive (admin view)
     */
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<List<PaymentTypeDTO>> getAll() {
        return ResponseEntity.ok(paymentTypeService.getAll());
    }

    /**
     * Get payment type by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<PaymentTypeDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentTypeService.getById(id));
    }

    /**
     * Get payment type by code
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<PaymentTypeDTO> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(paymentTypeService.getByCode(code));
    }

    /**
     * Create a new payment type
     * Can be created by HR or Finance
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE')")
    public ResponseEntity<PaymentTypeDTO> create(
            @RequestBody PaymentTypeDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(paymentTypeService.create(dto, username));
    }

    /**
     * Update a payment type
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<PaymentTypeDTO> update(
            @PathVariable UUID id,
            @RequestBody PaymentTypeDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(paymentTypeService.update(id, dto, username));
    }

    /**
     * Deactivate a payment type (soft delete)
     */
    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<Void> deactivate(
            @PathVariable UUID id,
            Authentication authentication) {
        String username = authentication.getName();
        paymentTypeService.deactivate(id, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Activate a payment type
     */
    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<Void> activate(
            @PathVariable UUID id,
            Authentication authentication) {
        String username = authentication.getName();
        paymentTypeService.activate(id, username);
        return ResponseEntity.ok().build();
    }
}
