package com.example.backend.services.finance.balances;

import com.example.backend.dto.finance.balances.BankAccountRequestDTO;
import com.example.backend.dto.finance.balances.BankAccountResponseDTO;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
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
public class BankAccountService {

    private final BankAccountRepository bankAccountRepository;

    public BankAccountResponseDTO create(BankAccountRequestDTO requestDTO, String createdBy) {
        if (bankAccountRepository.existsByAccountNumber(requestDTO.getAccountNumber())) {
            throw new IllegalArgumentException("Bank account with this account number already exists");
        }

        BankAccount bankAccount = BankAccount.builder()
                .bankName(requestDTO.getBankName())
                .accountNumber(requestDTO.getAccountNumber())
                .iban(requestDTO.getIban())
                .branchName(requestDTO.getBranchName())
                .branchCode(requestDTO.getBranchCode())
                .swiftCode(requestDTO.getSwiftCode())
                .accountHolderName(requestDTO.getAccountHolderName())
                .currentBalance(requestDTO.getCurrentBalance())
                .availableBalance(requestDTO.getCurrentBalance())  // ADD THIS LINE
                .totalBalance(requestDTO.getCurrentBalance())      // ADD THIS LINE
                .reservedBalance(BigDecimal.ZERO)
                .openingDate(requestDTO.getOpeningDate())
                .isActive(requestDTO.getIsActive() != null ? requestDTO.getIsActive() : true)
                .notes(requestDTO.getNotes())
                .createdBy(createdBy)
                .build();

        BankAccount saved = bankAccountRepository.save(bankAccount);
        return BankAccountResponseDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public BankAccountResponseDTO getById(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        return BankAccountResponseDTO.fromEntity(bankAccount);
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponseDTO> getAll() {
        return bankAccountRepository.findAll().stream()
                .map(BankAccountResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BankAccountResponseDTO> getAllActive() {
        return bankAccountRepository.findByIsActiveTrue().stream()
                .map(BankAccountResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public BankAccountResponseDTO update(UUID id, BankAccountRequestDTO requestDTO) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));

        // Check if account number is being changed and if new number already exists
        if (!bankAccount.getAccountNumber().equals(requestDTO.getAccountNumber()) &&
                bankAccountRepository.existsByAccountNumber(requestDTO.getAccountNumber())) {
            throw new IllegalArgumentException("Bank account with this account number already exists");
        }

        bankAccount.setBankName(requestDTO.getBankName());
        bankAccount.setAccountNumber(requestDTO.getAccountNumber());
        bankAccount.setIban(requestDTO.getIban());
        bankAccount.setBranchName(requestDTO.getBranchName());
        bankAccount.setBranchCode(requestDTO.getBranchCode());
        bankAccount.setSwiftCode(requestDTO.getSwiftCode());
        bankAccount.setAccountHolderName(requestDTO.getAccountHolderName());
        bankAccount.setCurrentBalance(requestDTO.getCurrentBalance());
        bankAccount.setOpeningDate(requestDTO.getOpeningDate());
        bankAccount.setIsActive(requestDTO.getIsActive());
        bankAccount.setNotes(requestDTO.getNotes());

        BankAccount updated = bankAccountRepository.save(bankAccount);
        return BankAccountResponseDTO.fromEntity(updated);
    }


    public void delete(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        bankAccountRepository.delete(bankAccount);
    }

    public BankAccountResponseDTO deactivate(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        bankAccount.setIsActive(false);
        BankAccount updated = bankAccountRepository.save(bankAccount);
        return BankAccountResponseDTO.fromEntity(updated);
    }

    public BankAccountResponseDTO activate(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        bankAccount.setIsActive(true);
        BankAccount updated = bankAccountRepository.save(bankAccount);
        return BankAccountResponseDTO.fromEntity(updated);
    }

    public void updateBalance(UUID id, BigDecimal newBalance) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));

        System.err.println("=== BEFORE UPDATE ===");
        System.err.println("ID: " + id);
        System.err.println("newBalance: " + newBalance);
        System.err.println("currentBalance: " + bankAccount.getCurrentBalance());
        System.err.println("availableBalance: " + bankAccount.getAvailableBalance());
        System.err.println("totalBalance: " + bankAccount.getTotalBalance());

        bankAccount.setCurrentBalance(newBalance);
        bankAccount.setAvailableBalance(newBalance);
        bankAccount.setTotalBalance(newBalance);

        System.err.println("=== AFTER SET ===");
        System.err.println("currentBalance: " + bankAccount.getCurrentBalance());
        System.err.println("availableBalance: " + bankAccount.getAvailableBalance());
        System.err.println("totalBalance: " + bankAccount.getTotalBalance());

        bankAccountRepository.save(bankAccount);
        System.err.println("=== SAVED SUCCESSFULLY ===");
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        return bankAccount.getCurrentBalance();
    }

    @Transactional(readOnly = true)
    public String getAccountName(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bank account not found with ID: " + id));
        return bankAccount.getBankName() + " - " + bankAccount.getAccountNumber();
    }
}