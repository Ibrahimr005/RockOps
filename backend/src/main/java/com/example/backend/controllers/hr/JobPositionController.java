package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.jobposition.JobPositionDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDetailsDTO;
import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.dto.hr.promotions.PromotionStatsDTO;
import com.example.backend.dto.hr.promotions.PromotionSummaryDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.hr.JobPositionService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/job-positions")
public class JobPositionController {
    private static final Logger logger = LoggerFactory.getLogger(JobPositionController.class);

    @Autowired
    private JobPositionService jobPositionService;

    @Autowired
    private JobPositionRepository jobPositionRepository;

    /**
     * Create a standardized error response with detailed information
     */
    private Map<String, Object> createErrorResponse(String error, String message, String details, Exception exception) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        response.put("message", message);

        if (details != null) {
            response.put("details", details);
        }

        if (exception != null) {
            response.put("exceptionType", exception.getClass().getSimpleName());

            // Include stack trace for debugging (only in development)
            // Remove this in production or use a flag
            StackTraceElement[] stackTrace = exception.getStackTrace();
            if (stackTrace.length > 0) {
                List<String> relevantStackTrace = Arrays.stream(stackTrace)
                        .limit(5) // Only first 5 lines
                        .map(StackTraceElement::toString)
                        .collect(Collectors.toList());
                response.put("stackTrace", relevantStackTrace);
            }

            // Include cause if available
            if (exception.getCause() != null) {
                response.put("cause", exception.getCause().getMessage());
                response.put("causeType", exception.getCause().getClass().getSimpleName());
            }
        }

