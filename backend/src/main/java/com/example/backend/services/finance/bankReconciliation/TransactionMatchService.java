package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.TransactionMatchRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.TransactionMatchResponseDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.*;
import com.example.backend.repositories.finance.bankReconciliation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionMatchService {

    private final TransactionMatchRepository transactionMatchRepository;
    private final BankStatementEntryRepository bankStatementEntryRepository;
    private final InternalTransactionRepository internalTransactionRepository;
    private final BankAccountRepository bankAccountRepository;
    private final InternalTransactionService internalTransactionService;
    private final BankStatementEntryService bankStatementEntryService;

    // Create new transaction match
    public TransactionMatchResponseDTO createTransactionMatch(TransactionMatchRequestDTO requestDTO) {
        BankStatementEntry bankEntry = bankStatementEntryRepository.findById(requestDTO.getBankStatementEntryId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + requestDTO.getBankStatementEntryId()));

        // Check if bank entry is already matched
        if (bankEntry.getIsMatched()) {
            throw new IllegalStateException("Bank statement entry is already matched");
        }

        List<InternalTransaction> internalTransactions = new ArrayList<>();
        for (UUID internalTxnId : requestDTO.getInternalTransactionIds()) {
            InternalTransaction transaction = internalTransactionRepository.findById(internalTxnId)
                    .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + internalTxnId));

            // Check if internal transaction is already reconciled
            if (transaction.getIsReconciled()) {
                throw new IllegalStateException("Internal transaction " + internalTxnId + " is already reconciled");
            }

            internalTransactions.add(transaction);
        }

        TransactionMatch match = new TransactionMatch();
        match.setBankStatementEntry(bankEntry);
        match.setInternalTransactions(internalTransactions);
        match.setMatchType(requestDTO.getMatchType());
        match.setConfidenceScore(requestDTO.getConfidenceScore());
        match.setIsAutomatic(requestDTO.getIsAutomatic());
        match.setMatchNotes(requestDTO.getMatchNotes());
        match.setMatchedBy(requestDTO.getMatchedBy());

        TransactionMatch savedMatch = transactionMatchRepository.save(match);
        return mapToResponseDTO(savedMatch);
    }

    // Get all transaction matches
    @Transactional(readOnly = true)
    public List<TransactionMatchResponseDTO> getAllTransactionMatches() {
        return transactionMatchRepository.findAll()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get transaction match by ID
    @Transactional(readOnly = true)
    public TransactionMatchResponseDTO getTransactionMatchById(UUID id) {
        TransactionMatch match = transactionMatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction match not found with ID: " + id));
        return mapToResponseDTO(match);
    }

    // Get unconfirmed matches
    @Transactional(readOnly = true)
    public List<TransactionMatchResponseDTO> getUnconfirmedMatches() {
        return transactionMatchRepository.findByIsConfirmedFalse()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get matches by bank account
    @Transactional(readOnly = true)
    public List<TransactionMatchResponseDTO> getMatchesByBankAccount(UUID bankAccountId) {
        BankAccount bankAccount = bankStatementEntryRepository.findById(bankAccountId)
                .map(entry -> entry.getBankAccount())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        return transactionMatchRepository.findByBankAccount(bankAccount)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get matches needing review (low confidence or manual)
    @Transactional(readOnly = true)
    public List<TransactionMatchResponseDTO> getMatchesNeedingReview(Double confidenceThreshold) {
        return transactionMatchRepository.findMatchesNeedingReview(confidenceThreshold)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Confirm transaction match
    public TransactionMatchResponseDTO confirmTransactionMatch(UUID id, String confirmedBy) {
        TransactionMatch match = transactionMatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction match not found with ID: " + id));

        if (match.getIsConfirmed()) {
            throw new IllegalStateException("Transaction match is already confirmed");
        }

        match.confirmMatch(confirmedBy);
        TransactionMatch confirmedMatch = transactionMatchRepository.save(match);
        return mapToResponseDTO(confirmedMatch);
    }

    // Delete transaction match (unconfirmed only)
    public void deleteTransactionMatch(UUID id) {
        TransactionMatch match = transactionMatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction match not found with ID: " + id));

        if (match.getIsConfirmed()) {
            throw new IllegalStateException("Cannot delete confirmed transaction match");
        }

        transactionMatchRepository.delete(match);
    }

    // Auto-match transactions based on rules
    @Transactional
    public List<TransactionMatchResponseDTO> performAutoMatching(UUID bankAccountId) {
        // Get the bank account first
        BankAccount bankAccount = bankAccountRepository.findById(bankAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + bankAccountId));

        // Get unmatched bank entries and unreconciled internal transactions
        List<BankStatementEntry> unmatchedBankEntries = bankStatementEntryRepository
                .findByBankAccountAndIsMatchedFalse(bankAccount);

        List<TransactionMatch> autoMatches = new ArrayList<>();

        for (BankStatementEntry bankEntry : unmatchedBankEntries) {
            // Look for exact amount and date matches
            List<InternalTransaction> potentialMatches = internalTransactionRepository
                    .findByAmountAndTransactionDate(bankEntry.getAmount(), bankEntry.getTransactionDate());

            potentialMatches = potentialMatches.stream()
                    .filter(t -> !t.getIsReconciled())
                    .filter(t -> t.getBankAccount().getId().equals(bankAccountId)) // ✅ Filter by bank account
                    .collect(Collectors.toList());

            if (potentialMatches.size() == 1) {
                // Exact match found
                TransactionMatch match = new TransactionMatch();
                match.setBankStatementEntry(bankEntry);
                match.setInternalTransactions(List.of(potentialMatches.get(0)));
                match.setMatchType(MatchType.EXACT_MATCH);
                match.setConfidenceScore(1.0);
                match.setIsAutomatic(true);
                match.setMatchNotes("Automatically matched - exact amount and date");
                match.setMatchedBy("SYSTEM");

                autoMatches.add(transactionMatchRepository.save(match));
            }
        }

        return autoMatches.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get potential matches for a bank statement entry
    @Transactional(readOnly = true)
    public List<TransactionMatchResponseDTO> findPotentialMatches(UUID bankStatementEntryId) {
        BankStatementEntry bankEntry = bankStatementEntryRepository.findById(bankStatementEntryId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + bankStatementEntryId));

        if (bankEntry.getIsMatched()) {
            throw new IllegalStateException("Bank statement entry is already matched");
        }

        // Find potential internal transaction matches
        BigDecimal tolerance = new BigDecimal("0.01");
        List<InternalTransaction> potentialMatches = internalTransactionRepository
                .findUnreconciledByAccountAndAmountRange(
                        bankEntry.getBankAccount(),
                        bankEntry.getAmount().subtract(tolerance),
                        bankEntry.getAmount().add(tolerance)
                );

        // Create suggested matches with confidence scores
        List<TransactionMatch> suggestions = new ArrayList<>();

        for (InternalTransaction internalTxn : potentialMatches) {
            double confidenceScore = calculateConfidenceScore(bankEntry, internalTxn);

            if (confidenceScore > 0.3) { // Only suggest matches with >30% confidence
                TransactionMatch suggestion = new TransactionMatch();
                suggestion.setBankStatementEntry(bankEntry);
                suggestion.setInternalTransactions(List.of(internalTxn));
                suggestion.setMatchType(determineMatchType(bankEntry, internalTxn));
                suggestion.setConfidenceScore(confidenceScore);
                suggestion.setIsAutomatic(false);
                suggestion.setMatchNotes("Suggested match - confidence: " + String.format("%.1f%%", confidenceScore * 100));
                suggestion.setMatchedBy("SYSTEM_SUGGESTION");

                suggestions.add(suggestion);
            }
        }

        return suggestions.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Helper method to calculate confidence score
    private double calculateConfidenceScore(BankStatementEntry bankEntry, InternalTransaction internalTxn) {
        double score = 0.0;

        // Amount match (40% weight)
        if (bankEntry.getAmount().compareTo(internalTxn.getAmount()) == 0) {
            score += 0.4;
        } else {
            // Partial score for close amounts
            BigDecimal difference = bankEntry.getAmount().subtract(internalTxn.getAmount()).abs();
            BigDecimal percentDiff = difference.divide(bankEntry.getAmount().abs(), 4, BigDecimal.ROUND_HALF_UP);
            if (percentDiff.compareTo(new BigDecimal("0.01")) <= 0) { // Within 1%
                score += 0.3;
            } else if (percentDiff.compareTo(new BigDecimal("0.05")) <= 0) { // Within 5%
                score += 0.2;
            }
        }

        // Date match (30% weight)
        if (bankEntry.getTransactionDate().equals(internalTxn.getTransactionDate())) {
            score += 0.3;
        } else {
            // Partial score for close dates
            long daysDiff = Math.abs(Period.between(bankEntry.getTransactionDate(), internalTxn.getTransactionDate()).getDays());
            if (daysDiff <= 1) {
                score += 0.2;
            } else if (daysDiff <= 3) {
                score += 0.1;
            }
        }

        // Reference number match (20% weight)
        if (bankEntry.getBankReference() != null && internalTxn.getReferenceNumber() != null) {
            if (bankEntry.getBankReference().equals(internalTxn.getReferenceNumber())) {
                score += 0.2;
            } else if (bankEntry.getBankReference().contains(internalTxn.getReferenceNumber()) ||
                    internalTxn.getReferenceNumber().contains(bankEntry.getBankReference())) {
                score += 0.1;
            }
        }

        // Description similarity (10% weight)
        if (bankEntry.getBankDescription() != null && internalTxn.getDescription() != null) {
            String bankDesc = bankEntry.getBankDescription().toLowerCase();
            String internalDesc = internalTxn.getDescription().toLowerCase();

            if (bankDesc.contains(internalDesc) || internalDesc.contains(bankDesc)) {
                score += 0.1;
            }
        }

        return Math.min(score, 1.0); // Cap at 100%
    }

    // Helper method to determine match type
    private MatchType determineMatchType(BankStatementEntry bankEntry, InternalTransaction internalTxn) {
        boolean amountMatch = bankEntry.getAmount().compareTo(internalTxn.getAmount()) == 0;
        boolean dateMatch = bankEntry.getTransactionDate().equals(internalTxn.getTransactionDate());
        boolean refMatch = (bankEntry.getBankReference() != null && internalTxn.getReferenceNumber() != null &&
                bankEntry.getBankReference().equals(internalTxn.getReferenceNumber()));

        if (amountMatch && dateMatch && refMatch) {
            return MatchType.EXACT_MATCH;
        } else if (amountMatch && dateMatch) {
            return MatchType.AMOUNT_DATE_MATCH;
        } else if (amountMatch && refMatch) {
            return MatchType.AMOUNT_REF_MATCH;
        } else if (amountMatch) {
            return MatchType.AMOUNT_MATCH;
        } else {
            return MatchType.POSSIBLE_MATCH;
        }
    }

    // Helper method to convert entity to DTO
    private TransactionMatchResponseDTO mapToResponseDTO(TransactionMatch match) {
        TransactionMatchResponseDTO responseDTO = new TransactionMatchResponseDTO();
        responseDTO.setId(match.getId());
        responseDTO.setBankStatementEntry(bankStatementEntryService.mapToResponseDTO(match.getBankStatementEntry()));
        responseDTO.setInternalTransactions(
                match.getInternalTransactions().stream()
                        .map(internalTransactionService::mapToResponseDTO)
                        .collect(Collectors.toList())
        );
        responseDTO.setMatchType(match.getMatchType());
        responseDTO.setConfidenceScore(match.getConfidenceScore());
        responseDTO.setIsAutomatic(match.getIsAutomatic());
        responseDTO.setMatchNotes(match.getMatchNotes());
        responseDTO.setMatchedAt(match.getMatchedAt());
        responseDTO.setMatchedBy(match.getMatchedBy());
        responseDTO.setIsConfirmed(match.getIsConfirmed());
        responseDTO.setConfirmedAt(match.getConfirmedAt());
        responseDTO.setConfirmedBy(match.getConfirmedBy());
        responseDTO.setCreatedAt(match.getCreatedAt());
        responseDTO.setUpdatedAt(match.getUpdatedAt());

        // Helper fields
        if (match.getConfidenceScore() != null) {
            if (match.getConfidenceScore() >= 0.8) {
                responseDTO.setConfidenceLevel("HIGH");
            } else if (match.getConfidenceScore() >= 0.5) {
                responseDTO.setConfidenceLevel("MEDIUM");
            } else {
                responseDTO.setConfidenceLevel("LOW");
            }
        }

        if (match.getIsConfirmed()) {
            responseDTO.setMatchStatusText("Confirmed");
        } else if (match.getConfidenceScore() != null && match.getConfidenceScore() < 0.5) {
            responseDTO.setMatchStatusText("Needs Review");
        } else {
            responseDTO.setMatchStatusText("Pending Confirmation");
        }

        responseDTO.setDaysSinceMatched(
                Period.between(match.getMatchedAt().toLocalDate(), LocalDate.now()).getDays()
        );

        return responseDTO;
    }
}