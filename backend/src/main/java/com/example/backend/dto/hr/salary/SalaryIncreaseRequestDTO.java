package com.example.backend.dto.hr.salary;

import com.example.backend.models.hr.SalaryIncreaseRequest;
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
public class SalaryIncreaseRequestDTO {

    private UUID id;
    private String requestNumber;
    private String requestType;
    private String status;
    private String statusDisplayName;

    // Employee info
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;

    // Position info
    private UUID jobPositionId;
    private String positionName;
    private String departmentName;

    // Salary details
    private BigDecimal currentSalary;
    private BigDecimal requestedSalary;
    private BigDecimal increaseAmount;
    private BigDecimal increasePercentage;
    private LocalDate effectiveDate;
    private String reason;

    // HR decision
    private String hrApprovedBy;
    private LocalDateTime hrDecisionDate;
    private String hrComments;
    private String hrRejectionReason;

    // Finance decision
    private String financeApprovedBy;
    private LocalDateTime financeDecisionDate;
    private String financeComments;
    private String financeRejectionReason;

    // Application
    private LocalDateTime appliedAt;
    private String appliedBy;

    // Audit
    private String createdBy;
    private LocalDateTime createdAt;

    public static SalaryIncreaseRequestDTO fromEntity(SalaryIncreaseRequest entity) {
        if (entity == null) return null;

        SalaryIncreaseRequestDTOBuilder builder = SalaryIncreaseRequestDTO.builder()
                .id(entity.getId())
                .requestNumber(entity.getRequestNumber())
                .requestType(entity.getRequestType() != null ? entity.getRequestType().name() : null)
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .statusDisplayName(getStatusDisplayName(entity.getStatus()))
                .currentSalary(entity.getCurrentSalary())
                .requestedSalary(entity.getRequestedSalary())
                .increaseAmount(entity.getIncreaseAmount())
                .increasePercentage(entity.getIncreasePercentage())
                .effectiveDate(entity.getEffectiveDate())
                .reason(entity.getReason())
                .hrApprovedBy(entity.getHrApprovedBy())
                .hrDecisionDate(entity.getHrDecisionDate())
                .hrComments(entity.getHrComments())
                .hrRejectionReason(entity.getHrRejectionReason())
                .financeApprovedBy(entity.getFinanceApprovedBy())
                .financeDecisionDate(entity.getFinanceDecisionDate())
                .financeComments(entity.getFinanceComments())
                .financeRejectionReason(entity.getFinanceRejectionReason())
                .appliedAt(entity.getAppliedAt())
                .appliedBy(entity.getAppliedBy())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt());

        if (entity.getEmployee() != null) {
            builder.employeeId(entity.getEmployee().getId())
                    .employeeName(entity.getEmployee().getFullName())
                    .employeeNumber(entity.getEmployee().getEmployeeNumber());
        }

        if (entity.getJobPosition() != null) {
            builder.jobPositionId(entity.getJobPosition().getId())
                    .positionName(entity.getJobPosition().getPositionName());
            if (entity.getJobPosition().getDepartment() != null) {
                builder.departmentName(entity.getJobPosition().getDepartment().getName());
            }
        }

        return builder.build();
    }

    private static String getStatusDisplayName(SalaryIncreaseRequest.Status status) {
        if (status == null) return null;
        return switch (status) {
            case PENDING_HR -> "Pending HR Approval";
            case PENDING_FINANCE -> "Pending Finance Approval";
            case APPROVED -> "Approved";
            case APPLIED -> "Applied";
            case REJECTED -> "Rejected";
        };
    }
}
