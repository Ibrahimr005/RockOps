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

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    @JsonBackReference("loan-repayment-schedules")
    private Loan loan;

    @Column(nullable = false)
    private Integer installmentNumber;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal scheduledAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal paidAmount;

    private LocalDateTime paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RepaymentStatus status;

    private String paymentMethod;

    private String transactionReference;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum RepaymentStatus {
        PENDING,
        PAID,
        OVERDUE,
        PARTIAL,
        CANCELLED
    }

    // Helper methods

    /**
     * Check if this repayment is overdue
     * @return true if due date has passed and not paid
     */
    public boolean isOverdue() {
        return dueDate.isBefore(LocalDate.now()) &&
                (status == RepaymentStatus.PENDING || status == RepaymentStatus.PARTIAL);
    }

    /**
     * Check if this repayment is partially paid
     * @return true if some amount has been paid but not the full amount
     */
    public boolean isPartiallyPaid() {
        return paidAmount != null &&
                paidAmount.compareTo(BigDecimal.ZERO) > 0 &&
                paidAmount.compareTo(scheduledAmount) < 0;
    }

    /**
     * Check if this repayment is fully paid
     * @return true if paid amount equals or exceeds scheduled amount
     */
    public boolean isFullyPaid() {
        return paidAmount != null &&
                paidAmount.compareTo(scheduledAmount) >= 0 &&
                status == RepaymentStatus.PAID;
    }

    /**
     * Get the remaining amount to be paid
     * @return remaining amount (scheduled - paid)
     */
    public BigDecimal getRemainingAmount() {
        if (paidAmount == null) {
            return scheduledAmount;
        }
        BigDecimal remaining = scheduledAmount.subtract(paidAmount);
        return remaining.compareTo(BigDecimal.ZERO) > 0 ? remaining : BigDecimal.ZERO;
    }

    /**
     * Calculate days overdue
     * @return number of days overdue (0 if not overdue)
     */
    public long getDaysOverdue() {
        if (!isOverdue()) {
            return 0;
        }
        return java.time.temporal.ChronoUnit.DAYS.between(dueDate, LocalDate.now());
    }

    /**
     * Get payment completion percentage
     * @return percentage of payment completed (0-100)
     */
    public BigDecimal getPaymentCompletionPercentage() {
        if (paidAmount == null || scheduledAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return paidAmount.divide(scheduledAmount, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    /**
     * Check if payment is due within specified days
     * @param days number of days to check
     * @return true if due within specified days
     */
    public boolean isDueWithinDays(int days) {
        LocalDate cutoffDate = LocalDate.now().plusDays(days);
        return dueDate.isAfter(LocalDate.now()) && dueDate.isBefore(cutoffDate.plusDays(1));
    }

    /**
     * Process a payment for this repayment schedule
     * @param amount amount being paid
     * @param paymentMethod method of payment
     * @param transactionRef transaction reference
     */
    public void processPayment(BigDecimal amount, String paymentMethod, String transactionRef) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }

        if (this.paidAmount == null) {
            this.paidAmount = BigDecimal.ZERO;
        }

        // Add to existing paid amount
        this.paidAmount = this.paidAmount.add(amount);
        this.paymentMethod = paymentMethod;
        this.transactionReference = transactionRef;
        this.paymentDate = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        // Update status based on payment
        if (this.paidAmount.compareTo(this.scheduledAmount) >= 0) {
            this.status = RepaymentStatus.PAID;
        } else {
            this.status = RepaymentStatus.PARTIAL;
        }
    }

    /**
     * Mark as overdue
     */
    public void markAsOverdue() {
        if (status == RepaymentStatus.PENDING || status == RepaymentStatus.PARTIAL) {
            this.status = RepaymentStatus.OVERDUE;
            this.updatedAt = LocalDateTime.now();
        }
    }

    /**
     * Cancel this repayment schedule
     */
    public void cancel() {
        this.status = RepaymentStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Get a human-readable description of this repayment
     * @return description string
     */
    public String getDescription() {
        return String.format("Installment %d of %d - Due: %s - Amount: $%.2f",
                installmentNumber,
                loan != null ? loan.getTotalInstallments() : 0,
                dueDate,
                scheduledAmount);
    }

    /**
     * Check if this repayment can be processed (not already paid or cancelled)
     * @return true if can be processed
     */
    public boolean canBeProcessed() {
        return status != RepaymentStatus.PAID && status != RepaymentStatus.CANCELLED;
    }

    // JPA lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = RepaymentStatus.PENDING;
        }
        if (paidAmount == null) {
            paidAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}