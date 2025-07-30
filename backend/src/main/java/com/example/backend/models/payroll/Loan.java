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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal remainingBalance;

    @Column(precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal installmentAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstallmentFrequency installmentFrequency;

    @Column(nullable = false)
    private Integer totalInstallments;

    @Column(nullable = false)
    @Builder.Default
    private Integer paidInstallments = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanStatus status;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String createdBy;

    private String approvedBy;

    private LocalDateTime approvalDate;

    private String rejectedBy;

    private String rejectionReason;

    private LocalDateTime rejectionDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Relationship with RepaymentSchedule
    @OneToMany(mappedBy = "loan", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference("loan-repayment-schedules")
    @Builder.Default
    private List<RepaymentSchedule> repaymentSchedules = new ArrayList<>();

    public enum LoanStatus {
        PENDING,
        ACTIVE,
        COMPLETED,
        REJECTED,
        CANCELLED
    }

    public enum InstallmentFrequency {
        WEEKLY,
        MONTHLY
    }

    // Helper methods

    /**
     * Check if loan is active
     * @return true if loan status is ACTIVE
     */
    public boolean isActive() {
        return status == LoanStatus.ACTIVE;
    }

    /**
     * Check if loan is pending approval
     * @return true if loan status is PENDING
     */
    public boolean isPending() {
        return status == LoanStatus.PENDING;
    }

    /**
     * Check if loan is completed
     * @return true if loan status is COMPLETED
     */
    public boolean isCompleted() {
        return status == LoanStatus.COMPLETED;
    }

    /**
     * Check if loan can be edited
     * @return true if loan is in PENDING status
     */
    public boolean canBeEdited() {
        return status == LoanStatus.PENDING;
    }

    /**
     * Check if loan can be approved
     * @return true if loan is in PENDING status
     */
    public boolean canBeApproved() {
        return status == LoanStatus.PENDING;
    }

    /**
     * Check if loan can be cancelled
     * @return true if loan is not COMPLETED
     */
    public boolean canBeCancelled() {
        return status != LoanStatus.COMPLETED;
    }

    /**
     * Get the number of remaining installments
     * @return remaining installments count
     */
    public Integer getRemainingInstallments() {
        return totalInstallments - (paidInstallments != null ? paidInstallments : 0);
    }

    /**
     * Get loan completion percentage
     * @return percentage completed (0-100)
     */
    public BigDecimal getCompletionPercentage() {
        if (totalInstallments == null || totalInstallments == 0) {
            return BigDecimal.ZERO;
        }
        int paid = paidInstallments != null ? paidInstallments : 0;
        return BigDecimal.valueOf(paid)
                .divide(BigDecimal.valueOf(totalInstallments), 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    /**
     * Calculate total interest amount
     * @return total interest for the loan
     */
    public BigDecimal getTotalInterestAmount() {
        if (interestRate == null || loanAmount == null) {
            return BigDecimal.ZERO;
        }
        return loanAmount.multiply(interestRate.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP));
    }

    /**
     * Calculate total repayment amount (principal + interest)
     * @return total amount to be repaid
     */
    public BigDecimal getTotalRepaymentAmount() {
        return loanAmount.add(getTotalInterestAmount());
    }

    /**
     * Get the expected end date based on start date and installments
     * @return calculated end date
     */
    public LocalDate getCalculatedEndDate() {
        if (startDate == null || totalInstallments == null || installmentFrequency == null) {
            return endDate;
        }

        switch (installmentFrequency) {
            case WEEKLY:
                return startDate.plusWeeks(totalInstallments);
            case MONTHLY:
                return startDate.plusMonths(totalInstallments);
            default:
                return endDate;
        }
    }

    /**
     * Check if loan is overdue (has overdue repayments)
     * @return true if any repayment is overdue
     */
    public boolean isOverdue() {
        if (repaymentSchedules == null || repaymentSchedules.isEmpty()) {
            return false;
        }

        return repaymentSchedules.stream()
                .anyMatch(RepaymentSchedule::isOverdue);
    }

    /**
     * Get the next due repayment
     * @return next pending repayment or null
     */
    public RepaymentSchedule getNextDueRepayment() {
        if (repaymentSchedules == null || repaymentSchedules.isEmpty()) {
            return null;
        }

        return repaymentSchedules.stream()
                .filter(rs -> rs.getStatus() == RepaymentSchedule.RepaymentStatus.PENDING)
                .min((rs1, rs2) -> rs1.getDueDate().compareTo(rs2.getDueDate()))
                .orElse(null);
    }

    /**
     * Get all overdue repayments
     * @return list of overdue repayments
     */
    public List<RepaymentSchedule> getOverdueRepayments() {
        if (repaymentSchedules == null) {
            return new ArrayList<>();
        }

        return repaymentSchedules.stream()
                .filter(RepaymentSchedule::isOverdue)
                .toList();
    }

    /**
     * Approve the loan
     * @param approvedBy who approved the loan
     */
    public void approve(String approvedBy) {
        if (!canBeApproved()) {
            throw new IllegalStateException("Loan cannot be approved in current status: " + status);
        }
        this.status = LoanStatus.ACTIVE;
        this.approvedBy = approvedBy;
        this.approvalDate = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Reject the loan
     * @param rejectedBy who rejected the loan
     * @param reason reason for rejection
     */
    public void reject(String rejectedBy, String reason) {
        if (!canBeApproved()) {
            throw new IllegalStateException("Loan cannot be rejected in current status: " + status);
        }
        this.status = LoanStatus.REJECTED;
        this.rejectedBy = rejectedBy;
        this.rejectionReason = reason;
        this.rejectionDate = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Cancel the loan
     */
    public void cancel() {
        if (!canBeCancelled()) {
            throw new IllegalStateException("Loan cannot be cancelled in current status: " + status);
        }
        this.status = LoanStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Complete the loan
     */
    public void complete() {
        this.status = LoanStatus.COMPLETED;
        this.remainingBalance = BigDecimal.ZERO;
        this.paidInstallments = totalInstallments;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Process a repayment
     * @param amount amount paid
     */
    public void processRepayment(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Repayment amount must be positive");
        }

        // Update remaining balance
        this.remainingBalance = this.remainingBalance.subtract(amount);

        // Increment paid installments if this completes an installment
        if (this.paidInstallments == null) {
            this.paidInstallments = 0;
        }
        this.paidInstallments++;

        // Check if loan is completed
        if (this.remainingBalance.compareTo(BigDecimal.ZERO) <= 0 ||
                this.paidInstallments >= this.totalInstallments) {
            complete();
        }

        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Get loan summary information
     * @return map of loan summary data
     */
    public java.util.Map<String, Object> getSummary() {
        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("id", id);
        summary.put("employeeName", employee != null ? employee.getFullName() : "Unknown");
        summary.put("loanAmount", loanAmount);
        summary.put("remainingBalance", remainingBalance);
        summary.put("installmentAmount", installmentAmount);
        summary.put("totalInstallments", totalInstallments);
        summary.put("paidInstallments", paidInstallments != null ? paidInstallments : 0);
        summary.put("remainingInstallments", getRemainingInstallments());
        summary.put("completionPercentage", getCompletionPercentage());
        summary.put("status", status.name());
        summary.put("isOverdue", isOverdue());
        summary.put("nextDueDate", getNextDueRepayment() != null ? getNextDueRepayment().getDueDate() : null);
        return summary;
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
            status = LoanStatus.PENDING;
        }
        if (paidInstallments == null) {
            paidInstallments = 0;
        }
        if (repaymentSchedules == null) {
            repaymentSchedules = new ArrayList<>();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}