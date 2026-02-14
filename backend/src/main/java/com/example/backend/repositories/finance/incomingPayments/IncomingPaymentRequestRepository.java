package com.example.backend.repositories.finance.incomingPayments;

import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequest;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IncomingPaymentRequestRepository extends JpaRepository<IncomingPaymentRequest, UUID> {

    List<IncomingPaymentRequest> findAllByOrderByCreatedAtDesc();

    List<IncomingPaymentRequest> findByStatusOrderByCreatedAtDesc(IncomingPaymentStatus status);

    List<IncomingPaymentRequest> findBySourceOrderByCreatedAtDesc(IncomingPaymentSource source);

    List<IncomingPaymentRequest> findByPurchaseOrderIdOrderByCreatedAtDesc(UUID purchaseOrderId);

    List<IncomingPaymentRequest> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId);

    @Query("SELECT ipr FROM IncomingPaymentRequest ipr " +
            "WHERE ipr.purchaseOrder.id = :purchaseOrderId " +
            "AND ipr.merchant.id = :merchantId " +
            "AND ipr.status = :status " +
            "AND ipr.source = :source")
    IncomingPaymentRequest findByPurchaseOrderIdAndMerchantIdAndStatusAndSource(
            @Param("purchaseOrderId") UUID purchaseOrderId,
            @Param("merchantId") UUID merchantId,
            @Param("status") IncomingPaymentStatus status,
            @Param("source") IncomingPaymentSource source
    );
}