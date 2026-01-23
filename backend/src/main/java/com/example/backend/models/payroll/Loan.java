package com.example.backend.models.payroll;

import com.example.backend.models.hr.Employee;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Loan Entity - Employee loan management
 * Tracks loans given to employees with repayment schedules
 * Integrates with Finance module for approval and payment scheduling
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

    // Human-readable loan number (e.g., "LOAN-2024-000001")
    @Column(name = "loan_number", unique = true, nullable = false, length = 30)
    private String loanNumber;

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

    // Legacy column - synced with monthlyInstallment for backward compatibility
    @Column(name = "installment_amount", precision = 10, scale = 2)
    private BigDecimal installmentAmount;

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate; // Annual interest rate percentage

    // Dates
    @Column(nullable = false)
    private LocalDate loanDate;

    @Column(nullable = true)
    private LocalDate disbursementDate; // When the loan was actually given to employee

    @Column(nullable = true)
    private LocalDate firstPaymentDate;

    @Column(name = "end_date")
    private LocalDate endDate; // Expected end date of loan repayment

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

    // ===================================================
    // HR APPROVAL TRACKING (Initial approval by HR Manager)
    // ===================================================
    @Column(name = "hr_approved_by")
    private String hrApprovedBy;

    @Column(name = "hr_approved_at")
    private LocalDateTime hrApprovedAt;

    @Column(name = "hr_rejected_by")
    private String hrRejectedBy;

    @Column(name = "hr_rejected_at")
    private LocalDateTime hrRejectedAt;

    @Column(name = "hr_rejection_reason", length = 500)
    private String hrRejectionReason;

    // ===================================================
    // FINANCE INTEGRATION
    // ===================================================

    // Finance payment request reference
    @Column(name = "finance_request_id")
    private UUID financeRequestId;

    @Column(name = "finance_request_number", length = 30)
    private String financeRequestNumber;

    // Finance approval tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "finance_status")
    private FinanceApprovalStatus financeStatus;

    @Column(name = "finance_approved_by")
    private String financeApprovedBy;

    @Column(name = "finance_approved_at")
    private LocalDateTime financeApprovedAt;

    @Column(name = "finance_rejected_by")
    private String financeRejectedBy;

    @Column(name = "finance_rejected_at")
    private LocalDateTime financeRejectedAt;

    @Column(name = "finance_rejection_reason", length = 500)
    private String financeRejectionReason;

    @Column(name = "finance_notes", length = 1000)
    private String financeNotes;

    // Deduction plan (decided by Finance)
    @Column(name = "finance_approved_installments")
    private Integer financeApprovedInstallments;

    @Column(name = "finance_approved_amount", precision = 15, scale = 2)
    private BigDecimal financeApprovedAmount;

    // Payment source tracking
    @Column(name = "payment_source_type", length = 50)
    private String paymentSourceType;

    @Column(name = "payment_source_id")
    private UUID paymentSourceId;

    @Column(name = "payment_source_name", length = 100)
    private String paymentSourceName;

    @Column(name = "disbursed_at")
    private LocalDateTime disbursedAt;

    @Column(name = "disbursed_by")
    private String disbursedBy;

    // Legacy fields for backward compatibility (deprecated - use hr_ prefixed fields)
    @Deprecated
    private String approvedBy;
    @Deprecated
    private LocalDateTime approvedAt;
    @Deprecated
    private String rejectedBy;
    @Deprecated
    private LocalDateTime rejectedAt;
    @Deprecated
    private String rejectionReason;

    // Audit fields
    @Column(nullable = false)
    private String createdBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private String updatedBy;
    private LocalDateTime updatedAt;

    // Loan Status Enum - Updated with Finance workflow
    public enum LoanStatus {
        DRAFT,                    // Loan being created, not yet submitted
        PENDING_HR_APPROVAL,      // Awaiting HR Manager approval
        HR_APPROVED,              // HR approved, awaiting Finance
        HR_REJECTED,              // HR rejected the loan
        PENDING_FINANCE,          // Sent to Finance for approval
        FINANCE_APPROVED,         // Finance approved, ready for disbursement
        FINANCE_REJECTED,         // Finance rejected the loan
        DISBURSED,                // Loan amount paid to employee
        ACTIVE,                   // Loan is being repaid through payroll
        COMPLETED,                // Loan fully paid
        CANCELLED,                // Loan cancelled
        // Legacy statuses for backward compatibility
        PENDING,                  // @Deprecated - Use PENDING_HR_APPROVAL
        APPROVED,                 // @Deprecated - Use HR_APPROVED or FINANCE_APPROVED
        REJECTED                  // @Deprecated - Use HR_REJECTED or FINANCE_REJECTED
    }

    // Finance Approval Status Enum
    public enum FinanceApprovalStatus {
        NOT_SUBMITTED,            // Not yet sent to Finance
        PENDING,                  // Awaiting Finance review
        UNDER_REVIEW,             // Finance is reviewing
        APPROVED,                 // Finance approved
        REJECTED,                 // Finance rejected
        REQUIRES_MODIFICATION     // Finance requires changes to terms
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
                    RoundingMode.HALF_UP
            );
        }

        // Calculate monthly interest rate (annual / 12 / 100)
        BigDecimal monthlyRate = interestRate
                .divide(BigDecimal.valueOf(12), 6, RoundingMode.HALF_UP)
                .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);

        // Calculate using loan amortization formula:
        // M = P * [r(1+r)^n] / [(1+r)^n - 1]
        BigDecimal onePlusRate = BigDecimal.ONE.add(monthlyRate);
        BigDecimal power = onePlusRate.pow(installmentMonths);

        BigDecimal numerator = loanAmount.multiply(monthlyRate).multiply(power);
        BigDecimal denominator = power.subtract(BigDecimal.ONE);

        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
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
                .divide(monthlyInstallment, 0, RoundingMode.UP)
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
                .divide(loanAmount, 2, RoundingMode.HALF_UP);
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
     * HR approves this loan
     * @param approver Username of HR approver
     */
    public void hrApprove(String approver) {
        if (this.status != LoanStatus.PENDING_HR_APPROVAL && this.status != LoanStatus.PENDING) {
            throw new IllegalStateException("Can only HR approve loans in PENDING_HR_APPROVAL status");
        }
        this.status = LoanStatus.HR_APPROVED;
        this.hrApprovedBy = approver;
        this.hrApprovedAt = LocalDateTime.now();
        this.financeStatus = FinanceApprovalStatus.NOT_SUBMITTED;
        // Legacy field for backward compatibility
        this.approvedBy = approver;
        this.approvedAt = LocalDateTime.now();
    }

    /**
     * HR rejects this loan
     * @param rejector Username of HR rejector
     * @param reason Rejection reason
     */
    public void hrReject(String rejector, String reason) {
        this.status = LoanStatus.HR_REJECTED;
        this.hrRejectedBy = rejector;
        this.hrRejectedAt = LocalDateTime.now();
        this.hrRejectionReason = reason;
        // Legacy field for backward compatibility
        this.rejectedBy = rejector;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    /**
     * Send loan to Finance for approval
     */
    public void sendToFinance() {
        if (this.status != LoanStatus.HR_APPROVED) {
            throw new IllegalStateException("Can only send HR-approved loans to Finance");
        }
        this.status = LoanStatus.PENDING_FINANCE;
        this.financeStatus = FinanceApprovalStatus.PENDING;
    }

    /**
     * Finance approves this loan with deduction plan
     * @param approver Username of Finance approver
     * @param approvedInstallments Number of payroll cycles for deduction
     * @param approvedAmount Amount per payroll deduction
     * @param notes Finance notes
     */
    public void financeApprove(String approver, Integer approvedInstallments,
                                BigDecimal approvedAmount, String notes) {
        if (this.status != LoanStatus.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance approve loans in PENDING_FINANCE status");
        }
        this.status = LoanStatus.FINANCE_APPROVED;
        this.financeStatus = FinanceApprovalStatus.APPROVED;
        this.financeApprovedBy = approver;
        this.financeApprovedAt = LocalDateTime.now();
        this.financeApprovedInstallments = approvedInstallments;
        this.financeApprovedAmount = approvedAmount;
        this.financeNotes = notes;
        // Update the actual installment values with Finance-approved values
        if (approvedInstallments != null) {
            this.installmentMonths = approvedInstallments;
        }
        if (approvedAmount != null) {
            this.monthlyInstallment = approvedAmount;
        }
    }

    /**
     * Finance rejects this loan
     * @param rejector Username of Finance rejector
     * @param reason Rejection reason
     */
    public void financeReject(String rejector, String reason) {
        if (this.status != LoanStatus.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance reject loans in PENDING_FINANCE status");
        }
        this.status = LoanStatus.FINANCE_REJECTED;
        this.financeStatus = FinanceApprovalStatus.REJECTED;
        this.financeRejectedBy = rejector;
        this.financeRejectedAt = LocalDateTime.now();
        this.financeRejectionReason = reason;
    }

    /**
     * Disburse loan amount to employee
     * @param disbursedBy Username of person who disbursed
     * @param sourceType Payment source type (BANK_ACCOUNT, CASH_SAFE, etc.)
     * @param sourceId Payment source ID
     * @param sourceName Payment source name
     */
    public void disburse(String disbursedBy, String sourceType, UUID sourceId, String sourceName) {
        if (this.status != LoanStatus.FINANCE_APPROVED) {
            throw new IllegalStateException("Can only disburse Finance-approved loans");
        }
        this.status = LoanStatus.DISBURSED;
        this.disbursedBy = disbursedBy;
        this.disbursedAt = LocalDateTime.now();
        this.disbursementDate = LocalDate.now();
        this.paymentSourceType = sourceType;
        this.paymentSourceId = sourceId;
        this.paymentSourceName = sourceName;
        this.remainingBalance = this.loanAmount;
    }

    /**
     * Activate this loan (start repayment)
     */
    public void activate() {
        if (this.status != LoanStatus.DISBURSED && this.status != LoanStatus.APPROVED
            && this.status != LoanStatus.FINANCE_APPROVED) {
            throw new IllegalStateException("Can only activate disbursed or approved loans");
        }
        this.status = LoanStatus.ACTIVE;
        if (this.remainingBalance == null) {
            this.remainingBalance = this.loanAmount;
        }
    }

    /**
     * Cancel this loan
     */
    public void cancel() {
        if (this.status == LoanStatus.COMPLETED || this.status == LoanStatus.ACTIVE) {
            throw new IllegalStateException("Cannot cancel completed or active loans");
        }
        this.status = LoanStatus.CANCELLED;
    }

    // Legacy methods for backward compatibility
    @Deprecated
    public void approve(String approver) {
        hrApprove(approver);
    }

    @Deprecated
    public void reject(String rejector, String reason) {
        hrReject(rejector, reason);
    }

    // ===================================================
    // HELPER METHODS
    // ===================================================

    /**
     * Generate human-readable loan number
     * Format: LOAN-YYYY-NNNNNN (e.g., LOAN-2024-000001)
     */
    public static String generateLoanNumber(int year, long sequenceNumber) {
        return String.format("LOAN-%d-%06d", year, sequenceNumber);
    }

    /**
     * Check if loan requires Finance approval
     */
    public boolean requiresFinanceApproval() {
        return status == LoanStatus.HR_APPROVED && financeStatus == FinanceApprovalStatus.NOT_SUBMITTED;
    }

    /**
     * Check if loan is pending any approval
     */
    public boolean isPendingApproval() {
        return status == LoanStatus.PENDING_HR_APPROVAL
            || status == LoanStatus.PENDING_FINANCE
            || status == LoanStatus.PENDING;
    }

    /**
     * Check if loan is fully approved and ready for disbursement
     */
    public boolean isReadyForDisbursement() {
        return status == LoanStatus.FINANCE_APPROVED;
    }

    /**
     * Get effective monthly installment (Finance-approved or calculated)
     */
    public BigDecimal getEffectiveMonthlyInstallment() {
        if (financeApprovedAmount != null) {
            return financeApprovedAmount;
        }
        return monthlyInstallment;
    }

    /**
     * Get effective installment months (Finance-approved or original)
     */
    public Integer getEffectiveInstallmentMonths() {
        if (financeApprovedInstallments != null) {
            return financeApprovedInstallments;
        }
        return installmentMonths;
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
            status = LoanStatus.PENDING_HR_APPROVAL;
        }
        if (remainingBalance == null) {
            remainingBalance = loanAmount;
        }
        if (financeStatus == null) {
            financeStatus = FinanceApprovalStatus.NOT_SUBMITTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}