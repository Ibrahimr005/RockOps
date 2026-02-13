package com.example.backend.controllers.finance.loans;

import com.example.backend.dto.finance.loans.*;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.services.finance.loans.CompanyLoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/loans/company-loans")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CompanyLoanController {

    private final CompanyLoanService loanService;

    /**
     * Create a new company loan
     */
//    @PostMapping
//    public ResponseEntity<CompanyLoanResponseDTO> createLoan(
//            @Valid @RequestBody CreateCompanyLoanRequestDTO requestDTO,
//            @AuthenticationPrincipal UserDetails userDetails) {
//        String username = userDetails != null ? userDetails.getUsername() : "system";
//        CompanyLoanResponseDTO response = loanService.createLoan(requestDTO, username);
//        return ResponseEntity.status(HttpStatus.CREATED).body(response);
//    }
    @PostMapping
    public ResponseEntity<CompanyLoanResponseDTO> createLoan(
            @Valid @RequestBody CreateCompanyLoanRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        CompanyLoanResponseDTO response = loanService.createLoan(requestDTO, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get loan by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<CompanyLoanResponseDTO> getById(@PathVariable UUID id) {
        CompanyLoanResponseDTO response = loanService.getById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get loan by loan number
     */
    @GetMapping("/number/{loanNumber}")
    public ResponseEntity<CompanyLoanResponseDTO> getByLoanNumber(@PathVariable String loanNumber) {
        CompanyLoanResponseDTO response = loanService.getByLoanNumber(loanNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all loans
     */
    @GetMapping
    public ResponseEntity<List<CompanyLoanSummaryDTO>> getAllLoans() {
        List<CompanyLoanSummaryDTO> response = loanService.getAllLoans();
        return ResponseEntity.ok(response);
    }

    /**
     * Get active loans
     */
    @GetMapping("/active")
    public ResponseEntity<List<CompanyLoanSummaryDTO>> getActiveLoans() {
        List<CompanyLoanSummaryDTO> response = loanService.getActiveLoans();
        return ResponseEntity.ok(response);
    }

    /**
     * Get loans by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<CompanyLoanSummaryDTO>> getLoansByStatus(@PathVariable CompanyLoanStatus status) {
        List<CompanyLoanSummaryDTO> response = loanService.getLoansByStatus(status);
        return ResponseEntity.ok(response);
    }

    /**
     * Get loans by institution
     */
    @GetMapping("/institution/{institutionId}")
    public ResponseEntity<List<CompanyLoanSummaryDTO>> getLoansByInstitution(@PathVariable UUID institutionId) {
        List<CompanyLoanSummaryDTO> response = loanService.getLoansByInstitution(institutionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get installments for a loan
     */
    @GetMapping("/{id}/installments")
    public ResponseEntity<List<LoanInstallmentResponseDTO>> getLoanInstallments(@PathVariable UUID id) {
        List<LoanInstallmentResponseDTO> response = loanService.getLoanInstallments(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Update loan status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<CompanyLoanResponseDTO> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        CompanyLoanStatus newStatus = CompanyLoanStatus.valueOf(body.get("status"));
        CompanyLoanResponseDTO response = loanService.updateStatus(id, newStatus, username);
        return ResponseEntity.ok(response);
    }

    /**
     * Get upcoming installments (next X days)
     */
    @GetMapping("/installments/upcoming")
    public ResponseEntity<List<LoanInstallmentResponseDTO>> getUpcomingInstallments(
            @RequestParam(defaultValue = "30") int days) {
        List<LoanInstallmentResponseDTO> response = loanService.getUpcomingInstallments(days);
        return ResponseEntity.ok(response);
    }

    /**
     * Get overdue installments
     */
    @GetMapping("/installments/overdue")
    public ResponseEntity<List<LoanInstallmentResponseDTO>> getOverdueInstallments() {
        List<LoanInstallmentResponseDTO> response = loanService.getOverdueInstallments();
        return ResponseEntity.ok(response);
    }
}