package com.example.backend.repositories.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionMatchRepository extends JpaRepository<TransactionMatch, UUID> {

    // Find matches by bank statement entry
    List<TransactionMatch> findByBankStatementEntry(BankStatementEntry bankStatementEntry);

    // Find matches containing specific internal transaction
    @Query("SELECT tm FROM TransactionMatch tm JOIN tm.internalTransactions it WHERE it = :internalTransaction")
    List<TransactionMatch> findByInternalTransaction(@Param("internalTransaction") InternalTransaction internalTransaction);

    // Find unconfirmed matches
    List<TransactionMatch> findByIsConfirmedFalse();

    // Find confirmed matches
    List<TransactionMatch> findByIsConfirmedTrue();

    // Find automatic matches
    List<TransactionMatch> findByIsAutomaticTrue();

    // Find manual matches
    List<TransactionMatch> findByIsAutomaticFalse();

    // Find matches by type
    List<TransactionMatch> findByMatchType(MatchType matchType);

    // Find matches by confidence score range
    List<TransactionMatch> findByConfidenceScoreBetween(Double minScore, Double maxScore);

    // Find matches created by specific user
    List<TransactionMatch> findByMatchedBy(String matchedBy);

    // Find matches in date range
    List<TransactionMatch> findByMatchedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find low confidence matches that need review
    @Query("SELECT tm FROM TransactionMatch tm WHERE tm.confidenceScore < :threshold AND tm.isConfirmed = false")
    List<TransactionMatch> findLowConfidenceMatches(@Param("threshold") Double threshold);

    // Find matches for specific bank account (through bank statement entry)
    @Query("SELECT tm FROM TransactionMatch tm WHERE tm.bankStatementEntry.bankAccount = :bankAccount")
    List<TransactionMatch> findByBankAccount(@Param("bankAccount") BankAccount bankAccount);

    // Find unconfirmed matches for specific bank account
    @Query("SELECT tm FROM TransactionMatch tm WHERE tm.bankStatementEntry.bankAccount = :bankAccount " +
            "AND tm.isConfirmed = false")
    List<TransactionMatch> findUnconfirmedByBankAccount(@Param("bankAccount") BankAccount bankAccount);

    // Check if bank statement entry is already matched
    boolean existsByBankStatementEntry(BankStatementEntry bankStatementEntry);

    // Check if internal transaction is already matched
    @Query("SELECT CASE WHEN COUNT(tm) > 0 THEN true ELSE false END FROM TransactionMatch tm " +
            "JOIN tm.internalTransactions it WHERE it = :internalTransaction")
    boolean existsByInternalTransaction(@Param("internalTransaction") InternalTransaction internalTransaction);

    // Count matches by type
    long countByMatchType(MatchType matchType);

    // Count unconfirmed matches
    long countByIsConfirmedFalse();

    // Find matches needing confirmation (low confidence or manual)
    @Query("SELECT tm FROM TransactionMatch tm WHERE tm.isConfirmed = false " +
            "AND (tm.confidenceScore < :threshold OR tm.isAutomatic = false)")
    List<TransactionMatch> findMatchesNeedingReview(@Param("threshold") Double threshold);
}