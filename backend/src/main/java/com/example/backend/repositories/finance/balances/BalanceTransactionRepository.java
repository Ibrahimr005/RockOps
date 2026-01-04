package com.example.backend.repositories.finance.balances;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BalanceTransaction;
import com.example.backend.models.finance.balances.TransactionStatus;
import com.example.backend.models.finance.balances.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface BalanceTransactionRepository extends JpaRepository<BalanceTransaction, UUID> {

    // Find by status
    List<BalanceTransaction> findByStatus(TransactionStatus status);

    List<BalanceTransaction> findByStatusOrderByCreatedAtDesc(TransactionStatus status);

    // Find by account
    List<BalanceTransaction> findByAccountTypeAndAccountIdOrderByTransactionDateDesc(
            AccountType accountType, UUID accountId);

    // Find by transaction type
    List<BalanceTransaction> findByTransactionType(TransactionType transactionType);

    // Find pending transactions
    List<BalanceTransaction> findByStatusAndCreatedByOrderByCreatedAtDesc(
            TransactionStatus status, String createdBy);

    // Find transactions in date range
    @Query("SELECT t FROM BalanceTransaction t WHERE t.transactionDate BETWEEN :startDate AND :endDate ORDER BY t.transactionDate DESC")
    List<BalanceTransaction> findByTransactionDateBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Find all transactions for an account (including transfers TO this account)
    @Query("SELECT t FROM BalanceTransaction t WHERE " +
            "(t.accountType = :accountType AND t.accountId = :accountId) OR " +
            "(t.toAccountType = :accountType AND t.toAccountId = :accountId) " +
            "ORDER BY t.transactionDate DESC")
    List<BalanceTransaction> findAllTransactionsForAccount(
            @Param("accountType") AccountType accountType,
            @Param("accountId") UUID accountId);

    // Count pending transactions
    long countByStatus(TransactionStatus status);
}