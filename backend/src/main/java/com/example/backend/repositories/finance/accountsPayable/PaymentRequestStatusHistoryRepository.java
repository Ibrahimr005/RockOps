package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.PaymentRequestStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRequestStatusHistoryRepository extends JpaRepository<PaymentRequestStatusHistory, UUID> {

    // Find by payment request
    List<PaymentRequestStatusHistory> findByPaymentRequestId(UUID paymentRequestId);

    // Find by payment request ordered by date
    @Query("SELECT h FROM PaymentRequestStatusHistory h WHERE h.paymentRequest.id = :paymentRequestId ORDER BY h.changedAt DESC")
    List<PaymentRequestStatusHistory> findByPaymentRequestIdOrderByChangedAtDesc(@Param("paymentRequestId") UUID paymentRequestId);

    // Find by user who made the change
    List<PaymentRequestStatusHistory> findByChangedByUserId(UUID userId);

    // Find by status transition
    List<PaymentRequestStatusHistory> findByFromStatusAndToStatus(String fromStatus, String toStatus);

    // Find by date range
    List<PaymentRequestStatusHistory> findByChangedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Get latest status change for payment request
    @Query("SELECT h FROM PaymentRequestStatusHistory h WHERE h.paymentRequest.id = :paymentRequestId ORDER BY h.changedAt DESC LIMIT 1")
    PaymentRequestStatusHistory findLatestByPaymentRequestId(@Param("paymentRequestId") UUID paymentRequestId);

    // Delete by payment request
    void deleteByPaymentRequestId(UUID paymentRequestId);
}