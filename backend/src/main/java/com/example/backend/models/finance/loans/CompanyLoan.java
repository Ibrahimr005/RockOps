package com.example.backend.models.finance.loans;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.InterestType;
import com.example.backend.models.finance.loans.enums.LenderType;
import com.example.backend.models.finance.loans.enums.LoanType;
import com.example.backend.models.merchant.Merchant;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "company_loans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "loan_number", nullable = false, unique = true, length = 50)
    private String loanNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "financial_institution_id", nullable = true)
    @JsonBackReference("institution-loans")
    private FinancialInstitution financialInstitution;

    // WITH this:
    @Enumerated(EnumType.STRING)
    @Column(name = "lender_type", nullable = false, length = 30)
    private LenderType lenderType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = true)
    private Merchant merchant;

    // Denormalized for easy display
    @Column(name = "lender_name", length = 255)
    private String lenderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "loan_type", nullable = false, length = 50)
    private LoanType loanType;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "remaining_principal", nullable = false, precision = 15, scale = 2)
    private BigDecimal remainingPrincipal;

    @Column(name = "interest_rate", nullable = false, precision = 6, scale = 3)
    private BigDecimal interestRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_type", nullable = false, length = 20)
    private InterestType interestType;

    @Column(name = "variable_rate_base", length = 100)
    private String variableRateBase;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "EGP";

    @Column(name = "disbursement_date", nullable = false)
    private LocalDate disbursementDate;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "term_months", nullable = false)
    private Integer termMonths;

    @Column(name = "total_installments", nullable = false)
    private Integer totalInstallments;

    // Which balance account received the loan money
    @Column(name = "disbursed_to_account_id", nullable = false)
    private UUID disbursedToAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "disbursed_to_account_type", nullable = false, length = 30)
    private AccountType disbursedToAccountType;

    @Column(name = "disbursed_to_account_name", length = 255)
    private String disbursedToAccountName;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "collateral", columnDefinition = "TEXT")
    private String collateral;

    @Column(name = "guarantor", length = 255)
    private String guarantor;

    @Column(name = "contract_reference", length = 100)
    private String contractReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private CompanyLoanStatus status = CompanyLoanStatus.ACTIVE;

    @Column(name = "total_interest_paid", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalInterestPaid = BigDecimal.ZERO;

    @Column(name = "total_principal_paid", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalPrincipalPaid = BigDecimal.ZERO;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationship with LoanInstallment
    @OneToMany(mappedBy = "companyLoan", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference("loan-installments")
    @Builder.Default
    private List<LoanInstallment> installments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods

    /**
     * Check if loan is fully paid
     */
    public boolean isFullyPaid() {
        return remainingPrincipal.compareTo(BigDecimal.ZERO) <= 0;
    }

    /**
     * Get total amount paid (principal + interest)
     */
    public BigDecimal getTotalAmountPaid() {
        return totalPrincipalPaid.add(totalInterestPaid);
    }

    /**
     * Get payment progress percentage
     */
    public double getPaymentProgressPercentage() {
        if (principalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 100.0;
        }
        return totalPrincipalPaid.divide(principalAmount, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }

    /**
     * Update loan after installment payment
     */
    public void processInstallmentPayment(BigDecimal principalPaid, BigDecimal interestPaid) {
        this.totalPrincipalPaid = this.totalPrincipalPaid.add(principalPaid);
        this.totalInterestPaid = this.totalInterestPaid.add(interestPaid);
        this.remainingPrincipal = this.remainingPrincipal.subtract(principalPaid);

        // Check if loan is fully paid
        if (this.remainingPrincipal.compareTo(BigDecimal.ZERO) <= 0) {
            this.remainingPrincipal = BigDecimal.ZERO;
            this.status = CompanyLoanStatus.COMPLETED;
        }
    }
}