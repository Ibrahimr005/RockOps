package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.CreateVacancyDTO;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.hr.Candidate;
import com.example.backend.services.hr.VacancyService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vacancies")
@CrossOrigin(origins = "*")
public class VacancyController {

    @Autowired
    private VacancyService vacancyService;

    // Create a new vacancy
    @PostMapping
    public ResponseEntity<?> createVacancy(@RequestBody CreateVacancyDTO dto) {
        System.out.println("=== VacancyController: Received create request ===");
        System.out.println("DTO: " + dto);

        try {
            Vacancy createdVacancy = vacancyService.createVacancy(dto);
            System.out.println("Vacancy created successfully with ID: " + createdVacancy.getId());
            return ResponseEntity.ok(createdVacancy);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Validation Error",
                    "message", e.getMessage(),
                    "timestamp", java.time.Instant.now().toString()
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Entity Not Found",
                    "message", e.getMessage(),
                    "timestamp", java.time.Instant.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Internal Server Error",
                    "message", "An unexpected error occurred while creating the vacancy",
                    "details", e.getMessage(),
                    "type", e.getClass().getSimpleName(),
                    "timestamp", java.time.Instant.now().toString()
            ));
        }
    }


    // Get all vacancies
    @GetMapping
    public ResponseEntity<List<Vacancy>> getAllVacancies() {
        List<Vacancy> vacancies = vacancyService.getAllVacancies();
        return ResponseEntity.ok(vacancies);
    }

    // Get a specific vacancy by ID
    @GetMapping("/{id}")
    public ResponseEntity<Vacancy> getVacancyById(@PathVariable UUID id) {
        Vacancy vacancy = vacancyService.getVacancyById(id);
        return ResponseEntity.ok(vacancy);
    }

    // Update an existing vacancy
    @PutMapping("/{id}")
    public ResponseEntity<Vacancy> updateVacancy(@PathVariable UUID id, @RequestBody Vacancy vacancyDetails) {
        Vacancy updatedVacancy = vacancyService.updateVacancy(id, vacancyDetails);
        return ResponseEntity.ok(updatedVacancy);
    }

    // Delete a vacancy
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVacancy(@PathVariable UUID id) {
        vacancyService.deleteVacancy(id);
        return ResponseEntity.noContent().build();
    }

    // Get vacancy statistics including position information
    @GetMapping("/{id}/statistics")
    public ResponseEntity<Map<String, Object>> getVacancyStatistics(@PathVariable UUID id) {
        Map<String, Object> statistics = vacancyService.getVacancyStatistics(id);
        return ResponseEntity.ok(statistics);
    }

    // Hire a candidate (updates position count)
    @PostMapping("/hire-candidate/{candidateId}")
    public ResponseEntity<Map<String, String>> hireCandidate(@PathVariable UUID candidateId) {
        try {
            vacancyService.hireCandidate(candidateId);
            return ResponseEntity.ok(Map.of("message", "Candidate hired successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Move candidates to potential list when vacancy is full
    @PostMapping("/{id}/move-to-potential")
    public ResponseEntity<Map<String, String>> moveCandidatesToPotential(@PathVariable UUID id) {
        vacancyService.moveCandidatesToPotentialList(id);
        return ResponseEntity.ok(Map.of("message", "Candidates moved to potential list"));
    }

    // Get all potential candidates
    @GetMapping("/potential-candidates")
    public ResponseEntity<List<Candidate>> getPotentialCandidates() {
        List<Candidate> potentialCandidates = vacancyService.getPotentialCandidates();
        return ResponseEntity.ok(potentialCandidates);
    }
}