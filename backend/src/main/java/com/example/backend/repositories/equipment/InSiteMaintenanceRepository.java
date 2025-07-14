package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.InSiteMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InSiteMaintenanceRepository extends JpaRepository<InSiteMaintenance, UUID> {

    // Find maintenance records by equipment ID with related transactions loaded
    @Query("SELECT DISTINCT m FROM InSiteMaintenance m " +
           "LEFT JOIN FETCH m.relatedTransactions " +
           "WHERE m.equipment.id = :equipmentId " +
           "ORDER BY m.maintenanceDate DESC")
    List<InSiteMaintenance> findByEquipmentIdWithTransactions(@Param("equipmentId") UUID equipmentId);

    // Original method for backward compatibility
    List<InSiteMaintenance> findByEquipmentIdOrderByMaintenanceDateDesc(UUID equipmentId);

    // Find top 10 maintenance records by equipment ID ordered by maintenance date desc
    List<InSiteMaintenance> findTop10ByEquipmentIdOrderByMaintenanceDateDesc(UUID equipmentId);

}