        response.put("timestamp", Instant.now().toString());
        return response;
    }

    /**
     * Create a standardized success response
     */
    private Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        if (data != null) {
            response.put("data", data);
        }
        response.put("timestamp", Instant.now().toString());
        return response;
    }

    /**
     * Enhanced create job position with comprehensive error handling
     */
    @PostMapping
    public ResponseEntity<?> createJobPosition(@RequestBody JobPositionDTO jobPositionDTO) {
        try {
            logger.info("🆕 Creating new job position");
            // Validate DTO if necessary (though service handles most)

            JobPositionDTO createdPosition = jobPositionService.createJobPosition(jobPositionDTO);

            logger.info("✅ Successfully created job position: {}", createdPosition.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPosition);

        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Validation error creating job position: {}", e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(
                    "VALIDATION_ERROR",
                    e.getMessage(),
                    "Please check your input data.",
                    e
            ));

        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Entity not found during creation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "ENTITY_NOT_FOUND",
                    e.getMessage(),
                    "Referenced department or parent position not found.",
                    e
            ));

        } catch (DataIntegrityViolationException e) {
            logger.error("🔴 Database constraint violation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(createErrorResponse(
                    "DUPLICATE_OR_CONSTRAINT_ERROR",
                    "A position with this name and level likely already exists.",
                    e.getMessage(),
                    e
            ));

        } catch (Exception e) {
            logger.error("💥 Unexpected error creating job position", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "CREATION_ERROR",
                    "Failed to create job position",
                    e.getMessage(),
                    e
            ));
        }
    }
    /**
     * Enhanced update job position with comprehensive error handling
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateJobPosition(@PathVariable UUID id, @RequestBody JobPositionDTO jobPositionDTO) {
        try {
            logger.info("📝 Updating job position: {}", id);
            logger.debug("📋 Update Data: contractType={}, experienceLevel={}, department={}",
                    jobPositionDTO.getContractType(),
                    jobPositionDTO.getExperienceLevel(),
                    jobPositionDTO.getDepartment());

            JobPositionDTO updatedPosition = jobPositionService.updateJobPosition(id, jobPositionDTO);

            logger.info("✅ Successfully updated job position: {}", id);
            return ResponseEntity.ok(updatedPosition);

        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Validation error updating job position {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(createErrorResponse(
                    "VALIDATION_ERROR",
                    e.getMessage(),
                    "Please check your input data. " + e.getMessage(),
                    e
            ));

        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Entity not found while updating job position {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "ENTITY_NOT_FOUND",
                    e.getMessage(),
                    "The job position or referenced entity could not be found: " + e.getMessage(),
                    e
            ));

        } catch (DataIntegrityViolationException e) {
            logger.error("🔴 Database constraint violation updating position {}: {}", id, e.getMessage());

            String userMessage;
            if (e.getMessage().contains("unique") || e.getMessage().contains("duplicate")) {
                userMessage = "A job position with this name and experience level already exists";
            } else if (e.getMessage().contains("foreign key") || e.getMessage().contains("constraint")) {
                userMessage = "Referenced data (department, parent position) is invalid";
            } else {
                userMessage = "Database constraint violation occurred";
            }

            return ResponseEntity.status(HttpStatus.CONFLICT).body(createErrorResponse(
                    "DATABASE_CONSTRAINT_VIOLATION",
                    userMessage,
                    e.getMessage(),
                    e
            ));

        } catch (Exception e) {
            logger.error("💥 Unexpected error updating job position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "UNEXPECTED_ERROR",
                    "An unexpected error occurred while updating the job position",
                    "Exception: " + e.getClass().getSimpleName() + " - " + e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get all job positions as DTOs
     */
    @GetMapping
    public ResponseEntity<?> getAllJobPositions() {
        try {
            List<JobPositionDTO> positions = jobPositionService.getAllJobPositionDTOs();
            return ResponseEntity.ok(positions);
        } catch (Exception e) {
            logger.error("💥 Error fetching all job positions", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve job positions",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get a job position by ID as DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getJobPositionById(@PathVariable UUID id) {
        try {
            JobPositionDTO position = jobPositionService.getJobPositionDTOById(id);
            return ResponseEntity.ok(position);
        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Job position not found: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "NOT_FOUND",
                    "Job position not found with ID: " + id,
                    e.getMessage(),
                    e
            ));
        } catch (Exception e) {
            logger.error("💥 Error fetching job position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve job position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Delete a job position
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteJobPosition(@PathVariable UUID id) {
        try {
            logger.info("🗑️ Deleting job position: {}", id);
            jobPositionService.deleteJobPosition(id);
            logger.info("✅ Successfully deleted job position: {}", id);
            return ResponseEntity.noContent().build();

        } catch (IllegalStateException e) {
            logger.warn("⚠️ Cannot delete job position {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(createErrorResponse(
                    "DELETE_CONFLICT",
                    e.getMessage(),
                    "This position cannot be deleted because it has assigned employees or active dependencies.",
                    e
            ));

        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Job position not found for deletion: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "NOT_FOUND",
                    "Job position not found with ID: " + id,
                    e.getMessage(),
                    e
            ));

        } catch (Exception e) {
            logger.error("💥 Error deleting job position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "DELETE_ERROR",
                    "Failed to delete job position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get employees by job position ID
     */
    @GetMapping("/{id}/employees")
    public ResponseEntity<?> getEmployeesByJobPositionId(@PathVariable UUID id) {
        try {
            logger.info("👥 Fetching employees for job position: {}", id);
            List<EmployeeSummaryDTO> employees = jobPositionService.getEmployeesByJobPositionId(id);
            return ResponseEntity.ok(employees);

        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Job position not found: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "NOT_FOUND",
                    "Job position not found with ID: " + id,
                    e.getMessage(),
                    e
            ));

        } catch (Exception e) {
            logger.error("💥 Error fetching employees for job position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve employees for this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    // ======================================
    // ENHANCED ENDPOINTS FOR DETAILS VIEW
    // ======================================

    /**
     * Get comprehensive job position details
     */
    @GetMapping("/{id}/details")
    public ResponseEntity<?> getJobPositionDetails(@PathVariable UUID id) {
        try {
            logger.info("📊 Fetching comprehensive details for job position: {}", id);
            JobPositionDetailsDTO details = jobPositionService.getJobPositionDetailsDTO(id);
            return ResponseEntity.ok(details);

        } catch (EntityNotFoundException e) {
            logger.warn("🔍 Job position not found: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(createErrorResponse(
                    "NOT_FOUND",
                    "Job position not found with ID: " + id,
                    e.getMessage(),
                    e
            ));

        } catch (Exception e) {
            logger.error("💥 Error fetching job position details {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve job position details",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get promotion statistics
     */
    @GetMapping("/{id}/promotion-statistics")
    public ResponseEntity<?> getPromotionStatistics(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPromotionStatistics(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching promotion statistics for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotion statistics",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get promotions FROM this position
     */
    @GetMapping("/{id}/promotions/from")
    public ResponseEntity<?> getPromotionsFromPosition(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPromotionsFromPosition(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching promotions from position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotions from this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get promotions TO this position
     */
    @GetMapping("/{id}/promotions/to")
    public ResponseEntity<?> getPromotionsToPosition(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPromotionsToPosition(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching promotions to position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotions to this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get pending promotions FROM this position
     */
    @GetMapping("/{id}/promotions/from/pending")
    public ResponseEntity<?> getPendingPromotionsFromPosition(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPendingPromotionsFromPosition(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching pending promotions from position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve pending promotions from this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get pending promotions TO this position
     */
    @GetMapping("/{id}/promotions/to/pending")
    public ResponseEntity<?> getPendingPromotionsToPosition(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPendingPromotionsToPosition(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching pending promotions to position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve pending promotions to this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get career path suggestions
     */
    @GetMapping("/{id}/career-path-suggestions")
    public ResponseEntity<?> getCareerPathSuggestions(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getCareerPathSuggestions(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching career path suggestions for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve career path suggestions",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get employees eligible for promotion
     */
    @GetMapping("/{id}/employees/eligible-for-promotion")
    public ResponseEntity<?> getEmployeesEligibleForPromotion(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getEmployeesEligibleForPromotion(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching eligible employees for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve eligible employees",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get salary statistics
     */
    @GetMapping("/{id}/salary-statistics")
    public ResponseEntity<?> getSalaryStatistics(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getSalaryStatistics(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching salary statistics for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve salary statistics",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get position validation
     */
    @GetMapping("/{id}/validation")
    public ResponseEntity<?> getPositionValidation(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPositionValidation(id));
        } catch (Exception e) {
            logger.error("💥 Error validating position {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "VALIDATION_ERROR",
                    "Failed to validate position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get position analytics
     */
    @GetMapping("/{id}/analytics")
    public ResponseEntity<?> getPositionAnalytics(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPositionAnalytics(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching analytics for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve position analytics",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Check if can delete
     */
    @GetMapping("/{id}/can-delete")
    public ResponseEntity<?> canDeletePosition(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.canDeletePosition(id));
        } catch (Exception e) {
            logger.error("💥 Error checking delete eligibility for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "CHECK_ERROR",
                    "Failed to check if position can be deleted",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get promotion destinations
     */
    @GetMapping("/{id}/promotion-destinations")
    public ResponseEntity<?> getPromotionDestinations(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPromotionDestinations(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching promotion destinations for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotion destinations",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get promotion sources
     */
    @GetMapping("/{id}/promotion-sources")
    public ResponseEntity<?> getPromotionSources(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getPromotionSources(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching promotion sources for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotion sources",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get simplified promotion stats
     */
    @GetMapping("/{id}/promotion-stats-simple")
    public ResponseEntity<?> getSimplifiedPromotionStats(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionStats(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching simple promotion stats for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotion statistics",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get simplified promotions from
     */
    @GetMapping("/{id}/promotions-from-simple")
    public ResponseEntity<?> getSimplifiedPromotionsFrom(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionsFrom(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching simple promotions from {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotions from this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get simplified promotions to
     */
    @GetMapping("/{id}/promotions-to-simple")
    public ResponseEntity<?> getSimplifiedPromotionsTo(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(jobPositionService.getSimplifiedPromotionsTo(id));
        } catch (Exception e) {
            logger.error("💥 Error fetching simple promotions to {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve promotions to this position",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get job position hierarchy
     */
    @GetMapping("/hierarchy")
    public ResponseEntity<?> getJobPositionHierarchy() {
        try {
            List<JobPosition> rootPositions = jobPositionRepository.findByParentJobPositionIsNull();
            return ResponseEntity.ok(convertToDTOList(rootPositions));
        } catch (Exception e) {
            logger.error("💥 Error fetching position hierarchy", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve position hierarchy",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Get child positions
     */
    @GetMapping("/{id}/children")
    public ResponseEntity<?> getChildPositions(@PathVariable UUID id) {
        try {
            List<JobPosition> childPositions = jobPositionRepository.findByParentJobPositionId(id);
            return ResponseEntity.ok(convertToDTOList(childPositions));
        } catch (Exception e) {
            logger.error("💥 Error fetching child positions for {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorResponse(
                    "FETCH_ERROR",
                    "Failed to retrieve child positions",
                    e.getMessage(),
                    e
            ));
        }
    }

    /**
     * Convert list of JobPosition entities to list of JobPositionDTOs
     */
    private List<JobPositionDTO> convertToDTOList(List<JobPosition> jobPositions) {
        if (jobPositions == null) {
            return new ArrayList<>();
        }

        return jobPositions.stream()
                .filter(Objects::nonNull)
                .map(this::convertToDTO)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Convert JobPosition entity to JobPositionDTO
     */
    private JobPositionDTO convertToDTO(JobPosition jobPosition) {
        if (jobPosition == null) {
            return null;
        }

        try {
            JobPositionDTO dto = new JobPositionDTO();
            dto.setId(jobPosition.getId());
            dto.setPositionName(jobPosition.getPositionName());
            dto.setDepartment(jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null);
            dto.setHead(jobPosition.getHead());
            dto.setBaseSalary(jobPosition.getBaseSalary());
            dto.setProbationPeriod(jobPosition.getProbationPeriod());
            dto.setContractType(jobPosition.getContractType());
            dto.setExperienceLevel(jobPosition.getExperienceLevel());
            dto.setActive(jobPosition.getActive());

            // Contract type specific fields
            switch (jobPosition.getContractType()) {
                case HOURLY:
                    dto.setWorkingDaysPerWeek(jobPosition.getWorkingDaysPerWeek());
                    dto.setHoursPerShift(jobPosition.getHoursPerShift());
                    dto.setHourlyRate(jobPosition.getHourlyRate());
                    dto.setOvertimeMultiplier(jobPosition.getOvertimeMultiplier());
                    dto.setTrackBreaks(jobPosition.getTrackBreaks());
                    dto.setBreakDurationMinutes(jobPosition.getBreakDurationMinutes());
                    break;
                case DAILY:
                    dto.setDailyRate(jobPosition.getDailyRate());
                    dto.setWorkingDaysPerMonth(jobPosition.getWorkingDaysPerMonth());
                    dto.setIncludesWeekends(jobPosition.getIncludesWeekends());
                    break;
                case MONTHLY:
                    dto.setMonthlyBaseSalary(jobPosition.getMonthlyBaseSalary());
                    dto.setWorkingDaysPerMonth(jobPosition.getWorkingDaysPerMonth());
                    dto.setShifts(jobPosition.getShifts());
                    dto.setWorkingHours(jobPosition.getWorkingHours());
                    dto.setVacations(jobPosition.getVacations());
                    dto.setStartTime(jobPosition.getStartTime());
                    dto.setEndTime(jobPosition.getEndTime());
                    break;
            }

            // Calculate derived fields
            dto.calculateFields();

            // Hierarchy fields
            dto.setParentJobPositionId(jobPosition.getParentJobPosition() != null ?
                    jobPosition.getParentJobPosition().getId() : null);
            dto.setParentJobPositionName(jobPosition.getParentJobPosition() != null ?
                    jobPosition.getParentJobPosition().getPositionName() : null);

            List<UUID> childIds = jobPosition.getChildPositions().stream()
                    .map(JobPosition::getId)
                    .collect(Collectors.toList());
            dto.setChildPositionIds(childIds);

            List<String> childNames = jobPosition.getChildPositions().stream()
                    .map(JobPosition::getPositionName)
                    .collect(Collectors.toList());
            dto.setChildPositionNames(childNames);

            dto.setIsRootPosition(jobPosition.isRootPosition());
            dto.setHierarchyLevel(jobPosition.getHierarchyLevel());
            dto.setHierarchyPath(jobPosition.getHierarchyPath());

            return dto;
        } catch (Exception e) {
            logger.error("💥 Error converting JobPosition to DTO: {}", e.getMessage(), e);
            return null;
        }
    }
}