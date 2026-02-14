package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderReturnItemRepository extends JpaRepository<PurchaseOrderReturnItem, UUID> {

    List<PurchaseOrderReturnItem> findByPurchaseOrderReturnId(UUID purchaseOrderReturnId);
}