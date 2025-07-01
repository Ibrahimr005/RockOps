//package com.example.backend.repositories.finance;
//
//
//
//import com.example.backend.models.finance.AccountType;
//import com.example.backend.models.finance.ChartOfAccount;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.stereotype.Repository;
//
//import java.util.List;
//import java.util.Optional;
//import java.util.UUID;
//
//@Repository
//public interface ChartOfAccountRepository extends JpaRepository<ChartOfAccount, UUID> {
//
//    List<ChartOfAccount> findByIsActiveTrue();
//
//    Optional<ChartOfAccount> findByAccountNumber(String accountNumber);
//
//    boolean existsByAccountNumber(String accountNumber);
//
//    List<ChartOfAccount> findByAccountType(AccountType accountType);
//
//    List<ChartOfAccount> findByParentAccountId(UUID parentAccountId);
//
//    @Query("SELECT c FROM ChartOfAccount c WHERE c.parentAccountId IS NULL")
//    List<ChartOfAccount> findAllParentAccounts();
//}
