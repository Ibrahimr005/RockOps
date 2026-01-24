package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, UUID> {

    List<PurchaseOrderItem> findByMerchantId(UUID merchantId);

    @Query("SELECT poi FROM PurchaseOrderItem poi " +
            "LEFT JOIN FETCH poi.itemType it " +
            "LEFT JOIN FETCH it.itemCategory " +
            "WHERE poi.id IN :itemIds")
    List<PurchaseOrderItem> findAllByIdIn(@Param("itemIds") List<UUID> itemIds);
}