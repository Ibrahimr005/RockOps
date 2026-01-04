package com.example.backend.controllers.finance.balances;

import com.example.backend.dto.finance.balances.CashSafeRequestDTO;
import com.example.backend.dto.finance.balances.CashSafeResponseDTO;
import com.example.backend.services.finance.balances.CashSafeService;
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
@RequestMapping("/api/v1/finance/balances/cash-safes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CashSafeController {

    private final CashSafeService cashSafeService;

    @PostMapping
    public ResponseEntity<CashSafeResponseDTO> create(
            @Valid @RequestBody CashSafeRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        CashSafeResponseDTO response = cashSafeService.create(requestDTO, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CashSafeResponseDTO> getById(@PathVariable UUID id) {
        CashSafeResponseDTO response = cashSafeService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<CashSafeResponseDTO>> getAll() {
        List<CashSafeResponseDTO> response = cashSafeService.getAll();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    public ResponseEntity<List<CashSafeResponseDTO>> getAllActive() {
        List<CashSafeResponseDTO> response = cashSafeService.getAllActive();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CashSafeResponseDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody CashSafeRequestDTO requestDTO) {
        CashSafeResponseDTO response = cashSafeService.update(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        cashSafeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<CashSafeResponseDTO> deactivate(@PathVariable UUID id) {
        CashSafeResponseDTO response = cashSafeService.deactivate(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<CashSafeResponseDTO> activate(@PathVariable UUID id) {
        CashSafeResponseDTO response = cashSafeService.activate(id);
        return ResponseEntity.ok(response);
    }
}