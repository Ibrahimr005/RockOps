package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.DiscrepancyRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.DiscrepancyResponseDTO;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyPriority;
import com.example.backend.models.finance.bankReconciliation.DiscrepancyStatus;
import com.example.backend.services.finance.bankReconciliation.DiscrepancyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discrepancies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DiscrepancyController {

    private final DiscrepancyService discrepancyService;

    @PostMapping
    public ResponseEntity<DiscrepancyResponseDTO> createDiscrepancy(
            @Valid @RequestBody DiscrepancyRequestDTO requestDTO) {
        DiscrepancyResponseDTO response = discrepancyService.createDiscrepancy(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<DiscrepancyResponseDTO>> getAllDiscrepancies() {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getAllDiscrepancies();
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiscrepancyResponseDTO> getDiscrepancyById(@PathVariable UUID id) {
        DiscrepancyResponseDTO discrepancy = discrepancyService.getDiscrepancyById(id);
        return ResponseEntity.ok(discrepancy);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getDiscrepanciesByStatus(
            @PathVariable DiscrepancyStatus status) {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getDiscrepanciesByStatus(status);
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/open")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getOpenDiscrepancies() {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getOpenDiscrepancies();
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/high-priority")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getHighPriorityDiscrepancies() {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getHighPriorityDiscrepancies();
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/assigned-to/{assignee}")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getDiscrepanciesAssignedTo(
            @PathVariable String assignee) {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getDiscrepanciesAssignedTo(assignee);
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/unassigned")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getUnassignedDiscrepancies() {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getUnassignedDiscrepancies();
        return ResponseEntity.ok(discrepancies);
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<DiscrepancyResponseDTO>> getOverdueDiscrepancies(
            @RequestParam(defaultValue = "7") int daysOld) {
        List<DiscrepancyResponseDTO> discrepancies = discrepancyService.getOverdueDiscrepancies(daysOld);
        return ResponseEntity.ok(discrepancies);
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<DiscrepancyResponseDTO> assignDiscrepancy(
            @PathVariable UUID id,
            @RequestParam String assignee) {
        DiscrepancyResponseDTO response = discrepancyService.assignDiscrepancy(id, assignee);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/investigation-notes")
    public ResponseEntity<DiscrepancyResponseDTO> updateInvestigationNotes(
            @PathVariable UUID id,
            @RequestBody String notes) {
        DiscrepancyResponseDTO response = discrepancyService.updateInvestigationNotes(id, notes);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<DiscrepancyResponseDTO> resolveDiscrepancy(
            @PathVariable UUID id,
            @RequestParam String resolution,
            @RequestParam String resolvedBy) {
        DiscrepancyResponseDTO response = discrepancyService.resolveDiscrepancy(id, resolution, resolvedBy);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<DiscrepancyResponseDTO> closeDiscrepancy(@PathVariable UUID id) {
        DiscrepancyResponseDTO response = discrepancyService.closeDiscrepancy(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/priority")
    public ResponseEntity<DiscrepancyResponseDTO> updatePriority(
            @PathVariable UUID id,
            @RequestParam DiscrepancyPriority priority) {
        DiscrepancyResponseDTO response = discrepancyService.updatePriority(id, priority);
        return ResponseEntity.ok(response);
    }
}