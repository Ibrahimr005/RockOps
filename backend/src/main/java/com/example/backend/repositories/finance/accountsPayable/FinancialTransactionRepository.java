package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.FinancialTransaction;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.TransactionStatus;
import com.example.backend.models.finance.accountsPayable.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, UUID> {

    // Find by transaction number
    Optional<FinancialTransaction> findByTransactionNumber(String transactionNumber);

    // Find by transaction type
    List<FinancialTransaction> findByTransactionType(TransactionType transactionType);

    // Find by status
    List<FinancialTransaction> findByStatus(TransactionStatus status);

    // Find by source
    List<FinancialTransaction> findBySourceTypeAndSourceId(String sourceType, UUID sourceId);

    // Find by debit account
    List<FinancialTransaction> findByDebitAccountTypeAndDebitAccountId(AccountType accountType, UUID accountId);

    // Find by credit account
    List<FinancialTransaction> findByCreditAccountTypeAndCreditAccountId(AccountType accountType, UUID accountId);

    // Find by any account (debit or credit)
    @Query("SELECT t FROM FinancialTransaction t WHERE " +
            "(t.debitAccountType = :accountType AND t.debitAccountId = :accountId) OR " +
            "(t.creditAccountType = :accountType AND t.creditAccountId = :accountId) " +
            "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<FinancialTransaction> findByAccount(@Param("accountType") AccountType accountType, @Param("accountId") UUID accountId);

    // Find by date range
    List<FinancialTransaction> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);

    // Find by created date range
    List<FinancialTransaction> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find transactions for account in date range
    @Query("SELECT t FROM FinancialTransaction t WHERE " +
            "((t.debitAccountType = :accountType AND t.debitAccountId = :accountId) OR " +
            "(t.creditAccountType = :accountType AND t.creditAccountId = :accountId)) AND " +
            "t.transactionDate BETWEEN :startDate AND :endDate " +
            "ORDER BY t.transactionDate DESC, t.createdAt DESC")
    List<FinancialTransaction> findByAccountAndDateRange(
            @Param("accountType") AccountType accountType,
            @Param("accountId") UUID accountId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find by created by user
    List<FinancialTransaction> findByCreatedByUserId(UUID userId);

    // Find reversed transactions
    List<FinancialTransaction> findByReversedByTransactionIdIsNotNull();

    // Get recent transactions
    @Query("SELECT t FROM FinancialTransaction t ORDER BY t.createdAt DESC LIMIT :limit")
    List<FinancialTransaction> findRecentTransactions(@Param("limit") int limit);

    // Get recent transactions for all accounts (for dashboard)
    @Query("SELECT t FROM FinancialTransaction t WHERE t.status = 'COMPLETED' ORDER BY t.transactionDate DESC, t.createdAt DESC LIMIT :limit")
    List<FinancialTransaction> findRecentCompletedTransactions(@Param("limit") int limit);

    // Check if transaction number exists
    boolean existsByTransactionNumber(String transactionNumber);

    // Sum transactions by account
    @Query("SELECT COALESCE(SUM(CASE WHEN t.debitAccountType = :accountType AND t.debitAccountId = :accountId THEN -t.amount ELSE t.amount END), 0) " +
            "FROM FinancialTransaction t WHERE " +
            "((t.debitAccountType = :accountType AND t.debitAccountId = :accountId) OR " +
            "(t.creditAccountType = :accountType AND t.creditAccountId = :accountId)) AND " +
            "t.status = 'COMPLETED'")
    Double calculateNetBalanceChange(@Param("accountType") AccountType accountType, @Param("accountId") UUID accountId);
}