package com.example.backend.models.payroll;

import com.example.backend.models.hr.Employee;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Loan Entity - Employee loan management
 * Tracks loans given to employees with repayment schedules
 */
@Entity
@Table(name = "loans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Employee relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonManagedReference("employee-loans")
    private Employee employee;

    // Loan details
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal remainingBalance;

    @Column(nullable = false)
    private Integer installmentMonths;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyInstallment;

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate; // Annual interest rate percentage

    // Dates
    @Column(nullable = false)
    private LocalDate loanDate;

    @Column(nullable = false)
    private LocalDate disbursementDate; // When the loan was actually given to employee

    @Column(nullable = false)
    private LocalDate firstPaymentDate;

    private LocalDate lastPaymentDate;

    private LocalDate completionDate;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    // Loan purpose and notes
    @Column(length = 500)
    private String purpose;

    @Column(length = 1000)
    private String notes;

    // Approval tracking
    private String approvedBy;
    private LocalDateTime approvedAt;

    private String rejectedBy;
    private LocalDateTime rejectedAt;
    private String rejectionReason;

    // Audit fields
    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private String updatedBy;
    private LocalDateTime updatedAt;

    // Loan Status Enum
    public enum LoanStatus {
        PENDING,      // Loan application pending approval
        APPROVED,     // Loan approved and active
        ACTIVE,       // Loan is being repaid
        COMPLETED,    // Loan fully paid
        REJECTED,     // Loan application rejected
        CANCELLED     // Loan cancelled
    }

    // ===================================================
    // BUSINESS LOGIC METHODS
    // ===================================================

    /**
     * Calculate monthly installment amount
     * @param loanAmount Total loan amount
     * @param installmentMonths Number of months
     * @param interestRate Annual interest rate (e.g., 5.0 for 5%)
     * @return Monthly installment amount
     */
    public static BigDecimal calculateMonthlyInstallment(
            BigDecimal loanAmount,
            Integer installmentMonths,
            BigDecimal interestRate) {

        if (installmentMonths == null || installmentMonths <= 0) {
            throw new IllegalArgumentException("Installment months must be positive");
        }

        // If no interest or zero interest, simple division
        if (interestRate == null || interestRate.compareTo(BigDecimal.ZERO) == 0) {
            return loanAmount.divide(
                    BigDecimal.valueOf(installmentMonths),
                    2,
                    BigDecimal.ROUND_HALF_UP
            );
        }

        // Calculate monthly interest rate (annual / 12 / 100)
        BigDecimal monthlyRate = interestRate
                .divide(BigDecimal.valueOf(12), 6, BigDecimal.ROUND_HALF_UP)
                .divide(BigDecimal.valueOf(100), 6, BigDecimal.ROUND_HALF_UP);

        // Calculate using loan amortization formula:
        // M = P * [r(1+r)^n] / [(1+r)^n - 1]
        BigDecimal onePlusRate = BigDecimal.ONE.add(monthlyRate);
        BigDecimal power = onePlusRate.pow(installmentMonths);

        BigDecimal numerator = loanAmount.multiply(monthlyRate).multiply(power);
        BigDecimal denominator = power.subtract(BigDecimal.ONE);

        return numerator.divide(denominator, 2, BigDecimal.ROUND_HALF_UP);
    }

    /**
     * Record a payment on this loan
     * @param paymentAmount Amount paid
     */
    public void recordPayment(BigDecimal paymentAmount) {
        if (this.remainingBalance == null) {
            this.remainingBalance = this.loanAmount;
        }

        this.remainingBalance = this.remainingBalance.subtract(paymentAmount);
        this.lastPaymentDate = LocalDate.now();

        // If fully paid, mark as completed
        if (this.remainingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            this.remainingBalance = BigDecimal.ZERO;
            this.status = LoanStatus.COMPLETED;
            this.completionDate = LocalDate.now();
        }
    }

    /**
     * Get repayment period (alias for installmentMonths)
     * @return Number of installment months
     */
    public Integer getRepaymentPeriod() {
        return this.installmentMonths;
    }

    /**
     * Check if loan is currently active (being repaid)
     * @return true if active
     */
    public boolean isActive() {
        return status == LoanStatus.ACTIVE || status == LoanStatus.APPROVED;
    }

    /**
     * Check if loan is completed
     * @return true if completed
     */
    public boolean isCompleted() {
        return status == LoanStatus.COMPLETED;
    }

    /**
     * Get number of payments remaining
     * @return Number of installments remaining
     */
    public Integer getPaymentsRemaining() {
        if (monthlyInstallment == null || monthlyInstallment.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }

        if (remainingBalance == null) {
            return installmentMonths;
        }

        return remainingBalance
                .divide(monthlyInstallment, 0, BigDecimal.ROUND_UP)
                .intValue();
    }

    /**
     * Get number of payments made
     * @return Number of installments paid
     */
    public Integer getPaymentsMade() {
        return installmentMonths - getPaymentsRemaining();
    }

    /**
     * Get loan completion percentage
     * @return Percentage of loan paid (0-100)
     */
    public BigDecimal getCompletionPercentage() {
        if (loanAmount == null || loanAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal amountPaid = loanAmount.subtract(
                remainingBalance != null ? remainingBalance : loanAmount
        );

        return amountPaid
                .multiply(BigDecimal.valueOf(100))
                .divide(loanAmount, 2, BigDecimal.ROUND_HALF_UP);
    }

    /**
     * Get total interest amount to be paid
     * @return Total interest amount
     */
    public BigDecimal getTotalInterest() {
        if (monthlyInstallment == null || installmentMonths == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalPayment = monthlyInstallment.multiply(
                BigDecimal.valueOf(installmentMonths)
        );

        return totalPayment.subtract(loanAmount);
    }

    /**
     * Get total amount to be paid (principal + interest)
     * @return Total payment amount
     */
    public BigDecimal getTotalPaymentAmount() {
        return loanAmount.add(getTotalInterest());
    }

    /**
     * Approve this loan
     * @param approver Username of approver
     */
    public void approve(String approver) {
        this.status = LoanStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
        this.remainingBalance = this.loanAmount;
    }

    /**
     * Reject this loan
     * @param rejector Username of rejector
     * @param reason Rejection reason
     */
    public void reject(String rejector, String reason) {
        this.status = LoanStatus.REJECTED;
        this.rejectedBy = rejector;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    /**
     * Activate this loan (start repayment)
     */
    public void activate() {
        if (this.status != LoanStatus.APPROVED) {
            throw new IllegalStateException("Can only activate approved loans");
        }
        this.status = LoanStatus.ACTIVE;
    }

    /**
     * Cancel this loan
     */
    public void cancel() {
        if (this.status == LoanStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel completed loan");
        }
        this.status = LoanStatus.CANCELLED;
    }

    // ===================================================
    // LIFECYCLE CALLBACKS
    // ===================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = LoanStatus.PENDING;
        }
        if (remainingBalance == null) {
            remainingBalance = loanAmount;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}