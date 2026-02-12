package com.example.backend.repositories.finance.valuation;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.Valuation.EquipmentValuation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EquipmentValuationRepository extends JpaRepository<EquipmentValuation, UUID> {

    Optional<EquipmentValuation> findByEquipment(Equipment equipment);

    Optional<EquipmentValuation> findByEquipmentId(UUID equipmentId);

    List<EquipmentValuation> findByEquipmentSiteId(UUID siteId);

    boolean existsByEquipmentId(UUID equipmentId);
}