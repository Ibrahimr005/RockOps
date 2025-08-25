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
import java.util.ArrayList;
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
     * Update a document (name and type only)
     */
    @Transactional
    public DocumentDTO updateDocument(UUID id, String name, String type) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        // Update only the name and type (file cannot be changed)
        if (name != null && !name.trim().isEmpty()) {
            document.setName(name.trim());
        }
        if (type != null && !type.trim().isEmpty()) {
            document.setType(type.trim());
        }

        // Update the timestamp
        document.setUpdatedAt(java.time.LocalDateTime.now());

        // Save the updated document
        Document updatedDocument = documentRepository.save(document);

        // Convert to DTO and return
        String entityName = getEntityName(document.getEntityType(), document.getEntityId());
        return convertToDTO(updatedDocument, entityName);
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
                String fileName = "document-" + id;
                minioService.deleteFile(bucketName, fileName);
            } catch (Exception e) {
                // Log error but continue with deletion
                System.err.println("Error deleting file from MinIO: " + e.getMessage());
            }
        }

        documentRepository.delete(document);
    }

    /**
     * Get documents by sarky month and year for a specific entity
     */
    public List<DocumentDTO> getSarkyDocumentsByMonth(EntityType entityType, UUID entityId, Integer month, Integer year) {
        try {
            // Verify that the entity exists
            String entityName = verifyEntityExists(entityType, entityId);

            return documentRepository.findByEntityTypeAndEntityIdAndSarkyMonthAndSarkyYearOrderByUploadDateDesc(entityType, entityId, month, year).stream()
                    .map(doc -> convertToDTO(doc, entityName))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Database error in getSarkyDocumentsByMonth: " + e.getMessage());
            e.printStackTrace();
            // Return empty list if database error (e.g., columns don't exist yet)
            return new ArrayList<>();
        }
    }

    /**
     * Create a sarky document with automatic sarky assignment
     */
    @Transactional
    public DocumentDTO createSarkyDocument(EntityType entityType, UUID entityId, String name, String type, MultipartFile file, Integer month, Integer year) throws Exception {
        // Verify that the entity exists and get its name
        String entityName = verifyEntityExists(entityType, entityId);

        // Get the currently authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResourceNotFoundException("No authenticated user found");
        }

        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + authentication.getName()));

        // Create new sarky document
        Document document = new Document();
        document.setEntityType(entityType);
        document.setEntityId(entityId);
        document.setName(name);
        document.setType(type);
        document.setUploadDate(LocalDate.now());
        document.setFileSize(file.getSize());
        document.setUploadedBy(currentUser);
        
        // Set sarky-specific fields
        document.setIsSarkyDocument(true);
        document.setSarkyMonth(month);
        document.setSarkyYear(year);

        // Save document first to get the ID
        Document savedDocument = documentRepository.save(document);

        // Upload file to MinIO with sarky subfolder structure
        try {
            String bucketName = entityType.name().toLowerCase() + "-" + entityId.toString();
            minioService.createBucketIfNotExists(bucketName);

            // Create sarky-specific file path: sarky/year/month/filename
            String fileName = String.format("sarky/%d/%d/%s-%s", year, month, name, savedDocument.getId().toString());
            minioService.uploadFile(bucketName, file, fileName);

            String fileUrl = minioService.getFileUrl(bucketName, fileName);
            savedDocument.setFileUrl(fileUrl);

            savedDocument = documentRepository.save(savedDocument);
        } catch (Exception e) {
            System.err.println("Error uploading sarky file to MinIO: " + e.getMessage());
            throw e;
        }

        return convertToDTO(savedDocument, entityName);
    }

    /**
     * Assign existing document to sarky month
     */
    @Transactional
    public DocumentDTO assignToSarkyMonth(UUID documentId, Integer month, Integer year) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        document.setIsSarkyDocument(true);
        document.setSarkyMonth(month);
        document.setSarkyYear(year);

        Document savedDocument = documentRepository.save(document);
        String entityName = getEntityName(document.getEntityType(), document.getEntityId());
        
        return convertToDTO(savedDocument, entityName);
    }

    /**
     * Remove sarky assignment from document
     */
    @Transactional
    public DocumentDTO removeSarkyAssignment(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        document.setIsSarkyDocument(false);
        document.setSarkyMonth(null);
        document.setSarkyYear(null);

        Document savedDocument = documentRepository.save(document);
        String entityName = getEntityName(document.getEntityType(), document.getEntityId());
        
        return convertToDTO(savedDocument, entityName);
    }

    /**
     * Get all sarky documents for an entity
     */
    public List<DocumentDTO> getAllSarkyDocuments(EntityType entityType, UUID entityId) {
        String entityName = verifyEntityExists(entityType, entityId);

        return documentRepository.findByEntityTypeAndEntityIdAndIsSarkyDocumentTrueOrderByUploadDateDesc(entityType, entityId).stream()
                .map(doc -> convertToDTO(doc, entityName))
                .collect(Collectors.toList());
    }

    /**
     * Get sarky document types (static list)
     */
    public List<String> getSarkyDocumentTypes() {
        return List.of(
            "DAILY_REPORT",
            "WEEKLY_SUMMARY", 
            "TIMESHEET",
            "FUEL_LOG",
            "MAINTENANCE_LOG",
            "INSPECTION_REPORT",
            "WORK_ORDER",
            "INCIDENT_REPORT",
            "PARTS_REQUEST",
            "OPERATOR_NOTES",
            "SHIFT_HANDOVER",
            "PERFORMANCE_METRICS"
        );
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

        // Set sarky-specific fields
        dto.setSarkyMonth(document.getSarkyMonth());
        dto.setSarkyYear(document.getSarkyYear());
        dto.setIsSarkyDocument(document.getIsSarkyDocument());

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