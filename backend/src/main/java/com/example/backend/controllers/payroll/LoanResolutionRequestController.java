package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.LoanResolutionRequestDTO;
import com.example.backend.models.payroll.LoanResolutionRequest;
import com.example.backend.services.payroll.LoanResolutionRequestService;
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
@RequestMapping("/api/v1/payroll/loan-resolution-requests")
@RequiredArgsConstructor
@Slf4j
public class LoanResolutionRequestController {

    private final LoanResolutionRequestService resolutionService;

    /**
     * Create a new loan resolution request
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<LoanResolutionRequestDTO> createRequest(
            @RequestBody LoanResolutionRequestDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        LoanResolutionRequestDTO result = resolutionService.createRequest(
            dto.getLoanId(), dto.getReason(), username);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Get resolution requests by status
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanResolutionRequestDTO>> getByStatus(
            @RequestParam(required = false) LoanResolutionRequest.ResolutionStatus status,
            @RequestParam(required = false) UUID loanId) {

        if (loanId != null) {
            return ResponseEntity.ok(resolutionService.getByLoanId(loanId));
        }
        if (status != null) {
            return ResponseEntity.ok(resolutionService.getByStatus(status));
        }
        // Default: return all
        return ResponseEntity.ok(resolutionService.getByStatus(null));
    }

    /**
     * Get a single resolution request by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanResolutionRequestDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(resolutionService.getById(id));
    }

    /**
     * HR decision on a resolution request
     */
    @PutMapping("/{id}/hr-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanResolutionRequestDTO> hrDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        String reason = (String) body.get("reason");

        LoanResolutionRequestDTO result;
        if (approved) {
            result = resolutionService.hrDecision(id, true, username);
        } else {
            result = resolutionService.hrReject(id, reason, username);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Finance decision on a resolution request
     */
    @PutMapping("/{id}/finance-decision")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanResolutionRequestDTO> financeDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        String reason = (String) body.get("reason");

        LoanResolutionRequestDTO result;
        if (approved) {
            result = resolutionService.financeDecision(id, true, username);
        } else {
            result = resolutionService.financeReject(id, reason, username);
        }
        return ResponseEntity.ok(result);
    }
}
