package com.example.backend.models.payroll;

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

/**
 * LoanFinanceRequest Entity - Tracks loan requests sent to Finance for approval
 * This is the bridge between HR's loan management and Finance's approval workflow
 */
@Entity
@Table(name = "loan_finance_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanFinanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Human-readable request number (e.g., "LFR-2024-000001")
    @Column(name = "request_number", unique = true, nullable = false, length = 30)
    private String requestNumber;

    // Reference to the loan
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false, unique = true)
    private Loan loan;

    // ===================================================
    // LOAN SUMMARY (Snapshot at request time)
    // ===================================================
    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "employee_name", nullable = false, length = 200)
    private String employeeName;

    @Column(name = "employee_number", length = 50)
    private String employeeNumber;

    @Column(name = "department_name", length = 100)
    private String departmentName;

    @Column(name = "job_position_name", length = 100)
    private String jobPositionName;

    @Column(name = "loan_number", nullable = false, length = 30)
    private String loanNumber;

    @Column(name = "loan_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "requested_installments", nullable = false)
    private Integer requestedInstallments;

    @Column(name = "requested_monthly_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedMonthlyAmount;

    @Column(name = "interest_rate", precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(name = "loan_purpose", length = 500)
    private String loanPurpose;

    // Employee's current monthly salary (for affordability assessment)
    @Column(name = "employee_monthly_salary", precision = 15, scale = 2)
    private BigDecimal employeeMonthlySalary;

    // ===================================================
    // REQUEST STATUS
    // ===================================================
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    // ===================================================
    // FINANCE DECISION
    // ===================================================
    @Column(name = "approved_installments")
    private Integer approvedInstallments;

    @Column(name = "approved_monthly_amount", precision = 15, scale = 2)
    private BigDecimal approvedMonthlyAmount;

    @Column(name = "first_deduction_date")
    private LocalDate firstDeductionDate;

    @Column(name = "deduction_start_payroll_date")
    private LocalDate deductionStartPayrollDate;

    @Column(name = "finance_notes", length = 1000)
    private String financeNotes;

    // Payment source for disbursement
    @Column(name = "payment_source_type", length = 50)
    private String paymentSourceType;

    @Column(name = "payment_source_id")
    private UUID paymentSourceId;

    @Column(name = "payment_source_name", length = 100)
    private String paymentSourceName;

    // ===================================================
    // REQUESTER INFO
    // ===================================================
    @Column(name = "requested_by_user_id")
    private UUID requestedByUserId;

    @Column(name = "requested_by_user_name", length = 100)
    private String requestedByUserName;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    // ===================================================
    // REVIEWER INFO
    // ===================================================
    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    @Column(name = "reviewed_by_user_name", length = 100)
    private String reviewedByUserName;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    // ===================================================
    // APPROVAL/REJECTION INFO
    // ===================================================
    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_by_user_name", length = 100)
    private String approvedByUserName;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_notes", length = 1000)
    private String approvalNotes;

    @Column(name = "rejected_by_user_id")
    private UUID rejectedByUserId;

    @Column(name = "rejected_by_user_name", length = 100)
    private String rejectedByUserName;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    // ===================================================
    // DISBURSEMENT TRACKING
    // ===================================================
    @Column(name = "disbursed_at")
    private LocalDateTime disbursedAt;

    @Column(name = "disbursed_by_user_id")
    private UUID disbursedByUserId;

    @Column(name = "disbursed_by_user_name", length = 100)
    private String disbursedByUserName;

    @Column(name = "disbursement_reference", length = 100)
    private String disbursementReference;

    // ===================================================
    // STATUS HISTORY
    // ===================================================
    @OneToMany(mappedBy = "loanFinanceRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LoanFinanceRequestStatusHistory> statusHistory = new ArrayList<>();

    // ===================================================
    // AUDIT FIELDS
    // ===================================================
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Request Status Enum
     */
    public enum RequestStatus {
        PENDING("Pending", "Awaiting Finance review"),
        UNDER_REVIEW("Under Review", "Finance is reviewing the request"),
        APPROVED("Approved", "Finance approved the loan"),
        REJECTED("Rejected", "Finance rejected the loan"),
        MODIFICATION_REQUESTED("Modification Requested", "Finance requires changes"),
        DISBURSEMENT_PENDING("Disbursement Pending", "Approved, awaiting disbursement"),
        DISBURSED("Disbursed", "Loan has been disbursed to employee"),
        CANCELLED("Cancelled", "Request was cancelled");

        private final String displayName;
        private final String description;

        RequestStatus(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }
    }

    // ===================================================
    // BUSINESS LOGIC METHODS
    // ===================================================

    /**
     * Generate request number
     */
    public static String generateRequestNumber(int year, long sequenceNumber) {
        return String.format("LFR-%d-%06d", year, sequenceNumber);
    }

    /**
     * Start review
     */
    public void startReview(UUID reviewerUserId, String reviewerUserName) {
        if (this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Can only start review for PENDING requests");
        }
        this.status = RequestStatus.UNDER_REVIEW;
        this.reviewedByUserId = reviewerUserId;
        this.reviewedByUserName = reviewerUserName;
        this.reviewedAt = LocalDateTime.now();
        addStatusHistory(RequestStatus.UNDER_REVIEW, reviewerUserId, reviewerUserName, "Started review");
    }

    /**
     * Approve the loan with deduction plan
     */
    public void approve(UUID approverUserId, String approverUserName,
                        Integer installments, BigDecimal monthlyAmount,
                        LocalDate firstDeductionDate, String notes) {
        if (this.status != RequestStatus.UNDER_REVIEW && this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Can only approve requests under review or pending");
        }
        this.status = RequestStatus.APPROVED;
        this.approvedByUserId = approverUserId;
        this.approvedByUserName = approverUserName;
        this.approvedAt = LocalDateTime.now();
        this.approvedInstallments = installments;
        this.approvedMonthlyAmount = monthlyAmount;
        this.firstDeductionDate = firstDeductionDate;
        this.approvalNotes = notes;
        this.financeNotes = notes;
        addStatusHistory(RequestStatus.APPROVED, approverUserId, approverUserName,
            "Approved with " + installments + " installments of " + monthlyAmount);
    }

    /**
     * Reject the loan
     */
    public void reject(UUID rejectorUserId, String rejectorUserName, String reason) {
        if (this.status != RequestStatus.UNDER_REVIEW && this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Can only reject requests under review or pending");
        }
        this.status = RequestStatus.REJECTED;
        this.rejectedByUserId = rejectorUserId;
        this.rejectedByUserName = rejectorUserName;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
        addStatusHistory(RequestStatus.REJECTED, rejectorUserId, rejectorUserName, reason);
    }

    /**
     * Request modification
     */
    public void requestModification(UUID reviewerUserId, String reviewerUserName, String reason) {
        if (this.status != RequestStatus.UNDER_REVIEW && this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Can only request modification for requests under review or pending");
        }
        this.status = RequestStatus.MODIFICATION_REQUESTED;
        this.financeNotes = reason;
        addStatusHistory(RequestStatus.MODIFICATION_REQUESTED, reviewerUserId, reviewerUserName, reason);
    }

    /**
     * Mark ready for disbursement
     */
    public void markReadyForDisbursement(String sourceType, UUID sourceId, String sourceName) {
        if (this.status != RequestStatus.APPROVED) {
            throw new IllegalStateException("Can only mark approved requests for disbursement");
        }
        this.status = RequestStatus.DISBURSEMENT_PENDING;
        this.paymentSourceType = sourceType;
        this.paymentSourceId = sourceId;
        this.paymentSourceName = sourceName;
        addStatusHistory(RequestStatus.DISBURSEMENT_PENDING, null, null,
            "Ready for disbursement from " + sourceName);
    }

    /**
     * Mark as disbursed
     */
    public void markDisbursed(UUID disburserUserId, String disburserUserName, String reference) {
        if (this.status != RequestStatus.DISBURSEMENT_PENDING && this.status != RequestStatus.APPROVED) {
            throw new IllegalStateException("Can only disburse approved or disbursement-pending requests");
        }
        this.status = RequestStatus.DISBURSED;
        this.disbursedByUserId = disburserUserId;
        this.disbursedByUserName = disburserUserName;
        this.disbursedAt = LocalDateTime.now();
        this.disbursementReference = reference;
        addStatusHistory(RequestStatus.DISBURSED, disburserUserId, disburserUserName,
            "Disbursed with reference: " + reference);
    }

    /**
     * Cancel the request
     */
    public void cancel(UUID cancellerUserId, String cancellerUserName, String reason) {
        if (this.status == RequestStatus.DISBURSED) {
            throw new IllegalStateException("Cannot cancel disbursed requests");
        }
        this.status = RequestStatus.CANCELLED;
        addStatusHistory(RequestStatus.CANCELLED, cancellerUserId, cancellerUserName, reason);
    }

    /**
     * Add status history entry
     */
    private void addStatusHistory(RequestStatus newStatus, UUID userId, String userName, String notes) {
        LoanFinanceRequestStatusHistory history = LoanFinanceRequestStatusHistory.builder()
            .loanFinanceRequest(this)
            .status(newStatus)
            .changedByUserId(userId)
            .changedByUserName(userName)
            .changedAt(LocalDateTime.now())
            .notes(notes)
            .build();
        this.statusHistory.add(history);
    }

    /**
     * Calculate affordability ratio (loan installment / monthly salary)
     */
    public BigDecimal calculateAffordabilityRatio() {
        if (employeeMonthlySalary == null || employeeMonthlySalary.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal installment = approvedMonthlyAmount != null ? approvedMonthlyAmount : requestedMonthlyAmount;
        return installment.divide(employeeMonthlySalary, 4, java.math.RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
    }

    // ===================================================
    // LIFECYCLE CALLBACKS
    // ===================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = RequestStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
