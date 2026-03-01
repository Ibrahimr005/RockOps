package com.example.backend.models.hr;

import com.example.backend.models.site.Site;
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
 * DemotionRequest - Employee demotion and position downgrade.
 * Status flow: PENDING → DEPT_HEAD_APPROVED → HR_APPROVED → APPLIED (or REJECTED at any stage)
 */
@Entity
@Table(name = "demotion_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemotionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "request_number", unique = true, length = 20)
    private String requestNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_position_id", nullable = false)
    private JobPosition currentPosition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_position_id", nullable = false)
    private JobPosition newPosition;

    @Column(name = "current_grade", length = 50)
    private String currentGrade;

    @Column(name = "new_grade", length = 50)
    private String newGrade;

    @Column(name = "current_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentSalary;

    @Column(name = "new_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal newSalary;

    @Column(name = "salary_reduction_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal salaryReductionAmount;

    @Column(name = "salary_reduction_percentage", nullable = false, precision = 8, scale = 4)
    private BigDecimal salaryReductionPercentage;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Status status = Status.PENDING;

    // JSON array of approval steps
    @Column(name = "approvals", columnDefinition = "TEXT")
    private String approvals;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    // Department Head decision
    @Column(name = "dept_head_approved_by")
    private String deptHeadApprovedBy;

    @Column(name = "dept_head_decision_date")
    private LocalDateTime deptHeadDecisionDate;

    @Column(name = "dept_head_comments", length = 1000)
    private String deptHeadComments;

    @Column(name = "dept_head_rejection_reason", length = 1000)
    private String deptHeadRejectionReason;

    // HR decision
    @Column(name = "hr_approved_by")
    private String hrApprovedBy;

    @Column(name = "hr_decision_date")
    private LocalDateTime hrDecisionDate;

    @Column(name = "hr_comments", length = 1000)
    private String hrComments;

    @Column(name = "hr_rejection_reason", length = 1000)
    private String hrRejectionReason;

    // Application tracking
    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "applied_by")
    private String appliedBy;

    // Audit
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING,
        DEPT_HEAD_APPROVED,
        HR_APPROVED,
        REJECTED,
        APPLIED
    }

    // Business logic methods

    public void deptHeadApprove(String approver, String comments) {
        if (this.status != Status.PENDING) {
            throw new IllegalStateException("Can only approve requests in PENDING status");
        }
        this.status = Status.DEPT_HEAD_APPROVED;
        this.deptHeadApprovedBy = approver;
        this.deptHeadDecisionDate = LocalDateTime.now();
        this.deptHeadComments = comments;
        this.updatedAt = LocalDateTime.now();
    }

    public void deptHeadReject(String rejector, String reason) {
        if (this.status != Status.PENDING) {
            throw new IllegalStateException("Can only reject requests in PENDING status");
        }
        this.status = Status.REJECTED;
        this.deptHeadApprovedBy = rejector;
        this.deptHeadDecisionDate = LocalDateTime.now();
        this.deptHeadRejectionReason = reason;
        this.updatedAt = LocalDateTime.now();
    }

    public void hrApprove(String approver, String comments) {
        if (this.status != Status.DEPT_HEAD_APPROVED) {
            throw new IllegalStateException("Can only HR approve requests in DEPT_HEAD_APPROVED status");
        }
        this.status = Status.HR_APPROVED;
        this.hrApprovedBy = approver;
        this.hrDecisionDate = LocalDateTime.now();
        this.hrComments = comments;
        this.updatedAt = LocalDateTime.now();
    }

    public void hrReject(String rejector, String reason) {
        if (this.status != Status.DEPT_HEAD_APPROVED) {
            throw new IllegalStateException("Can only HR reject requests in DEPT_HEAD_APPROVED status");
        }
        this.status = Status.REJECTED;
        this.hrApprovedBy = rejector;
        this.hrDecisionDate = LocalDateTime.now();
        this.hrRejectionReason = reason;
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
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
