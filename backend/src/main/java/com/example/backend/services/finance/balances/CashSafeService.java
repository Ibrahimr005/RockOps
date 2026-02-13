package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.CashSafeRequestDTO;
import com.example.backend.dto.finance.balances.CashSafeResponseDTO;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CashSafeService {

    private final CashSafeRepository cashSafeRepository;

    public CashSafeResponseDTO create(CashSafeRequestDTO requestDTO, String createdBy) {
        CashSafe cashSafe = CashSafe.builder()
                .safeName(requestDTO.getSafeName())
                .location(requestDTO.getLocation())
                .currentBalance(requestDTO.getCurrentBalance())
                .availableBalance(requestDTO.getCurrentBalance())  // ADD THIS LINE
                .totalBalance(requestDTO.getCurrentBalance())      // ADD THIS LINE
                .reservedBalance(BigDecimal.ZERO)
                .isActive(requestDTO.getIsActive() != null ? requestDTO.getIsActive() : true)
                .notes(requestDTO.getNotes())
                .createdBy(createdBy)
                .build();

        CashSafe saved = cashSafeRepository.save(cashSafe);
        return CashSafeResponseDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public CashSafeResponseDTO getById(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        return CashSafeResponseDTO.fromEntity(cashSafe);
    }

    @Transactional(readOnly = true)
    public List<CashSafeResponseDTO> getAll() {
        return cashSafeRepository.findAll().stream()
                .map(CashSafeResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CashSafeResponseDTO> getAllActive() {
        return cashSafeRepository.findByIsActiveTrue().stream()
                .map(CashSafeResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CashSafeResponseDTO update(UUID id, CashSafeRequestDTO requestDTO) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));

        cashSafe.setSafeName(requestDTO.getSafeName());
        cashSafe.setLocation(requestDTO.getLocation());
        cashSafe.setCurrentBalance(requestDTO.getCurrentBalance());
        cashSafe.setIsActive(requestDTO.getIsActive());
        cashSafe.setNotes(requestDTO.getNotes());

        CashSafe updated = cashSafeRepository.save(cashSafe);
        return CashSafeResponseDTO.fromEntity(updated);
    }

    public void delete(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        cashSafeRepository.delete(cashSafe);
    }

    public CashSafeResponseDTO deactivate(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        cashSafe.setIsActive(false);
        CashSafe updated = cashSafeRepository.save(cashSafe);
        return CashSafeResponseDTO.fromEntity(updated);
    }

    public CashSafeResponseDTO activate(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        cashSafe.setIsActive(true);
        CashSafe updated = cashSafeRepository.save(cashSafe);
        return CashSafeResponseDTO.fromEntity(updated);
    }

    // Internal method for balance updates (used by transaction service)
    public void updateBalance(UUID id, BigDecimal newBalance) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        cashSafe.setCurrentBalance(newBalance);
        cashSafe.setAvailableBalance(newBalance);   // ← ADD THIS LINE
        cashSafe.setTotalBalance(newBalance);
        cashSafeRepository.save(cashSafe);
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        return cashSafe.getCurrentBalance();
    }

    @Transactional(readOnly = true)
    public String getAccountName(UUID id) {
        CashSafe cashSafe = cashSafeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash safe not found with ID: " + id));
        return cashSafe.getSafeName() + " (" + cashSafe.getLocation() + ")";
    }
}