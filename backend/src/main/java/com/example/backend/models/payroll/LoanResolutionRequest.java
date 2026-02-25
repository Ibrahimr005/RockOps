package com.example.backend.models.payroll;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * LoanResolutionRequest - Allows closing/resolving a loan before all installments are paid.
 * Follows a two-tier approval workflow: HR -> Finance
 */
@Entity
@Table(name = "loan_resolution_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanResolutionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "remaining_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal remainingBalance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ResolutionStatus status = ResolutionStatus.PENDING_HR;

    // HR decision
    @Column(name = "hr_approved_by")
    private String hrApprovedBy;

    @Column(name = "hr_decision_date")
    private LocalDateTime hrDecisionDate;

    @Column(name = "hr_rejection_reason", length = 1000)
    private String hrRejectionReason;

    // Finance decision
    @Column(name = "finance_approved_by")
    private String financeApprovedBy;

    @Column(name = "finance_decision_date")
    private LocalDateTime financeDecisionDate;

    @Column(name = "finance_rejection_reason", length = 1000)
    private String financeRejectionReason;

    // Audit
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    public enum ResolutionStatus {
        PENDING_HR,
        PENDING_FINANCE,
        APPROVED,
        REJECTED
    }

    // Business logic methods

    public void hrApprove(String approver) {
        if (this.status != ResolutionStatus.PENDING_HR) {
            throw new IllegalStateException("Can only HR approve requests in PENDING_HR status");
        }
        this.status = ResolutionStatus.PENDING_FINANCE;
        this.hrApprovedBy = approver;
        this.hrDecisionDate = LocalDateTime.now();
    }

    public void hrReject(String rejector, String reason) {
        if (this.status != ResolutionStatus.PENDING_HR) {
            throw new IllegalStateException("Can only HR reject requests in PENDING_HR status");
        }
        this.status = ResolutionStatus.REJECTED;
        this.hrApprovedBy = rejector;
        this.hrDecisionDate = LocalDateTime.now();
        this.hrRejectionReason = reason;
    }

    public void financeApprove(String approver) {
        if (this.status != ResolutionStatus.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance approve requests in PENDING_FINANCE status");
        }
        this.status = ResolutionStatus.APPROVED;
        this.financeApprovedBy = approver;
        this.financeDecisionDate = LocalDateTime.now();
    }

    public void financeReject(String rejector, String reason) {
        if (this.status != ResolutionStatus.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance reject requests in PENDING_FINANCE status");
        }
        this.status = ResolutionStatus.REJECTED;
        this.financeApprovedBy = rejector;
        this.financeDecisionDate = LocalDateTime.now();
        this.financeRejectionReason = reason;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
