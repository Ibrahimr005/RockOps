package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.loans.LoanInstallment;
import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
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
public class LoanInstallmentResponseDTO {

    private UUID id;
    private UUID companyLoanId;
    private String loanNumber;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private BigDecimal principalAmount;
    private BigDecimal interestAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private UUID paymentRequestId;
    private String paymentRequestNumber;
    private LoanInstallmentStatus status;
    private LocalDate paidDate;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Computed fields
    private Boolean isOverdue;
    private Long daysUntilDue;
    private Long daysOverdue;

    public static LoanInstallmentResponseDTO fromEntity(LoanInstallment entity) {
        LoanInstallmentResponseDTO dto = LoanInstallmentResponseDTO.builder()
                .id(entity.getId())
                .companyLoanId(entity.getCompanyLoan() != null ? entity.getCompanyLoan().getId() : null)
                .loanNumber(entity.getCompanyLoan() != null ? entity.getCompanyLoan().getLoanNumber() : null)
                .installmentNumber(entity.getInstallmentNumber())
                .dueDate(entity.getDueDate())
                .principalAmount(entity.getPrincipalAmount())
                .interestAmount(entity.getInterestAmount())
                .totalAmount(entity.getTotalAmount())
                .paidAmount(entity.getPaidAmount())
                .remainingAmount(entity.getRemainingAmount())
                .paymentRequestId(entity.getPaymentRequestId())
                .status(entity.getStatus())
                .paidDate(entity.getPaidDate())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .isOverdue(entity.isOverdue())
                .build();

        // Calculate days until due or days overdue
        if (entity.getDueDate() != null) {
            long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), entity.getDueDate());
            if (daysDiff >= 0) {
                dto.setDaysUntilDue(daysDiff);
                dto.setDaysOverdue(0L);
            } else {
                dto.setDaysUntilDue(0L);
                dto.setDaysOverdue(Math.abs(daysDiff));
            }
        }

        return dto;
    }
}