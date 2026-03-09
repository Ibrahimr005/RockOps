package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.EquipmentPurchaseSpecDTO;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.procurement.EquipmentPurchaseSpecRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EquipmentPurchaseSpecService {

    private final EquipmentPurchaseSpecRepository specRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;
    private final EquipmentBrandRepository equipmentBrandRepository;

    public List<EquipmentPurchaseSpec> getAll() {
        return specRepository.findAll();
    }

    public EquipmentPurchaseSpec getById(UUID id) {
        return specRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Equipment purchase spec not found: " + id));
    }

    public EquipmentPurchaseSpec create(EquipmentPurchaseSpecDTO dto) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(dto.getEquipmentTypeId())
                .orElseThrow(() -> new RuntimeException("Equipment type not found: " + dto.getEquipmentTypeId()));

        EquipmentPurchaseSpec spec = EquipmentPurchaseSpec.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .equipmentType(equipmentType)
                .model(dto.getModel())
                .manufactureYear(dto.getManufactureYear())
                .countryOfOrigin(dto.getCountryOfOrigin())
                .specifications(dto.getSpecifications())
                .estimatedBudget(dto.getEstimatedBudget())
                .build();

        // Set brand if provided
        if (dto.getEquipmentBrandId() != null) {
            EquipmentBrand brand = equipmentBrandRepository.findById(dto.getEquipmentBrandId())
                    .orElseThrow(() -> new RuntimeException("Equipment brand not found: " + dto.getEquipmentBrandId()));
            spec.setBrand(brand);
        }

        return specRepository.save(spec);
    }

    public EquipmentPurchaseSpec update(UUID id, EquipmentPurchaseSpecDTO dto) {
        EquipmentPurchaseSpec existing = getById(id);

        EquipmentType equipmentType = equipmentTypeRepository.findById(dto.getEquipmentTypeId())
                .orElseThrow(() -> new RuntimeException("Equipment type not found: " + dto.getEquipmentTypeId()));

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setEquipmentType(equipmentType);
        existing.setModel(dto.getModel());
        existing.setManufactureYear(dto.getManufactureYear());
        existing.setCountryOfOrigin(dto.getCountryOfOrigin());
        existing.setSpecifications(dto.getSpecifications());
        existing.setEstimatedBudget(dto.getEstimatedBudget());

        if (dto.getEquipmentBrandId() != null) {
            EquipmentBrand brand = equipmentBrandRepository.findById(dto.getEquipmentBrandId())
                    .orElseThrow(() -> new RuntimeException("Equipment brand not found: " + dto.getEquipmentBrandId()));
            existing.setBrand(brand);
        } else {
            existing.setBrand(null);
        }

        return specRepository.save(existing);
    }

    public void delete(UUID id) {
        specRepository.deleteById(id);
    }
}
