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

    // Update candidate status
    @PutMapping("/{id}/status")
    public ResponseEntity<Candidate> updateCandidateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String newStatus = statusUpdate.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            Candidate updatedCandidate = candidateService.updateCandidateStatus(id, newStatus);
            return ResponseEntity.ok(updatedCandidate);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}