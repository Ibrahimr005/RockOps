package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.TransactionMatchRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.TransactionMatchResponseDTO;
import com.example.backend.services.finance.bankReconciliation.TransactionMatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transaction-matches")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TransactionMatchController {

    private final TransactionMatchService transactionMatchService;

    @PostMapping
    public ResponseEntity<TransactionMatchResponseDTO> createTransactionMatch(
            @Valid @RequestBody TransactionMatchRequestDTO requestDTO) {
        TransactionMatchResponseDTO response = transactionMatchService.createTransactionMatch(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TransactionMatchResponseDTO>> getAllTransactionMatches() {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.getAllTransactionMatches();
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionMatchResponseDTO> getTransactionMatchById(@PathVariable UUID id) {
        TransactionMatchResponseDTO match = transactionMatchService.getTransactionMatchById(id);
        return ResponseEntity.ok(match);
    }

    @GetMapping("/unconfirmed")
    public ResponseEntity<List<TransactionMatchResponseDTO>> getUnconfirmedMatches() {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.getUnconfirmedMatches();
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/bank-account/{bankAccountId}")
    public ResponseEntity<List<TransactionMatchResponseDTO>> getMatchesByBankAccount(
            @PathVariable UUID bankAccountId) {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.getMatchesByBankAccount(bankAccountId);
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/needs-review")
    public ResponseEntity<List<TransactionMatchResponseDTO>> getMatchesNeedingReview(
            @RequestParam(defaultValue = "0.5") Double confidenceThreshold) {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.getMatchesNeedingReview(confidenceThreshold);
        return ResponseEntity.ok(matches);
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<TransactionMatchResponseDTO> confirmTransactionMatch(
            @PathVariable UUID id,
            @RequestParam String confirmedBy) {
        TransactionMatchResponseDTO response = transactionMatchService.confirmTransactionMatch(id, confirmedBy);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransactionMatch(@PathVariable UUID id) {
        transactionMatchService.deleteTransactionMatch(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auto-match/bank-account/{bankAccountId}")
    public ResponseEntity<List<TransactionMatchResponseDTO>> performAutoMatching(
            @PathVariable UUID bankAccountId) {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.performAutoMatching(bankAccountId);
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/potential-matches/bank-statement-entry/{bankStatementEntryId}")
    public ResponseEntity<List<TransactionMatchResponseDTO>> findPotentialMatches(
            @PathVariable UUID bankStatementEntryId) {
        List<TransactionMatchResponseDTO> matches = transactionMatchService.findPotentialMatches(bankStatementEntryId);
        return ResponseEntity.ok(matches);
    }
}