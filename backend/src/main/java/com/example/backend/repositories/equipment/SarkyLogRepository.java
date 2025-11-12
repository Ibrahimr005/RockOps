package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.SarkyLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface SarkyLogRepository extends JpaRepository<SarkyLog, UUID> {
    // Find all sarky logs for a specific equipment
    List<SarkyLog> findByEquipmentIdOrderByDateDesc(UUID equipmentId);

    // Find sarky logs for a specific equipment and date
    List<SarkyLog> findByEquipmentIdAndDate(UUID equipmentId, LocalDate date);

    // Check if any sarky log exists for a specific equipment and date
    boolean existsByEquipmentIdAndDate(UUID equipmentId, LocalDate date);

    // Check if any sarky log exists for a specific equipment and date, excluding a specific ID
    boolean existsByEquipmentIdAndDateAndIdNot(UUID equipmentId, LocalDate date, UUID id);

    // Find all sarky logs between date range for specific equipment
    List<SarkyLog> findByEquipmentIdAndDateBetweenOrderByDateDesc(UUID equipmentId, LocalDate startDate, LocalDate endDate);

    // Find all sarky logs for a specific work type
    List<SarkyLog> findByWorkTypeIdOrderByDateDesc(UUID workTypeId);

    // Add this method to SarkyLogRepository
    List<SarkyLog> findByEquipmentIdOrderByDateAsc(UUID equipmentId);
    
    // Find sarky logs for equipment within date range
    List<SarkyLog> findByEquipmentIdAndDateBetween(UUID equipmentId, LocalDate startDate, LocalDate endDate);
}