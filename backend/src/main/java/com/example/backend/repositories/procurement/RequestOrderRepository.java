package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.RequestOrder.RequestOrder;
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
            "LEFT JOIN FETCH ro.purchaseOrders po " +  // CHANGED THIS LINE
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

    // Dashboard metrics methods
    long countByStatus(String status);
    List<RequestOrder> findByStatus(String status);

    // Check if a request order with the same title and requesterId exists with PENDING status
    @Query("SELECT CASE WHEN COUNT(ro) > 0 THEN true ELSE false END FROM RequestOrder ro WHERE LOWER(ro.title) = LOWER(:title) AND ro.requesterId = :requesterId AND ro.status = 'PENDING'")
    boolean existsByTitleAndRequesterIdAndStatusPending(@Param("title") String title, @Param("requesterId") UUID requesterId);

    // For update - check if title and requesterId exists for PENDING status excluding current ID
    @Query("SELECT CASE WHEN COUNT(ro) > 0 THEN true ELSE false END FROM RequestOrder ro WHERE LOWER(ro.title) = LOWER(:title) AND ro.requesterId = :requesterId AND ro.status = 'PENDING' AND ro.id != :excludeId")
    boolean existsByTitleAndRequesterIdAndStatusPendingExcludingId(@Param("title") String title, @Param("requesterId") UUID requesterId, @Param("excludeId") UUID excludeId);

    @Query("SELECT DISTINCT ro FROM RequestOrder ro " +
            "LEFT JOIN FETCH ro.requestItems ri " +
            "LEFT JOIN FETCH ri.itemType it " +
            "LEFT JOIN FETCH it.itemCategory ic " +
            "WHERE ro.id = :id")
    Optional<RequestOrder> findByIdForDetails(@Param("id") UUID id);
}
