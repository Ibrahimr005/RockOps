package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.DeliveryItemReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryItemReceiptRepository extends JpaRepository<DeliveryItemReceipt, UUID> {
    List<DeliveryItemReceipt> findByPurchaseOrderItemId(UUID purchaseOrderItemId);
    List<DeliveryItemReceipt> findByDeliverySessionId(UUID deliverySessionId);
}