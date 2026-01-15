package com.example.backend.controllers.finance.balances;

import com.example.backend.dto.finance.balances.CashWithPersonRequestDTO;
import com.example.backend.dto.finance.balances.CashWithPersonResponseDTO;
import com.example.backend.services.finance.balances.CashWithPersonService;
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
@RequestMapping("/api/v1/finance/balances/cash-with-persons")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CashWithPersonController {

    private final CashWithPersonService cashWithPersonService;

    @PostMapping
    public ResponseEntity<CashWithPersonResponseDTO> create(
            @Valid @RequestBody CashWithPersonRequestDTO requestDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        CashWithPersonResponseDTO response = cashWithPersonService.create(requestDTO, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CashWithPersonResponseDTO> getById(@PathVariable UUID id) {
        CashWithPersonResponseDTO response = cashWithPersonService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<CashWithPersonResponseDTO>> getAll() {
        List<CashWithPersonResponseDTO> response = cashWithPersonService.getAll();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    public ResponseEntity<List<CashWithPersonResponseDTO>> getAllActive() {
        List<CashWithPersonResponseDTO> response = cashWithPersonService.getAllActive();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CashWithPersonResponseDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody CashWithPersonRequestDTO requestDTO) {
        CashWithPersonResponseDTO response = cashWithPersonService.update(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        cashWithPersonService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<CashWithPersonResponseDTO> deactivate(@PathVariable UUID id) {
        CashWithPersonResponseDTO response = cashWithPersonService.deactivate(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<CashWithPersonResponseDTO> activate(@PathVariable UUID id) {
        CashWithPersonResponseDTO response = cashWithPersonService.activate(id);
        return ResponseEntity.ok(response);
    }
}