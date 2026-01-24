package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.IssueStatus;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderIssueRepository extends JpaRepository<PurchaseOrderIssue, UUID> {

    // Find all issues for a purchase order
    List<PurchaseOrderIssue> findByPurchaseOrderId(UUID purchaseOrderId);

    // Find all issues for a specific purchase order item
    List<PurchaseOrderIssue> findByPurchaseOrderItemId(UUID purchaseOrderItemId);

    // Find issues by status
    List<PurchaseOrderIssue> findByIssueStatus(IssueStatus issueStatus);

    // Find active (unresolved) issues for a purchase order
    List<PurchaseOrderIssue> findByPurchaseOrderIdAndIssueStatus(UUID purchaseOrderId, IssueStatus issueStatus);

    // Check if a purchase order has any active issues
    boolean existsByPurchaseOrderIdAndIssueStatus(UUID purchaseOrderId, IssueStatus issueStatus);

    // Count active issues for a purchase order
    long countByPurchaseOrderIdAndIssueStatus(UUID purchaseOrderId, IssueStatus issueStatus);

    @Query("SELECT i FROM PurchaseOrderIssue i " +
            "LEFT JOIN FETCH i.purchaseOrderItem poi " +
            "LEFT JOIN FETCH poi.itemType it " +
            "WHERE i.purchaseOrder.id = :purchaseOrderId")
    List<PurchaseOrderIssue> findByPurchaseOrderIdWithDetails(@Param("purchaseOrderId") UUID purchaseOrderId);
}