package com.example.backend.services;

import com.example.backend.models.PartyType;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class EntityService {
    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SiteRepository siteRepository;

    /**
     * Get entity name by type and ID
     */
    public String getEntityName(PartyType type, UUID id) {
        switch (type) {
            case WAREHOUSE:
                return warehouseRepository.findById(id)
                        .map(Warehouse::getName)
                        .orElse("Unknown Warehouse");
            case EQUIPMENT:
                return equipmentRepository.findById(id)
                        .map(equipment -> equipment.getType() + " - " + equipment.getFullModelName())
                        .orElse("Unknown Equipment");
            default:
                return "Unknown Entity";
        }
    }
}
