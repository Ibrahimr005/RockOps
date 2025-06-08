package com.example.backend.repositories.warehouse;


import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemRepository extends JpaRepository<Item, UUID> {

    Optional<Item> findByItemTypeIdAndWarehouseId(UUID itemTypeId, UUID warehouseId);

    // Methods that return multiple items (List)
    List<Item> findAllByItemTypeIdAndWarehouseId(UUID itemTypeId, UUID warehouseId);

    List<Item> findAllByItemTypeIdAndWarehouseIdAndItemStatus(
            UUID itemTypeId,
            UUID warehouseId,
            ItemStatus status);

    List<Item> findAllByItemTypeIdAndWarehouseIdAndItemStatusAndQuantity(
            UUID itemTypeId,
            UUID warehouseId,
            ItemStatus status,
            int quantity);

    List<Item> findByWarehouse(Warehouse warehouse);

    Optional<Item> findByItemTypeAndWarehouse(ItemType itemType, Warehouse warehouse);

    // Additional useful queries
    List<Item> findByWarehouseAndItemStatus(Warehouse warehouse, ItemStatus status);

    Long countByWarehouseAndItemStatus(Warehouse warehouse, ItemStatus status);

    // MISSING METHOD - This is what you need for discrepancy resolution
    List<Item> findByWarehouseAndItemStatusIn(Warehouse warehouse, List<ItemStatus> statuses);

    // Alternative methods you might find useful
    List<Item> findByWarehouseIdAndItemStatusIn(UUID warehouseId, List<ItemStatus> statuses);

    List<Item> findByItemStatusIn(List<ItemStatus> statuses);

    List<Item> findByWarehouseAndItemStatusInAndResolvedFalse(Warehouse warehouse, List<ItemStatus> statuses);
    List<Item> findByWarehouseAndResolvedTrue(Warehouse warehouse);
    List<Item> findByWarehouseAndResolvedFalse(Warehouse warehouse);

    @Query("SELECT i FROM Item i " +
            "LEFT JOIN FETCH i.transactionItem ti " +
            "LEFT JOIN FETCH ti.transaction t " +
            "WHERE i.warehouse = :warehouse")
    List<Item> findByWarehouseWithTransactionItems(@Param("warehouse") Warehouse warehouse);

    @Query("SELECT i FROM Item i " +
            "LEFT JOIN FETCH i.transactionItem ti " +
            "LEFT JOIN FETCH ti.transaction t " +
            "WHERE i.itemType.id = :itemTypeId " +
            "AND i.warehouse.id = :warehouseId " +
            "AND i.itemStatus = :itemStatus " +
            "ORDER BY t.completedAt DESC")
    List<Item> findAllByItemTypeIdAndWarehouseIdAndItemStatusWithTransactionDetails(
            @Param("itemTypeId") UUID itemTypeId,
            @Param("warehouseId") UUID warehouseId,
            @Param("itemStatus") ItemStatus itemStatus);

    List<Item> findAllByItemTypeIdAndWarehouseIdAndItemStatusAndTransactionItemId(
            UUID itemTypeId,
            UUID warehouseId,
            ItemStatus itemStatus,
            UUID transactionItemId
    );


    // Add this method to your ItemRepository interface

    @Query("SELECT i FROM Item i WHERE i.transactionItem.transaction.id = :transactionId " +
            "AND i.itemStatus IN ('MISSING', 'OVERRECEIVED')")
    List<Item> findDiscrepancyItemsByTransaction(@Param("transactionId") UUID transactionId);
}