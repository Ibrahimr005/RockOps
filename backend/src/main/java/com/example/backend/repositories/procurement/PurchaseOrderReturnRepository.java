package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseOrderReturnRepository extends JpaRepository<PurchaseOrderReturn, UUID> {

    List<PurchaseOrderReturn> findAllByOrderByCreatedAtDesc();

    List<PurchaseOrderReturn> findByStatusOrderByCreatedAtDesc(PurchaseOrderReturnStatus status);

    List<PurchaseOrderReturn> findByPurchaseOrderIdOrderByCreatedAtDesc(UUID purchaseOrderId);

    List<PurchaseOrderReturn> findByMerchantIdOrderByCreatedAtDesc(UUID merchantId);
}