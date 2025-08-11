package com.example.backend.repositories.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.models.finance.bankReconciliation.InternalTransaction;
import com.example.backend.models.finance.bankReconciliation.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InternalTransactionRepository extends JpaRepository<InternalTransaction, UUID> {

    // Find by bank account
    List<InternalTransaction> findByBankAccount(BankAccount bankAccount);

    // Find unreconciled transactions
    List<InternalTransaction> findByIsReconciledFalse();

    // Find unreconciled transactions for specific account
    List<InternalTransaction> findByBankAccountAndIsReconciledFalse(BankAccount bankAccount);

    // Find by transaction type
    List<InternalTransaction> findByTransactionType(TransactionType transactionType);

    // Find by date range
    List<InternalTransaction> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);

    // Find by reference number
    Optional<InternalTransaction> findByReferenceNumber(String referenceNumber);

    // Find by amount and date (for matching)
    List<InternalTransaction> findByAmountAndTransactionDate(BigDecimal amount, LocalDate transactionDate);

    // Find transactions for specific account in date range
    @Query("SELECT it FROM InternalTransaction it WHERE it.bankAccount = :bankAccount " +
            "AND it.transactionDate BETWEEN :startDate AND :endDate")
    List<InternalTransaction> findByAccountAndDateRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find unreconciled transactions for specific account in date range
    @Query("SELECT it FROM InternalTransaction it WHERE it.bankAccount = :bankAccount " +
            "AND it.transactionDate BETWEEN :startDate AND :endDate " +
            "AND it.isReconciled = false")
    List<InternalTransaction> findUnreconciledByAccountAndDateRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find transactions by amount range (for potential matching)
    @Query("SELECT it FROM InternalTransaction it WHERE it.bankAccount = :bankAccount " +
            "AND it.amount BETWEEN :minAmount AND :maxAmount " +
            "AND it.isReconciled = false")
    List<InternalTransaction> findUnreconciledByAccountAndAmountRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount
    );

    // Count unreconciled transactions
    long countByIsReconciledFalse();

    // Count unreconciled transactions for specific account
    long countByBankAccountAndIsReconciledFalse(BankAccount bankAccount);
}