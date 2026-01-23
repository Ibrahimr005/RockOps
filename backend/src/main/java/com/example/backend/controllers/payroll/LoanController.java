package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.LoanFinanceActionDTO;
import com.example.backend.dto.payroll.LoanFinanceRequestDTO;
import com.example.backend.models.payroll.Loan;
import com.example.backend.services.payroll.LoanService;
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
 * Controller for managing employee loans with Finance integration
 */
@RestController
@RequestMapping("/api/v1/payroll/loans")
@RequiredArgsConstructor
@Slf4j
public class LoanController {

    private final LoanService loanService;

    // ===================================================
    // LOAN CRUD OPERATIONS
    // ===================================================

    /**
     * Get all loans
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanDTO>> getAllLoans(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status) {
        log.info("Getting loans - employeeId: {}, status: {}", employeeId, status);

        List<LoanDTO> loans;
        if (employeeId != null) {
            loans = loanService.getLoansByEmployee(employeeId);
        } else if (status != null && !status.isEmpty()) {
            loans = loanService.getLoansByStatus(Loan.LoanStatus.valueOf(status));
        } else {
            loans = loanService.getAllLoans();
        }

        return ResponseEntity.ok(loans);
    }

    /**
     * Get loan by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanDTO> getLoanById(@PathVariable UUID id) {
        log.info("Getting loan by ID: {}", id);
        LoanDTO loan = loanService.getLoanById(id);
        return ResponseEntity.ok(loan);
    }

    /**
     * Get loan by loan number
     */
    @GetMapping("/number/{loanNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanDTO> getLoanByNumber(@PathVariable String loanNumber) {
        log.info("Getting loan by number: {}", loanNumber);
        LoanDTO loan = loanService.getLoanByNumber(loanNumber);
        return ResponseEntity.ok(loan);
    }

    /**
     * Get loans by employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanDTO>> getLoansByEmployee(@PathVariable UUID employeeId) {
        log.info("Getting loans for employee: {}", employeeId);
        List<LoanDTO> loans = loanService.getLoansByEmployee(employeeId);
        return ResponseEntity.ok(loans);
    }

    /**
     * Get active loans
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanDTO>> getActiveLoans() {
        log.info("Getting active loans");
        List<LoanDTO> loans = loanService.getActiveLoans();
        return ResponseEntity.ok(loans);
    }

    /**
     * Create a new loan
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanDTO> createLoan(
            @Valid @RequestBody LoanDTO dto,
            @RequestParam(required = false) String createdBy,
            Principal principal) {
        String username = createdBy != null ? createdBy : (principal != null ? principal.getName() : "SYSTEM");
        log.info("Creating loan for employee {} by {}", dto.getEmployeeId(), username);
        LoanDTO created = loanService.createLoan(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update a loan
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanDTO> updateLoan(
            @PathVariable UUID id,
            @Valid @RequestBody LoanDTO dto,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Updating loan {} by {}", id, username);
        LoanDTO updated = loanService.updateLoan(id, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Cancel a loan
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanDTO> cancelLoan(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Cancelling loan {} by {}", id, username);
        LoanDTO cancelled = loanService.cancelLoan(id, username, reason != null ? reason : "Cancelled by user");
        return ResponseEntity.ok(cancelled);
    }

    // ===================================================
    // HR APPROVAL WORKFLOW
    // ===================================================

    /**
     * HR approves a loan
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanDTO> hrApproveLoan(
            @PathVariable UUID id,
            @RequestParam(required = false) String approvedBy,
            Principal principal) {
        String username = approvedBy != null ? approvedBy : (principal != null ? principal.getName() : "SYSTEM");
        log.info("HR approving loan {} by {}", id, username);
        LoanDTO approved = loanService.hrApproveLoan(id, username);
        return ResponseEntity.ok(approved);
    }

    /**
     * HR rejects a loan
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanDTO> hrRejectLoan(
            @PathVariable UUID id,
            @RequestParam(required = false) String rejectedBy,
            @RequestParam String reason,
            Principal principal) {
        String username = rejectedBy != null ? rejectedBy : (principal != null ? principal.getName() : "SYSTEM");
        log.info("HR rejecting loan {} by {}", id, username);
        LoanDTO rejected = loanService.hrRejectLoan(id, username, reason);
        return ResponseEntity.ok(rejected);
    }

    // ===================================================
    // FINANCE INTEGRATION ENDPOINTS
    // ===================================================

    /**
     * Send loan to Finance for approval
     */
    @PostMapping("/{id}/send-to-finance")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> sendToFinance(
            @PathVariable UUID id,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        UUID userId = null; // TODO: Get from principal
        log.info("Sending loan {} to Finance by {}", id, username);
        LoanFinanceRequestDTO request = loanService.sendToFinance(id, userId, username);
        return ResponseEntity.ok(request);
    }

    /**
     * Get pending finance requests
     */
    @GetMapping("/finance/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanFinanceRequestDTO>> getPendingFinanceRequests() {
        log.info("Getting pending finance requests");
        List<LoanFinanceRequestDTO> requests = loanService.getPendingFinanceRequests();
        return ResponseEntity.ok(requests);
    }

