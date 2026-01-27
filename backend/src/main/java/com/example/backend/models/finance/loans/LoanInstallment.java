package com.example.backend.models.finance.loans;

import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
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
@Table(name = "loan_installments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoanInstallment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_loan_id", nullable = false)
    @JsonBackReference("loan-installments")
    private CompanyLoan companyLoan;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "remaining_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal remainingAmount;

    // Link to generated PaymentRequest
    @Column(name = "payment_request_id")
    private UUID paymentRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private LoanInstallmentStatus status = LoanInstallmentStatus.PENDING;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (remainingAmount == null) {
            remainingAmount = totalAmount;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper methods

    /**
     * Check if installment is overdue
     */
    public boolean isOverdue() {
        return status != LoanInstallmentStatus.PAID
                && status != LoanInstallmentStatus.PARTIALLY_PAID
                && dueDate.isBefore(LocalDate.now());
    }

    /**
     * Check if installment is fully paid
     */
    public boolean isFullyPaid() {
        return remainingAmount.compareTo(BigDecimal.ZERO) <= 0;
    }

    /**
     * Process a payment on this installment
     */
    public void processPayment(BigDecimal amount) {
        this.paidAmount = this.paidAmount.add(amount);
        this.remainingAmount = this.totalAmount.subtract(this.paidAmount);

        if (this.remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            this.remainingAmount = BigDecimal.ZERO;
            this.status = LoanInstallmentStatus.PAID;
            this.paidDate = LocalDate.now();
        } else {
            this.status = LoanInstallmentStatus.PARTIALLY_PAID;
        }
    }

    /**
     * Get the proportion of principal in this payment
     * Used when processing partial payments
     */
    public BigDecimal getPrincipalPortion(BigDecimal paymentAmount) {
        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal ratio = principalAmount.divide(totalAmount, 8, java.math.RoundingMode.HALF_UP);
        return paymentAmount.multiply(ratio).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Get the proportion of interest in this payment
     * Used when processing partial payments
     */
    public BigDecimal getInterestPortion(BigDecimal paymentAmount) {
        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal ratio = interestAmount.divide(totalAmount, 8, java.math.RoundingMode.HALF_UP);
        return paymentAmount.multiply(ratio).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}