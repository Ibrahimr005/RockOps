package com.example.backend.models.hr;

import com.example.backend.models.site.Site;
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
 * SalaryIncreaseRequest - Supports EMPLOYEE_LEVEL and POSITION_LEVEL salary increases.
 * Follows a two-tier approval workflow: HR → Finance
 */
@Entity
@Table(name = "salary_increase_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryIncreaseRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "request_number", unique = true, length = 20)
    private String requestNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private RequestType requestType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "current_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentSalary;

    @Column(name = "requested_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal requestedSalary;

    @Column(name = "increase_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal increaseAmount;

    @Column(name = "increase_percentage", nullable = false, precision = 8, scale = 4)
    private BigDecimal increasePercentage;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Status status = Status.PENDING_HR;

    // HR decision
    @Column(name = "hr_approved_by")
    private String hrApprovedBy;

    @Column(name = "hr_decision_date")
    private LocalDateTime hrDecisionDate;

    @Column(name = "hr_comments", length = 1000)
    private String hrComments;

    @Column(name = "hr_rejection_reason", length = 1000)
    private String hrRejectionReason;

    // Finance decision
    @Column(name = "finance_approved_by")
    private String financeApprovedBy;

    @Column(name = "finance_decision_date")
    private LocalDateTime financeDecisionDate;

    @Column(name = "finance_comments", length = 1000)
    private String financeComments;

    @Column(name = "finance_rejection_reason", length = 1000)
    private String financeRejectionReason;

    // Application tracking
    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "applied_by")
    private String appliedBy;

    // Audit
    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum RequestType {
        EMPLOYEE_LEVEL,
        POSITION_LEVEL
    }

    public enum Status {
        PENDING_HR,
        PENDING_FINANCE,
        APPROVED,
        APPLIED,
        REJECTED
    }

    // Business logic methods

    public void hrApprove(String approver, String comments) {
        if (this.status != Status.PENDING_HR) {
            throw new IllegalStateException("Can only HR approve requests in PENDING_HR status");
        }
        this.status = Status.PENDING_FINANCE;
        this.hrApprovedBy = approver;
        this.hrDecisionDate = LocalDateTime.now();
        this.hrComments = comments;
        this.updatedAt = LocalDateTime.now();
    }

    public void hrReject(String rejector, String reason) {
        if (this.status != Status.PENDING_HR) {
            throw new IllegalStateException("Can only HR reject requests in PENDING_HR status");
        }
        this.status = Status.REJECTED;
        this.hrApprovedBy = rejector;
        this.hrDecisionDate = LocalDateTime.now();
        this.hrRejectionReason = reason;
        this.updatedAt = LocalDateTime.now();
    }

    public void financeApprove(String approver, String comments) {
        if (this.status != Status.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance approve requests in PENDING_FINANCE status");
        }
        this.status = Status.APPROVED;
        this.financeApprovedBy = approver;
        this.financeDecisionDate = LocalDateTime.now();
        this.financeComments = comments;
        this.updatedAt = LocalDateTime.now();
    }

    public void financeReject(String rejector, String reason) {
        if (this.status != Status.PENDING_FINANCE) {
            throw new IllegalStateException("Can only Finance reject requests in PENDING_FINANCE status");
        }
        this.status = Status.REJECTED;
        this.financeApprovedBy = rejector;
        this.financeDecisionDate = LocalDateTime.now();
        this.financeRejectionReason = reason;
        this.updatedAt = LocalDateTime.now();
    }

    public void markApplied(String appliedByUser) {
        this.status = Status.APPLIED;
        this.appliedAt = LocalDateTime.now();
        this.appliedBy = appliedByUser;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
