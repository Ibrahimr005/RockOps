package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.BankStatementEntryRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.BankStatementEntryResponseDTO;
import com.example.backend.services.finance.bankReconciliation.BankStatementEntryService;
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
@RequestMapping("/api/v1/bank-statement-entries")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BankStatementEntryController {

    private final BankStatementEntryService bankStatementEntryService;

    @PostMapping
    public ResponseEntity<BankStatementEntryResponseDTO> createBankStatementEntry(
            @Valid @RequestBody BankStatementEntryRequestDTO requestDTO) {
        BankStatementEntryResponseDTO response = bankStatementEntryService.createBankStatementEntry(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/import")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> importBankStatementEntries(
            @Valid @RequestBody List<BankStatementEntryRequestDTO> requestDTOs) {
        List<BankStatementEntryResponseDTO> responses = bankStatementEntryService.importBankStatementEntries(requestDTOs);
        return new ResponseEntity<>(responses, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getAllBankStatementEntries() {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getAllBankStatementEntries();
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankStatementEntryResponseDTO> getBankStatementEntryById(@PathVariable UUID id) {
        BankStatementEntryResponseDTO entry = bankStatementEntryService.getBankStatementEntryById(id);
        return ResponseEntity.ok(entry);
    }

    @GetMapping("/bank-account/{bankAccountId}")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getEntriesByBankAccount(
            @PathVariable UUID bankAccountId) {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getEntriesByBankAccount(bankAccountId);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/unmatched")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getUnmatchedEntries() {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getUnmatchedEntries();
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/unmatched/bank-account/{bankAccountId}")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getUnmatchedEntriesByBankAccount(
            @PathVariable UUID bankAccountId) {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getUnmatchedEntriesByBankAccount(bankAccountId);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getEntriesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getEntriesByDateRange(startDate, endDate);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> getEntriesByCategory(
            @PathVariable String category) {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.getEntriesByCategory(category);
        return ResponseEntity.ok(entries);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankStatementEntryResponseDTO> updateBankStatementEntry(
            @PathVariable UUID id,
            @Valid @RequestBody BankStatementEntryRequestDTO requestDTO) {
        BankStatementEntryResponseDTO response = bankStatementEntryService.updateBankStatementEntry(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBankStatementEntry(@PathVariable UUID id) {
        bankStatementEntryService.deleteBankStatementEntry(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/match")
    public ResponseEntity<BankStatementEntryResponseDTO> markAsMatched(
            @PathVariable UUID id,
            @RequestParam String matchedBy) {
        BankStatementEntryResponseDTO response = bankStatementEntryService.markAsMatched(id, matchedBy);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/potential-matches")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> findPotentialMatches(
            @RequestParam UUID bankAccountId,
            @RequestParam BigDecimal amount,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<BankStatementEntryResponseDTO> matches = bankStatementEntryService.findPotentialMatches(bankAccountId, amount, date);
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/search")
    public ResponseEntity<List<BankStatementEntryResponseDTO>> searchByDescription(
            @RequestParam UUID bankAccountId,
            @RequestParam String keyword) {
        List<BankStatementEntryResponseDTO> entries = bankStatementEntryService.searchByDescription(bankAccountId, keyword);
        return ResponseEntity.ok(entries);
    }
}