package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.InternalTransactionRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.InternalTransactionResponseDTO;
import com.example.backend.models.finance.bankReconciliation.TransactionType;
import com.example.backend.services.finance.bankReconciliation.InternalTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal-transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InternalTransactionController {

    private final InternalTransactionService internalTransactionService;

    @PostMapping
    public ResponseEntity<InternalTransactionResponseDTO> createInternalTransaction(
            @Valid @RequestBody InternalTransactionRequestDTO requestDTO) {
        InternalTransactionResponseDTO response = internalTransactionService.createInternalTransaction(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<InternalTransactionResponseDTO>> getAllInternalTransactions() {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getAllInternalTransactions();
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InternalTransactionResponseDTO> getInternalTransactionById(@PathVariable UUID id) {
        InternalTransactionResponseDTO transaction = internalTransactionService.getInternalTransactionById(id);
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/bank-account/{bankAccountId}")
    public ResponseEntity<List<InternalTransactionResponseDTO>> getTransactionsByBankAccount(
            @PathVariable UUID bankAccountId) {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getTransactionsByBankAccount(bankAccountId);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/unreconciled")
    public ResponseEntity<List<InternalTransactionResponseDTO>> getUnreconciledTransactions() {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getUnreconciledTransactions();
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/unreconciled/bank-account/{bankAccountId}")
    public ResponseEntity<List<InternalTransactionResponseDTO>> getUnreconciledTransactionsByBankAccount(
            @PathVariable UUID bankAccountId) {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getUnreconciledTransactionsByBankAccount(bankAccountId);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<InternalTransactionResponseDTO>> getTransactionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getTransactionsByDateRange(startDate, endDate);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/type/{transactionType}")
    public ResponseEntity<List<InternalTransactionResponseDTO>> getTransactionsByType(
            @PathVariable TransactionType transactionType) {
        List<InternalTransactionResponseDTO> transactions = internalTransactionService.getTransactionsByType(transactionType);
        return ResponseEntity.ok(transactions);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InternalTransactionResponseDTO> updateInternalTransaction(
            @PathVariable UUID id,
            @Valid @RequestBody InternalTransactionRequestDTO requestDTO) {
        InternalTransactionResponseDTO response = internalTransactionService.updateInternalTransaction(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInternalTransaction(@PathVariable UUID id) {
        internalTransactionService.deleteInternalTransaction(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reconcile")
    public ResponseEntity<InternalTransactionResponseDTO> markAsReconciled(
            @PathVariable UUID id,
            @RequestParam String reconciledBy) {
        InternalTransactionResponseDTO response = internalTransactionService.markAsReconciled(id, reconciledBy);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/potential-matches")
    public ResponseEntity<List<InternalTransactionResponseDTO>> findPotentialMatches(
            @RequestParam UUID bankAccountId,
            @RequestParam BigDecimal amount,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<InternalTransactionResponseDTO> matches = internalTransactionService.findPotentialMatches(bankAccountId, amount, date);
        return ResponseEntity.ok(matches);
    }
}