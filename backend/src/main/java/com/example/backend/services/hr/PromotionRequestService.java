package com.example.backend.services.hr;

import com.example.backend.models.hr.*;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.*;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionRequestService {

    private final PromotionRequestRepository promotionRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final JobPositionRepository jobPositionRepository;
    private final NotificationService notificationService;

    /**
     * Create a new promotion request
     */
    @Transactional
    public PromotionRequest createPromotionRequest(Map<String, Object> requestData, String requestedBy) {
        try {
            log.info("Creating promotion request by: {}", requestedBy);

            // Get employee
            UUID employeeId = UUID.fromString((String) requestData.get("employeeId"));
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            // Get current job position
            JobPosition currentPosition = employee.getJobPosition();
            if (currentPosition == null) {
                throw new RuntimeException("Employee has no current job position assigned");
            }

            // Get promoted to job position
            UUID promotedToPositionId = UUID.fromString((String) requestData.get("promotedToJobPositionId"));
            JobPosition promotedToPosition = jobPositionRepository.findById(promotedToPositionId)
                    .orElseThrow(() -> new RuntimeException("Promoted to job position not found"));

            // Validate that it's actually a promotion (not lateral move to same level)
            if (currentPosition.getId().equals(promotedToPosition.getId())) {
                throw new RuntimeException("Cannot promote employee to the same position");
            }

            // Parse dates
            LocalDate proposedEffectiveDate = requestData.get("proposedEffectiveDate") != null 
                ? LocalDate.parse((String) requestData.get("proposedEffectiveDate"))
                : LocalDate.now().plusDays(30); // Default to 30 days from now

            // Parse salary information
            BigDecimal currentSalary = employee.getMonthlySalary();
            BigDecimal proposedSalary = requestData.get("proposedSalary") != null 
                ? new BigDecimal(requestData.get("proposedSalary").toString())
                : promotedToPosition.getBaseSalary() != null 
                    ? BigDecimal.valueOf(promotedToPosition.getBaseSalary())
                    : currentSalary.multiply(BigDecimal.valueOf(1.1)); // Default 10% increase

            // Create promotion request
            PromotionRequest promotionRequest = PromotionRequest.builder()
                    .employee(employee)
                    .currentJobPosition(currentPosition)
                    .promotedToJobPosition(promotedToPosition)
                    .requestTitle((String) requestData.get("requestTitle"))
                    .justification((String) requestData.get("justification"))
                    .proposedEffectiveDate(proposedEffectiveDate)
                    .currentSalary(currentSalary)
                    .proposedSalary(proposedSalary)
                    .requestedBy(requestedBy)
                    .hrComments((String) requestData.get("hrComments"))
                    .performanceRating((String) requestData.get("performanceRating"))
                    .educationalQualifications((String) requestData.get("educationalQualifications"))
                    .additionalCertifications((String) requestData.get("additionalCertifications"))
                    .requiresAdditionalTraining(
                        requestData.get("requiresAdditionalTraining") != null 
                        ? (Boolean) requestData.get("requiresAdditionalTraining") 
                        : false)
                    .trainingPlan((String) requestData.get("trainingPlan"))
                    .priority(requestData.get("priority") != null 
                        ? PromotionRequest.PromotionPriority.valueOf(((String) requestData.get("priority")).toUpperCase())
                        : PromotionRequest.PromotionPriority.NORMAL)
                    .status(PromotionRequest.PromotionStatus.PENDING)
                    .build();

            // Calculate years in current position
            if (employee.getHireDate() != null) {
                long years = java.time.temporal.ChronoUnit.YEARS.between(employee.getHireDate(), LocalDate.now());
                promotionRequest.setYearsInCurrentPosition((int) years);
            }

            PromotionRequest savedRequest = promotionRequestRepository.save(promotionRequest);
            
            // Send notifications
            sendPromotionRequestNotifications(savedRequest, "created");

            log.info("Successfully created promotion request with ID: {}", savedRequest.getId());
            return savedRequest;

        } catch (Exception e) {
            log.error("Error creating promotion request", e);
            
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Promotion Request Creation Failed",
                    "Failed to create promotion request: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/promotions",
                    "promotion-error-" + System.currentTimeMillis()
            );
            
            throw e;
        }
    }

    /**
     * Review a promotion request (HR Manager action)
     */
    @Transactional
    public PromotionRequest reviewPromotionRequest(UUID requestId, Map<String, Object> reviewData, String reviewedBy) {
        try {
            log.info("Reviewing promotion request: {} by: {}", requestId, reviewedBy);

            PromotionRequest request = promotionRequestRepository.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Promotion request not found"));

            if (request.getStatus() != PromotionRequest.PromotionStatus.PENDING) {
                throw new RuntimeException("Promotion request is not in pending status");
            }

            String action = (String) reviewData.get("action"); // "approve" or "reject"
            
            request.setReviewedBy(reviewedBy);
            request.setReviewedAt(LocalDateTime.now());
            request.setManagerComments((String) reviewData.get("managerComments"));

            if ("approve".equalsIgnoreCase(action)) {
                request.setStatus(PromotionRequest.PromotionStatus.APPROVED);
                request.setApprovedBy(reviewedBy);
                request.setApprovedAt(LocalDateTime.now());

                // Update approved salary if different from proposed
                if (reviewData.get("approvedSalary") != null) {
                    BigDecimal approvedSalary = new BigDecimal(reviewData.get("approvedSalary").toString());
                    request.setApprovedSalary(approvedSalary);
                } else {
                    request.setApprovedSalary(request.getProposedSalary());
                }

                // Update effective date if changed
                if (reviewData.get("actualEffectiveDate") != null) {
                    LocalDate actualEffectiveDate = LocalDate.parse((String) reviewData.get("actualEffectiveDate"));
                    request.setActualEffectiveDate(actualEffectiveDate);
                } else {
                    request.setActualEffectiveDate(request.getProposedEffectiveDate());
                }

            } else if ("reject".equalsIgnoreCase(action)) {
                request.setStatus(PromotionRequest.PromotionStatus.REJECTED);
                request.setRejectionReason((String) reviewData.get("rejectionReason"));
            } else {
                throw new RuntimeException("Invalid review action. Must be 'approve' or 'reject'");
            }

            PromotionRequest updatedRequest = promotionRequestRepository.save(request);
            
            // Send notifications
            sendPromotionRequestNotifications(updatedRequest, action);

            log.info("Successfully reviewed promotion request: {} with action: {}", requestId, action);
            return updatedRequest;

        } catch (Exception e) {
            log.error("Error reviewing promotion request", e);
            
            notificationService.sendNotificationToHRUsers(
                    "Promotion Review Failed",
                    "Failed to review promotion request: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/promotions/" + requestId,
                    "promotion-review-error-" + requestId
            );
            
            throw e;
        }
    }

    /**
     * Implement an approved promotion request
     */
    @Transactional
    public PromotionRequest implementPromotionRequest(UUID requestId, String implementedBy) {
        try {
            log.info("Implementing promotion request: {} by: {}", requestId, implementedBy);

            PromotionRequest request = promotionRequestRepository.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Promotion request not found"));

            if (request.getStatus() != PromotionRequest.PromotionStatus.APPROVED) {
                throw new RuntimeException("Promotion request is not approved");
            }

            if (!request.canBeImplemented()) {
                throw new RuntimeException("Promotion request cannot be implemented yet. Check effective date.");
            }

            Employee employee = request.getEmployee();
            
            // Update employee's job position
            employee.setJobPosition(request.getPromotedToJobPosition());
            
            // Update employee's salary if approved salary is different
            if (request.getApprovedSalary() != null) {
                employee.setBaseSalaryOverride(request.getApprovedSalary());
            }
            
            employeeRepository.save(employee);

            // Update promotion request status
            request.setStatus(PromotionRequest.PromotionStatus.IMPLEMENTED);
            request.setImplementedAt(LocalDateTime.now());

            PromotionRequest implementedRequest = promotionRequestRepository.save(request);
            
            // Send notifications
            sendPromotionRequestNotifications(implementedRequest, "implemented");

            log.info("Successfully implemented promotion for employee: {}", employee.getFullName());
            return implementedRequest;

        } catch (Exception e) {
            log.error("Error implementing promotion request", e);
            
            notificationService.sendNotificationToHRUsers(
                    "Promotion Implementation Failed",
                    "Failed to implement promotion: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/promotions/" + requestId,
                    "promotion-impl-error-" + requestId
            );
            
            throw e;
        }
    }

    /**
     * Get all promotion requests with optional filtering
     */
    public List<PromotionRequest> getAllPromotionRequests(
            PromotionRequest.PromotionStatus status,
            UUID employeeId,
            String requestedBy) {
        
        if (status != null && employeeId != null) {
            return promotionRequestRepository.findByStatusAndEmployeeIdOrderByCreatedAtDesc(status, employeeId);
        } else if (status != null) {
            return promotionRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        } else if (employeeId != null) {
            return promotionRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        } else if (requestedBy != null) {
            return promotionRequestRepository.findByRequestedByOrderByCreatedAtDesc(requestedBy);
        } else {
            return promotionRequestRepository.findAllByOrderByCreatedAtDesc();
        }
    }

    /**
     * Get pending promotion requests for HR managers
     */
    public List<PromotionRequest> getPendingPromotionRequests() {
        return promotionRequestRepository.findByStatusOrderByCreatedAtDesc(PromotionRequest.PromotionStatus.PENDING);
    }

    /**
     * Get approved promotions ready for implementation
     */
    public List<PromotionRequest> getPromotionsReadyForImplementation() {
        LocalDate today = LocalDate.now();
        return promotionRequestRepository.findByStatusAndActualEffectiveDateLessThanEqualOrderByActualEffectiveDate(
                PromotionRequest.PromotionStatus.APPROVED, today);
    }

    /**
     * Get promotion request by ID
     */
    public PromotionRequest getPromotionRequestById(UUID requestId) {
        return promotionRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Promotion request not found"));
    }

    /**
     * Cancel a promotion request
     */
    @Transactional
    public PromotionRequest cancelPromotionRequest(UUID requestId, String cancelledBy, String reason) {
        try {
            PromotionRequest request = getPromotionRequestById(requestId);
            
            if (request.isCompleted()) {
                throw new RuntimeException("Cannot cancel a completed promotion request");
            }

            request.setStatus(PromotionRequest.PromotionStatus.CANCELLED);
            request.setRejectionReason(reason);
            
            PromotionRequest cancelledRequest = promotionRequestRepository.save(request);
            
            sendPromotionRequestNotifications(cancelledRequest, "cancelled");
            
            return cancelledRequest;

        } catch (Exception e) {
            log.error("Error cancelling promotion request", e);
            throw e;
        }
    }

    /**
     * Get promotion statistics
     */
    public Map<String, Object> getPromotionStatistics() {
        long totalRequests = promotionRequestRepository.count();
        long pendingRequests = promotionRequestRepository.countByStatus(PromotionRequest.PromotionStatus.PENDING);
        long approvedRequests = promotionRequestRepository.countByStatus(PromotionRequest.PromotionStatus.APPROVED);
        long implementedRequests = promotionRequestRepository.countByStatus(PromotionRequest.PromotionStatus.IMPLEMENTED);
        long rejectedRequests = promotionRequestRepository.countByStatus(PromotionRequest.PromotionStatus.REJECTED);

        return Map.of(
                "totalRequests", totalRequests,
                "pendingRequests", pendingRequests,
                "approvedRequests", approvedRequests,
                "implementedRequests", implementedRequests,
                "rejectedRequests", rejectedRequests,
                "approvalRate", totalRequests > 0 ? (double) implementedRequests / totalRequests * 100 : 0.0
        );
    }

    /**
     * Send notifications for promotion request events
     */
    private void sendPromotionRequestNotifications(PromotionRequest request, String action) {
        String employeeName = request.getEmployeeName();
        String currentPosition = request.getCurrentPositionName();
        String promotedPosition = request.getPromotedToPositionName();

        switch (action.toLowerCase()) {
            case "created":
                // Notify HR managers about new promotion request
                notificationService.sendNotificationToHRUsers(
                        "New Promotion Request",
                        "New promotion request for " + employeeName + " from " + currentPosition + " to " + promotedPosition,
                        NotificationType.INFO,
                        "/promotions/" + request.getId(),
                        "new-promotion-" + request.getId()
                );

                // Special notification for interdepartmental promotions
                if (request.isInterdepartmentalPromotion()) {
                    notificationService.sendNotificationToHRUsers(
                            "Interdepartmental Promotion Request",
                            "🔄 " + employeeName + " promotion involves department change: " + 
                            request.getCurrentDepartmentName() + " → " + request.getPromotedToDepartmentName(),
                            NotificationType.WARNING,
                            "/promotions/" + request.getId(),
                            "interdept-promotion-" + request.getId()
                    );
                }
                break;

            case "approve":
                // Notify HR team about approval
                notificationService.sendNotificationToHRUsers(
                        "Promotion Request Approved",
                        "✅ Promotion approved for " + employeeName + " to " + promotedPosition + 
                        ". Effective date: " + request.getActualEffectiveDate(),
                        NotificationType.SUCCESS,
                        "/promotions/" + request.getId(),
                        "promotion-approved-" + request.getId()
                );

                // Notify about salary increase if significant
                BigDecimal salaryIncrease = request.getSalaryIncreasePercentage();
                if (salaryIncrease.compareTo(BigDecimal.valueOf(20)) > 0) {
                    notificationService.sendNotificationToHRUsers(
                            "Significant Salary Increase",
                            "💰 " + employeeName + " promotion includes " + salaryIncrease + "% salary increase",
                            NotificationType.INFO,
                            "/promotions/" + request.getId(),
                            "salary-increase-" + request.getId()
                    );
                }
                break;

            case "reject":
                // Notify about rejection
                notificationService.sendNotificationToHRUsers(
                        "Promotion Request Rejected",
                        "❌ Promotion request for " + employeeName + " has been rejected",
                        NotificationType.WARNING,
                        "/promotions/" + request.getId(),
                        "promotion-rejected-" + request.getId()
                );
                break;

            case "implemented":
                // Notify about successful implementation
                notificationService.sendNotificationToHRUsers(
                        "Promotion Implemented",
                        "🎉 " + employeeName + " has been successfully promoted to " + promotedPosition,
                        NotificationType.SUCCESS,
                        "/employees/" + request.getEmployee().getId(),
                        "promotion-implemented-" + request.getId()
                );

                // Notify relevant departments
                if (request.isInterdepartmentalPromotion()) {
                    notificationService.sendNotificationToHRUsers(
                            "Department Transfer Completed",
                            employeeName + " has transferred from " + request.getCurrentDepartmentName() + 
                            " to " + request.getPromotedToDepartmentName(),
                            NotificationType.INFO,
                            "/employees/" + request.getEmployee().getId(),
                            "dept-transfer-" + request.getId()
                    );
                }
                break;

            case "cancelled":
                notificationService.sendNotificationToHRUsers(
                        "Promotion Request Cancelled",
                        "Promotion request for " + employeeName + " has been cancelled",
                        NotificationType.INFO,
                        "/promotions/" + request.getId(),
                        "promotion-cancelled-" + request.getId()
                );
                break;
        }
    }

    /**
     * Check for overdue approved promotions and send alerts
     */
    public void checkOverduePromotions() {
        List<PromotionRequest> overduePromotions = promotionRequestRepository
                .findByStatusAndActualEffectiveDateLessThanOrderByActualEffectiveDate(
                        PromotionRequest.PromotionStatus.APPROVED, LocalDate.now());

        for (PromotionRequest request : overduePromotions) {
            notificationService.sendNotificationToHRUsers(
                    "Overdue Promotion Implementation",
                    "⏰ Promotion for " + request.getEmployeeName() + 
                    " was scheduled for " + request.getActualEffectiveDate() + " but has not been implemented",
                    NotificationType.WARNING,
                    "/promotions/" + request.getId(),
                    "overdue-promotion-" + request.getId()
            );
        }
    }
}