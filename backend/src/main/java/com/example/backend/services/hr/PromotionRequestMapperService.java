package com.example.backend.services.hr;

import com.example.backend.dto.hr.*;
import com.example.backend.dto.hr.promotions.*;
import com.example.backend.dto.hr.promotions.PromotionEligibilityDTO;
import com.example.backend.dto.hr.promotions.PromotionRequestResponseDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.PromotionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionRequestMapperService {

    /**
     * Convert PromotionRequest entity to response DTO
     */
    public PromotionRequestResponseDTO toResponseDTO(PromotionRequest request) {
        if (request == null) {
            return null;
        }

        return PromotionRequestResponseDTO.builder()
                .id(request.getId())
                .requestTitle(request.getRequestTitle())
                .justification(request.getJustification())
                .proposedEffectiveDate(request.getProposedEffectiveDate())
                .actualEffectiveDate(request.getActualEffectiveDate())
                .status(request.getStatus() != null ? request.getStatus().name() : null)
                .priority(request.getPriority() != null ? request.getPriority().name() : null)
                
                // Employee information
                .employeeId(request.getEmployee() != null ? request.getEmployee().getId() : null)
                .employeeName(request.getEmployeeName())
                .employeePhotoUrl(request.getEmployee() != null ? request.getEmployee().getPhotoUrl() : null)
                
                // Position information
                .currentJobPositionId(request.getCurrentJobPosition() != null ? request.getCurrentJobPosition().getId() : null)
                .currentPositionName(request.getCurrentPositionName())
                .currentDepartmentName(request.getCurrentDepartmentName())
                .promotedToJobPositionId(request.getPromotedToJobPosition() != null ? request.getPromotedToJobPosition().getId() : null)
                .promotedToPositionName(request.getPromotedToPositionName())
                .promotedToDepartmentName(request.getPromotedToDepartmentName())
                .involvesDepartmentChange(request.isInterdepartmentalPromotion())
                
                // Salary information
                .currentSalary(request.getCurrentSalary())
                .proposedSalary(request.getProposedSalary())
                .approvedSalary(request.getApprovedSalary())
                .salaryIncrease(request.getSalaryIncrease())
                .salaryIncreasePercentage(request.getSalaryIncreasePercentage())
                
                // Workflow information
                .requestedBy(request.getRequestedBy())
                .reviewedBy(request.getReviewedBy())
                .approvedBy(request.getApprovedBy())
                .submittedAt(request.getSubmittedAt())
                .reviewedAt(request.getReviewedAt())
                .approvedAt(request.getApprovedAt())
                .implementedAt(request.getImplementedAt())
                
                // Comments and feedback
                .hrComments(request.getHrComments())
                .managerComments(request.getManagerComments())
                .rejectionReason(request.getRejectionReason())
                
                // Performance and qualifications
                .performanceRating(request.getPerformanceRating())
                .yearsInCurrentPosition(request.getYearsInCurrentPosition())
                .educationalQualifications(request.getEducationalQualifications())
                .additionalCertifications(request.getAdditionalCertifications())
                
                // Training and development
                .requiresAdditionalTraining(request.getRequiresAdditionalTraining())
                .trainingPlan(request.getTrainingPlan())
                
                // Timing information
                .daysToEffectiveDate(request.getDaysToEffectiveDate())
                .isOverdue(request.isOverdue())
                .canBeImplemented(request.canBeImplemented())
                
                // Audit timestamps
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    /**
     * Convert list of PromotionRequest entities to response DTOs
     */
    public List<PromotionRequestResponseDTO> toResponseDTOList(List<PromotionRequest> requests) {
        return requests.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert Employee to promotion summary DTO
     */
    public EmployeePromotionSummaryDTO toEmployeePromotionSummaryDTO(Employee employee) {
        if (employee == null) {
            return null;
        }

        Map<String, Object> promotionSummary = employee.getPromotionSummary();
        Map<String, Object> eligibilityStatus = employee.getPromotionEligibilityStatus();

        PromotionEligibilityDTO eligibilityDTO = PromotionEligibilityDTO.builder()
                .eligible((Boolean) eligibilityStatus.get("eligible"))
                .reasons((List<String>) eligibilityStatus.get("reasons"))
                .monthsInCurrentPosition((Long) eligibilityStatus.get("monthsInCurrentPosition"))
                .hasActivePromotionRequests((Boolean) eligibilityStatus.get("hasActivePromotionRequests"))
                .promotionHistoryCount((Integer) eligibilityStatus.get("promotionHistory"))
                .employeeStatus(employee.getStatus())
                .build();

        PromotionRequestResponseDTO lastPromotionDTO = null;
        PromotionRequest lastPromotion = employee.getLastPromotion();
        if (lastPromotion != null) {
            lastPromotionDTO = toResponseDTO(lastPromotion);
        }

        PromotionRequestResponseDTO mostRecentRequestDTO = null;
        PromotionRequest mostRecentRequest = employee.getMostRecentPromotionRequest();
        if (mostRecentRequest != null) {
            mostRecentRequestDTO = toResponseDTO(mostRecentRequest);
        }

        return EmployeePromotionSummaryDTO.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .currentPositionName(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .currentDepartmentName(employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null 
                    ? employee.getJobPosition().getDepartment().getName() : null)
                .totalPromotions((Integer) promotionSummary.get("totalPromotions"))
                .pendingRequests((Integer) promotionSummary.get("pendingRequests"))
                .approvedRequests((Integer) promotionSummary.get("approvedRequests"))
                .monthsSinceLastPromotion((Long) promotionSummary.get("monthsSinceLastPromotion"))
                .averageTimeBetweenPromotions((Double) promotionSummary.get("averageTimeBetweenPromotions"))
                .isEligibleForPromotion(employee.isEligibleForPromotion())
                .eligibilityStatus(eligibilityDTO)
                .lastPromotion(lastPromotionDTO)
                .mostRecentRequest(mostRecentRequestDTO)
                .build();
    }

    /**
     * Convert promotion statistics to DTO
     */
    public PromotionStatisticsDTO toStatisticsDTO(Map<String, Object> statistics) {
        return PromotionStatisticsDTO.builder()
                .totalRequests((Long) statistics.get("totalRequests"))
                .pendingRequests((Long) statistics.get("pendingRequests"))
                .approvedRequests((Long) statistics.get("approvedRequests"))
                .implementedRequests((Long) statistics.get("implementedRequests"))
                .rejectedRequests((Long) statistics.get("rejectedRequests"))
                .cancelledRequests((Long) statistics.getOrDefault("cancelledRequests", 0L))
                .approvalRate((Double) statistics.get("approvalRate"))
                .implementationRate((Double) statistics.getOrDefault("implementationRate", 0.0))
                .averageSalaryIncrease((java.math.BigDecimal) statistics.getOrDefault("averageSalaryIncrease", java.math.BigDecimal.ZERO))
                .averageSalaryIncreasePercentage((java.math.BigDecimal) statistics.getOrDefault("averageSalaryIncreasePercentage", java.math.BigDecimal.ZERO))
                .averageDaysToApproval((Long) statistics.getOrDefault("averageDaysToApproval", 0L))
                .averageDaysToImplementation((Long) statistics.getOrDefault("averageDaysToImplementation", 0L))
                .build();
    }

    /**
     * Create promotion request from create DTO and additional data
     */
    public PromotionRequest fromCreateDTO(PromotionRequestCreateDTO createDTO, Employee employee, 
            com.example.backend.models.hr.JobPosition currentPosition, 
            com.example.backend.models.hr.JobPosition promotedToPosition, 
            String requestedBy) {
        
        return PromotionRequest.builder()
                .employee(employee)
                .currentJobPosition(currentPosition)
                .promotedToJobPosition(promotedToPosition)
                .requestTitle(createDTO.getRequestTitle())
                .justification(createDTO.getJustification())
                .proposedEffectiveDate(createDTO.getProposedEffectiveDate())
                .currentSalary(employee.getMonthlySalary())
                .proposedSalary(createDTO.getProposedSalary())
                .requestedBy(requestedBy)
                .hrComments(createDTO.getHrComments())
                .performanceRating(createDTO.getPerformanceRating())
                .educationalQualifications(createDTO.getEducationalQualifications())
                .additionalCertifications(createDTO.getAdditionalCertifications())
                .requiresAdditionalTraining(createDTO.getRequiresAdditionalTraining())
                .trainingPlan(createDTO.getTrainingPlan())
                .priority(createDTO.getPriority() != null ? 
                    PromotionRequest.PromotionPriority.valueOf(createDTO.getPriority().toUpperCase()) : 
                    PromotionRequest.PromotionPriority.NORMAL)
                .status(PromotionRequest.PromotionStatus.PENDING)
                .build();
    }

    /**
     * Convert list of employees to promotion summary DTOs
     */
    public List<EmployeePromotionSummaryDTO> toEmployeePromotionSummaryDTOList(List<Employee> employees) {
        return employees.stream()
                .map(this::toEmployeePromotionSummaryDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create monthly trend DTO
     */
    public MonthlyPromotionTrendDTO createMonthlyTrendDTO(int year, int month, 
            long totalRequests, long approvedPromotions, long implementedPromotions, 
            java.math.BigDecimal averageSalaryIncrease) {
        
        String monthName = java.time.Month.of(month).name();
        
        return MonthlyPromotionTrendDTO.builder()
                .year(year)
                .month(month)
                .monthName(monthName)
                .totalRequests(totalRequests)
                .approvedPromotions(approvedPromotions)
                .implementedPromotions(implementedPromotions)
                .averageSalaryIncrease(averageSalaryIncrease)
                .build();
    }

    /**
     * Create top performer DTO from employee and promotion data
     */
    public TopPerformerDTO createTopPerformerDTO(Employee employee, 
            int totalPromotions, double averageTimeBetweenPromotions, 
            java.math.BigDecimal totalSalaryIncrease, java.time.LocalDateTime lastPromotionDate) {
        
        return TopPerformerDTO.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .currentPosition(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .department(employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null 
                    ? employee.getJobPosition().getDepartment().getName() : null)
                .totalPromotions(totalPromotions)
                .averageTimeBetweenPromotions(averageTimeBetweenPromotions)
                .totalSalaryIncrease(totalSalaryIncrease)
                .lastPromotionDate(lastPromotionDate)
                .build();
    }

    /**
     * Validate create DTO
     */
    public void validateCreateDTO(PromotionRequestCreateDTO createDTO) {
        if (createDTO == null) {
            throw new IllegalArgumentException("Promotion request data is required");
        }
        
        if (createDTO.getEmployeeId() == null) {
            throw new IllegalArgumentException("Employee ID is required");
        }
        
        if (createDTO.getPromotedToJobPositionId() == null) {
            throw new IllegalArgumentException("Promoted to job position ID is required");
        }
        
        if (createDTO.getRequestTitle() == null || createDTO.getRequestTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Request title is required");
        }
        
        if (createDTO.getProposedEffectiveDate() == null) {
            throw new IllegalArgumentException("Proposed effective date is required");
        }
        
        if (createDTO.getProposedEffectiveDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Proposed effective date cannot be in the past");
        }
    }

    /**
     * Validate review DTO
     */
    public void validateReviewDTO(PromotionRequestReviewDTO reviewDTO) {
        if (reviewDTO == null) {
            throw new IllegalArgumentException("Review data is required");
        }
        
        if (reviewDTO.getAction() == null || reviewDTO.getAction().trim().isEmpty()) {
            throw new IllegalArgumentException("Review action is required");
        }
        
        String action = reviewDTO.getAction().toLowerCase();
        if (!action.equals("approve") && !action.equals("reject")) {
            throw new IllegalArgumentException("Review action must be 'approve' or 'reject'");
        }
        
        if (action.equals("reject") && 
            (reviewDTO.getRejectionReason() == null || reviewDTO.getRejectionReason().trim().isEmpty())) {
            throw new IllegalArgumentException("Rejection reason is required when rejecting a request");
        }
    }
}