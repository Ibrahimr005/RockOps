package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.RepaymentScheduleDTO;
import com.example.backend.services.payroll.LoanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll/loans")
@RequiredArgsConstructor
@Slf4j
public class LoanController {

    private final LoanService loanService;

    /**
     * Create new loan
     */
    @PostMapping
    public ResponseEntity<LoanDTO> createLoan(
            @RequestBody LoanDTO loanDTO,
            @RequestParam(defaultValue = "SYSTEM") String createdBy) {

        LoanDTO createdLoan = loanService.createLoan(loanDTO, createdBy);
        return ResponseEntity.ok(createdLoan);
    }

    /**
     * Get loan by ID
     */
    @GetMapping("/{loanId}")
    public ResponseEntity<LoanDTO> getLoanById(@PathVariable UUID loanId) {
        LoanDTO loan = loanService.getLoanById(loanId);
        return ResponseEntity.ok(loan);
    }

    /**
     * Update loan
     */
    @PutMapping("/{loanId}")
    public ResponseEntity<LoanDTO> updateLoan(
            @PathVariable UUID loanId,
            @RequestBody LoanDTO loanDTO) {
        LoanDTO updatedLoan = loanService.updateLoan(loanId, loanDTO);
        return ResponseEntity.ok(updatedLoan);
    }

    /**
     * Delete/Cancel loan
     */
    @DeleteMapping("/{loanId}")
    public ResponseEntity<Void> cancelLoan(@PathVariable UUID loanId) {
        loanService.cancelLoan(loanId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get loans by employee
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LoanDTO>> getLoansByEmployee(@PathVariable UUID employeeId) {
        List<LoanDTO> loans = loanService.getLoansByEmployee(employeeId);
        return ResponseEntity.ok(loans);
    }

    /**
     * Get active loans
     */
    @GetMapping("/active")
    public ResponseEntity<List<LoanDTO>> getActiveLoans() {
        List<LoanDTO> loans = loanService.getActiveLoans();
        return ResponseEntity.ok(loans);
    }

    /**
     * Get overdue loans
     */
    @GetMapping("/overdue")
    public ResponseEntity<List<LoanDTO>> getOverdueLoans() {
        List<LoanDTO> loans = loanService.getOverdueLoans();
        return ResponseEntity.ok(loans);
    }

    /**
     * Get loans by status
     */
    @GetMapping
    public ResponseEntity<List<LoanDTO>> getLoansByStatus(@RequestParam(required = false) String status) {
        List<LoanDTO> loans;
        if (status != null && !status.isEmpty()) {
            loans = loanService.getLoansByStatus(status);
        } else {
            loans = loanService.getActiveLoans();
        }
        return ResponseEntity.ok(loans);
    }

    /**
     * Get loan statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Object> getLoanStatistics() {
        Object statistics = loanService.getLoanStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get loan repayment schedule
     */
    @GetMapping("/{loanId}/schedule")
    public ResponseEntity<List<RepaymentScheduleDTO>> getRepaymentSchedule(@PathVariable UUID loanId) {
        List<RepaymentScheduleDTO> schedule = loanService.getRepaymentSchedule(loanId);
        return ResponseEntity.ok(schedule);
    }

    /**
     * Approve loan
     */
    @PostMapping("/{loanId}/approve")
    public ResponseEntity<LoanDTO> approveLoan(
            @PathVariable UUID loanId,
            @RequestParam(defaultValue = "SYSTEM") String approvedBy) {
        LoanDTO approvedLoan = loanService.approveLoan(loanId, approvedBy);
        return ResponseEntity.ok(approvedLoan);
    }

    /**
     * Reject loan
     */
    @PostMapping("/{loanId}/reject")
    public ResponseEntity<LoanDTO> rejectLoan(
            @PathVariable UUID loanId,
            @RequestParam(defaultValue = "SYSTEM") String rejectedBy,
            @RequestParam(defaultValue = "") String reason) {
        LoanDTO rejectedLoan = loanService.rejectLoan(loanId, rejectedBy, reason);
        return ResponseEntity.ok(rejectedLoan);
    }

    /**
     * Get total outstanding balance for employee
     */
    @GetMapping("/employee/{employeeId}/outstanding-balance")
    public ResponseEntity<BigDecimal> getOutstandingBalance(@PathVariable UUID employeeId) {
        BigDecimal balance = loanService.getTotalOutstandingBalanceByEmployee(employeeId);
        return ResponseEntity.ok(balance);
    }

    /**
     * Process loan repayment
     */
    @PostMapping("/repayments/{scheduleId}/pay")
    public ResponseEntity<Void> processRepayment(
            @PathVariable UUID scheduleId,
            @RequestParam BigDecimal amount) {

        loanService.processLoanRepayment(scheduleId, amount);
        return ResponseEntity.ok().build();
    }
}