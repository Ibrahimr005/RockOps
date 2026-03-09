package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.equipment.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {
    List<Equipment> findByType(EquipmentType type);
    boolean existsBySerialNumber (String serialNumber);

    List<Equipment> findBySiteIsNull();

    List<Equipment> findBySiteId(UUID siteId);

    // Dashboard metrics methods
    long countByStatus(EquipmentStatus status);

    List<Equipment> findByImageStorageKeyIsNull();

    boolean existsByPurchaseOrderId(UUID purchaseOrderId);

    /**
     * Fetch all equipment with associations eagerly loaded in a single query.
     * Prevents N+1 problem (6 lazy associations x N equipment = 6N+1 queries).
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "LEFT JOIN FETCH e.type " +
           "LEFT JOIN FETCH e.brand " +
           "LEFT JOIN FETCH e.site " +
           "LEFT JOIN FETCH e.mainDriver " +
           "LEFT JOIN FETCH e.subDriver " +
           "LEFT JOIN FETCH e.purchasedFrom " +
           "LEFT JOIN FETCH e.purchaseSpec")
    List<Equipment> findAllWithAssociations();

    /**
     * Fetch equipment for a specific site with associations eagerly loaded.
     */
    @Query("SELECT DISTINCT e FROM Equipment e " +
           "LEFT JOIN FETCH e.type " +
           "LEFT JOIN FETCH e.brand " +
           "LEFT JOIN FETCH e.site " +
           "LEFT JOIN FETCH e.mainDriver " +
           "LEFT JOIN FETCH e.subDriver " +
           "LEFT JOIN FETCH e.purchasedFrom " +
           "LEFT JOIN FETCH e.purchaseSpec " +
           "WHERE e.site.id = :siteId")
    List<Equipment> findBySiteIdWithAssociations(UUID siteId);
}