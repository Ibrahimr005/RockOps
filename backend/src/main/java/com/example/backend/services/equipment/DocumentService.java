package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.DocumentDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.user.User;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.repositories.equipment.DocumentRepository;
import com.example.backend.models.equipment.Document.EntityType;
import com.example.backend.models.equipment.Document;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.site.SiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MinioService minioService;

    /**
     * Get all documents for a specific entity
     */
    public List<DocumentDTO> getDocumentsByEntity(EntityType entityType, UUID entityId) {
        // Verify that the entity exists
        verifyEntityExists(entityType, entityId);

        return documentRepository.findByEntityTypeAndEntityIdOrderByUploadDateDesc(entityType, entityId).stream()
                .map(doc -> convertToDTO(doc, getEntityName(entityType, entityId)))
                .collect(Collectors.toList());
    }

    /**
     * Get document by ID
     */
    public DocumentDTO getDocumentById(UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        String entityName = getEntityName(document.getEntityType(), document.getEntityId());
        return convertToDTO(document, entityName);
    }

    /**
     * Create a new document
     */
    @Transactional
    public DocumentDTO createDocument(EntityType entityType, UUID entityId, String name, String type, MultipartFile file) throws Exception {
        // Verify that the entity exists and get its name
        String entityName = verifyEntityExists(entityType, entityId);

        // Get the currently authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResourceNotFoundException("No authenticated user found");
        }

        // Find the User entity based on the username
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + authentication.getName()));

        // Create new document
        Document document = new Document();
        document.setEntityType(entityType);
        document.setEntityId(entityId);
        document.setName(name);
        document.setType(type);
        document.setUploadDate(LocalDate.now());
        document.setFileSize(file.getSize());
        document.setUploadedBy(currentUser);

        // Save document first to get the ID
        Document savedDocument = documentRepository.save(document);

        // Upload file to MinIO
        try {
            // Create bucket for the entity if it doesn't exist
            String bucketName = entityType.name().toLowerCase() + "-" + entityId.toString();
            minioService.createBucketIfNotExists(bucketName);

            // Upload the file with the document prefix and the document ID
            String fileName = name + savedDocument.getId().toString();
            minioService.uploadFile(bucketName, file, fileName);

            // Set the file URL in the document
            String fileUrl = minioService.getFileUrl(bucketName, fileName);
            savedDocument.setFileUrl(fileUrl);

            // Update the document
            savedDocument = documentRepository.save(savedDocument);
        } catch (Exception e) {
            // Log error but continue
            System.err.println("Error uploading file to MinIO: " + e.getMessage());
            throw e;
        }

        return convertToDTO(savedDocument, entityName);
    }

    /**
     * Delete a document
     */
    @Transactional
    public void deleteDocument(UUID id) throws Exception {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        // Delete the file from MinIO if exists
        if (document.getFileUrl() != null && !document.getFileUrl().isEmpty()) {
            try {
                String bucketName = document.getEntityType().name().toLowerCase() + "-" + document.getEntityId().toString();
                String fileName = "document-" + id.toString();
                minioService.deleteFile(bucketName, fileName);
            } catch (Exception e) {
                // Log error but continue with deletion
                System.err.println("Error deleting file from MinIO: " + e.getMessage());
            }
        }

        documentRepository.delete(document);
    }

    /**
     * Convert entity to DTO
     */
    private DocumentDTO convertToDTO(Document document, String entityName) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(document.getId());
        dto.setEntityType(document.getEntityType());
        dto.setEntityId(document.getEntityId());
        dto.setEntityName(entityName);
        dto.setName(document.getName());
        dto.setType(document.getType());
        dto.setDateUploaded(document.getUploadDate());

        // Set raw file size
        dto.setFileSize(document.getFileSize());
        
        // Format file size
        if (document.getFileSize() != null) {
            long size = document.getFileSize();
            if (size < 1024) {
                dto.setSize(size + " B");
            } else if (size < 1024 * 1024) {
                dto.setSize(String.format("%.1f KB", size / 1024.0));
            } else {
                dto.setSize(String.format("%.1f MB", size / (1024.0 * 1024)));
            }
        } else {
            dto.setSize("Unknown");
        }

        dto.setUrl(document.getFileUrl());

        if (document.getUploadedBy() != null) {
            dto.setUploadedBy(document.getUploadedBy().getFirstName() + " " + document.getUploadedBy().getLastName());
        }

        return dto;
    }

    /**
     * Verify that an entity exists and return its name
     */
    private String verifyEntityExists(EntityType entityType, UUID entityId) {
        switch (entityType) {
            case EQUIPMENT:
                Equipment equipment = equipmentRepository.findById(entityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + entityId));
                return equipment.getType().getName() + " - " + equipment.getFullModelName();

            case SITE:
                Site site = siteRepository.findById(entityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Site not found with id: " + entityId));
                return site.getName();

            case WAREHOUSE:
                Warehouse warehouse = warehouseRepository.findById(entityId)
                        .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + entityId));
                return warehouse.getName();

            default:
                throw new IllegalArgumentException("Unsupported entity type: " + entityType);
        }
    }

    /**
     * Get the name of an entity
     */
    private String getEntityName(EntityType entityType, UUID entityId) {
        try {
            return verifyEntityExists(entityType, entityId);
        } catch (ResourceNotFoundException e) {
            // If entity no longer exists, return "Unknown"
            return "Unknown";
        }
    }

    // Helper method to create MinioService methods if they don't exist already
    private void extendMinioService() {
        // This is just a placeholder - you'll need to add these methods to MinioService
        // if they don't already exist
    }
}