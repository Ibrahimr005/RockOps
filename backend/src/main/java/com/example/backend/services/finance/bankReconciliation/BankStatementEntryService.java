package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.BankStatementEntryRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.BankStatementEntryResponseDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.models.finance.bankReconciliation.BankStatementEntry;
import com.example.backend.repositories.finance.bankReconciliation.BankAccountRepository;
import com.example.backend.repositories.finance.bankReconciliation.BankStatementEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BankStatementEntryService {

    private final BankStatementEntryRepository bankStatementEntryRepository;
    private final BankAccountRepository bankAccountRepository;

    // Create new bank statement entry
    public BankStatementEntryResponseDTO createBankStatementEntry(BankStatementEntryRequestDTO requestDTO) {
        BankAccount bankAccount = bankAccountRepository.findById(requestDTO.getBankAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + requestDTO.getBankAccountId()));

        BankStatementEntry entry = new BankStatementEntry();
        entry.setBankAccount(bankAccount);
        entry.setAmount(requestDTO.getAmount());
        entry.setTransactionDate(requestDTO.getTransactionDate());
        entry.setBankDescription(requestDTO.getBankDescription());
        entry.setBankReference(requestDTO.getBankReference());
        entry.setBankCategory(requestDTO.getBankCategory());
        entry.setRunningBalance(requestDTO.getRunningBalance());
        entry.setImportedBy(requestDTO.getImportedBy());

        BankStatementEntry savedEntry = bankStatementEntryRepository.save(entry);
        return mapToResponseDTO(savedEntry);
    }

    // Import multiple bank statement entries
    public List<BankStatementEntryResponseDTO> importBankStatementEntries(List<BankStatementEntryRequestDTO> requestDTOs) {
        return requestDTOs.stream()
                .map(this::createBankStatementEntry)
                .collect(Collectors.toList());
    }

    // Get all bank statement entries
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getAllBankStatementEntries() {
        return bankStatementEntryRepository.findAll()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get bank statement entry by ID
    @Transactional(readOnly = true)
    public BankStatementEntryResponseDTO getBankStatementEntryById(UUID id) {
        BankStatementEntry entry = bankStatementEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + id));
        return mapToResponseDTO(entry);
    }

    // Get entries by bank account
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getEntriesByBankAccount(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return bankStatementEntryRepository.findByBankAccountOrderByTransactionDateDesc(bankAccount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get unmatched entries
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getUnmatchedEntries() {
        return bankStatementEntryRepository.findByIsMatchedFalse()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get unmatched entries by bank account
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getUnmatchedEntriesByBankAccount(UUID bankAccountId) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return bankStatementEntryRepository.findByBankAccountAndIsMatchedFalse(bankAccount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get entries by date range
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getEntriesByDateRange(LocalDate startDate, LocalDate endDate) {
        return bankStatementEntryRepository.findByTransactionDateBetween(startDate, endDate)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get entries by bank category
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> getEntriesByCategory(String category) {
        return bankStatementEntryRepository.findByBankCategory(category)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Update bank statement entry
    public BankStatementEntryResponseDTO updateBankStatementEntry(UUID id, BankStatementEntryRequestDTO requestDTO) {
        BankStatementEntry entry = bankStatementEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + id));

        // Check if entry is already matched
        if (entry.getIsMatched()) {
            throw new IllegalStateException("Cannot update matched bank statement entry");
        }

        BankAccount bankAccount = bankAccountRepository.findById(requestDTO.getBankAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + requestDTO.getBankAccountId()));

        entry.setBankAccount(bankAccount);
        entry.setAmount(requestDTO.getAmount());
        entry.setTransactionDate(requestDTO.getTransactionDate());
        entry.setBankDescription(requestDTO.getBankDescription());
        entry.setBankReference(requestDTO.getBankReference());
        entry.setBankCategory(requestDTO.getBankCategory());
        entry.setRunningBalance(requestDTO.getRunningBalance());

        BankStatementEntry updatedEntry = bankStatementEntryRepository.save(entry);
        return mapToResponseDTO(updatedEntry);
    }

    // Delete bank statement entry
    public void deleteBankStatementEntry(UUID id) {
        BankStatementEntry entry = bankStatementEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + id));

        // Check if entry is already matched
        if (entry.getIsMatched()) {
            throw new IllegalStateException("Cannot delete matched bank statement entry");
        }

        bankStatementEntryRepository.delete(entry);
    }

    // Mark entry as matched
    public BankStatementEntryResponseDTO markAsMatched(UUID id, String matchedBy) {
        BankStatementEntry entry = bankStatementEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + id));

        entry.markAsMatched(matchedBy);
        BankStatementEntry updatedEntry = bankStatementEntryRepository.save(entry);
        return mapToResponseDTO(updatedEntry);
    }

    // Search entries for potential matches
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> findPotentialMatches(UUID bankAccountId, BigDecimal amount, LocalDate date) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        // Search for exact matches first, then close amounts
        BigDecimal tolerance = new BigDecimal("0.01");
        BigDecimal minAmount = amount.subtract(tolerance);
        BigDecimal maxAmount = amount.add(tolerance);

        return bankStatementEntryRepository.findUnmatchedByAccountAndAmountRange(bankAccount, minAmount, maxAmount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Search entries by description keywords
    @Transactional(readOnly = true)
    public List<BankStatementEntryResponseDTO> searchByDescription(UUID bankAccountId, String keyword) {
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return bankStatementEntryRepository.findUnmatchedByAccountAndDescriptionContaining(bankAccount, keyword)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Helper method to convert entity to DTO
    public BankStatementEntryResponseDTO mapToResponseDTO(BankStatementEntry entry) {
        BankStatementEntryResponseDTO responseDTO = new BankStatementEntryResponseDTO();
        responseDTO.setId(entry.getId());
        responseDTO.setBankAccountId(entry.getBankAccount().getId());
        responseDTO.setBankAccountName(entry.getBankAccount().getAccountName());
        responseDTO.setAmount(entry.getAmount());
        responseDTO.setTransactionDate(entry.getTransactionDate());
        responseDTO.setBankDescription(entry.getBankDescription());
        responseDTO.setBankReference(entry.getBankReference());
        responseDTO.setBankCategory(entry.getBankCategory());
        responseDTO.setIsMatched(entry.getIsMatched());
        responseDTO.setMatchedAt(entry.getMatchedAt());
        responseDTO.setMatchedBy(entry.getMatchedBy());
        responseDTO.setRunningBalance(entry.getRunningBalance());
        responseDTO.setImportedAt(entry.getImportedAt());
        responseDTO.setImportedBy(entry.getImportedBy());
        responseDTO.setCreatedAt(entry.getCreatedAt());
        responseDTO.setUpdatedAt(entry.getUpdatedAt());

        // Helper fields
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
        responseDTO.setFormattedAmount(currencyFormatter.format(entry.getAmount()));
        responseDTO.setTransactionDirection(entry.isCredit() ? "CREDIT" : "DEBIT");
        responseDTO.setDaysSinceImported(Period.between(entry.getImportedAt().toLocalDate(), LocalDate.now()).getDays());

        return responseDTO;
    }
}