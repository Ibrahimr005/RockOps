package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.DeliveryItemReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryItemReceiptRepository extends JpaRepository<DeliveryItemReceipt, UUID> {
    List<DeliveryItemReceipt> findByPurchaseOrderItemId(UUID purchaseOrderItemId);
    List<DeliveryItemReceipt> findByDeliverySessionId(UUID deliverySessionId);

    @Query("SELECT r FROM DeliveryItemReceipt r WHERE r.purchaseOrderItem.merchant.id = :merchantId")
    List<DeliveryItemReceipt> findByPurchaseOrderItemMerchantId(@Param("merchantId") UUID merchantId);
}