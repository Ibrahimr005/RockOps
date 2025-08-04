package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.promotions.*;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.services.hr.PromotionRequestService;
import com.example.backend.services.hr.PromotionRequestMapperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

// Removed javax.validation.Valid import
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class PromotionRequestController {

    private final PromotionRequestService promotionRequestService;
    private final PromotionRequestMapperService mapperService;

    /**
     * Create a new promotion request using DTO
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> createPromotionRequest(
            @RequestBody PromotionRequestCreateDTO createDTO,
            Authentication authentication) {
        try {
            // Validate input
            mapperService.validateCreateDTO(createDTO);

            String requestedBy = authentication.getName();

            // Convert DTO to map for service layer (maintaining backward compatibility)
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("employeeId", createDTO.getEmployeeId().toString());
            requestData.put("promotedToJobPositionId", createDTO.getPromotedToJobPositionId().toString());
            requestData.put("requestTitle", createDTO.getRequestTitle());
            requestData.put("justification", createDTO.getJustification() != null ? createDTO.getJustification() : "");
            requestData.put("proposedEffectiveDate", createDTO.getProposedEffectiveDate().toString());
            requestData.put("proposedSalary", createDTO.getProposedSalary() != null ? createDTO.getProposedSalary() : 0);
            requestData.put("priority", createDTO.getPriority() != null ? createDTO.getPriority() : "NORMAL");
            requestData.put("hrComments", createDTO.getHrComments() != null ? createDTO.getHrComments() : "");
            requestData.put("performanceRating", createDTO.getPerformanceRating() != null ? createDTO.getPerformanceRating() : "");
            requestData.put("educationalQualifications", createDTO.getEducationalQualifications() != null ? createDTO.getEducationalQualifications() : "");
            requestData.put("additionalCertifications", createDTO.getAdditionalCertifications() != null ? createDTO.getAdditionalCertifications() : "");
            requestData.put("requiresAdditionalTraining", createDTO.getRequiresAdditionalTraining() != null ? createDTO.getRequiresAdditionalTraining() : false);
            requestData.put("trainingPlan", createDTO.getTrainingPlan() != null ? createDTO.getTrainingPlan() : "");

            PromotionRequest createdRequest = promotionRequestService.createPromotionRequest(requestData, requestedBy);
            PromotionRequestResponseDTO responseDTO = mapperService.toResponseDTO(createdRequest);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Promotion request created successfully",
                    "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error creating promotion request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get all promotion requests with pagination and filtering
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> getAllPromotionRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String requestedBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        try {
            PromotionRequest.PromotionStatus promotionStatus = null;
            if (status != null) {
                promotionStatus = PromotionRequest.PromotionStatus.valueOf(status.toUpperCase());
            }

            List<PromotionRequest> requests = promotionRequestService.getAllPromotionRequests(
                    promotionStatus, employeeId, requestedBy);

            List<PromotionRequestResponseDTO> responseDTOs = mapperService.toResponseDTOList(requests);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", responseDTOs,
                    "total", responseDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching promotion requests", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get pending promotion requests for HR managers
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getPendingPromotionRequests() {
        try {
            List<PromotionRequest> pendingRequests = promotionRequestService.getPendingPromotionRequests();
            List<PromotionRequestResponseDTO> responseDTOs = mapperService.toResponseDTOList(pendingRequests);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", responseDTOs,
                    "count", responseDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching pending promotion requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Review a promotion request using DTO
     */
    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> reviewPromotionRequest(
            @PathVariable UUID id,
            @RequestBody PromotionRequestReviewDTO reviewDTO,
            Authentication authentication) {
        try {
            // Validate review data
            mapperService.validateReviewDTO(reviewDTO);

            String reviewedBy = authentication.getName();

            // Convert DTO to map for service layer
            Map<String, Object> reviewData = new HashMap<>();
            reviewData.put("action", reviewDTO.getAction());
            reviewData.put("managerComments", reviewDTO.getManagerComments() != null ? reviewDTO.getManagerComments() : "");
            reviewData.put("rejectionReason", reviewDTO.getRejectionReason() != null ? reviewDTO.getRejectionReason() : "");
            reviewData.put("approvedSalary", reviewDTO.getApprovedSalary() != null ? reviewDTO.getApprovedSalary() : 0);
            reviewData.put("actualEffectiveDate", reviewDTO.getActualEffectiveDate() != null ? reviewDTO.getActualEffectiveDate().toString() : "");

            PromotionRequest reviewedRequest = promotionRequestService.reviewPromotionRequest(id, reviewData, reviewedBy);
            PromotionRequestResponseDTO responseDTO = mapperService.toResponseDTO(reviewedRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Promotion request " + reviewDTO.getAction() + "d successfully",
                    "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error reviewing promotion request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get promotion statistics with detailed analytics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getPromotionStatistics() {
        try {
            Map<String, Object> statistics = promotionRequestService.getPromotionStatistics();
            PromotionStatisticsDTO statisticsDTO = mapperService.toStatisticsDTO(statistics);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", statisticsDTO
            ));
        } catch (Exception e) {
            log.error("Error fetching promotion statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get specific promotion request by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> getPromotionRequestById(@PathVariable UUID id) {
        try {
            PromotionRequest request = promotionRequestService.getPromotionRequestById(id);
            PromotionRequestResponseDTO responseDTO = mapperService.toResponseDTO(request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error fetching promotion request", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Implement an approved promotion request
     */
    @PostMapping("/{id}/implement")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> implementPromotionRequest(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            String implementedBy = authentication.getName();
            PromotionRequest implementedRequest = promotionRequestService.implementPromotionRequest(id, implementedBy);
            PromotionRequestResponseDTO responseDTO = mapperService.toResponseDTO(implementedRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Promotion implemented successfully",
                    "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error implementing promotion request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get approved promotions ready for implementation
     */
    @GetMapping("/ready-for-implementation")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getPromotionsReadyForImplementation() {
        try {
            List<PromotionRequest> readyPromotions = promotionRequestService.getPromotionsReadyForImplementation();
            List<PromotionRequestResponseDTO> responseDTOs = mapperService.toResponseDTOList(readyPromotions);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", responseDTOs,
                    "count", responseDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching promotions ready for implementation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get employee's promotion summary
     */
    @GetMapping("/employee/{employeeId}/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> getEmployeePromotionSummary(@PathVariable UUID employeeId) {
        try {
            // This would require adding a method to get employee by ID in the service
            // For now, we'll return a placeholder response
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Employee promotion summary endpoint - implementation needed",
                    "employeeId", employeeId
            ));
        } catch (Exception e) {
            log.error("Error fetching employee promotion summary", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Check employee promotion eligibility
     */
    @GetMapping("/employee/{employeeId}/eligibility")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> checkEmployeePromotionEligibility(@PathVariable UUID employeeId) {
        try {
            // This would require adding a method to check eligibility in the service
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Employee promotion eligibility endpoint - implementation needed",
                    "employeeId", employeeId
            ));
        } catch (Exception e) {
            log.error("Error checking employee promotion eligibility", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Cancel a promotion request
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> cancelPromotionRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> cancelData,
            Authentication authentication) {
        try {
            String cancelledBy = authentication.getName();
            String reason = (String) cancelData.get("reason");

            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "success", false,
                        "error", "Cancellation reason is required"
                ));
            }

            PromotionRequest cancelledRequest = promotionRequestService.cancelPromotionRequest(id, cancelledBy, reason);
            PromotionRequestResponseDTO responseDTO = mapperService.toResponseDTO(cancelledRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Promotion request cancelled successfully",
                    "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error cancelling promotion request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get promotion requests by department
     */
    @GetMapping("/department/{departmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE')")
    public ResponseEntity<?> getPromotionRequestsByDepartment(
            @PathVariable UUID departmentId,
            @RequestParam(defaultValue = "current") String type) {
        try {
            // This would require adding department-specific queries to the service
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Department promotion requests endpoint - implementation needed",
                    "departmentId", departmentId,
                    "type", type
            ));
        } catch (Exception e) {
            log.error("Error fetching department promotion requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Bulk actions on promotion requests
     */
    @PostMapping("/bulk-action")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> bulkPromotionAction(
            @RequestBody BulkPromotionActionDTO bulkActionDTO,
            Authentication authentication) {
        try {
            // This would require implementing bulk operations in the service
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Bulk promotion action endpoint - implementation needed",
                    "action", bulkActionDTO.getAction(),
                    "requestCount", bulkActionDTO.getPromotionRequestIds().size()
            ));
        } catch (Exception e) {
            log.error("Error performing bulk promotion action", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Get promotion analytics and trends
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getPromotionAnalytics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UUID departmentId) {
        try {
            // This would require implementing analytics in the service
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Promotion analytics endpoint - implementation needed",
                    "year", year,
                    "departmentId", departmentId
            ));
        } catch (Exception e) {
            log.error("Error fetching promotion analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Export promotion data
     */
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> exportPromotionData(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID departmentId) {
        try {
            // This would require implementing export functionality
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Promotion data export endpoint - implementation needed",
                    "format", format,
                    "status", status,
                    "departmentId", departmentId
            ));
        } catch (Exception e) {
            log.error("Error exporting promotion data", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "service", "Enhanced Promotion Request API",
                "timestamp", java.time.LocalDateTime.now(),
                "version", "1.0.0"
        ));
    }
}