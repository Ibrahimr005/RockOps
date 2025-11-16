package com.example.backend.repositories.procurement;


import com.example.backend.models.procurement.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    // Dashboard metrics methods
    long countByStatus(String status);
    List<PurchaseOrder> findByStatus(String status);
}
