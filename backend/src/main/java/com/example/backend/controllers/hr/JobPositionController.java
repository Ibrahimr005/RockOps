package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.JobPositionDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
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
}