package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.MonetaryFieldDocumentDTO;
import com.example.backend.services.equipment.MonetaryFieldDocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/equipment")
@CrossOrigin(origins = "http://localhost:3000")
public class MonetaryFieldDocumentController {

    @Autowired
    private MonetaryFieldDocumentService monetaryFieldDocumentService;

    /**
     * Get all monetary field documents for a specific equipment
     */
    @GetMapping("/{equipmentId}/monetary-documents")
    public ResponseEntity<List<MonetaryFieldDocumentDTO>> getEquipmentMonetaryDocuments(@PathVariable UUID equipmentId) {
        try {
            List<MonetaryFieldDocumentDTO> documents = monetaryFieldDocumentService.getDocumentsByEquipment(equipmentId);
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get monetary field documents for a specific equipment and field type
     */
    @GetMapping("/{equipmentId}/monetary-documents/{fieldType}")
    public ResponseEntity<List<MonetaryFieldDocumentDTO>> getEquipmentMonetaryDocumentsByFieldType(
            @PathVariable UUID equipmentId,
            @PathVariable String fieldType) {
        try {
            List<MonetaryFieldDocumentDTO> documents = monetaryFieldDocumentService.getDocumentsByEquipmentAndFieldType(equipmentId, fieldType);
            return ResponseEntity.ok(documents);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get a specific monetary field document by ID
     */
    @GetMapping("/monetary-documents/{documentId}")
    public ResponseEntity<MonetaryFieldDocumentDTO> getMonetaryDocumentById(@PathVariable UUID documentId) {
        try {
            MonetaryFieldDocumentDTO document = monetaryFieldDocumentService.getDocumentById(documentId);
            return ResponseEntity.ok(document);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    /**
     * Upload a document for a monetary field
     */
    @PostMapping("/{equipmentId}/monetary-documents/{fieldType}")
    public ResponseEntity<MonetaryFieldDocumentDTO> uploadMonetaryFieldDocument(
            @PathVariable UUID equipmentId,
            @PathVariable String fieldType,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentName") String documentName,
            @RequestParam("documentType") String documentType) {
        try {
            // Validate file
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            MonetaryFieldDocumentDTO document = monetaryFieldDocumentService.createDocument(
                    equipmentId, fieldType, documentName, documentType, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(document);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Delete a monetary field document
     */
    @DeleteMapping("/monetary-documents/{documentId}")
    public ResponseEntity<Void> deleteMonetaryFieldDocument(@PathVariable UUID documentId) {
        try {
            monetaryFieldDocumentService.deleteDocument(documentId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 