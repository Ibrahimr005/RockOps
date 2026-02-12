package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.Logistics.LogisticsPurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LogisticsPurchaseOrderRepository extends JpaRepository<LogisticsPurchaseOrder, UUID> {

    @Query("SELECT lpo FROM LogisticsPurchaseOrder lpo " +
            "WHERE lpo.purchaseOrder.id = :purchaseOrderId")
    List<LogisticsPurchaseOrder> findByPurchaseOrderId(@Param("purchaseOrderId") UUID purchaseOrderId);

    @Query("SELECT lpo FROM LogisticsPurchaseOrder lpo " +
            "WHERE lpo.logistics.id = :logisticsId")
    List<LogisticsPurchaseOrder> findByLogisticsId(@Param("logisticsId") UUID logisticsId);
}