package com.example.backend.models.payroll;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "repayment_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepaymentSchedule {
    public enum ScheduleStatus {
        PENDING,     // Awaiting payslip processing
        PAID,        // Processed through payslip
        OVERDUE,     // Due date passed, not processed
        DEFERRED,    // Temporarily postponed
        CANCELLED    // Cancelled (loan cancelled/modified)
    }
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    @JsonBackReference
    private Loan loan;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "scheduled_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal scheduledAmount;

    @Column(name = "principal_amount", precision = 12, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", precision = 12, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "actual_amount", precision = 12, scale = 2)
    private BigDecimal actualAmount;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    /**
     * NEW: Link to payslip where this repayment was processed
     * Ensures traceability between loan repayments and payslips
     */
    @Column(name = "payslip_id")
    private UUID payslipId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepaymentStatus status;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * ENHANCED: Repayment schedule status
     * Aligns with payslip-only processing
     * RENAMED to RepaymentStatus to match existing Loan model references
     */
    public enum RepaymentStatus {
        PENDING,     // Awaiting payslip processing
        PAID,        // Processed through payslip
        OVERDUE,     // Due date passed, not processed
        DEFERRED,    // Temporarily postponed
        CANCELLED    // Cancelled (loan cancelled/modified)
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = RepaymentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * NEW: Check if repayment is due within payslip period
     */
    public boolean isDueInPeriod(LocalDate periodStart, LocalDate periodEnd) {
        return dueDate != null &&
                !dueDate.isBefore(periodStart) &&
                !dueDate.isAfter(periodEnd);
    }

    /**
     * NEW: Check if repayment was processed in payslip
     */
    public boolean isProcessedInPayslip() {
        return payslipId != null && status.equals(ScheduleStatus.PAID);
    }

    /**
     * Check if repayment is overdue
     */
    public boolean isOverdue() {
        return status == RepaymentStatus.PENDING &&
                dueDate != null &&
                dueDate.isBefore(LocalDate.now());
    }

    /**
     * Get payment variance (difference between scheduled and actual)
     */
    public BigDecimal getPaymentVariance() {
        if (actualAmount == null || scheduledAmount == null) {
            return BigDecimal.ZERO;
        }
        return actualAmount.subtract(scheduledAmount);
    }

    /**
     * Check if payment has variance
     */
    public boolean hasPaymentVariance() {
        return getPaymentVariance().compareTo(BigDecimal.ZERO) != 0;
    }

    /**
     * Get remaining principal after this payment
     */
    public BigDecimal getRemainingPrincipalAfterPayment() {
        if (loan == null || principalAmount == null) {
            return BigDecimal.ZERO;
        }

        // This would need to be calculated based on loan balance
        // and previous payments - simplified here
        return loan.getRemainingBalance().subtract(principalAmount);
    }

    /**
     * Mark as paid through payslip
     */
    public void markAsPaidThroughPayslip(UUID payslipId, BigDecimal actualAmount, LocalDate paidDate) {
        this.payslipId = payslipId;
        this.actualAmount = actualAmount;
        this.paidDate = paidDate;
        this.status = RepaymentStatus.PAID;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Mark as overdue
     */
    public void markAsOverdue() {
        if (this.status == RepaymentStatus.PENDING && isOverdue()) {
            this.status = RepaymentStatus.OVERDUE;
            this.updatedAt = LocalDateTime.now();
        }
    }

    /**
     * Check if this repayment can be processed in current payslip period
     */
    public boolean canBeProcessedInPeriod(LocalDate payslipStart, LocalDate payslipEnd) {
        return status == RepaymentStatus.PENDING &&
                isDueInPeriod(payslipStart, payslipEnd) &&
                loan != null &&
                loan.getStatus() == Loan.LoanStatus.ACTIVE;
    }

    /**
     * Get description for payslip deduction
     */
    public String getDeductionDescription() {
        StringBuilder description = new StringBuilder();
        description.append("Loan Repayment");

        if (installmentNumber != null) {
            description.append(" - Installment #").append(installmentNumber);

            if (loan != null && loan.getTotalInstallments() != null) {
                description.append("/").append(loan.getTotalInstallments());
            }
        }

        if (dueDate != null) {
            description.append(" (Due: ").append(dueDate).append(")");
        }

        return description.toString();
    }

}
