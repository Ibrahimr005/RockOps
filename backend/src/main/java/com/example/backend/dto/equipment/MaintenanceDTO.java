package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceDTO {
    private UUID id;
    private UUID equipmentId;
    private String equipmentName;
    private UUID technicianId;
    private String technicianName;
    private LocalDateTime maintenanceDate;
    private UUID maintenanceTypeId;
    private String maintenanceTypeName;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private Integer linkedTransactionCount;
    private String lastTransactionBatch;
} 