package com.example.backend.repositories.finance;

import com.example.backend.models.finance.Invoice;
import com.example.backend.models.finance.InvoiceStatus;
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
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    // Find invoice by invoice number
    // Example: Find "INV-2024-001"
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    // Check if invoice number already exists (for validation)
    boolean existsByInvoiceNumber(String invoiceNumber);

    // Find invoices by vendor
    // Example: Show me all invoices from "ABC Lumber Company"
    List<Invoice> findByVendorNameContainingIgnoreCaseOrderByInvoiceDateDesc(String vendorName);

    // Find invoices by exact vendor name
    List<Invoice> findByVendorNameOrderByInvoiceDateDesc(String vendorName);

    // Find invoices by status
    // Example: Show me all unpaid invoices
    List<Invoice> findByStatusOrderByDueDateAsc(InvoiceStatus status);

    // Find unpaid invoices (for payment processing)
    // Example: Show me all invoices that still need payment
    @Query("SELECT i FROM Invoice i WHERE i.status IN (:statuses) ORDER BY i.dueDate ASC")
    List<Invoice> findUnpaidInvoices(@Param("statuses") List<InvoiceStatus> statuses);

    // Find overdue invoices
    // Example: Show me all invoices past their due date
    @Query("SELECT i FROM Invoice i WHERE i.dueDate < :currentDate " +
            "AND i.status != 'FULLY_PAID' ORDER BY i.dueDate ASC")
    List<Invoice> findOverdueInvoices(@Param("currentDate") LocalDate currentDate);

    // Find invoices due within X days
    // Example: Show me invoices due in the next 7 days
    @Query("SELECT i FROM Invoice i WHERE i.dueDate BETWEEN :currentDate AND :futureDate " +
            "AND i.status != 'FULLY_PAID' ORDER BY i.dueDate ASC")
    List<Invoice> findInvoicesDueWithinDays(
            @Param("currentDate") LocalDate currentDate,
            @Param("futureDate") LocalDate futureDate);

    // Find invoices within date range
    // Example: Show me all invoices from January 2024
    List<Invoice> findByInvoiceDateBetweenOrderByInvoiceDateDesc(
            LocalDate startDate, LocalDate endDate);

    // Find invoices with pagination
    Page<Invoice> findAllByOrderByInvoiceDateDesc(Pageable pageable);

    // Calculate total amount by status
    // Example: How much do we owe in total (unpaid invoices)?
    @Query("SELECT COALESCE(SUM(i.totalAmount - i.paidAmount), 0) FROM Invoice i " +
            "WHERE i.status IN (:statuses)")
    BigDecimal calculateTotalOutstandingAmount(@Param("statuses") List<InvoiceStatus> statuses);

    // Calculate total invoices amount for a period
    // Example: How much in invoices did we receive in January?
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i " +
            "WHERE i.invoiceDate BETWEEN :startDate AND :endDate")
    BigDecimal calculateTotalInvoiceAmountByPeriod(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Count invoices by status
    // Example: How many pending invoices do we have?
    long countByStatus(InvoiceStatus status);

    // Find invoices by amount range
    // Example: Show me all invoices between $1,000 and $10,000
    List<Invoice> findByTotalAmountBetweenOrderByTotalAmountDesc(
            BigDecimal minAmount, BigDecimal maxAmount);

    // Find top vendors by total invoice amount
    // Example: Who are our biggest suppliers?
    @Query("SELECT i.vendorName, SUM(i.totalAmount) as totalAmount FROM Invoice i " +
            "WHERE i.invoiceDate BETWEEN :startDate AND :endDate " +
            "GROUP BY i.vendorName ORDER BY totalAmount DESC")
    List<Object[]> findTopVendorsByPeriod(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    // Search invoices by multiple criteria
    // Example: Search for invoices containing "lumber" in description
    @Query("SELECT i FROM Invoice i WHERE " +
            "(:vendorName IS NULL OR LOWER(i.vendorName) LIKE LOWER(CONCAT('%', :vendorName, '%'))) AND " +
            "(:invoiceNumber IS NULL OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :invoiceNumber, '%'))) AND " +
            "(:description IS NULL OR LOWER(i.description) LIKE LOWER(CONCAT('%', :description, '%'))) AND " +
            "(:status IS NULL OR i.status = :status) AND " +
            "(:startDate IS NULL OR i.invoiceDate >= :startDate) AND " +
            "(:endDate IS NULL OR i.invoiceDate <= :endDate) AND " +
            "(:minAmount IS NULL OR i.totalAmount >= :minAmount) AND " +
            "(:maxAmount IS NULL OR i.totalAmount <= :maxAmount) " +
            "ORDER BY i.invoiceDate DESC")
    Page<Invoice> searchInvoices(
            @Param("vendorName") String vendorName,
            @Param("invoiceNumber") String invoiceNumber,
            @Param("description") String description,
            @Param("status") InvoiceStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            Pageable pageable);

    // Aging report queries - group invoices by how old they are
// Replace ALL aging methods in your InvoiceRepository with these corrected versions

    // Get invoices aged 0-30 days (Current)
    @Query("SELECT i FROM Invoice i WHERE " +
            "i.dueDate <= :currentDate " +
            "AND i.dueDate >= :thirtyDaysAgo " +
            "AND i.status NOT IN ('FULLY_PAID', 'CANCELLED') ORDER BY i.dueDate ASC")
    List<Invoice> findInvoicesAged0To30Days(@Param("currentDate") LocalDate currentDate,
                                            @Param("thirtyDaysAgo") LocalDate thirtyDaysAgo);

    // Get invoices aged 31-60 days
    @Query("SELECT i FROM Invoice i WHERE " +
            "i.dueDate < :thirtyDaysAgo " +
            "AND i.dueDate >= :sixtyDaysAgo " +
            "AND i.status NOT IN ('FULLY_PAID', 'CANCELLED') ORDER BY i.dueDate ASC")
    List<Invoice> findInvoicesAged31To60Days(@Param("thirtyDaysAgo") LocalDate thirtyDaysAgo,
                                             @Param("sixtyDaysAgo") LocalDate sixtyDaysAgo);

    // Get invoices aged 61-90 days
    @Query("SELECT i FROM Invoice i WHERE " +
            "i.dueDate < :sixtyDaysAgo " +
            "AND i.dueDate >= :ninetyDaysAgo " +
            "AND i.status NOT IN ('FULLY_PAID', 'CANCELLED') ORDER BY i.dueDate ASC")
    List<Invoice> findInvoicesAged61To90Days(@Param("sixtyDaysAgo") LocalDate sixtyDaysAgo,
                                             @Param("ninetyDaysAgo") LocalDate ninetyDaysAgo);

    // Get invoices aged over 90 days
    @Query("SELECT i FROM Invoice i WHERE " +
            "i.dueDate < :ninetyDaysAgo " +
            "AND i.status NOT IN ('FULLY_PAID', 'CANCELLED') ORDER BY i.dueDate ASC")
    List<Invoice> findInvoicesAgedOver90Days(@Param("ninetyDaysAgo") LocalDate ninetyDaysAgo);
    // Get vendor statistics
    @Query("SELECT i.vendorName, " +
            "COUNT(i) as invoiceCount, " +
            "SUM(i.totalAmount) as totalAmount, " +
            "SUM(i.paidAmount) as paidAmount, " +
            "SUM(i.totalAmount - i.paidAmount) as outstandingAmount " +
            "FROM Invoice i " +
            "WHERE i.invoiceDate BETWEEN :startDate AND :endDate " +
            "GROUP BY i.vendorName " +
            "ORDER BY totalAmount DESC")
    List<Object[]> getVendorStatistics(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find invoices by due date range
    List<Invoice> findByDueDateBetweenAndStatusNotOrderByDueDateAsc(
            LocalDate startDate, LocalDate endDate, InvoiceStatus excludeStatus);

    // Add this method to your InvoiceRepository interface
    @Query("SELECT (i.totalAmount - COALESCE(SUM(p.amount), 0)) " +
            "FROM Invoice i LEFT JOIN i.payments p " +
            "WHERE i.id = :invoiceId AND (p.status = 'PROCESSED' OR p.status IS NULL) " +
            "GROUP BY i.id, i.totalAmount")
    BigDecimal getCurrentRemainingBalance(@Param("invoiceId") UUID invoiceId);

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.invoice.id = :invoiceId AND p.status = 'PROCESSED'")
    BigDecimal calculateTotalPaidAmount(@Param("invoiceId") UUID invoiceId);
}