package com.example.backend.dto.equipment;

import com.example.backend.models.equipment.Document.EntityType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {
    private UUID id;
    private EntityType entityType;
    private UUID entityId;
    private String entityName; // Name of the entity (e.g., equipment type, site name, etc.)
    private String name;
    private String type;
    private LocalDate dateUploaded;
    private String size;
    private Long fileSize; // Raw file size in bytes
    private String url;
    private String uploadedBy;
}