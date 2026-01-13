package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.Logistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LogisticsRepository extends JpaRepository<Logistics, UUID> {
    List<Logistics> findByPurchaseOrderId(UUID purchaseOrderId);
    List<Logistics> findByDeliverySessionId(UUID deliverySessionId);
    List<Logistics> findByPurchaseOrderIdAndDeliverySessionIsNull(UUID purchaseOrderId);
}