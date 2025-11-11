package com.example.backend.services.hr;

import com.example.backend.dto.hr.EmployeeDocumentDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.EmployeeDocument;
import com.example.backend.repositories.hr.EmployeeDocumentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing employee documents
 */
@Service
@RequiredArgsConstructor
public class EmployeeDocumentService {

    private final EmployeeDocumentRepository documentRepository;
    private final EmployeeRepository employeeRepository;
    private final FileStorageService fileStorageService;

    /**
     * Get all documents for an employee
     */
    @Transactional(readOnly = true)
    public List<EmployeeDocumentDTO> getEmployeeDocuments(UUID employeeId) {
        List<EmployeeDocument> documents = documentRepository.findByEmployeeIdAndIsDeletedFalse(employeeId);
        return documents.stream()
                .map(EmployeeDocumentDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific document by ID
     */
    @Transactional(readOnly = true)
    public EmployeeDocumentDTO getDocumentById(UUID documentId) {
        EmployeeDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
        
        if (document.getIsDeleted()) {
            throw new RuntimeException("Document has been deleted");
        }
        
        return EmployeeDocumentDTO.fromEntity(document);
    }

    /**
     * Upload a new document for an employee
     */
    @Transactional
    public EmployeeDocumentDTO uploadDocument(
            UUID employeeId,
            MultipartFile file,
            String documentTypeStr,
            String description,
            String uploadedBy
    ) {
        // Validate employee exists
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));

        // Validate file
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }

        // Parse document type
        EmployeeDocument.DocumentType documentType;
        try {
            documentType = EmployeeDocument.DocumentType.valueOf(documentTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid document type: " + documentTypeStr);
        }

        try {
            // Upload file to storage
            String fileName = fileStorageService.uploadFile(file);
            String fileUrl = fileStorageService.getFileUrl(fileName);

            // Create document record
            EmployeeDocument document = EmployeeDocument.builder()
                    .employee(employee)
                    .fileName(file.getOriginalFilename())
                    .fileUrl(fileUrl)
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType())
                    .documentType(documentType)
                    .description(description)
                    .uploadedBy(uploadedBy)
                    .isDeleted(false)
                    .build();

            document = documentRepository.save(document);
            return EmployeeDocumentDTO.fromEntity(document);

        } catch (Exception e) {
            throw new RuntimeException("Failed to upload document: " + e.getMessage(), e);
        }
    }

    /**
     * Upload multiple documents at once
     */
    @Transactional
    public List<EmployeeDocumentDTO> uploadMultipleDocuments(
            UUID employeeId,
            List<MultipartFile> files,
            String documentTypeStr,
            String description,
            String uploadedBy
    ) {
        return files.stream()
                .map(file -> uploadDocument(employeeId, file, documentTypeStr, description, uploadedBy))
                .collect(Collectors.toList());
    }

    /**
     * Update ID card image (front or back)
     */
    @Transactional
    public EmployeeDocumentDTO updateIdCard(
            UUID employeeId,
            MultipartFile file,
            boolean isFront,
            String uploadedBy
    ) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with id: " + employeeId));

        EmployeeDocument.DocumentType documentType = isFront ? 
                EmployeeDocument.DocumentType.ID_CARD_FRONT : 
                EmployeeDocument.DocumentType.ID_CARD_BACK;

        // Delete old ID card if exists
        List<EmployeeDocument> existingDocs = documentRepository.findByEmployeeIdAndDocumentType(
                employeeId, documentType);
        
        for (EmployeeDocument doc : existingDocs) {
            try {
                // Delete file from storage
                fileStorageService.deleteFile(extractFileNameFromUrl(doc.getFileUrl()));
                // Mark as deleted
                doc.setIsDeleted(true);
                documentRepository.save(doc);
            } catch (Exception e) {
                // Log error but continue
                System.err.println("Failed to delete old ID card file: " + e.getMessage());
            }
        }

        // Upload new ID card
        String description = isFront ? "ID Card - Front" : "ID Card - Back";
        EmployeeDocumentDTO newDocument = uploadDocument(employeeId, file, documentType.name(), description, uploadedBy);

        // Update employee entity with new URL
        try {
            String fileName = fileStorageService.uploadFile(file);
            String fileUrl = fileStorageService.getFileUrl(fileName);
            
            if (isFront) {
                employee.setIdFrontImage(fileUrl);
            } else {
                employee.setIdBackImage(fileUrl);
            }
            employeeRepository.save(employee);
        } catch (Exception e) {
            System.err.println("Failed to update employee ID card URL: " + e.getMessage());
        }

        return newDocument;
    }

    /**
     * Delete a document (soft delete)
     */
    @Transactional
    public void deleteDocument(UUID documentId) {
        EmployeeDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        // Soft delete
        document.setIsDeleted(true);
        documentRepository.save(document);

        // Optionally delete from storage (commented out for safety - can enable if needed)
        // try {
        //     fileStorageService.deleteFile(extractFileNameFromUrl(document.getFileUrl()));
        // } catch (Exception e) {
        //     System.err.println("Failed to delete file from storage: " + e.getMessage());
        // }
    }

    /**
     * Get document count for an employee
     */
    @Transactional(readOnly = true)
    public long getDocumentCount(UUID employeeId) {
        return documentRepository.countByEmployeeId(employeeId);
    }

    /**
     * Get documents by type
     */
    @Transactional(readOnly = true)
    public List<EmployeeDocumentDTO> getDocumentsByType(UUID employeeId, String documentTypeStr) {
        EmployeeDocument.DocumentType documentType;
        try {
            documentType = EmployeeDocument.DocumentType.valueOf(documentTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid document type: " + documentTypeStr);
        }

        List<EmployeeDocument> documents = documentRepository.findByEmployeeIdAndDocumentType(
                employeeId, documentType);
        
        return documents.stream()
                .map(EmployeeDocumentDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to extract filename from URL
     */
    private String extractFileNameFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        int lastSlashIndex = url.lastIndexOf('/');
        if (lastSlashIndex >= 0 && lastSlashIndex < url.length() - 1) {
            return url.substring(lastSlashIndex + 1);
        }
        return url;
    }
}