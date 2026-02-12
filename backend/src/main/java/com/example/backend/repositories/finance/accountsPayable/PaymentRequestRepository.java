package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
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
public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, UUID> {

    // Find by request number
    Optional<PaymentRequest> findByRequestNumber(String requestNumber);

//    // Find by purchase order
//    Optional<PaymentRequest> findByPurchaseOrderId(UUID purchaseOrderId);
// In PaymentRequestRepository.java, change this:
//@Query("SELECT pr FROM PaymentRequest pr WHERE pr.purchaseOrder.id = :purchaseOrderId")
//Optional<PaymentRequest> findByPurchaseOrderId(@Param("purchaseOrderId") UUID purchaseOrderId);
// ✅ NEW METHOD (returns list - handles multiple payment requests per PO)
List<PaymentRequest> findAllByPurchaseOrderId(UUID purchaseOrderId);
    // Find by status
    List<PaymentRequest> findByStatus(PaymentRequestStatus status);

    // Find by multiple statuses
    List<PaymentRequest> findByStatusIn(List<PaymentRequestStatus> statuses);

    // Find by merchant
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.merchant.id = :merchantId")
    List<PaymentRequest> findByMerchantId(@Param("merchantId") UUID merchantId);

    // Find by requester
    List<PaymentRequest> findByRequestedByUserId(UUID userId);

    // Find by department
    List<PaymentRequest> findByRequestedByDepartment(String department);

    // Find pending requests
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.status = 'PENDING' ORDER BY pr.requestedAt ASC")
    List<PaymentRequest> findPendingRequests();

    // Find approved and ready to pay
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.status IN ('APPROVED', 'PARTIALLY_PAID') AND pr.deletedAt IS NULL ORDER BY pr.paymentDueDate ASC NULLS LAST")
    List<PaymentRequest> findApprovedAndReadyToPay();

    // Find overdue payments
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.status IN ('APPROVED', 'PARTIALLY_PAID') AND pr.paymentDueDate < :today AND pr.deletedAt IS NULL")
    List<PaymentRequest> findOverduePayments(@Param("today") LocalDate today);

    // Find by date range
    List<PaymentRequest> findByRequestedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find with remaining amount
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.remainingAmount > 0 AND pr.deletedAt IS NULL")
    List<PaymentRequest> findWithRemainingAmount();

    // Get payment requests by merchant with details
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.merchant.id = :merchantId AND pr.deletedAt IS NULL ORDER BY pr.requestedAt DESC")
    List<PaymentRequest> findByMerchantIdWithDetails(@Param("merchantId") UUID merchantId);

    // Count by status
    long countByStatus(PaymentRequestStatus status);

    // Sum total amount by status
    @Query("SELECT COALESCE(SUM(pr.requestedAmount), 0) FROM PaymentRequest pr WHERE pr.status = :status AND pr.deletedAt IS NULL")
    Double sumAmountByStatus(@Param("status") PaymentRequestStatus status);

    // Get requests due within days
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.status IN ('APPROVED', 'PARTIALLY_PAID') AND pr.paymentDueDate BETWEEN :startDate AND :endDate AND pr.deletedAt IS NULL ORDER BY pr.paymentDueDate ASC")
    List<PaymentRequest> findDueWithinDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Check if request number exists
    boolean existsByRequestNumber(String requestNumber);

    // Find deleted requests
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.deletedAt IS NOT NULL")
    List<PaymentRequest> findDeletedRequests();

    // Maintenance-related queries
    Optional<PaymentRequest> findByMaintenanceStepId(UUID maintenanceStepId);

    List<PaymentRequest> findByMaintenanceRecordId(UUID maintenanceRecordId);

    boolean existsByMaintenanceStepId(UUID maintenanceStepId);

    // Get max sequence number for payment request number generation
    @Query("SELECT MAX(CAST(SUBSTRING(pr.requestNumber, LENGTH(:prefix) + 1) AS long)) " +
           "FROM PaymentRequest pr WHERE pr.requestNumber LIKE :prefix")
    Long getMaxRequestNumberSequence(@Param("prefix") String prefix);

    // Find by payroll batch
    Optional<PaymentRequest> findByPayrollBatchId(UUID payrollBatchId);

    // Find all payment requests for a payroll (via batches)
    @Query("SELECT pr FROM PaymentRequest pr WHERE pr.payrollBatch.payroll.id = :payrollId")
    List<PaymentRequest> findByPayrollId(@Param("payrollId") UUID payrollId);
}