package com.example.backend.repositories.finance;

import com.example.backend.models.finance.Payment;
import com.example.backend.models.finance.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    //Find all payments for a specific invoice
    // Example: Show me all payments for "ABC Lumber Invoice #1234"
    List<Payment> findByInvoiceIdOrderByPaymentDateDesc(UUID invoiceId);

    // Find payments by status
    // Example: Show me all pending payments
    List<Payment> findByStatusOrderByPaymentDateDesc(PaymentStatus status);

    // Find payments within a date range
    // Example: Show me all payments made in January 2024
    List<Payment> findByPaymentDateBetweenOrderByPaymentDateDesc(
            LocalDate startDate, LocalDate endDate);

    // Find payments by vendor (through invoice relationship)
    // Example: Show me all payments to "ABC Lumber Company"
    @Query("SELECT p FROM Payment p WHERE p.invoice.vendorName = :vendorName " +
            "ORDER BY p.paymentDate DESC")
    List<Payment> findByVendorName(@Param("vendorName") String vendorName);

    // Find payments by vendor containing text (case-insensitive)
    @Query("SELECT p FROM Payment p WHERE LOWER(p.invoice.vendorName) LIKE LOWER(CONCAT('%', :vendorName, '%')) " +
            "ORDER BY p.paymentDate DESC")
    List<Payment> findByVendorNameContaining(@Param("vendorName") String vendorName);

    // Find payments by reference number
    // Example: Find payment made with "Check #1001"
    List<Payment> findByReferenceNumberContainingIgnoreCase(String referenceNumber);

    // Find payments with pagination support
    // Example: Show me page 1 of all payments (20 per page)
    Page<Payment> findAllByOrderByPaymentDateDesc(Pageable pageable);

    // Find payments by amount range
    // Example: Show me all payments between $1,000 and $5,000
    List<Payment> findByAmountBetweenOrderByPaymentDateDesc(
            BigDecimal minAmount, BigDecimal maxAmount);

    // Calculate total payments for a specific period
    // Example: How much did we pay out in January 2024?
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
            "WHERE p.paymentDate BETWEEN :startDate AND :endDate " +
            "AND p.status = :status")
    BigDecimal calculateTotalPaymentsByPeriodAndStatus(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") PaymentStatus status);

    // Find recent payments (last X days)
    // Example: Show me all payments from the last month
    @Query("SELECT p FROM Payment p WHERE p.paymentDate >= :cutoffDate " +
            "ORDER BY p.paymentDate DESC")
    List<Payment> findRecentPayments(@Param("cutoffDate") LocalDate cutoffDate);

    // Count payments by status
    // Example: How many pending payments do we have?
    long countByStatus(PaymentStatus status);

    // Find largest payments in a period
    // Example: Show me the top 10 largest payments this year
    @Query("SELECT p FROM Payment p WHERE p.paymentDate BETWEEN :startDate AND :endDate " +
            "ORDER BY p.amount DESC")
    List<Payment> findLargestPaymentsByPeriod(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    // Advanced search with multiple criteria
    @Query("SELECT p FROM Payment p WHERE " +
            "(:vendorName IS NULL OR LOWER(p.invoice.vendorName) LIKE LOWER(CONCAT('%', :vendorName, '%'))) AND " +
            "(:referenceNumber IS NULL OR LOWER(p.referenceNumber) LIKE LOWER(CONCAT('%', :referenceNumber, '%'))) AND " +
            "(:status IS NULL OR p.status = :status) AND " +
            "(:startDate IS NULL OR p.paymentDate >= :startDate) AND " +
            "(:endDate IS NULL OR p.paymentDate <= :endDate) AND " +
            "(:minAmount IS NULL OR p.amount >= :minAmount) AND " +
            "(:maxAmount IS NULL OR p.amount <= :maxAmount) " +
            "ORDER BY p.paymentDate DESC")
    Page<Payment> searchPayments(
            @Param("vendorName") String vendorName,
            @Param("referenceNumber") String referenceNumber,
            @Param("status") PaymentStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            Pageable pageable);

    // Calculate total payments by vendor for a period
    @Query("SELECT p.invoice.vendorName, SUM(p.amount) FROM Payment p " +
            "WHERE p.paymentDate BETWEEN :startDate AND :endDate " +
            "AND p.status = :status " +
            "GROUP BY p.invoice.vendorName " +
            "ORDER BY SUM(p.amount) DESC")
    List<Object[]> calculatePaymentsByVendor(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") PaymentStatus status);

    // Find payments by invoice status
    @Query("SELECT p FROM Payment p WHERE p.invoice.status = :invoiceStatus " +
            "ORDER BY p.paymentDate DESC")
    List<Payment> findByInvoiceStatus(@Param("invoiceStatus") com.example.backend.models.finance.InvoiceStatus invoiceStatus);

    @Query("SELECT (i.totalAmount - i.paidAmount) FROM Invoice i WHERE i.id = :invoiceId")
    BigDecimal getCurrentRemainingBalance(@Param("invoiceId") UUID invoiceId);
}