package com.example.backend.repositories.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {

    // Find all active bank accounts
    List<BankAccount> findByIsActiveTrue();

    // Find by account number
    Optional<BankAccount> findByAccountNumber(String accountNumber);

    // Find by bank name
    List<BankAccount> findByBankNameContainingIgnoreCase(String bankName);

    // Find by account name
    List<BankAccount> findByAccountNameContainingIgnoreCase(String accountName);

    // Check if account number already exists
    boolean existsByAccountNumber(String accountNumber);

    // Custom query to find accounts with balance above certain amount
    @Query("SELECT ba FROM BankAccount ba WHERE ba.currentBalance >= :minBalance AND ba.isActive = true")
    List<BankAccount> findActiveAccountsWithBalanceAbove(@Param("minBalance") java.math.BigDecimal minBalance);
}