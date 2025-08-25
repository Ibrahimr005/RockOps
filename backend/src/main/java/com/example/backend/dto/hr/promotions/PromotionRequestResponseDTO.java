package com.example.backend.dto.hr.promotions;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for promotion request responses
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionRequestResponseDTO {
    private UUID id;
    private String requestTitle;
    private String justification;
    private LocalDate proposedEffectiveDate;
    private LocalDate actualEffectiveDate;
    private String status;
    private String priority;

    // Employee information
    private UUID employeeId;
    private String employeeName;
    private String employeePhotoUrl;

    // Position information
    private UUID currentJobPositionId;
    private String currentPositionName;
    private String currentDepartmentName;
    private UUID promotedToJobPositionId;
    private String promotedToPositionName;
    private String promotedToDepartmentName;
    private Boolean involvesDepartmentChange;

    // Salary information
    private BigDecimal currentSalary;
    private BigDecimal proposedSalary;
    private BigDecimal approvedSalary;
    private BigDecimal salaryIncrease;
    private BigDecimal salaryIncreasePercentage;

    // Workflow information
    private String requestedBy;
    private String reviewedBy;
    private String approvedBy;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime implementedAt;

    // Comments and feedback
    private String hrComments;
    private String managerComments;
    private String rejectionReason;

    // Performance and qualifications
    private String performanceRating;
    private Integer yearsInCurrentPosition;
    private String educationalQualifications;
    private String additionalCertifications;

    // Training and development
    private Boolean requiresAdditionalTraining;
    private String trainingPlan;

    // Timing information
    private Long daysToEffectiveDate;
    private Boolean isOverdue;
    private Boolean canBeImplemented;

    // Audit timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

