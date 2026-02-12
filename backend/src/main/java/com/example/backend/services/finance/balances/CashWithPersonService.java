package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.CashWithPersonRequestDTO;
import com.example.backend.dto.finance.balances.CashWithPersonResponseDTO;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
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
public class CashWithPersonService {

    private final CashWithPersonRepository cashWithPersonRepository;

    public CashWithPersonResponseDTO create(CashWithPersonRequestDTO requestDTO, String createdBy) {
        CashWithPerson cashWithPerson = CashWithPerson.builder()
                .personName(requestDTO.getPersonName())
                .phoneNumber(requestDTO.getPhoneNumber())
                .email(requestDTO.getEmail())
                .address(requestDTO.getAddress())
                .personalBankAccountNumber(requestDTO.getPersonalBankAccountNumber())
                .personalBankName(requestDTO.getPersonalBankName())
                .currentBalance(requestDTO.getCurrentBalance())
                .availableBalance(requestDTO.getCurrentBalance())  // ADD THIS LINE
                .totalBalance(requestDTO.getCurrentBalance())      // ADD THIS LINE
                .reservedBalance(BigDecimal.ZERO)
                .isActive(requestDTO.getIsActive() != null ? requestDTO.getIsActive() : true)
                .notes(requestDTO.getNotes())
                .createdBy(createdBy)
                .build();

        CashWithPerson saved = cashWithPersonRepository.save(cashWithPerson);
        return CashWithPersonResponseDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public CashWithPersonResponseDTO getById(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        return CashWithPersonResponseDTO.fromEntity(cashWithPerson);
    }

    @Transactional(readOnly = true)
    public List<CashWithPersonResponseDTO> getAll() {
        return cashWithPersonRepository.findAll().stream()
                .map(CashWithPersonResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CashWithPersonResponseDTO> getAllActive() {
        return cashWithPersonRepository.findByIsActiveTrue().stream()
                .map(CashWithPersonResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CashWithPersonResponseDTO update(UUID id, CashWithPersonRequestDTO requestDTO) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));

        cashWithPerson.setPersonName(requestDTO.getPersonName());
        cashWithPerson.setPhoneNumber(requestDTO.getPhoneNumber());
        cashWithPerson.setEmail(requestDTO.getEmail());
        cashWithPerson.setAddress(requestDTO.getAddress());
        cashWithPerson.setPersonalBankAccountNumber(requestDTO.getPersonalBankAccountNumber());
        cashWithPerson.setPersonalBankName(requestDTO.getPersonalBankName());
        cashWithPerson.setCurrentBalance(requestDTO.getCurrentBalance());
        cashWithPerson.setIsActive(requestDTO.getIsActive());
        cashWithPerson.setNotes(requestDTO.getNotes());

        CashWithPerson updated = cashWithPersonRepository.save(cashWithPerson);
        return CashWithPersonResponseDTO.fromEntity(updated);
    }

    public void delete(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        cashWithPersonRepository.delete(cashWithPerson);
    }

    public CashWithPersonResponseDTO deactivate(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        cashWithPerson.setIsActive(false);
        CashWithPerson updated = cashWithPersonRepository.save(cashWithPerson);
        return CashWithPersonResponseDTO.fromEntity(updated);
    }

    public CashWithPersonResponseDTO activate(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        cashWithPerson.setIsActive(true);
        CashWithPerson updated = cashWithPersonRepository.save(cashWithPerson);
        return CashWithPersonResponseDTO.fromEntity(updated);
    }

    // Internal method for balance updates (used by transaction service)
    public void updateBalance(UUID id, BigDecimal newBalance) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        cashWithPerson.setCurrentBalance(newBalance);
        cashWithPerson.setAvailableBalance(newBalance);   // ← ADD THIS LINE
        cashWithPerson.setTotalBalance(newBalance);
        cashWithPersonRepository.save(cashWithPerson);
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        return cashWithPerson.getCurrentBalance();
    }

    @Transactional(readOnly = true)
    public String getAccountName(UUID id) {
        CashWithPerson cashWithPerson = cashWithPersonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cash with person not found with ID: " + id));
        return cashWithPerson.getPersonName();
    }
}