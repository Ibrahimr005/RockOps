package com.example.backend.dtos.equipment;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.UUID;

/**
 * Minimal DTO for equipment used in dropdowns and lists
 * Contains only essential fields without heavy data like images
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentMinimalDTO {

    private UUID id;

    private String name;

    private String model;

    private String serialNumber;

    private String status;
}
