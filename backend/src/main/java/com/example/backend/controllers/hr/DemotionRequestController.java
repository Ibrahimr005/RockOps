package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.demotion.*;
import com.example.backend.models.hr.DemotionRequest;
import com.example.backend.services.hr.DemotionRequestService;
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
@RequestMapping("/api/v1/hr/demotion-requests")
@RequiredArgsConstructor
@Slf4j
public class DemotionRequestController {

    private final DemotionRequestService demotionRequestService;

    /**
     * Create a new demotion request
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<DemotionRequestDTO> createRequest(
            @Valid @RequestBody DemotionRequestCreateDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        DemotionRequestDTO result = demotionRequestService.createRequest(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Get all demotion requests with optional filters
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<List<DemotionRequestDTO>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID employeeId) {

        if (employeeId != null) {
            return ResponseEntity.ok(demotionRequestService.getByEmployee(employeeId));
        }
        if (status != null) {
            try {
                DemotionRequest.Status statusEnum = DemotionRequest.Status.valueOf(status);
                return ResponseEntity.ok(demotionRequestService.getByStatus(statusEnum));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }
        return ResponseEntity.ok(demotionRequestService.getAll());
    }

    /**
     * Get a single request by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<DemotionRequestDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(demotionRequestService.getById(id));
    }

    /**
     * Get statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        return ResponseEntity.ok(demotionRequestService.getStatistics());
    }

    /**
     * Department Head approve/reject
     */
    @PutMapping("/{id}/dept-head-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DemotionRequestDTO> deptHeadDecision(
            @PathVariable UUID id,
            @RequestBody DemotionReviewDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        DemotionRequestDTO result = demotionRequestService.deptHeadDecision(id, dto, username);
        return ResponseEntity.ok(result);
    }

    /**
     * HR approve/reject (final approval, triggers demotion application)
     */
    @PutMapping("/{id}/hr-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<DemotionRequestDTO> hrDecision(
            @PathVariable UUID id,
            @RequestBody DemotionReviewDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        DemotionRequestDTO result = demotionRequestService.hrDecision(id, dto, username);
        return ResponseEntity.ok(result);
    }
}
