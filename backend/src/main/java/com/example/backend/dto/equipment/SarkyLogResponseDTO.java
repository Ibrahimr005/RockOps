package com.example.backend.dto.equipment;

import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.equipment.SarkyLog;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

// DTO for sarky log response including related data
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SarkyLogResponseDTO {
    private UUID id;
    private UUID equipmentId;
    private EquipmentType equipmentType;
    private WorkTypeDTO workType;
    private Double workedHours;
    private LocalDate date;
    private String filePath;
    private String createdByName;
    private LocalDate createdAt;
    private UUID driverId;
    private String driverName;

    /**
     * Create a SarkyLogResponseDTO from a SarkyLog entity
     * @param sarkyLog The SarkyLog entity to convert
     * @return The converted SarkyLogResponseDTO
     */
    public static SarkyLogResponseDTO fromEntity(SarkyLog sarkyLog) {
        SarkyLogResponseDTO dto = new SarkyLogResponseDTO();
        
        dto.setId(sarkyLog.getId());
        dto.setEquipmentId(sarkyLog.getEquipment().getId());
        dto.setEquipmentType(sarkyLog.getEquipment().getType());
        
        // Convert WorkType to WorkTypeDTO
        WorkTypeDTO workTypeDTO = new WorkTypeDTO();
        workTypeDTO.setId(sarkyLog.getWorkType().getId());
        workTypeDTO.setName(sarkyLog.getWorkType().getName());
        workTypeDTO.setDescription(sarkyLog.getWorkType().getDescription());
        dto.setWorkType(workTypeDTO);
        
        dto.setWorkedHours(sarkyLog.getWorkedHours());
        dto.setDate(sarkyLog.getDate());
        dto.setFilePath(sarkyLog.getFileUrl());
        
        if (sarkyLog.getCreatedBy() != null) {
            dto.setCreatedByName(sarkyLog.getCreatedBy().getUsername());
        }
        
        if (sarkyLog.getCreatedAt() != null) {
            dto.setCreatedAt(sarkyLog.getCreatedAt().toLocalDate());
        }
        
        if (sarkyLog.getDriver() != null) {
            dto.setDriverId(sarkyLog.getDriver().getId());
            dto.setDriverName(sarkyLog.getDriver().getFullName());
        }
        
        return dto;
    }
}