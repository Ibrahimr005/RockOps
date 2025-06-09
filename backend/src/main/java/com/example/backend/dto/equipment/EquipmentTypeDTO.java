package com.example.backend.dto.equipment;

import com.example.backend.models.equipment.EquipmentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentTypeDTO {
    private UUID id;
    private String name;
    private String description;
    private boolean drivable = true; // Default to true for backward compatibility
    private List<WorkTypeDTO> supportedWorkTypes;

    // Convert Entity to DTO
    public static EquipmentTypeDTO fromEntity(EquipmentType equipmentType) {
        if (equipmentType == null) return null;

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setId(equipmentType.getId());
        dto.setName(equipmentType.getName());
        dto.setDescription(equipmentType.getDescription());
        dto.setDrivable(equipmentType.isDrivable());
        
        // Convert supported work types
        if (equipmentType.getSupportedWorkTypes() != null) {
            dto.setSupportedWorkTypes(
                equipmentType.getSupportedWorkTypes().stream()
                    .map(workType -> {
                        WorkTypeDTO workTypeDTO = new WorkTypeDTO();
                        workTypeDTO.setId(workType.getId());
                        workTypeDTO.setName(workType.getName());
                        workTypeDTO.setDescription(workType.getDescription());
                        workTypeDTO.setActive(workType.isActive());
                        return workTypeDTO;
                    })
                    .collect(Collectors.toList())
            );
        }
        
        return dto;
    }

    // Convert DTO to Entity
    public EquipmentType toEntity() {
        EquipmentType entity = new EquipmentType();
        entity.setId(this.id);
        entity.setName(this.name);
        entity.setDescription(this.description);
        entity.setDrivable(this.drivable);
        return entity;
    }
}