    /**
     * Get all active finance requests for dashboard
     */
    @GetMapping("/finance/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<List<LoanFinanceRequestDTO>> getActiveFinanceRequests() {
        log.info("Getting active finance requests");
        List<LoanFinanceRequestDTO> requests = loanService.getActiveFinanceRequests();
        return ResponseEntity.ok(requests);
    }

    /**
     * Get finance request by ID
     */
    @GetMapping("/finance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER', 'HR_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> getFinanceRequestById(@PathVariable UUID id) {
        log.info("Getting finance request by ID: {}", id);
        LoanFinanceRequestDTO request = loanService.getFinanceRequestById(id);
        return ResponseEntity.ok(request);
    }

    /**
     * Finance approves a loan with deduction plan
     */
    @PostMapping("/finance/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> financeApproveLoan(
            @Valid @RequestBody LoanFinanceActionDTO.ApproveRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        UUID userId = null; // TODO: Get from principal
        log.info("Finance approving loan request {} by {}", request.getRequestId(), username);
        LoanFinanceRequestDTO approved = loanService.financeApproveLoan(request, userId, username);
        return ResponseEntity.ok(approved);
    }

    /**
     * Finance rejects a loan
     */
    @PostMapping("/finance/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> financeRejectLoan(
            @Valid @RequestBody LoanFinanceActionDTO.RejectRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        UUID userId = null; // TODO: Get from principal
        log.info("Finance rejecting loan request {} by {}", request.getRequestId(), username);
        LoanFinanceRequestDTO rejected = loanService.financeRejectLoan(request, userId, username);
        return ResponseEntity.ok(rejected);
    }

    /**
     * Set disbursement source
     */
    @PostMapping("/finance/set-disbursement-source")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> setDisbursementSource(
            @Valid @RequestBody LoanFinanceActionDTO.SetDisbursementSourceRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        log.info("Setting disbursement source for request {}", request.getRequestId());
        LoanFinanceRequestDTO updated = loanService.setDisbursementSource(request, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Disburse loan to employee
     */
    @PostMapping("/finance/disburse")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanFinanceRequestDTO> disburseLoan(
            @Valid @RequestBody LoanFinanceActionDTO.DisbursementRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : "SYSTEM";
        UUID userId = null; // TODO: Get from principal
        log.info("Disbursing loan request {} by {}", request.getRequestId(), username);
        LoanFinanceRequestDTO disbursed = loanService.disburseLoan(request, userId, username);
        return ResponseEntity.ok(disbursed);
    }

    /**
     * Get Finance dashboard summary
     */
    @GetMapping("/finance/dashboard-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_MANAGER')")
    public ResponseEntity<LoanFinanceActionDTO.DashboardSummary> getFinanceDashboardSummary() {
        log.info("Getting Finance dashboard summary");
        LoanFinanceActionDTO.DashboardSummary summary = loanService.getFinanceDashboardSummary();
        return ResponseEntity.ok(summary);
    }

    // ===================================================
    // UTILITY ENDPOINTS
    // ===================================================

    /**
     * Get loan statuses
     */
    @GetMapping("/statuses")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<StatusInfo>> getLoanStatuses() {
        log.info("Getting loan statuses");
        List<StatusInfo> statuses = java.util.Arrays.stream(Loan.LoanStatus.values())
            .filter(s -> s != Loan.LoanStatus.PENDING && s != Loan.LoanStatus.APPROVED && s != Loan.LoanStatus.REJECTED)
            .map(s -> new StatusInfo(s.name(), getStatusDisplayName(s)))
            .toList();
        return ResponseEntity.ok(statuses);
    }

    /**
     * Get finance approval statuses
     */
    @GetMapping("/finance-statuses")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'FINANCE_MANAGER')")
    public ResponseEntity<List<StatusInfo>> getFinanceStatuses() {
        log.info("Getting finance statuses");
        List<StatusInfo> statuses = java.util.Arrays.stream(Loan.FinanceApprovalStatus.values())
            .map(s -> new StatusInfo(s.name(), s.name().replace("_", " ")))
            .toList();
        return ResponseEntity.ok(statuses);
    }

    private String getStatusDisplayName(Loan.LoanStatus status) {
        return switch (status) {
            case DRAFT -> "Draft";
            case PENDING_HR_APPROVAL -> "Pending HR Approval";
            case HR_APPROVED -> "HR Approved";
            case HR_REJECTED -> "HR Rejected";
            case PENDING_FINANCE -> "Pending Finance";
            case FINANCE_APPROVED -> "Finance Approved";
            case FINANCE_REJECTED -> "Finance Rejected";
            case DISBURSED -> "Disbursed";
            case ACTIVE -> "Active";
            case COMPLETED -> "Completed";
            case CANCELLED -> "Cancelled";
            default -> status.name();
        };
    }

    /**
     * Status info record
     */
    public record StatusInfo(String code, String displayName) {}
}
