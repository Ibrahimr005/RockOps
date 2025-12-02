package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.DeliverySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliverySessionRepository extends JpaRepository<DeliverySession, UUID> {
    List<DeliverySession> findByPurchaseOrderId(UUID purchaseOrderId);
}