package com.example.backend.controllers.finance.loans;

import com.example.backend.dto.finance.loans.FinancialInstitutionRequestDTO;
import com.example.backend.dto.finance.loans.FinancialInstitutionResponseDTO;
import com.example.backend.models.finance.loans.enums.InstitutionType;
import com.example.backend.services.finance.loans.FinancialInstitutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/loans/institutions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FinancialInstitutionController {

    private final FinancialInstitutionService institutionService;

    /**
     * Create a new financial institution
     */
    @PostMapping
    public ResponseEntity<FinancialInstitutionResponseDTO> create(
            @Valid @RequestBody FinancialInstitutionRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        FinancialInstitutionResponseDTO response = institutionService.create(requestDTO, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get institution by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<FinancialInstitutionResponseDTO> getById(@PathVariable UUID id) {
        FinancialInstitutionResponseDTO response = institutionService.getById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all institutions
     */
    @GetMapping
    public ResponseEntity<List<FinancialInstitutionResponseDTO>> getAll() {
        List<FinancialInstitutionResponseDTO> response = institutionService.getAll();
        return ResponseEntity.ok(response);
    }

    /**
     * Get active institutions (for dropdowns)
     */
    @GetMapping("/active")
    public ResponseEntity<List<FinancialInstitutionResponseDTO>> getActiveInstitutions() {
        List<FinancialInstitutionResponseDTO> response = institutionService.getActiveInstitutions();
        return ResponseEntity.ok(response);
    }

    /**
     * Get institutions by type
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<List<FinancialInstitutionResponseDTO>> getByType(@PathVariable InstitutionType type) {
        List<FinancialInstitutionResponseDTO> response = institutionService.getByType(type);
        return ResponseEntity.ok(response);
    }

    /**
     * Search institutions by name
     */
    @GetMapping("/search")
    public ResponseEntity<List<FinancialInstitutionResponseDTO>> searchByName(@RequestParam String name) {
        List<FinancialInstitutionResponseDTO> response = institutionService.searchByName(name);
        return ResponseEntity.ok(response);
    }

    /**
     * Update institution
     */
    @PutMapping("/{id}")
    public ResponseEntity<FinancialInstitutionResponseDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody FinancialInstitutionRequestDTO requestDTO) {
        FinancialInstitutionResponseDTO response = institutionService.update(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    /**
     * Deactivate institution
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<FinancialInstitutionResponseDTO> deactivate(@PathVariable UUID id) {
        FinancialInstitutionResponseDTO response = institutionService.deactivate(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete institution
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        institutionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}