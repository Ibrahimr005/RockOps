package com.example.backend.dto.payroll;

import com.example.backend.models.payroll.Loan;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Loan entity with Finance integration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanDTO {

    private UUID id;

    // Human-readable loan number
    private String loanNumber;

    // Employee info
    @NotNull(message = "Employee ID is required")
    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;

    // Loan details
    @NotNull(message = "Loan amount is required")
    @DecimalMin(value = "0.01", message = "Loan amount must be greater than 0")
    private BigDecimal loanAmount;

    private BigDecimal remainingBalance;

    @NotNull(message = "Installment months is required")
    @Min(value = 1, message = "Installment months must be at least 1")
    private Integer installmentMonths;

    private BigDecimal monthlyInstallment;

    @DecimalMin(value = "0", message = "Interest rate must be non-negative")
    @DecimalMax(value = "100", message = "Interest rate must be less than 100")
    private BigDecimal interestRate;

    // Dates
    @NotNull(message = "Loan date is required")
    private LocalDate loanDate;

    private LocalDate disbursementDate;

    private LocalDate firstPaymentDate;

    private LocalDate lastPaymentDate;

    private LocalDate completionDate;

    // Status
    private Loan.LoanStatus status;
    private String statusDisplayName;

    // Purpose and notes
    @Size(max = 500, message = "Purpose must be less than 500 characters")
    private String purpose;

    @Size(max = 1000, message = "Notes must be less than 1000 characters")
    private String notes;

    // HR Approval
    private String hrApprovedBy;
    private LocalDateTime hrApprovedAt;
    private String hrRejectedBy;
    private LocalDateTime hrRejectedAt;
    private String hrRejectionReason;

    // Finance integration
    private UUID financeRequestId;
    private String financeRequestNumber;
    private Loan.FinanceApprovalStatus financeStatus;
    private String financeStatusDisplayName;
    private String financeApprovedBy;
    private LocalDateTime financeApprovedAt;
    private String financeRejectedBy;
    private LocalDateTime financeRejectedAt;
    private String financeRejectionReason;
    private String financeNotes;
    private Integer financeApprovedInstallments;
    private BigDecimal financeApprovedAmount;

    // Payment source
    private String paymentSourceType;
    private UUID paymentSourceId;
    private String paymentSourceName;
    private LocalDateTime disbursedAt;
    private String disbursedBy;

    // Calculated fields
    private Integer paymentsRemaining;
    private Integer paymentsMade;
    private BigDecimal completionPercentage;
    private BigDecimal totalInterest;
    private BigDecimal totalPaymentAmount;
    private BigDecimal effectiveMonthlyInstallment;
    private Integer effectiveInstallmentMonths;

    // Audit fields
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    /**
     * Convert entity to DTO
     */
    public static LoanDTO fromEntity(Loan entity) {
        if (entity == null) {
            return null;
        }

        LoanDTOBuilder builder = LoanDTO.builder()
            .id(entity.getId())
            .loanNumber(entity.getLoanNumber())
            .loanAmount(entity.getLoanAmount())
            .remainingBalance(entity.getRemainingBalance())
            .installmentMonths(entity.getInstallmentMonths())
            .monthlyInstallment(entity.getMonthlyInstallment())
            .interestRate(entity.getInterestRate())
            .loanDate(entity.getLoanDate())
            .disbursementDate(entity.getDisbursementDate())
            .firstPaymentDate(entity.getFirstPaymentDate())
            .lastPaymentDate(entity.getLastPaymentDate())
            .completionDate(entity.getCompletionDate())
            .status(entity.getStatus())
            .statusDisplayName(getStatusDisplayName(entity.getStatus()))
            .purpose(entity.getPurpose())
            .notes(entity.getNotes())
            // HR Approval
            .hrApprovedBy(entity.getHrApprovedBy())
            .hrApprovedAt(entity.getHrApprovedAt())
            .hrRejectedBy(entity.getHrRejectedBy())
            .hrRejectedAt(entity.getHrRejectedAt())
            .hrRejectionReason(entity.getHrRejectionReason())
            // Finance integration
            .financeRequestId(entity.getFinanceRequestId())
            .financeRequestNumber(entity.getFinanceRequestNumber())
            .financeStatus(entity.getFinanceStatus())
            .financeStatusDisplayName(entity.getFinanceStatus() != null
                ? entity.getFinanceStatus().name().replace("_", " ") : null)
            .financeApprovedBy(entity.getFinanceApprovedBy())
            .financeApprovedAt(entity.getFinanceApprovedAt())
            .financeRejectedBy(entity.getFinanceRejectedBy())
            .financeRejectedAt(entity.getFinanceRejectedAt())
            .financeRejectionReason(entity.getFinanceRejectionReason())
            .financeNotes(entity.getFinanceNotes())
            .financeApprovedInstallments(entity.getFinanceApprovedInstallments())
            .financeApprovedAmount(entity.getFinanceApprovedAmount())
            // Payment source
            .paymentSourceType(entity.getPaymentSourceType())
            .paymentSourceId(entity.getPaymentSourceId())
            .paymentSourceName(entity.getPaymentSourceName())
            .disbursedAt(entity.getDisbursedAt())
            .disbursedBy(entity.getDisbursedBy())
            // Calculated fields
            .paymentsRemaining(entity.getPaymentsRemaining())
            .paymentsMade(entity.getPaymentsMade())
            .completionPercentage(entity.getCompletionPercentage())
            .totalInterest(entity.getTotalInterest())
            .totalPaymentAmount(entity.getTotalPaymentAmount())
            .effectiveMonthlyInstallment(entity.getEffectiveMonthlyInstallment())
            .effectiveInstallmentMonths(entity.getEffectiveInstallmentMonths())
            // Audit
            .createdBy(entity.getCreatedBy())
            .createdAt(entity.getCreatedAt())
            .updatedBy(entity.getUpdatedBy())
            .updatedAt(entity.getUpdatedAt());

        // Employee info
        if (entity.getEmployee() != null) {
            builder.employeeId(entity.getEmployee().getId())
                .employeeName(entity.getEmployee().getFirstName() + " " + entity.getEmployee().getLastName())
                .employeeNumber(entity.getEmployee().getEmployeeNumber());
        }

        return builder.build();
    }

    private static String getStatusDisplayName(Loan.LoanStatus status) {
        if (status == null) return null;
        return switch (status) {
            case DRAFT -> "Draft";
            case PENDING_HR_APPROVAL -> "Pending HR Approval";
            case HR_APPROVED -> "HR Approved";
            case HR_REJECTED -> "HR Rejected";
            case PENDING_FINANCE -> "Pending Finance";
            case FINANCE_APPROVED -> "Finance Approved";
            case FINANCE_REJECTED -> "Finance Rejected";
            case DISBURSED -> "Disbursed";
            case ACTIVE -> "Active";
            case COMPLETED -> "Completed";
            case CANCELLED -> "Cancelled";
            case PENDING -> "Pending";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
        };
    }
}
