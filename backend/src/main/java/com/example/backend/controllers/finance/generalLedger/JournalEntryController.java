package com.example.backend.controllers.finance.generalLedger;

import com.example.backend.dto.finance.generalLedger.JournalEntryLineDTO;
import com.example.backend.dto.finance.generalLedger.JournalEntryRequestDTO;
import com.example.backend.dto.finance.generalLedger.JournalEntryResponseDTO;
import com.example.backend.models.finance.generalLedger.JournalEntryStatus;
import com.example.backend.models.user.User;
import com.example.backend.repositories.finance.generalLedger.JournalEntryRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.finance.generalLedger.JournalEntryService;
import com.example.backend.services.MinioService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/journal-entries")
public class JournalEntryController {

    private final JournalEntryService journalEntryService;
    private final JournalEntryRepository journalEntryRepository;
    private MinioService minioService;
    private UserRepository userRepository;

    @Autowired
    public JournalEntryController(JournalEntryService journalEntryService,
                                  JournalEntryRepository journalEntryRepository,
                                  MinioService minioService,
                                  UserRepository userRepository) {
        this.journalEntryService = journalEntryService;
        this.journalEntryRepository = journalEntryRepository;
        this.minioService = minioService;
        this.userRepository = userRepository;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<JournalEntryResponseDTO> createJournalEntry(
            @RequestParam("journalEntryData") String journalEntryDataJson,
            @RequestParam(value = "document", required = false) MultipartFile document) {
        try {
            // Convert JSON String to JournalEntryRequestDTO
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.registerModule(new JavaTimeModule());
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
// Add this line to ensure proper boolean handling
            objectMapper.configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES, true);
            JournalEntryRequestDTO requestDTO = objectMapper.readValue(journalEntryDataJson, JournalEntryRequestDTO.class);
            System.out.println("Received JSON: " + journalEntryDataJson);

            // Upload document if provided
            if (document != null && !document.isEmpty()) {
                String fileName = minioService.uploadFile(document);
                String fileUrl = minioService.getFileUrl(fileName);
                // Instead of setting base64 content, we'll set the document path directly
                // and handle it in the service
                requestDTO.setDocumentPath(fileUrl);
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            // Find the user in the database
            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));
            UUID userId = currentUser.getId();

            // For development/testing, use a hardcoded user ID
            // In production, you'd get this from security context
//            UUID userId = UUID.fromString("b5607d38-8fc1-43ef-b44e-34967083c80c");

            // Save journal entry with document URL
            JournalEntryResponseDTO savedEntry = journalEntryService.createJournalEntry(requestDTO, userId);

            return ResponseEntity.ok(savedEntry);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<JournalEntryResponseDTO> getJournalEntryById(@PathVariable UUID id) {
        JournalEntryResponseDTO response = journalEntryService.getJournalEntryById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<JournalEntryResponseDTO>> getAllJournalEntries(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<JournalEntryResponseDTO> journalEntries;

        if (status != null && !status.isEmpty()) {
            JournalEntryStatus entryStatus = JournalEntryStatus.valueOf(status.toUpperCase());
            journalEntries = journalEntryService.getJournalEntriesByStatus(entryStatus);
        } else if (startDate != null && endDate != null) {
            journalEntries = journalEntryService.getJournalEntriesByDateRange(startDate, endDate);
        } else {
            journalEntries = journalEntryService.getAllJournalEntries();
        }

        return ResponseEntity.ok(journalEntries);
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<JournalEntryResponseDTO> approveJournalEntry(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> approvalData) {

        try {
            // Get comments from request body
            String comments = (approvalData != null && approvalData.containsKey("comments"))
                    ? approvalData.get("comments") : "";

            // Get the currently logged-in user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            // Find the user in the database
            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));
            UUID approverId = currentUser.getId();

            JournalEntryResponseDTO response = journalEntryService.approveJournalEntry(id, approverId, comments);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<JournalEntryResponseDTO> rejectJournalEntry(
            @PathVariable UUID id,
            @RequestBody Map<String, String> rejectionData) {

        try {
            // Get reason from request body
            if (rejectionData == null || !rejectionData.containsKey("reason") || rejectionData.get("reason").isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }

            String reason = rejectionData.get("reason");

            // Get the currently logged-in user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            // Find the user in the database
            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Logged-in user not found in the database"));
            UUID rejecterId = currentUser.getId();

            JournalEntryResponseDTO response = journalEntryService.rejectJournalEntry(id, rejecterId, reason);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournalEntry(@PathVariable UUID id) {
        journalEntryService.deleteJournalEntry(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<JournalEntryResponseDTO> updateJournalEntry(
            @PathVariable UUID id,
            @RequestBody String requestJson) {
        try {
            // Convert JSON String to JournalEntryRequestDTO with special handling
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.registerModule(new JavaTimeModule());
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            objectMapper.configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES, true);

            JournalEntryRequestDTO requestDTO = objectMapper.readValue(requestJson, JournalEntryRequestDTO.class);
            System.out.println("Update request JSON: " + requestJson);

            // Log line details for debugging
            for (JournalEntryLineDTO line : requestDTO.getEntryLines()) {
                System.out.println("Line: amount=" + line.getAmount() + ", isDebit=" + line.isDebit());
            }

            JournalEntryResponseDTO response = journalEntryService.updateJournalEntry(id, requestDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<JournalEntryResponseDTO>> getPendingJournalEntries() {
        List<JournalEntryResponseDTO> pendingEntries = journalEntryService.getJournalEntriesByStatus(JournalEntryStatus.PENDING);
        return ResponseEntity.ok(pendingEntries);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", ex.getMessage());

        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (ex.getMessage().contains("closed accounting period")) {
            status = HttpStatus.FORBIDDEN;
        }

        return new ResponseEntity<>(errorResponse, status);
    }

}