package com.example.backend.repositories.finance.refunds;

import com.example.backend.models.finance.refunds.RefundRequest;
import com.example.backend.models.finance.refunds.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {

    // Find all refunds ordered by creation date (newest first)
    List<RefundRequest> findAllByOrderByCreatedAtDesc();

    // Find refunds by status
    List<RefundRequest> findByStatusOrderByCreatedAtDesc(RefundStatus status);

    // Find refunds by purchase order
    List<RefundRequest> findByPurchaseOrderIdOrderByCreatedAtDesc(UUID purchaseOrderId);

    // Find refunds by merchant
    List<RefundRequest> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId);

    // Check if refund request exists for a specific merchant in a PO
    @Query("SELECT CASE WHEN COUNT(rr) > 0 THEN true ELSE false END " +
            "FROM RefundRequest rr " +
            "WHERE rr.purchaseOrder.id = :purchaseOrderId " +
            "AND rr.merchant.id = :merchantId")
    boolean existsByPurchaseOrderIdAndMerchantId(
            @Param("purchaseOrderId") UUID purchaseOrderId,
            @Param("merchantId") UUID merchantId
    );

    // Find existing refund request for a specific merchant in a PO
    @Query("SELECT rr FROM RefundRequest rr " +
            "WHERE rr.purchaseOrder.id = :purchaseOrderId " +
            "AND rr.merchant.id = :merchantId " +
            "AND rr.status = :status")
    RefundRequest findByPurchaseOrderIdAndMerchantIdAndStatus(
            @Param("purchaseOrderId") UUID purchaseOrderId,
            @Param("merchantId") UUID merchantId,
            @Param("status") RefundStatus status
    );
}