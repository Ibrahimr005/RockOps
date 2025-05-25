package com.example.backend.repositories.equipment;

import com.example.backend.repositories.equipment.finance.models.ItemStatus;
import com.example.backend.services.finance.equipment.finance.models.*;
import com.example.backend.repositories.equipment.finance.models.equipment.Consumable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConsumableRepository extends JpaRepository<Consumable, UUID> {


    Consumable findByEquipmentIdAndItemTypeId(UUID equipmentId, UUID itemTypeId);

    List<Consumable> findByEquipmentId(UUID equipmentId);

    List<Consumable> findByEquipmentIdAndStatus(UUID equipmentId, ItemStatus status);

    List<Consumable> findByEquipmentIdAndStatusOrStatus(UUID equipmentId, ItemStatus status1, ItemStatus status2);



}
