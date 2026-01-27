package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.loans.CompanyLoan;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.InterestType;
import com.example.backend.models.finance.loans.enums.LoanType;
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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyLoanResponseDTO {

    private UUID id;
    private String loanNumber;

    // Institution info
    private UUID financialInstitutionId;
    private String financialInstitutionName;
    private String financialInstitutionNumber;

    // Loan details
    private LoanType loanType;
    private BigDecimal principalAmount;
    private BigDecimal remainingPrincipal;
    private BigDecimal interestRate;
    private InterestType interestType;
    private String variableRateBase;
    private String currency;

    // Dates
    private LocalDate disbursementDate;
    private LocalDate startDate;
    private LocalDate maturityDate;
    private Integer termMonths;
    private Integer totalInstallments;

    // Disbursement info
    private UUID disbursedToAccountId;
    private AccountType disbursedToAccountType;
    private String disbursedToAccountName;

    // Additional info
    private String purpose;
    private String collateral;
    private String guarantor;
    private String contractReference;
    private CompanyLoanStatus status;

    // Payment tracking
    private BigDecimal totalInterestPaid;
    private BigDecimal totalPrincipalPaid;
    private BigDecimal totalAmountPaid;
    private Double paymentProgressPercentage;

    // Installment summary
    private Integer paidInstallments;
    private Integer pendingInstallments;
    private Integer overdueInstallments;
    private BigDecimal nextInstallmentAmount;
    private LocalDate nextInstallmentDueDate;

    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Installments list
    private List<LoanInstallmentResponseDTO> installments;

    public static CompanyLoanResponseDTO fromEntity(CompanyLoan entity) {
        CompanyLoanResponseDTO dto = CompanyLoanResponseDTO.builder()
                .id(entity.getId())
                .loanNumber(entity.getLoanNumber())
                .financialInstitutionId(entity.getFinancialInstitution() != null ? entity.getFinancialInstitution().getId() : null)
                .financialInstitutionName(entity.getFinancialInstitution() != null ? entity.getFinancialInstitution().getName() : null)
                .financialInstitutionNumber(entity.getFinancialInstitution() != null ? entity.getFinancialInstitution().getInstitutionNumber() : null)
                .loanType(entity.getLoanType())
                .principalAmount(entity.getPrincipalAmount())
                .remainingPrincipal(entity.getRemainingPrincipal())
                .interestRate(entity.getInterestRate())
                .interestType(entity.getInterestType())
                .variableRateBase(entity.getVariableRateBase())
                .currency(entity.getCurrency())
                .disbursementDate(entity.getDisbursementDate())
                .startDate(entity.getStartDate())
                .maturityDate(entity.getMaturityDate())
                .termMonths(entity.getTermMonths())
                .totalInstallments(entity.getTotalInstallments())
                .disbursedToAccountId(entity.getDisbursedToAccountId())
                .disbursedToAccountType(entity.getDisbursedToAccountType())
                .disbursedToAccountName(entity.getDisbursedToAccountName())
                .purpose(entity.getPurpose())
                .collateral(entity.getCollateral())
                .guarantor(entity.getGuarantor())
                .contractReference(entity.getContractReference())
                .status(entity.getStatus())
                .totalInterestPaid(entity.getTotalInterestPaid())
                .totalPrincipalPaid(entity.getTotalPrincipalPaid())
                .totalAmountPaid(entity.getTotalAmountPaid())
                .paymentProgressPercentage(entity.getPaymentProgressPercentage())
                .notes(entity.getNotes())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();

        // Convert installments
        if (entity.getInstallments() != null && !entity.getInstallments().isEmpty()) {
            dto.setInstallments(entity.getInstallments().stream()
                    .map(LoanInstallmentResponseDTO::fromEntity)
                    .collect(Collectors.toList()));

            // Calculate installment summary
            long paid = entity.getInstallments().stream()
                    .filter(i -> i.getStatus() == com.example.backend.models.finance.loans.enums.LoanInstallmentStatus.PAID)
                    .count();
            long overdue = entity.getInstallments().stream()
                    .filter(i -> i.isOverdue())
                    .count();

            dto.setPaidInstallments((int) paid);
            dto.setOverdueInstallments((int) overdue);
            dto.setPendingInstallments(entity.getTotalInstallments() - (int) paid);

            // Find next installment
            entity.getInstallments().stream()
                    .filter(i -> i.getStatus() != com.example.backend.models.finance.loans.enums.LoanInstallmentStatus.PAID)
                    .min((a, b) -> a.getDueDate().compareTo(b.getDueDate()))
                    .ifPresent(nextInstallment -> {
                        dto.setNextInstallmentAmount(nextInstallment.getTotalAmount());
                        dto.setNextInstallmentDueDate(nextInstallment.getDueDate());
                    });
        }

        return dto;
    }
}