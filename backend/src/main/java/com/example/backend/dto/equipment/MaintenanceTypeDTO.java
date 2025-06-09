package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

// DTO for creating/updating maintenance types
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceTypeDTO {
    private UUID id;
    private String name;
    private String description;
    private boolean active;
} 