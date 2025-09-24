package com.example.backend.services.equipment;

import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class EquipmentBrandService {

    @Autowired
    private EquipmentBrandRepository equipmentBrandRepository;

    public List<EquipmentBrand> getAllEquipmentBrands() {
        return equipmentBrandRepository.findAll();
    }

    public Optional<EquipmentBrand> getEquipmentBrandById(UUID id) {
        return equipmentBrandRepository.findById(id);
    }

    public EquipmentBrand createEquipmentBrand(EquipmentBrand equipmentBrand) {
        // Check if a brand with this name already exists
        Optional<EquipmentBrand> existingBrand = equipmentBrandRepository.findByName(equipmentBrand.getName());
        if (existingBrand.isPresent()) {
            // For equipment brands, we don't have soft delete, so it's always an active duplicate
            throw ResourceConflictException.duplicateActive("Equipment brand", equipmentBrand.getName());
        }
        return equipmentBrandRepository.save(equipmentBrand);
    }

    public EquipmentBrand updateEquipmentBrand(UUID id, EquipmentBrand equipmentBrand) {
        Optional<EquipmentBrand> existingBrand = equipmentBrandRepository.findById(id);
        if (existingBrand.isPresent()) {
            EquipmentBrand brand = existingBrand.get();
            
            // Check if name is being changed and if it conflicts with another brand
            if (!brand.getName().equals(equipmentBrand.getName())) {
                Optional<EquipmentBrand> conflictingBrand = equipmentBrandRepository.findByName(equipmentBrand.getName());
                if (conflictingBrand.isPresent()) {
                    throw ResourceConflictException.duplicateActive("Equipment brand", equipmentBrand.getName());
                }
            }
            
            brand.setName(equipmentBrand.getName());
            brand.setDescription(equipmentBrand.getDescription());
            return equipmentBrandRepository.save(brand);
        }
        throw new RuntimeException("Equipment brand not found");
    }

    public void deleteEquipmentBrand(UUID id) {
        if (!equipmentBrandRepository.existsById(id)) {
            throw new RuntimeException("Equipment brand not found");
        }
        equipmentBrandRepository.deleteById(id);
    }
} 