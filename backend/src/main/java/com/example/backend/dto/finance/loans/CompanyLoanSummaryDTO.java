package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.loans.CompanyLoan;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
import com.example.backend.models.finance.loans.enums.LoanType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyLoanSummaryDTO {

    private UUID id;
    private String loanNumber;
    private String financialInstitutionName;
    private LoanType loanType;
    private BigDecimal principalAmount;
    private BigDecimal remainingPrincipal;
    private BigDecimal interestRate;
    private String currency;
    private LocalDate maturityDate;
    private CompanyLoanStatus status;
    private Double paymentProgressPercentage;
    private Integer totalInstallments;
    private Integer paidInstallments;
    private Integer overdueInstallments;
    private LocalDate nextInstallmentDueDate;
    private BigDecimal nextInstallmentAmount;

    public static CompanyLoanSummaryDTO fromEntity(CompanyLoan entity) {
        CompanyLoanSummaryDTO dto = CompanyLoanSummaryDTO.builder()
                .id(entity.getId())
                .loanNumber(entity.getLoanNumber())
                .financialInstitutionName(entity.getFinancialInstitution() != null ? entity.getFinancialInstitution().getName() : null)
                .loanType(entity.getLoanType())
                .principalAmount(entity.getPrincipalAmount())
                .remainingPrincipal(entity.getRemainingPrincipal())
                .interestRate(entity.getInterestRate())
                .currency(entity.getCurrency())
                .maturityDate(entity.getMaturityDate())
                .status(entity.getStatus())
                .paymentProgressPercentage(entity.getPaymentProgressPercentage())
                .totalInstallments(entity.getTotalInstallments())
                .build();

        if (entity.getInstallments() != null) {
            long paid = entity.getInstallments().stream()
                    .filter(i -> i.getStatus() == LoanInstallmentStatus.PAID)
                    .count();
            long overdue = entity.getInstallments().stream()
                    .filter(i -> i.isOverdue())
                    .count();

            dto.setPaidInstallments((int) paid);
            dto.setOverdueInstallments((int) overdue);

            entity.getInstallments().stream()
                    .filter(i -> i.getStatus() != LoanInstallmentStatus.PAID)
                    .min((a, b) -> a.getDueDate().compareTo(b.getDueDate()))
                    .ifPresent(next -> {
                        dto.setNextInstallmentDueDate(next.getDueDate());
                        dto.setNextInstallmentAmount(next.getTotalAmount());
                    });
        }

        return dto;
    }
}