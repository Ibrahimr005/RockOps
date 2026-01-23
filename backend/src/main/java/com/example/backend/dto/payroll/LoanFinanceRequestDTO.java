package com.example.backend.dto.payroll;

import com.example.backend.models.payroll.LoanFinanceRequest;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * DTO for LoanFinanceRequest entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanFinanceRequestDTO {

    private UUID id;

    private String requestNumber;

    // Loan reference
    private UUID loanId;
    private String loanNumber;

    // Employee info
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;
    private String departmentName;
    private String jobPositionName;
    private BigDecimal employeeMonthlySalary;

    // Loan details
    private BigDecimal loanAmount;
    private Integer requestedInstallments;
    private BigDecimal requestedMonthlyAmount;
    private BigDecimal interestRate;
    private String loanPurpose;

    // Status
    private LoanFinanceRequest.RequestStatus status;
    private String statusDisplayName;

    // Finance decision
    private Integer approvedInstallments;
    private BigDecimal approvedMonthlyAmount;
    private LocalDate firstDeductionDate;
    private LocalDate deductionStartPayrollDate;
    private String financeNotes;

    // Payment source
    private String paymentSourceType;
    private UUID paymentSourceId;
    private String paymentSourceName;

    // Requester info
    private UUID requestedByUserId;
    private String requestedByUserName;
    private LocalDateTime requestedAt;

    // Reviewer info
    private UUID reviewedByUserId;
    private String reviewedByUserName;
    private LocalDateTime reviewedAt;

    // Approval info
    private UUID approvedByUserId;
    private String approvedByUserName;
    private LocalDateTime approvedAt;
    private String approvalNotes;

    // Rejection info
    private UUID rejectedByUserId;
    private String rejectedByUserName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    // Disbursement info
    private LocalDateTime disbursedAt;
    private UUID disbursedByUserId;
    private String disbursedByUserName;
    private String disbursementReference;

    // Calculated fields
    private BigDecimal affordabilityRatio;

    // Status history
    private List<StatusHistoryDTO> statusHistory;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to DTO
     */
    public static LoanFinanceRequestDTO fromEntity(LoanFinanceRequest entity) {
        if (entity == null) {
            return null;
        }

        LoanFinanceRequestDTOBuilder builder = LoanFinanceRequestDTO.builder()
            .id(entity.getId())
            .requestNumber(entity.getRequestNumber())
            .loanNumber(entity.getLoanNumber())
            .employeeId(entity.getEmployeeId())
            .employeeName(entity.getEmployeeName())
            .employeeNumber(entity.getEmployeeNumber())
            .departmentName(entity.getDepartmentName())
            .jobPositionName(entity.getJobPositionName())
            .employeeMonthlySalary(entity.getEmployeeMonthlySalary())
            .loanAmount(entity.getLoanAmount())
            .requestedInstallments(entity.getRequestedInstallments())
            .requestedMonthlyAmount(entity.getRequestedMonthlyAmount())
            .interestRate(entity.getInterestRate())
            .loanPurpose(entity.getLoanPurpose())
            .status(entity.getStatus())
            .statusDisplayName(entity.getStatus() != null ? entity.getStatus().getDisplayName() : null)
            .approvedInstallments(entity.getApprovedInstallments())
            .approvedMonthlyAmount(entity.getApprovedMonthlyAmount())
            .firstDeductionDate(entity.getFirstDeductionDate())
            .deductionStartPayrollDate(entity.getDeductionStartPayrollDate())
            .financeNotes(entity.getFinanceNotes())
            .paymentSourceType(entity.getPaymentSourceType())
            .paymentSourceId(entity.getPaymentSourceId())
            .paymentSourceName(entity.getPaymentSourceName())
            .requestedByUserId(entity.getRequestedByUserId())
            .requestedByUserName(entity.getRequestedByUserName())
            .requestedAt(entity.getRequestedAt())
            .reviewedByUserId(entity.getReviewedByUserId())
            .reviewedByUserName(entity.getReviewedByUserName())
            .reviewedAt(entity.getReviewedAt())
            .approvedByUserId(entity.getApprovedByUserId())
            .approvedByUserName(entity.getApprovedByUserName())
            .approvedAt(entity.getApprovedAt())
            .approvalNotes(entity.getApprovalNotes())
            .rejectedByUserId(entity.getRejectedByUserId())
            .rejectedByUserName(entity.getRejectedByUserName())
            .rejectedAt(entity.getRejectedAt())
            .rejectionReason(entity.getRejectionReason())
            .disbursedAt(entity.getDisbursedAt())
            .disbursedByUserId(entity.getDisbursedByUserId())
            .disbursedByUserName(entity.getDisbursedByUserName())
            .disbursementReference(entity.getDisbursementReference())
            .affordabilityRatio(entity.calculateAffordabilityRatio())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt());

        // Loan reference
        if (entity.getLoan() != null) {
            builder.loanId(entity.getLoan().getId());
        }

        // Status history
        if (entity.getStatusHistory() != null && !entity.getStatusHistory().isEmpty()) {
            builder.statusHistory(entity.getStatusHistory().stream()
                .map(StatusHistoryDTO::fromEntity)
                .collect(Collectors.toList()));
        }

        return builder.build();
    }

    /**
     * Status History DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistoryDTO {
        private UUID id;
        private LoanFinanceRequest.RequestStatus status;
        private String statusDisplayName;
        private UUID changedByUserId;
        private String changedByUserName;
        private LocalDateTime changedAt;
        private String notes;

        public static StatusHistoryDTO fromEntity(com.example.backend.models.payroll.LoanFinanceRequestStatusHistory entity) {
            if (entity == null) {
                return null;
            }
            return StatusHistoryDTO.builder()
                .id(entity.getId())
                .status(entity.getStatus())
                .statusDisplayName(entity.getStatus() != null ? entity.getStatus().getDisplayName() : null)
                .changedByUserId(entity.getChangedByUserId())
                .changedByUserName(entity.getChangedByUserName())
                .changedAt(entity.getChangedAt())
                .notes(entity.getNotes())
                .build();
        }
    }
}
