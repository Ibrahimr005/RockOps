package com.example.backend.repositories.equipment;

//import com.example.backend.services.finance.equipment.finance.models.*;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.warehouse.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConsumableRepository extends JpaRepository<Consumable, UUID> {


    Consumable findByEquipmentIdAndItemTypeId(UUID equipmentId, UUID itemTypeId);
    
    Consumable findByEquipmentIdAndItemTypeIdAndStatus(UUID equipmentId, UUID itemTypeId, ItemStatus status);

    List<Consumable> findByEquipmentId(UUID equipmentId);

    List<Consumable> findByEquipmentIdAndStatus(UUID equipmentId, ItemStatus status);

    List<Consumable> findByEquipmentIdAndStatusOrStatus(UUID equipmentId, ItemStatus status1, ItemStatus status2);

    // Method to get ACTIVE (unresolved) consumables with discrepancies
    List<Consumable> findByEquipmentIdAndStatusInAndResolvedFalse(UUID equipmentId, List<ItemStatus> statuses);

    // Method to get resolved consumables for history tab
    List<Consumable> findByEquipmentIdAndResolvedTrue(UUID equipmentId);

    // Method to find consumables by transaction and status
    List<Consumable> findByTransactionAndStatusIn(Transaction transaction, List<ItemStatus> statuses);

    /**
     * Find all consumables for a specific equipment and item type (for history)
     * Returns all transaction records for this consumable type on this equipment
     */
    @Query("SELECT c FROM Consumable c " +
           "LEFT JOIN FETCH c.transaction t " +
           "WHERE c.equipment.id = :equipmentId " +
           "AND c.itemType.id = :itemTypeId " +
           "ORDER BY t.completedAt DESC NULLS LAST")
    List<Consumable> findAllByEquipmentIdAndItemTypeId(
            @Param("equipmentId") UUID equipmentId, 
            @Param("itemTypeId") UUID itemTypeId
    );

    /**
     * Find the history of transactions that contributed to a specific consumable's availability.
     * This rebuilds history based on transaction relationships, not the unreliable transaction field in consumables.
     * 
     * Logic: 
     * 1. Get the equipment and item type from the consumable
     * 2. Find all transactions where this equipment was a receiver
     * 3. Check if transaction has purpose "CONSUMABLE" 
     * 4. Check if any transaction item matches the consumable's item type
     */
    @Query("SELECT DISTINCT t FROM Transaction t " +
           "JOIN FETCH t.items ti " +
           "LEFT JOIN FETCH ti.itemType it " +
           "WHERE t.receiverId = (SELECT c.equipment.id FROM Consumable c WHERE c.id = :consumableId) " +
           "AND t.receiverType = 'EQUIPMENT' " +
           "AND t.purpose = 'CONSUMABLE' " +
           "AND ti.itemType.id = (SELECT c.itemType.id FROM Consumable c WHERE c.id = :consumableId) " +
           "ORDER BY t.createdAt DESC NULLS LAST")
    List<Transaction> findTransactionHistoryForConsumable(@Param("consumableId") UUID consumableId);
}
