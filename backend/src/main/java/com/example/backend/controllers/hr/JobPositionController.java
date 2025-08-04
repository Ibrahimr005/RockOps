package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.JobPositionDTO;
import com.example.backend.dto.hr.JobPositionDetailsDTO;
import com.example.backend.dto.hr.promotions.PromotionStatsDTO;
import com.example.backend.dto.hr.promotions.PromotionSummaryDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.hr.JobPositionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/job-positions")
public class JobPositionController {

    @Autowired
    private JobPositionService jobPositionService;

    @Autowired
    private JobPositionRepository jobPositionRepository;

    /**
     * Create a new job position using DTO
     */
    @PostMapping
    public ResponseEntity<JobPositionDTO> createJobPosition(@RequestBody JobPositionDTO jobPositionDTO) {
        return ResponseEntity.ok(jobPositionService.createJobPosition(jobPositionDTO));
    }

    /**
     * Get all job positions as DTOs
     */
    @GetMapping
    public ResponseEntity<List<JobPositionDTO>> getAllJobPositions() {
        return ResponseEntity.ok(jobPositionService.getAllJobPositionDTOs());
    }

    /**
     * Get a job position by ID as DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPositionDTO> getJobPositionById(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getJobPositionDTOById(id));
    }

    /**
     * Update a job position using DTO
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobPositionDTO> updateJobPosition(@PathVariable UUID id, @RequestBody JobPositionDTO jobPositionDTO) {
        return ResponseEntity.ok(jobPositionService.updateJobPosition(id, jobPositionDTO));
    }

    /**
     * Delete a job position
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJobPosition(@PathVariable UUID id) {
        jobPositionService.deleteJobPosition(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get employees by job position ID
     */
    @GetMapping("/{id}/employees")
    public ResponseEntity<List<Employee>> getEmployeesByJobPositionId(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getEmployeesByJobPositionId(id));
    }

    // ======================================
    // NEW ENHANCED ENDPOINTS FOR DETAILS VIEW
    // ======================================


    /**
     * Get comprehensive job position details with all analytics, employees, and promotions
     * This is the main endpoint for the job position details page
     */
    @GetMapping("/{id}/details")
    public ResponseEntity<JobPositionDetailsDTO> getJobPositionDetails(@PathVariable UUID id) {
        JobPositionDetailsDTO details = jobPositionService.getJobPositionDetailsDTO(id);
        return ResponseEntity.ok(details);
    }

    /**
     * Get only basic job position info (for backward compatibility)
     */
    @GetMapping("/{id}/basic")
    public ResponseEntity<JobPosition> getJobPositionBasic(@PathVariable UUID id) {
        JobPosition jobPosition = jobPositionService.getJobPositionById(id);
        return ResponseEntity.ok(jobPosition);
    }

    /**
     * Get promotion statistics for a job position
     */
    @GetMapping("/{id}/promotion-statistics")
    public ResponseEntity<Map<String, Object>> getPromotionStatistics(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPromotionStatistics(id));
    }

    /**
     * Get all promotions FROM this position
     */
    @GetMapping("/{id}/promotions/from")
    public ResponseEntity<List<PromotionRequest>> getPromotionsFromPosition(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPromotionsFromPosition(id));
    }

    /**
     * Get all promotions TO this position
     */
    @GetMapping("/{id}/promotions/to")
    public ResponseEntity<List<PromotionRequest>> getPromotionsToPosition(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPromotionsToPosition(id));
    }

    /**
     * Get pending promotions FROM this position
     */
    @GetMapping("/{id}/promotions/from/pending")
    public ResponseEntity<List<PromotionRequest>> getPendingPromotionsFromPosition(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPendingPromotionsFromPosition(id));
    }

    /**
     * Get pending promotions TO this position
     */
    @GetMapping("/{id}/promotions/to/pending")
    public ResponseEntity<List<PromotionRequest>> getPendingPromotionsToPosition(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPendingPromotionsToPosition(id));
    }

    /**
     * Get career path suggestions from this position
     */
    @GetMapping("/{id}/career-path-suggestions")
    public ResponseEntity<List<String>> getCareerPathSuggestions(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getCareerPathSuggestions(id));
    }

    /**
     * Get employees eligible for promotion from this position
     */
    @GetMapping("/{id}/employees/eligible-for-promotion")
    public ResponseEntity<List<Employee>> getEmployeesEligibleForPromotion(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getEmployeesEligibleForPromotion(id));
    }

    /**
     * Get salary statistics for this position
     */
    @GetMapping("/{id}/salary-statistics")
    public ResponseEntity<Map<String, Object>> getSalaryStatistics(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getSalaryStatistics(id));
    }

    /**
     * Get position validation status
     */
    @GetMapping("/{id}/validation")
    public ResponseEntity<Map<String, Object>> getPositionValidation(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPositionValidation(id));
    }

    /**
     * Get comprehensive position analytics
     */
    @GetMapping("/{id}/analytics")
    public ResponseEntity<Map<String, Object>> getPositionAnalytics(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPositionAnalytics(id));
    }

    /**
     * Check if position can be safely deleted
     */
    @GetMapping("/{id}/can-delete")
    public ResponseEntity<Map<String, Object>> canDeletePosition(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.canDeletePosition(id));
    }

    /**
     * Get positions that can be promoted to from this position
     */
    @GetMapping("/{id}/promotion-destinations")
    public ResponseEntity<List<JobPositionDTO>> getPromotionDestinations(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPromotionDestinations(id));
    }

    /**
     * Get positions that commonly promote to this position
     */
    @GetMapping("/{id}/promotion-sources")
    public ResponseEntity<List<JobPositionDTO>> getPromotionSources(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getPromotionSources(id));
    }

    /**
     * Get detailed employee analytics for this position
     */
    @GetMapping("/{id}/employee-analytics")
    public ResponseEntity<Map<String, Object>> getEmployeeAnalytics(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getEmployeeAnalytics(id));
    }

    /**
     * Get simplified promotion statistics
     */
    @GetMapping("/{id}/promotion-stats-simple")
    public ResponseEntity<PromotionStatsDTO> getSimplifiedPromotionStats(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionStats(id));
    }

    /**
     * Get simplified promotions from this position
     */
    @GetMapping("/{id}/promotions-from-simple")
    public ResponseEntity<List<PromotionSummaryDTO>> getSimplifiedPromotionsFrom(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionsFrom(id));
    }

    /**
     * Get simplified promotions to this position
     */
    @GetMapping("/{id}/promotions-to-simple")
    public ResponseEntity<List<PromotionSummaryDTO>> getSimplifiedPromotionsTo(@PathVariable UUID id) {
        return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionsTo(id));
    }
}