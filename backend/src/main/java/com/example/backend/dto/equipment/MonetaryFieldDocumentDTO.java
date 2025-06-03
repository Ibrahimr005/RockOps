package com.example.backend.dto.equipment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonetaryFieldDocumentDTO {
    private UUID id;
    private UUID equipmentId;
    private String equipmentName;
    private String fieldType; // "SHIPPING", "CUSTOMS", "TAXES"
    private String documentName;
    private String documentType;
    private String fileUrl;
    private Long fileSize;
    private LocalDate uploadDate;
    private String uploadedByName;
    private UUID uploadedById;
} 