package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.EmployeeDocumentDTO;
import com.example.backend.services.hr.EmployeeDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for Employee Document operations
 */
@RestController
@RequestMapping("/api/v1/hr/employees/{employeeId}/documents")
@RequiredArgsConstructor
public class EmployeeDocumentController {

    private final EmployeeDocumentService documentService;

    /**
     * Get all documents for an employee
     * GET /api/v1/hr/employees/{employeeId}/documents
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getEmployeeDocuments(@PathVariable UUID employeeId) {
        try {
            List<EmployeeDocumentDTO> documents = documentService.getEmployeeDocuments(employeeId);
            long documentCount = documentService.getDocumentCount(employeeId);

            Map<String, Object> response = new HashMap<>();
            response.put("documents", documents);
            response.put("totalCount", documentCount);
            response.put("success", true);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Get a specific document by ID
     * GET /api/v1/hr/employees/{employeeId}/documents/{documentId}
     */
    @GetMapping("/{documentId}")
    public ResponseEntity<EmployeeDocumentDTO> getDocumentById(
            @PathVariable UUID employeeId,
            @PathVariable UUID documentId
    ) {
        try {
            EmployeeDocumentDTO document = documentService.getDocumentById(documentId);
            return ResponseEntity.ok(document);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    /**
     * Upload a new document
     * POST /api/v1/hr/employees/{employeeId}/documents
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @PathVariable UUID employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "uploadedBy", required = false, defaultValue = "System") String uploadedBy
    ) {
        try {
            EmployeeDocumentDTO document = documentService.uploadDocument(
                    employeeId, file, documentType, description, uploadedBy);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploaded successfully");
            response.put("document", document);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    /**
     * Upload multiple documents
     * POST /api/v1/hr/employees/{employeeId}/documents/bulk
     */
    @PostMapping(value = "/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadMultipleDocuments(
            @PathVariable UUID employeeId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("documentType") String documentType,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "uploadedBy", required = false, defaultValue = "System") String uploadedBy
    ) {
        try {
            List<EmployeeDocumentDTO> documents = documentService.uploadMultipleDocuments(
                    employeeId, files, documentType, description, uploadedBy);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", documents.size() + " document(s) uploaded successfully");
            response.put("documents", documents);
            response.put("count", documents.size());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    /**
     * Update ID card (front or back)
     * PUT /api/v1/hr/employees/{employeeId}/documents/id-card
     */
    @PutMapping(value = "/id-card", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateIdCard(
            @PathVariable UUID employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("isFront") boolean isFront,
            @RequestParam(value = "uploadedBy", required = false, defaultValue = "System") String uploadedBy
    ) {
        try {
            EmployeeDocumentDTO document = documentService.updateIdCard(
                    employeeId, file, isFront, uploadedBy);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "ID card updated successfully");
            response.put("document", document);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    /**
     * Delete a document
     * DELETE /api/v1/hr/employees/{employeeId}/documents/{documentId}
     */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @PathVariable UUID employeeId,
            @PathVariable UUID documentId
    ) {
        try {
            documentService.deleteDocument(documentId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document deleted successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    /**
     * Get documents by type
     * GET /api/v1/hr/employees/{employeeId}/documents/type/{documentType}
     */
    @GetMapping("/type/{documentType}")
    public ResponseEntity<List<EmployeeDocumentDTO>> getDocumentsByType(
            @PathVariable UUID employeeId,
            @PathVariable String documentType
    ) {
        try {
            List<EmployeeDocumentDTO> documents = documentService.getDocumentsByType(employeeId, documentType);
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
}