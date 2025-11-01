package com.example.backend.dto.hr;

import com.example.backend.models.hr.EmployeeDocument;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Employee Document responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDocumentDTO {
    private UUID id;
    private UUID employeeId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String mimeType;
    private String documentType;
    private String documentTypeName;
    private String description;
    private LocalDateTime uploadedAt;
    private String uploadedBy;

    /**
     * Convert entity to DTO
     */
    public static EmployeeDocumentDTO fromEntity(EmployeeDocument document) {
        return EmployeeDocumentDTO.builder()
                .id(document.getId())
                .employeeId(document.getEmployee().getId())
                .fileName(document.getFileName())
                .fileUrl(document.getFileUrl())
                .fileSize(document.getFileSize())
                .mimeType(document.getMimeType())
                .documentType(document.getDocumentType().name())
                .documentTypeName(document.getDocumentType().getDisplayName())
                .description(document.getDescription())
                .uploadedAt(document.getUploadedAt())
                .uploadedBy(document.getUploadedBy())
                .build();
    }
}

/**
 * DTO for uploading documents
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DocumentUploadRequestDTO {
    private String documentType;
    private String description;
}