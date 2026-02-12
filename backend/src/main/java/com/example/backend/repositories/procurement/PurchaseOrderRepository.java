package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    // Dashboard metrics methods
    long countByStatus(String status);
    List<PurchaseOrder> findByStatus(String status);
    List<PurchaseOrder> findByStatusOrderByUpdatedAtDesc(String status);

    // NEW: Fetch all POs with item details including category
    @Query("SELECT DISTINCT po FROM PurchaseOrder po " +
            "LEFT JOIN FETCH po.purchaseOrderItems poi " +
            "LEFT JOIN FETCH poi.itemType it " +
            "LEFT JOIN FETCH it.itemCategory " +
            "LEFT JOIN FETCH poi.merchant")
    List<PurchaseOrder> findAllWithDetails();

    // NEW: Fetch single PO with item details including category
    @Query("SELECT po FROM PurchaseOrder po " +
            "LEFT JOIN FETCH po.purchaseOrderItems poi " +
            "LEFT JOIN FETCH poi.itemType it " +
            "LEFT JOIN FETCH it.itemCategory " +
            "LEFT JOIN FETCH poi.merchant " +
            "WHERE po.id = :id")
    Optional<PurchaseOrder> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT DISTINCT po FROM PurchaseOrder po " +
            "LEFT JOIN FETCH po.purchaseOrderItems poi " +
            "LEFT JOIN FETCH poi.itemType it " +
            "LEFT JOIN FETCH poi.merchant m " +  // ADD THIS LINE
            "WHERE po.status = 'COMPLETED' " +
            "ORDER BY po.updatedAt DESC")
    List<PurchaseOrder> findCompletedPOsWithItems();
}