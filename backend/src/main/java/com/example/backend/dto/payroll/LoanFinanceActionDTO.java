package com.example.backend.dto.payroll;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTOs for Finance actions on loan requests
 */
public class LoanFinanceActionDTO {

    /**
     * Request to approve a loan with deduction plan
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproveRequest {
        @NotNull(message = "Request ID is required")
        private UUID requestId;

        @NotNull(message = "Number of installments is required")
        @Min(value = 1, message = "Installments must be at least 1")
        @Max(value = 60, message = "Installments cannot exceed 60 months")
        private Integer installments;

        @NotNull(message = "Monthly deduction amount is required")
        @DecimalMin(value = "0.01", message = "Monthly amount must be greater than 0")
        private BigDecimal monthlyAmount;

        @NotNull(message = "First deduction date is required")
        private LocalDate firstDeductionDate;

        private String notes;
    }

    /**
     * Request to reject a loan
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectRequest {
        @NotNull(message = "Request ID is required")
        private UUID requestId;

        @NotBlank(message = "Rejection reason is required")
        @Size(max = 1000, message = "Rejection reason must be less than 1000 characters")
        private String reason;
    }

    /**
     * Request to request modification
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModificationRequest {
        @NotNull(message = "Request ID is required")
        private UUID requestId;

        @NotBlank(message = "Modification reason is required")
        @Size(max = 1000, message = "Modification reason must be less than 1000 characters")
        private String reason;

        private Integer suggestedInstallments;
        private BigDecimal suggestedMonthlyAmount;
    }

    /**
     * Request to set disbursement source
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SetDisbursementSourceRequest {
        @NotNull(message = "Request ID is required")
        private UUID requestId;

        @NotBlank(message = "Payment source type is required")
        private String paymentSourceType;

        @NotNull(message = "Payment source ID is required")
        private UUID paymentSourceId;

        private String paymentSourceName;
    }

    /**
     * Request to confirm disbursement
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DisbursementRequest {
        @NotNull(message = "Request ID is required")
        private UUID requestId;

        private String disbursementReference;

        private String notes;
    }

    /**
     * Dashboard summary for Finance
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardSummary {
        private long pendingCount;
        private long underReviewCount;
        private long approvedCount;
        private long pendingDisbursementCount;
        private BigDecimal totalPendingAmount;
        private BigDecimal totalApprovedAmount;
        private BigDecimal totalDisbursedThisMonth;
    }
}
