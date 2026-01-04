package com.example.backend.controllers.finance.balances;

import com.example.backend.dto.finance.balances.BalanceTransactionRequestDTO;
import com.example.backend.dto.finance.balances.BalanceTransactionResponseDTO;
import com.example.backend.dto.finance.balances.TransactionApprovalDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.finance.balances.BalanceTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/balances/transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BalanceTransactionController {

    private final BalanceTransactionService balanceTransactionService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<BalanceTransactionResponseDTO> createTransaction(
            @Valid @RequestBody BalanceTransactionRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        String username = userDetails != null ? userDetails.getUsername() : "system";
        Role userRole = getUserRole(username);

        BalanceTransactionResponseDTO response = balanceTransactionService.createTransaction(
                requestDTO, username, userRole);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<BalanceTransactionResponseDTO> approveTransaction(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String username = userDetails != null ? userDetails.getUsername() : "system";
        BalanceTransactionResponseDTO response = balanceTransactionService.approveTransaction(id, username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<BalanceTransactionResponseDTO> rejectTransaction(
            @PathVariable UUID id,
            @RequestBody TransactionApprovalDTO approvalDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        String username = userDetails != null ? userDetails.getUsername() : "system";
        BalanceTransactionResponseDTO response = balanceTransactionService.rejectTransaction(
                id, username, approvalDTO.getRejectionReason());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BalanceTransactionResponseDTO> getById(@PathVariable UUID id) {
        BalanceTransactionResponseDTO response = balanceTransactionService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<BalanceTransactionResponseDTO>> getAll() {
        List<BalanceTransactionResponseDTO> response = balanceTransactionService.getAll();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<BalanceTransactionResponseDTO>> getPendingTransactions() {
        List<BalanceTransactionResponseDTO> response = balanceTransactionService.getPendingTransactions();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending/count")
    public ResponseEntity<Long> getPendingTransactionCount() {
        long count = balanceTransactionService.getPendingTransactionCount();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/account/{accountType}/{accountId}")
    public ResponseEntity<List<BalanceTransactionResponseDTO>> getTransactionsByAccount(
            @PathVariable AccountType accountType,
            @PathVariable UUID accountId) {
        List<BalanceTransactionResponseDTO> response = balanceTransactionService.getTransactionsByAccount(
                accountType, accountId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<BalanceTransactionResponseDTO>> getTransactionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<BalanceTransactionResponseDTO> response = balanceTransactionService.getTransactionsByDateRange(
                startDate, endDate);
        return ResponseEntity.ok(response);
    }

    private Role getUserRole(String username) {
        return userRepository.findByUsername(username)
                .map(User::getRole)
                .orElse(Role.FINANCE_EMPLOYEE);
    }
}