package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.AccountPayablePayment;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
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
public interface AccountPayablePaymentRepository extends JpaRepository<AccountPayablePayment, UUID> {

    // Find by payment number
    Optional<AccountPayablePayment> findByPaymentNumber(String paymentNumber);

    // Find by payment request
    List<AccountPayablePayment> findByPaymentRequestId(UUID paymentRequestId);

    // Find by status
    List<AccountPayablePayment> findByStatus(PaymentStatus status);

    // Find by payment method
    List<AccountPayablePayment> findByPaymentMethod(PaymentMethod paymentMethod);

    // Find by account
    List<AccountPayablePayment> findByPaymentAccountIdAndPaymentAccountType(UUID accountId, AccountType accountType);

    // Find by merchant
    @Query("SELECT p FROM AccountPayablePayment p WHERE p.paidToMerchant.id = :merchantId")
    List<AccountPayablePayment> findByMerchantId(@Param("merchantId") UUID merchantId);

    // Find by processor
    List<AccountPayablePayment> findByProcessedByUserId(UUID userId);

    // Find by date range
    List<AccountPayablePayment> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate);

    // Find by processed date range
    List<AccountPayablePayment> findByProcessedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find payments made today
    @Query("SELECT p FROM AccountPayablePayment p WHERE p.paymentDate = :today ORDER BY p.processedAt DESC")
    List<AccountPayablePayment> findPaymentsMadeToday(@Param("today") LocalDate today);

    // Find by merchant with date range
    @Query("SELECT p FROM AccountPayablePayment p WHERE p.paidToMerchant.id = :merchantId AND p.paymentDate BETWEEN :startDate AND :endDate ORDER BY p.paymentDate DESC")
    List<AccountPayablePayment> findByMerchantAndDateRange(
            @Param("merchantId") UUID merchantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Get total paid amount by merchant
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM AccountPayablePayment p WHERE p.paidToMerchant.id = :merchantId AND p.status = 'COMPLETED'")
    Double getTotalPaidToMerchant(@Param("merchantId") UUID merchantId);

    // Get payment count by merchant
    @Query("SELECT COUNT(p) FROM AccountPayablePayment p WHERE p.paidToMerchant.id = :merchantId AND p.status = :status")
    long countByMerchantAndStatus(@Param("merchantId") UUID merchantId, @Param("status") PaymentStatus status);

    // Get last payment to merchant
    @Query("SELECT p FROM AccountPayablePayment p WHERE p.paidToMerchant.id = :merchantId AND p.status = 'COMPLETED' ORDER BY p.paymentDate DESC LIMIT 1")
    Optional<AccountPayablePayment> findLastPaymentToMerchant(@Param("merchantId") UUID merchantId);

    // Get payments by account in date range
    @Query("SELECT p FROM AccountPayablePayment p WHERE p.paymentAccountId = :accountId AND p.paymentAccountType = :accountType AND p.paymentDate BETWEEN :startDate AND :endDate ORDER BY p.paymentDate DESC")
    List<AccountPayablePayment> findByAccountAndDateRange(
            @Param("accountId") UUID accountId,
            @Param("accountType") AccountType accountType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // Sum payments by account
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM AccountPayablePayment p WHERE p.paymentAccountId = :accountId AND p.paymentAccountType = :accountType AND p.status = 'COMPLETED'")
    Double sumPaymentsByAccount(@Param("accountId") UUID accountId, @Param("accountType") AccountType accountType);

    // Check if payment number exists
    boolean existsByPaymentNumber(String paymentNumber);

    // Get recent payments (last N)
    @Query("SELECT p FROM AccountPayablePayment p ORDER BY p.processedAt DESC LIMIT :limit")
    List<AccountPayablePayment> findRecentPayments(@Param("limit") int limit);
}