package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MonetaryFieldDocumentDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.MonetaryFieldDocument;
import com.example.backend.models.equipment.MonetaryFieldDocument.MonetaryFieldType;
import com.example.backend.models.hr.Employee;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.MonetaryFieldDocumentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.services.MinioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MonetaryFieldDocumentService {

    @Autowired
    private MonetaryFieldDocumentRepository monetaryFieldDocumentRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private MinioService minioService;

    /**
     * Get all documents for a specific equipment
     */
    public List<MonetaryFieldDocumentDTO> getDocumentsByEquipment(UUID equipmentId) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        return monetaryFieldDocumentRepository.findByEquipmentIdOrderByUploadDateDesc(equipmentId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get documents for a specific equipment and field type
     */
    public List<MonetaryFieldDocumentDTO> getDocumentsByEquipmentAndFieldType(UUID equipmentId, String fieldType) {
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        MonetaryFieldType monetaryFieldType;
        try {
            monetaryFieldType = MonetaryFieldType.valueOf(fieldType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid field type: " + fieldType + ". Must be one of: SHIPPING, CUSTOMS, TAXES");
        }

        return monetaryFieldDocumentRepository.findByEquipmentIdAndFieldTypeOrderByUploadDateDesc(equipmentId, monetaryFieldType).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get document by ID
     */
    public MonetaryFieldDocumentDTO getDocumentById(UUID id) {
        MonetaryFieldDocument document = monetaryFieldDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        return convertToDTO(document);
    }

    /**
     * Create a new document for a monetary field
     */
    @Transactional
    public MonetaryFieldDocumentDTO createDocument(UUID equipmentId, String fieldType, String documentName, String documentType, MultipartFile file) throws Exception {
        // Verify equipment exists
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));

        // Validate field type
        MonetaryFieldType monetaryFieldType;
        try {
            monetaryFieldType = MonetaryFieldType.valueOf(fieldType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid field type: " + fieldType + ". Must be one of: SHIPPING, CUSTOMS, TAXES");
        }

        // Hardcoded employee ID as requested
        UUID employeeId = UUID.fromString("aeff4938-09fe-4b86-8b5b-4fd6ab3d47d9");
        Employee currentUser = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        // Create new document
        MonetaryFieldDocument document = new MonetaryFieldDocument();
        document.setEquipment(equipment);
        document.setFieldType(monetaryFieldType);
        document.setDocumentName(documentName);
        document.setDocumentType(documentType);
        document.setUploadDate(LocalDate.now());
        document.setFileSize(file.getSize());
        document.setUploadedBy(currentUser);

        // Save document first to get the ID
        MonetaryFieldDocument savedDocument = monetaryFieldDocumentRepository.save(document);

        // Upload file to MinIO
        try {
            // Create bucket for the equipment if it doesn't exist
            String bucketName = "equipment-" + equipmentId.toString();
            minioService.createBucketIfNotExists(bucketName);

            // Upload the file with the monetary field prefix and the document ID
            String fileName = fieldType.toLowerCase() + "-document-" + savedDocument.getId().toString();
            minioService.uploadFile(bucketName, file, fileName);

            // Set the file URL in the document
            String fileUrl = minioService.getFileUrl(bucketName, fileName);
            savedDocument.setFileUrl(fileUrl);

            // Update the document
            savedDocument = monetaryFieldDocumentRepository.save(savedDocument);
        } catch (Exception e) {
            // Log error but continue
            System.err.println("Error uploading file to MinIO: " + e.getMessage());
            throw e;
        }

        return convertToDTO(savedDocument);
    }

    /**
     * Delete a document
     */
    @Transactional
    public void deleteDocument(UUID id) throws Exception {
        MonetaryFieldDocument document = monetaryFieldDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        // Delete the file from MinIO if exists
        if (document.getFileUrl() != null && !document.getFileUrl().isEmpty()) {
            try {
                String bucketName = "equipment-" + document.getEquipment().getId().toString();
                String fileName = document.getFieldType().name().toLowerCase() + "-document-" + id.toString();
                minioService.deleteFile(bucketName, fileName);
            } catch (Exception e) {
                // Log error but continue with deletion
                System.err.println("Error deleting file from MinIO: " + e.getMessage());
            }
        }

        monetaryFieldDocumentRepository.delete(document);
    }

    /**
     * Convert entity to DTO
     */
    private MonetaryFieldDocumentDTO convertToDTO(MonetaryFieldDocument document) {
        MonetaryFieldDocumentDTO dto = new MonetaryFieldDocumentDTO();
        dto.setId(document.getId());
        dto.setEquipmentId(document.getEquipment().getId());
        dto.setEquipmentName(document.getEquipment().getName());
        dto.setFieldType(document.getFieldType().name());
        dto.setDocumentName(document.getDocumentName());
        dto.setDocumentType(document.getDocumentType());
        dto.setFileUrl(document.getFileUrl());
        dto.setFileSize(document.getFileSize());
        dto.setUploadDate(document.getUploadDate());
        dto.setUploadedById(document.getUploadedBy().getId());
        dto.setUploadedByName(document.getUploadedBy().getFullName());
        return dto;
    }
} 