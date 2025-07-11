package com.example.backend.controllers.finance;

import com.example.backend.dto.finance.AccountingPeriodRequestDTO;
import com.example.backend.dto.finance.AccountingPeriodResponseDTO;
import com.example.backend.models.user.User;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.finance.AccountingPeriodService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounting-periods")
public class AccountingPeriodController {

    private final AccountingPeriodService accountingPeriodService;
    private final UserRepository userRepository;

    @Autowired
    public AccountingPeriodController(AccountingPeriodService accountingPeriodService,
                                      UserRepository userRepository) {
        this.accountingPeriodService = accountingPeriodService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<AccountingPeriodResponseDTO>> getAllPeriods() {
        List<AccountingPeriodResponseDTO> periods = accountingPeriodService.getAllPeriods();
        return ResponseEntity.ok(periods);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountingPeriodResponseDTO> getPeriodById(@PathVariable UUID id) {
        AccountingPeriodResponseDTO period = accountingPeriodService.getPeriodById(id);
        return ResponseEntity.ok(period);
    }

    @PostMapping
    public ResponseEntity<AccountingPeriodResponseDTO> createPeriod(
            @RequestBody AccountingPeriodRequestDTO requestDTO) {
        try {
            // Get the currently logged-in user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));

            // Pass the current user to the service method
            AccountingPeriodResponseDTO response = accountingPeriodService.createPeriod(requestDTO, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<AccountingPeriodResponseDTO> closePeriod(
            @PathVariable UUID id,
            @RequestBody Map<String, String> closeData) {
        try {
            String notes = closeData.getOrDefault("notes", "");

            // Get the currently logged-in user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));

            AccountingPeriodResponseDTO response = accountingPeriodService.closePeriod(id, notes, currentUser.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
}