package com.example.backend.dto.payroll;

import com.example.backend.models.payroll.LoanResolutionRequest;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanResolutionRequestDTO {

    private UUID id;

    @NotNull(message = "Loan ID is required")
    private UUID loanId;
    private String loanNumber;
    private BigDecimal loanAmount;

    private UUID employeeId;
    private String employeeName;
    private String employeeNumber;

    @NotNull(message = "Reason is required")
    @Size(min = 1, max = 1000, message = "Reason must be between 1 and 1000 characters")
    private String reason;

    private BigDecimal remainingBalance;
    private LoanResolutionRequest.ResolutionStatus status;
    private String statusDisplayName;

    // HR decision
    private String hrApprovedBy;
    private LocalDateTime hrDecisionDate;
    private String hrRejectionReason;

    // Finance decision
    private String financeApprovedBy;
    private LocalDateTime financeDecisionDate;
    private String financeRejectionReason;

    // Audit
    private LocalDateTime createdAt;
    private String createdBy;

    public static LoanResolutionRequestDTO fromEntity(LoanResolutionRequest entity) {
        if (entity == null) return null;

        LoanResolutionRequestDTOBuilder builder = LoanResolutionRequestDTO.builder()
            .id(entity.getId())
            .reason(entity.getReason())
            .remainingBalance(entity.getRemainingBalance())
            .status(entity.getStatus())
            .statusDisplayName(getStatusDisplayName(entity.getStatus()))
            .hrApprovedBy(entity.getHrApprovedBy())
            .hrDecisionDate(entity.getHrDecisionDate())
            .hrRejectionReason(entity.getHrRejectionReason())
            .financeApprovedBy(entity.getFinanceApprovedBy())
            .financeDecisionDate(entity.getFinanceDecisionDate())
            .financeRejectionReason(entity.getFinanceRejectionReason())
            .createdAt(entity.getCreatedAt())
            .createdBy(entity.getCreatedBy());

        if (entity.getLoan() != null) {
            builder.loanId(entity.getLoan().getId())
                .loanNumber(entity.getLoan().getLoanNumber())
                .loanAmount(entity.getLoan().getLoanAmount());
        }

        if (entity.getEmployee() != null) {
            builder.employeeId(entity.getEmployee().getId())
                .employeeName(entity.getEmployee().getFirstName() + " " + entity.getEmployee().getLastName())
                .employeeNumber(entity.getEmployee().getEmployeeNumber());
        }

        return builder.build();
    }

    private static String getStatusDisplayName(LoanResolutionRequest.ResolutionStatus status) {
        if (status == null) return null;
        return switch (status) {
            case PENDING_HR -> "Pending HR Approval";
            case PENDING_FINANCE -> "Pending Finance Approval";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
        };
    }
}
