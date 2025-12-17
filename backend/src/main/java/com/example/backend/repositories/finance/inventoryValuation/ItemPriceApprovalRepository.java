package com.example.backend.repositories.finance.inventoryValuation;

import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.warehouse.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemPriceApprovalRepository extends JpaRepository<ItemPriceApproval, UUID> {

    // Find all pending approvals
    List<ItemPriceApproval> findByApprovalStatusOrderByRequestedAtDesc(ApprovalStatus status);

    // Find pending approvals for a specific warehouse
    List<ItemPriceApproval> findByWarehouseAndApprovalStatusOrderByRequestedAtDesc(
            Warehouse warehouse, ApprovalStatus status);

    // Find approval by item
    Optional<ItemPriceApproval> findByItemId(UUID itemId);

    // Count pending approvals
    @Query("SELECT COUNT(ipa) FROM ItemPriceApproval ipa WHERE ipa.approvalStatus = 'PENDING'")
    Long countPendingApprovals();

    // Count pending approvals for a warehouse
    @Query("SELECT COUNT(ipa) FROM ItemPriceApproval ipa WHERE ipa.warehouse = :warehouse AND ipa.approvalStatus = 'PENDING'")
    Long countPendingApprovalsByWarehouse(@Param("warehouse") Warehouse warehouse);

    // Get all approvals by status and warehouse
    List<ItemPriceApproval> findByWarehouseAndApprovalStatus(Warehouse warehouse, ApprovalStatus status);
}