package com.example.backend.controllers.hr;

import com.example.backend.models.hr.Candidate;
import com.example.backend.services.hr.CandidateService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/candidates")
public class CandidateController {

    @Autowired
    private CandidateService candidateService;

    // Get all candidates
    @GetMapping
    public ResponseEntity<List<Candidate>> getAllCandidates() {
        return ResponseEntity.ok(candidateService.getAllCandidates());
    }

    // Get candidate by ID
    @GetMapping("/{id}")
    public ResponseEntity<Candidate> getCandidateById(@PathVariable UUID id) {
        try {
            Candidate candidate = candidateService.getCandidateById(id);
            return ResponseEntity.ok(candidate);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Get candidates by vacancy ID
    @GetMapping("/vacancy/{vacancyId}")
    public ResponseEntity<List<Candidate>> getCandidatesByVacancyId(@PathVariable UUID vacancyId) {
        return ResponseEntity.ok(candidateService.getCandidatesByVacancyId(vacancyId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createCandidate(
            @RequestPart("candidateData") String candidateDataJson,
            @RequestPart(value = "resume", required = false) MultipartFile resumeFile) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> candidateData = objectMapper.readValue(candidateDataJson, new TypeReference<Map<String, Object>>() {});

            Map<String, Object> createdCandidateData = candidateService.createCandidate(candidateData, resumeFile);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdCandidateData);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }


    // Update an existing candidate
    @PutMapping("/{id}")
    public ResponseEntity<Candidate> updateCandidate(
            @PathVariable UUID id,
            @RequestPart("candidateData") String candidateDataJson,
            @RequestPart(value = "resume", required = false) MultipartFile resumeFile) {
        try {
            // Convert JSON string to Map using Jackson ObjectMapper
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> candidateData = objectMapper.readValue(candidateDataJson, new TypeReference<Map<String, Object>>() {});

            Candidate updatedCandidate = (Candidate) candidateService.updateCandidate(id, candidateData, resumeFile);
            return ResponseEntity.ok(updatedCandidate);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace(); // Log the error for debugging
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Delete a candidate
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCandidate(@PathVariable UUID id) {
        try {
            candidateService.deleteCandidate(id);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Convert candidate to employee data (preparation for hiring)
    @GetMapping("/{id}/to-employee")
    public ResponseEntity<Map<String, Object>> convertCandidateToEmployee(@PathVariable UUID id) {
        try {
            Map<String, Object> employeeData = candidateService.convertCandidateToEmployee(id);
            return ResponseEntity.ok(employeeData);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/rating")
    public ResponseEntity<Candidate> updateCandidateRating(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> ratingData) {
        try {
            Integer rating = (Integer) ratingData.get("rating");
            String ratingNotes = (String) ratingData.get("ratingNotes");

            if (rating == null || rating < 1 || rating > 5) {
                return ResponseEntity.badRequest().build();
            }

            Candidate updatedCandidate = candidateService.updateCandidateRating(id, rating, ratingNotes);
            return ResponseEntity.ok(updatedCandidate);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateCandidateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> statusUpdate) {

        System.out.println("=== UPDATE CANDIDATE STATUS ENDPOINT ===");
        System.out.println("Candidate ID: " + id);
        System.out.println("Request body: " + statusUpdate);

        try {
            // Validate request body
            if (statusUpdate == null || statusUpdate.isEmpty()) {
                System.out.println("ERROR: Empty request body");
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "error", "Request body cannot be empty",
                                "timestamp", LocalDateTime.now(),
                                "path", "/api/v1/candidates/" + id + "/status"
                        ));
            }

            // Extract and validate parameters
            String newStatus = (String) statusUpdate.get("status");
            String rejectionReason = (String) statusUpdate.get("rejectionReason");
            Integer rating = null;
            String ratingNotes = (String) statusUpdate.get("ratingNotes");

            // Handle rating - can be Integer or String
            Object ratingObj = statusUpdate.get("rating");
            if (ratingObj != null) {
                try {
                    if (ratingObj instanceof Integer) {
                        rating = (Integer) ratingObj;
                    } else if (ratingObj instanceof String && !((String) ratingObj).trim().isEmpty()) {
                        rating = Integer.parseInt((String) ratingObj);
                    }
                    System.out.println("Parsed rating: " + rating);
                } catch (NumberFormatException e) {
                    System.out.println("ERROR: Invalid rating format: " + ratingObj);
                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "error", "Invalid rating format. Must be a number between 1 and 5.",
                                    "provided", ratingObj.toString(),
                                    "timestamp", LocalDateTime.now(),
                                    "path", "/api/v1/candidates/" + id + "/status"
                            ));
                }
            }

            System.out.println("Extracted parameters:");
            System.out.println("  Status: " + newStatus);
            System.out.println("  Rejection Reason: " + rejectionReason);
            System.out.println("  Rating: " + rating);
            System.out.println("  Rating Notes: " + ratingNotes);

            // Validate required fields
            if (newStatus == null || newStatus.trim().isEmpty()) {
                System.out.println("ERROR: Status is required");
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "error", "Status is required",
                                "timestamp", LocalDateTime.now(),
                                "path", "/api/v1/candidates/" + id + "/status"
                        ));
            }

            // Validate rating range
            if (rating != null && (rating < 1 || rating > 5)) {
                System.out.println("ERROR: Rating out of range: " + rating);
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "error", "Rating must be between 1 and 5",
                                "provided", rating,
                                "timestamp", LocalDateTime.now(),
                                "path", "/api/v1/candidates/" + id + "/status"
                        ));
            }

            // Call service method
            Candidate updatedCandidate = candidateService.updateCandidateStatusWithDetails(
                    id, newStatus.trim(), rejectionReason, rating, ratingNotes);

            System.out.println("Status update successful");
            return ResponseEntity.ok(updatedCandidate);

        } catch (EntityNotFoundException e) {
            System.out.println("ENTITY_NOT_FOUND: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error", "Candidate not found",
                            "message", e.getMessage(),
                            "candidateId", id.toString(),
                            "timestamp", LocalDateTime.now(),
                            "path", "/api/v1/candidates/" + id + "/status"
                    ));

        } catch (IllegalArgumentException e) {
            System.out.println("VALIDATION_ERROR: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "Validation failed",
                            "message", e.getMessage(),
                            "candidateId", id.toString(),
                            "timestamp", LocalDateTime.now(),
                            "path", "/api/v1/candidates/" + id + "/status"
                    ));

        } catch (Exception e) {
            System.out.println("UNEXPECTED_ERROR: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Internal server error",
                            "message", "An unexpected error occurred while updating candidate status",
                            "candidateId", id.toString(),
                            "timestamp", LocalDateTime.now(),
                            "path", "/api/v1/candidates/" + id + "/status"
                    ));
        }
    }

    // Get available status transitions for a candidate
    @GetMapping("/{id}/available-statuses")
    public ResponseEntity<List<String>> getAvailableStatuses(@PathVariable UUID id) {
        try {
            List<String> availableStatuses = candidateService.getAvailableStatusTransitions(id);
            return ResponseEntity.ok(availableStatuses);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}