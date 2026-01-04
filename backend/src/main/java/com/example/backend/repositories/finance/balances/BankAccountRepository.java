package com.example.backend.repositories.finance.balances;

import com.example.backend.models.finance.balances.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {

    List<BankAccount> findByIsActiveTrue();

    List<BankAccount> findByIsActiveFalse();

    Optional<BankAccount> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    List<BankAccount> findByBankNameContainingIgnoreCase(String bankName);

    List<BankAccount> findByAccountHolderNameContainingIgnoreCase(String accountHolderName);
}