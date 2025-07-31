package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.equipment.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConsumableResolutionRepository extends JpaRepository<ConsumableResolution, UUID> {

    // Find resolutions by consumable ID
    List<ConsumableResolution> findByConsumableId(UUID consumableId);

    // Find resolutions by who resolved them
    List<ConsumableResolution> findByResolvedBy(String resolvedBy);

    // Find resolutions by equipment - using a custom query to join through Consumable
    @Query("SELECT cr FROM ConsumableResolution cr JOIN cr.consumable c WHERE c.equipment = :equipment ORDER BY cr.resolvedAt DESC")
    List<ConsumableResolution> findByConsumableEquipmentOrderByResolvedAtDesc(@Param("equipment") Equipment equipment);

    // Alternative method if the above doesn't work
    @Query("SELECT cr FROM ConsumableResolution cr WHERE cr.consumable.equipment.id = :equipmentId ORDER BY cr.resolvedAt DESC")
    List<ConsumableResolution> findByConsumableEquipmentIdOrderByResolvedAtDesc(@Param("equipmentId") UUID equipmentId);

    // Find resolutions by transaction ID
    List<ConsumableResolution> findByTransactionId(String transactionId);
} 