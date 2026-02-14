package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.loans.enums.InterestType;
import com.example.backend.models.finance.loans.enums.LenderType;
import com.example.backend.models.finance.loans.enums.LoanType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCompanyLoanRequestDTO {

//    @NotNull(message = "Financial institution is required")
//    private UUID financialInstitutionId;

    // ADD these:
    @NotNull(message = "Lender type is required")
    private LenderType lenderType;

    private UUID financialInstitutionId;  // required when lenderType = FINANCIAL_INSTITUTION

    private UUID merchantId;

    @NotNull(message = "Loan type is required")
    private LoanType loanType;

    @NotNull(message = "Principal amount is required")
    @DecimalMin(value = "0.01", message = "Principal amount must be greater than 0")
    private BigDecimal principalAmount;

    @NotNull(message = "Interest rate is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Interest rate must be non-negative")
    private BigDecimal interestRate;

    @NotNull(message = "Interest type is required")
    private InterestType interestType;

    private String variableRateBase;

    private String currency;

    @NotNull(message = "Disbursement date is required")
    private LocalDate disbursementDate;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "Maturity date is required")
    private LocalDate maturityDate;

    @NotNull(message = "Term months is required")
    private Integer termMonths;

    @NotNull(message = "Disbursed to account is required")
    private UUID disbursedToAccountId;

    @NotNull(message = "Disbursed to account type is required")
    private AccountType disbursedToAccountType;

    private String purpose;
    private String collateral;
    private String guarantor;
    private String contractReference;
    private String notes;

    // Installments - manually defined payment plan
    @NotEmpty(message = "At least one installment is required")
    @Valid
    private List<LoanInstallmentRequestDTO> installments;
}