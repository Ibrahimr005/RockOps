package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.RequestOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RequestOrderRepository extends JpaRepository<RequestOrder, UUID> {

    @Query("SELECT ro FROM RequestOrder ro " +
            "LEFT JOIN FETCH ro.requestItems ri " +
            "LEFT JOIN FETCH ri.itemType it " +
            "LEFT JOIN FETCH it.itemCategory " +
            "LEFT JOIN FETCH ro.purchaseOrder po " +
            "WHERE ro.id = :id")
    Optional<RequestOrder> findByIdWithItems(@Param("id") UUID id);

    List<RequestOrder> findAllByRequesterIdAndPartyType(UUID requesterId, String partyType);
    List<RequestOrder> findByRequesterIdAndStatusAndPartyType(UUID requesterId, String status, String partyType);

    @Query("SELECT ro FROM RequestOrder ro JOIN ro.requestItems ri WHERE ro.requesterId = :warehouseId AND ri.itemType.id = :itemTypeId AND ro.status IN :statuses AND ro.createdAt >= :createdAfter ORDER BY ro.createdAt DESC")
    List<RequestOrder> findByWarehouseAndItemTypeAndStatusInAndCreatedAtAfter(
            @Param("warehouseId") UUID warehouseId,
            @Param("itemTypeId") UUID itemTypeId,
            @Param("statuses") List<String> statuses,
            @Param("createdAfter") LocalDateTime createdAfter
    );
}
