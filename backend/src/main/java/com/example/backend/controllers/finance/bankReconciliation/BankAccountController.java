package com.example.backend.controllers.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.BankAccountRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.BankAccountResponseDTO;
import com.example.backend.services.finance.bankReconciliation.BankAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bank-accounts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BankAccountController {

    private final BankAccountService bankAccountService;

    @PostMapping
    public ResponseEntity<BankAccountResponseDTO> createBankAccount(
            @Valid @RequestBody BankAccountRequestDTO requestDTO) {
        BankAccountResponseDTO response = bankAccountService.createBankAccount(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<BankAccountResponseDTO>> getAllActiveBankAccounts() {
        List<BankAccountResponseDTO> accounts = bankAccountService.getAllActiveBankAccounts();
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankAccountResponseDTO> getBankAccountById(@PathVariable UUID id) {
        BankAccountResponseDTO account = bankAccountService.getBankAccountById(id);
        return ResponseEntity.ok(account);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankAccountResponseDTO> updateBankAccount(
            @PathVariable UUID id,
            @Valid @RequestBody BankAccountRequestDTO requestDTO) {
        BankAccountResponseDTO response = bankAccountService.updateBankAccount(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateBankAccount(@PathVariable UUID id) {
        bankAccountService.deactivateBankAccount(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/balance")
    public ResponseEntity<BankAccountResponseDTO> updateAccountBalance(
            @PathVariable UUID id,
            @RequestParam BigDecimal balance) {
        BankAccountResponseDTO response = bankAccountService.updateAccountBalance(id, balance);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<BankAccountResponseDTO>> searchAccountsByName(
            @RequestParam String searchTerm) {
        List<BankAccountResponseDTO> accounts = bankAccountService.searchAccountsByName(searchTerm);
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/balance-above")
    public ResponseEntity<List<BankAccountResponseDTO>> getAccountsWithBalanceAbove(
            @RequestParam BigDecimal minBalance) {
        List<BankAccountResponseDTO> accounts = bankAccountService.getAccountsWithBalanceAbove(minBalance);
        return ResponseEntity.ok(accounts);
    }
}