package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.DocumentDTO;
import com.example.backend.models.equipment.Document.EntityType;
import com.example.backend.services.equipment.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @GetMapping("/documents/{id}")
    public ResponseEntity<DocumentDTO> getDocumentById(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocumentById(id));
    }

    @GetMapping("/{entityType}/{entityId}/documents")
    public ResponseEntity<List<DocumentDTO>> getDocumentsByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        try {
            UUID id = UUID.fromString(entityId);
            EntityType type = EntityType.valueOf(entityType.toUpperCase());
            return ResponseEntity.ok(documentService.getDocumentsByEntity(type, id));
        } catch (IllegalArgumentException e) {
            // Log the error
            System.err.println("Invalid parameters: " + e.getMessage());
            // Return empty list instead of error
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PostMapping("/{entityType}/{entityId}/documents")
    public ResponseEntity<DocumentDTO> createDocument(
            @PathVariable String entityType,
            @PathVariable UUID entityId,
            @RequestParam("name") String name,
            @RequestParam("type") String type,
            @RequestParam("file") MultipartFile file) throws Exception {

        try {
            EntityType entityTypeEnum = EntityType.valueOf(entityType.toUpperCase());
            DocumentDTO createdDocument = documentService.createDocument(entityTypeEnum, entityId, name, type, file);
            return new ResponseEntity<>(createdDocument, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/documents/{id}")
    public ResponseEntity<DocumentDTO> updateDocument(
            @PathVariable UUID id,
            @RequestParam("name") String name,
            @RequestParam("type") String type) {
        try {
            DocumentDTO updatedDocument = documentService.updateDocument(id, name, type);
            return ResponseEntity.ok(updatedDocument);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID id) throws Exception {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    // Sarky-specific endpoints

    @GetMapping("/{entityType}/{entityId}/documents/sarky")
    public ResponseEntity<List<DocumentDTO>> getSarkyDocumentsByMonth(
            @PathVariable String entityType,
            @PathVariable String entityId,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        try {
            UUID id = UUID.fromString(entityId);
            EntityType type = EntityType.valueOf(entityType.toUpperCase());
            return ResponseEntity.ok(documentService.getSarkyDocumentsByMonth(type, id, month, year));
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid parameters for sarky documents: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        } catch (Exception e) {
            System.err.println("Database error for sarky documents: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    @PostMapping("/{entityType}/{entityId}/documents/sarky")
    public ResponseEntity<DocumentDTO> createSarkyDocument(
            @PathVariable String entityType,
            @PathVariable UUID entityId,
            @RequestParam("name") String name,
            @RequestParam("type") String type,
            @RequestParam("file") MultipartFile file,
            @RequestParam Integer month,
            @RequestParam Integer year) throws Exception {

        try {
            EntityType entityTypeEnum = EntityType.valueOf(entityType.toUpperCase());
            DocumentDTO createdDocument = documentService.createSarkyDocument(entityTypeEnum, entityId, name, type, file, month, year);
            return new ResponseEntity<>(createdDocument, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{entityType}/{entityId}/documents/sarky/all")
    public ResponseEntity<List<DocumentDTO>> getAllSarkyDocuments(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        try {
            UUID id = UUID.fromString(entityId);
            EntityType type = EntityType.valueOf(entityType.toUpperCase());
            return ResponseEntity.ok(documentService.getAllSarkyDocuments(type, id));
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid parameters for all sarky documents: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PutMapping("/documents/{id}/assign-sarky")
    public ResponseEntity<DocumentDTO> assignToSarkyMonth(
            @PathVariable UUID id,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        try {
            DocumentDTO updatedDocument = documentService.assignToSarkyMonth(id, month, year);
            return ResponseEntity.ok(updatedDocument);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/documents/{id}/remove-sarky")
    public ResponseEntity<DocumentDTO> removeSarkyAssignment(@PathVariable UUID id) {
        try {
            DocumentDTO updatedDocument = documentService.removeSarkyAssignment(id);
            return ResponseEntity.ok(updatedDocument);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/documents/sarky/types")
    public ResponseEntity<List<String>> getSarkyDocumentTypes() {
        return ResponseEntity.ok(documentService.getSarkyDocumentTypes());
    }
}