package com.example.backend.repositories.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.BankAccount;
import com.example.backend.models.finance.bankReconciliation.BankStatementEntry;
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
public interface BankStatementEntryRepository extends JpaRepository<BankStatementEntry, UUID> {

    // Find by bank account
    List<BankStatementEntry> findByBankAccount(BankAccount bankAccount);

    // Find unmatched entries
    List<BankStatementEntry> findByIsMatchedFalse();

    // Find unmatched entries for specific account
    List<BankStatementEntry> findByBankAccountAndIsMatchedFalse(BankAccount bankAccount);

    // Find by transaction date range
    List<BankStatementEntry> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);

    // Find by bank reference
    Optional<BankStatementEntry> findByBankReference(String bankReference);

    // Find by amount and date (for matching)
    List<BankStatementEntry> findByAmountAndTransactionDate(BigDecimal amount, LocalDate transactionDate);

    // Find by bank category
    List<BankStatementEntry> findByBankCategory(String bankCategory);

    // Find entries for specific account in date range
    @Query("SELECT bse FROM BankStatementEntry bse WHERE bse.bankAccount = :bankAccount " +
            "AND bse.transactionDate BETWEEN :startDate AND :endDate")
    List<BankStatementEntry> findByAccountAndDateRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find unmatched entries for specific account in date range
    @Query("SELECT bse FROM BankStatementEntry bse WHERE bse.bankAccount = :bankAccount " +
            "AND bse.transactionDate BETWEEN :startDate AND :endDate " +
            "AND bse.isMatched = false")
    List<BankStatementEntry> findUnmatchedByAccountAndDateRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Find entries by amount range (for potential matching)
    @Query("SELECT bse FROM BankStatementEntry bse WHERE bse.bankAccount = :bankAccount " +
            "AND bse.amount BETWEEN :minAmount AND :maxAmount " +
            "AND bse.isMatched = false")
    List<BankStatementEntry> findUnmatchedByAccountAndAmountRange(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount
    );

    // Find entries with similar descriptions (for matching)
    @Query("SELECT bse FROM BankStatementEntry bse WHERE bse.bankAccount = :bankAccount " +
            "AND UPPER(bse.bankDescription) LIKE UPPER(CONCAT('%', :keyword, '%')) " +
            "AND bse.isMatched = false")
    List<BankStatementEntry> findUnmatchedByAccountAndDescriptionContaining(
            @Param("bankAccount") BankAccount bankAccount,
            @Param("keyword") String keyword
    );

    // Count unmatched entries
    long countByIsMatchedFalse();

    // Count unmatched entries for specific account
    long countByBankAccountAndIsMatchedFalse(BankAccount bankAccount);

    // Find entries ordered by transaction date (latest first)
    List<BankStatementEntry> findByBankAccountOrderByTransactionDateDesc(BankAccount bankAccount);
}