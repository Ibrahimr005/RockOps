package com.example.backend.dto.hr.demotion;

import com.example.backend.models.hr.DemotionRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemotionRequestDTO {

    private UUID id;
    private String requestNumber;

    // Employee info
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;

    // Position change
    private UUID currentPositionId;
    private String currentPositionName;
    private UUID newPositionId;
    private String newPositionName;

    // Department info
    private String currentDepartmentName;
    private String newDepartmentName;

    // Grade change
    private String currentGrade;
    private String newGrade;

    // Salary change
    private BigDecimal currentSalary;
    private BigDecimal newSalary;
    private BigDecimal salaryReductionAmount;
    private BigDecimal salaryReductionPercentage;

    // Request details
    private LocalDate effectiveDate;
    private String reason;
    private String status;
    private String approvals;

    // Requester
    private String requestedBy;
    private LocalDateTime requestedAt;

    // Dept Head decision
    private String deptHeadApprovedBy;
    private LocalDateTime deptHeadDecisionDate;
    private String deptHeadComments;
    private String deptHeadRejectionReason;

    // HR decision
    private String hrApprovedBy;
    private LocalDateTime hrDecisionDate;
    private String hrComments;
    private String hrRejectionReason;

    // Applied
    private LocalDateTime appliedAt;
    private String appliedBy;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DemotionRequestDTO fromEntity(DemotionRequest entity) {
        return DemotionRequestDTO.builder()
                .id(entity.getId())
                .requestNumber(entity.getRequestNumber())
                .employeeId(entity.getEmployee() != null ? entity.getEmployee().getId() : null)
                .employeeName(entity.getEmployee() != null ? entity.getEmployee().getFullName() : null)
                .employeeNumber(entity.getEmployee() != null ? entity.getEmployee().getEmployeeNumber() : null)
                .currentPositionId(entity.getCurrentPosition() != null ? entity.getCurrentPosition().getId() : null)
                .currentPositionName(entity.getCurrentPosition() != null ? entity.getCurrentPosition().getPositionName() : null)
                .newPositionId(entity.getNewPosition() != null ? entity.getNewPosition().getId() : null)
                .newPositionName(entity.getNewPosition() != null ? entity.getNewPosition().getPositionName() : null)
                .currentDepartmentName(entity.getCurrentPosition() != null && entity.getCurrentPosition().getDepartment() != null
                        ? entity.getCurrentPosition().getDepartment().getName() : null)
                .newDepartmentName(entity.getNewPosition() != null && entity.getNewPosition().getDepartment() != null
                        ? entity.getNewPosition().getDepartment().getName() : null)
                .currentGrade(entity.getCurrentGrade())
                .newGrade(entity.getNewGrade())
                .currentSalary(entity.getCurrentSalary())
                .newSalary(entity.getNewSalary())
                .salaryReductionAmount(entity.getSalaryReductionAmount())
                .salaryReductionPercentage(entity.getSalaryReductionPercentage())
                .effectiveDate(entity.getEffectiveDate())
                .reason(entity.getReason())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .approvals(entity.getApprovals())
                .requestedBy(entity.getRequestedBy())
                .requestedAt(entity.getRequestedAt())
                .deptHeadApprovedBy(entity.getDeptHeadApprovedBy())
                .deptHeadDecisionDate(entity.getDeptHeadDecisionDate())
                .deptHeadComments(entity.getDeptHeadComments())
                .deptHeadRejectionReason(entity.getDeptHeadRejectionReason())
                .hrApprovedBy(entity.getHrApprovedBy())
                .hrDecisionDate(entity.getHrDecisionDate())
                .hrComments(entity.getHrComments())
                .hrRejectionReason(entity.getHrRejectionReason())
                .appliedAt(entity.getAppliedAt())
                .appliedBy(entity.getAppliedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
