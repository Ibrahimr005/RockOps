package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.PaymentRequestItem;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRequestItemRepository extends JpaRepository<PaymentRequestItem, UUID> {

    // Find by payment request
    List<PaymentRequestItem> findByPaymentRequestId(UUID paymentRequestId);

    // Find by status
    List<PaymentRequestItem> findByStatus(PaymentRequestItemStatus status);

    // Find by payment request and status
    List<PaymentRequestItem> findByPaymentRequestIdAndStatus(UUID paymentRequestId, PaymentRequestItemStatus status);

    // Find items with remaining amount
    @Query("SELECT item FROM PaymentRequestItem item WHERE item.remainingAmount > 0")
    List<PaymentRequestItem> findItemsWithRemainingAmount();

    // Find items by payment request with remaining amount
    @Query("SELECT item FROM PaymentRequestItem item WHERE item.paymentRequest.id = :paymentRequestId AND item.remainingAmount > 0")
    List<PaymentRequestItem> findUnpaidItemsByPaymentRequest(@Param("paymentRequestId") UUID paymentRequestId);

    // Count items by status for a payment request
    long countByPaymentRequestIdAndStatus(UUID paymentRequestId, PaymentRequestItemStatus status);

    // Delete by payment request
    void deleteByPaymentRequestId(UUID paymentRequestId);
}