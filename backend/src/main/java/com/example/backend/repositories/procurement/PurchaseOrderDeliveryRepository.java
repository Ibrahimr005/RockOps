package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.PurchaseOrderDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderDeliveryRepository extends JpaRepository<PurchaseOrderDelivery, UUID> {

    // Find all deliveries for a purchase order
    List<PurchaseOrderDelivery> findByPurchaseOrderId(UUID purchaseOrderId);

    // Find all deliveries for a specific purchase order item
    List<PurchaseOrderDelivery> findByPurchaseOrderItemId(UUID purchaseOrderItemId);

    // Find deliveries with full details (avoid N+1 queries)
    @Query("SELECT d FROM PurchaseOrderDelivery d " +
            "LEFT JOIN FETCH d.issues " +
            "WHERE d.purchaseOrderItem.id = :itemId " +
            "ORDER BY d.deliveredAt DESC")
    List<PurchaseOrderDelivery> findByItemIdWithIssues(@Param("itemId") UUID itemId);

    // Find redeliveries for a specific issue
    List<PurchaseOrderDelivery> findByRedeliveryForIssueId(UUID issueId);

    @Query("SELECT COUNT(d) FROM PurchaseOrderDelivery d WHERE d.redeliveryForIssue.id = :issueId")
    Long countByRedeliveryForIssueId(@Param("issueId") UUID issueId);

    /**
     * Check if a redelivery exists for a specific issue
     */
    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM PurchaseOrderDelivery d WHERE d.redeliveryForIssue.id = :issueId")
    boolean existsByRedeliveryForIssueId(@Param("issueId") UUID issueId);

    // Check if item has any redeliveries pending
    @Query("SELECT COUNT(d) > 0 FROM PurchaseOrderDelivery d " +
            "WHERE d.purchaseOrderItem.id = :itemId " +
            "AND d.isRedelivery = true")
    boolean hasRedeliveries(@Param("itemId") UUID itemId);


}