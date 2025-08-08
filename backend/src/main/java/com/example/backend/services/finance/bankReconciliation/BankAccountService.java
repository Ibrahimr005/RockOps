package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.BankAccountRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.BankAccountResponseDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.repositories.finance.bankReconciliation.*;
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
    private final InternalTransactionRepository internalTransactionRepository;
    private final BankStatementEntryRepository bankStatementEntryRepository;
    private final DiscrepancyRepository discrepancyRepository;

    // Create new bank account
    public BankAccountResponseDTO createBankAccount(BankAccountRequestDTO requestDTO) {
        // Check if account number already exists
        if (bankAccountRepository.existsByAccountNumber(requestDTO.getAccountNumber())) {
            throw new IllegalArgumentException("Bank account with this account number already exists");
        }

        BankAccount bankAccount = new BankAccount();
        bankAccount.setAccountName(requestDTO.getAccountName());
        bankAccount.setBankName(requestDTO.getBankName());
        bankAccount.setAccountNumber(requestDTO.getAccountNumber());
        bankAccount.setCurrentBalance(requestDTO.getCurrentBalance());
        bankAccount.setIsActive(requestDTO.getIsActive());

        BankAccount savedAccount = bankAccountRepository.save(bankAccount);
        return mapToResponseDTO(savedAccount);
    }

    // Get all active bank accounts
    @Transactional(readOnly = true)
    public List<BankAccountResponseDTO> getAllActiveBankAccounts() {
        return bankAccountRepository.findByIsActiveTrue()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get bank account by ID
    @Transactional(readOnly = true)
    public BankAccountResponseDTO getBankAccountById(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + id));
        return mapToResponseDTO(bankAccount);
    }

    // Update bank account
    public BankAccountResponseDTO updateBankAccount(UUID id, BankAccountRequestDTO requestDTO) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + id));

        // Check if new account number conflicts with existing one (if changed)
        if (!bankAccount.getAccountNumber().equals(requestDTO.getAccountNumber()) &&
                bankAccountRepository.existsByAccountNumber(requestDTO.getAccountNumber())) {
            throw new IllegalArgumentException("Bank account with this account number already exists");
        }

        bankAccount.setAccountName(requestDTO.getAccountName());
        bankAccount.setBankName(requestDTO.getBankName());
        bankAccount.setAccountNumber(requestDTO.getAccountNumber());
        bankAccount.setCurrentBalance(requestDTO.getCurrentBalance());
        bankAccount.setIsActive(requestDTO.getIsActive());

        BankAccount updatedAccount = bankAccountRepository.save(bankAccount);
        return mapToResponseDTO(updatedAccount);
    }

    // Deactivate bank account (soft delete)
    public void deactivateBankAccount(UUID id) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + id));

        bankAccount.setIsActive(false);
        bankAccountRepository.save(bankAccount);
    }

    // Update account balance
    public BankAccountResponseDTO updateAccountBalance(UUID id, BigDecimal newBalance) {
        BankAccount bankAccount = bankAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + id));

        bankAccount.setCurrentBalance(newBalance);
        BankAccount updatedAccount = bankAccountRepository.save(bankAccount);
        return mapToResponseDTO(updatedAccount);
    }

    // Search accounts by name
    @Transactional(readOnly = true)
    public List<BankAccountResponseDTO> searchAccountsByName(String searchTerm) {
        return bankAccountRepository.findByAccountNameContainingIgnoreCase(searchTerm)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get accounts with balance above threshold
    @Transactional(readOnly = true)
    public List<BankAccountResponseDTO> getAccountsWithBalanceAbove(BigDecimal minBalance) {
        return bankAccountRepository.findActiveAccountsWithBalanceAbove(minBalance)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Helper method to convert entity to DTO
    private BankAccountResponseDTO mapToResponseDTO(BankAccount bankAccount) {
        BankAccountResponseDTO responseDTO = new BankAccountResponseDTO();
        responseDTO.setId(bankAccount.getId());
        responseDTO.setAccountName(bankAccount.getAccountName());
        responseDTO.setBankName(bankAccount.getBankName());
        responseDTO.setAccountNumber(bankAccount.getAccountNumber());
        responseDTO.setCurrentBalance(bankAccount.getCurrentBalance());
        responseDTO.setIsActive(bankAccount.getIsActive());
        responseDTO.setCreatedAt(bankAccount.getCreatedAt());
        responseDTO.setUpdatedAt(bankAccount.getUpdatedAt());

        // Add calculated fields
        responseDTO.setUnreconciledTransactionCount(
                internalTransactionRepository.countByBankAccountAndIsReconciledFalse(bankAccount)
        );
        responseDTO.setUnmatchedStatementEntryCount(
                bankStatementEntryRepository.countByBankAccountAndIsMatchedFalse(bankAccount)
        );
        responseDTO.setOpenDiscrepancyCount(
                discrepancyRepository.countOpenDiscrepanciesByBankAccount(bankAccount)
        );

        return responseDTO;
    }
}