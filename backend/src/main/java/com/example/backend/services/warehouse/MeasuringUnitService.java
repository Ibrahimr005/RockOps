package com.example.backend.services.warehouse;

import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.repositories.warehouse.MeasuringUnitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MeasuringUnitService {

    @Autowired
    private MeasuringUnitRepository measuringUnitRepository;

    public MeasuringUnit createMeasuringUnit(Map<String, Object> requestBody) {
        MeasuringUnit measuringUnit = new MeasuringUnit();

        if (requestBody.containsKey("name")) {
            String name = (String) requestBody.get("name");

            // Check if already exists
            if (measuringUnitRepository.findByName(name).isPresent()) {
                throw new IllegalArgumentException("Measuring unit with name '" + name + "' already exists");
            }

            measuringUnit.setName(name);
        } else {
            throw new IllegalArgumentException("Name is required");
        }

        if (requestBody.containsKey("displayName")) {
            measuringUnit.setDisplayName((String) requestBody.get("displayName"));
        } else {
            measuringUnit.setDisplayName(measuringUnit.getName());
        }

        if (requestBody.containsKey("abbreviation")) {
            measuringUnit.setAbbreviation((String) requestBody.get("abbreviation"));
        } else {
            measuringUnit.setAbbreviation(measuringUnit.getName());
        }

        if (requestBody.containsKey("isActive")) {
            measuringUnit.setIsActive((Boolean) requestBody.get("isActive"));
        } else {
            measuringUnit.setIsActive(true);
        }

        return measuringUnitRepository.save(measuringUnit);
    }

    public List<MeasuringUnit> getAllMeasuringUnits() {
        return measuringUnitRepository.findAll();
    }

    public List<MeasuringUnit> getActiveMeasuringUnits() {
        return measuringUnitRepository.findAll().stream()
                .filter(MeasuringUnit::getIsActive)
                .toList();
    }

    public MeasuringUnit getMeasuringUnitById(UUID id) {
        return measuringUnitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Measuring unit not found"));
    }

    public MeasuringUnit updateMeasuringUnit(UUID id, Map<String, Object> requestBody) {
        MeasuringUnit existingUnit = getMeasuringUnitById(id);

        if (requestBody.containsKey("name")) {
            String newName = (String) requestBody.get("name");

            // Check if new name conflicts with another unit
            measuringUnitRepository.findByName(newName).ifPresent(unit -> {
                if (!unit.getId().equals(id)) {
                    throw new IllegalArgumentException("Measuring unit with name '" + newName + "' already exists");
                }
            });

            existingUnit.setName(newName);
        }

        if (requestBody.containsKey("displayName")) {
            existingUnit.setDisplayName((String) requestBody.get("displayName"));
        }

        if (requestBody.containsKey("abbreviation")) {
            existingUnit.setAbbreviation((String) requestBody.get("abbreviation"));
        }

        if (requestBody.containsKey("isActive")) {
            existingUnit.setIsActive((Boolean) requestBody.get("isActive"));
        }

        return measuringUnitRepository.save(existingUnit);
    }

    public void deleteMeasuringUnit(UUID id) {
        MeasuringUnit unit = getMeasuringUnitById(id);

        // Instead of hard delete, just deactivate
        unit.setIsActive(false);
        measuringUnitRepository.save(unit);
    }
}