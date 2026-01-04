package com.example.backend.controllers.finance.balances;

import com.example.backend.dto.finance.balances.BankAccountRequestDTO;
import com.example.backend.dto.finance.balances.BankAccountResponseDTO;
import com.example.backend.services.finance.balances.BankAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/balances/bank-accounts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BankAccountController {

    private final BankAccountService bankAccountService;

    @PostMapping
    public ResponseEntity<BankAccountResponseDTO> create(
            @Valid @RequestBody BankAccountRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        BankAccountResponseDTO response = bankAccountService.create(requestDTO, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankAccountResponseDTO> getById(@PathVariable UUID id) {
        BankAccountResponseDTO response = bankAccountService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<BankAccountResponseDTO>> getAll() {
        List<BankAccountResponseDTO> response = bankAccountService.getAll();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    public ResponseEntity<List<BankAccountResponseDTO>> getAllActive() {
        List<BankAccountResponseDTO> response = bankAccountService.getAllActive();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankAccountResponseDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody BankAccountRequestDTO requestDTO) {
        BankAccountResponseDTO response = bankAccountService.update(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        bankAccountService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<BankAccountResponseDTO> deactivate(@PathVariable UUID id) {
        BankAccountResponseDTO response = bankAccountService.deactivate(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<BankAccountResponseDTO> activate(@PathVariable UUID id) {
        BankAccountResponseDTO response = bankAccountService.activate(id);
        return ResponseEntity.ok(response);
    }
}