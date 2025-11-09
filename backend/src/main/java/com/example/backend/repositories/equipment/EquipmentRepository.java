package com.example.backend.repositories.equipment;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.equipment.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
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
}