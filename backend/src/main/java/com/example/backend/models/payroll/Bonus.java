package com.example.backend.models.payroll;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bonuses", indexes = {
    @Index(name = "idx_bonus_site", columnList = "site_id"),
    @Index(name = "idx_bonus_employee", columnList = "employee_id"),
    @Index(name = "idx_bonus_type", columnList = "bonus_type_id"),
    @Index(name = "idx_bonus_status", columnList = "status"),
    @Index(name = "idx_bonus_effective", columnList = "effective_month,effective_year"),
    @Index(name = "idx_bonus_payroll", columnList = "payroll_id"),
    @Index(name = "idx_bonus_bulk", columnList = "bulk_bonus_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employee", "bonusType", "site", "payroll"})
@ToString(exclude = {"employee", "bonusType", "site", "payroll"})
public class Bonus {

    public enum BonusStatus {
        DRAFT("Draft"),
        PENDING_HR_APPROVAL("Pending HR Approval"),
        HR_APPROVED("HR Approved"),
        HR_REJECTED("HR Rejected"),
        PENDING_PAYMENT("Pending Payment"),
        PAID("Paid"),
        CANCELLED("Cancelled");

        private final String displayName;

        BonusStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "bonus_number", nullable = false, unique = true, length = 30)
    private String bonusNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bonus_type_id", nullable = false)
    private BonusType bonusType;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "effective_month")
    private Integer effectiveMonth;

    @Column(name = "effective_year")
    private Integer effectiveYear;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BonusStatus status;

    @Column(length = 500)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // HR approval fields
    @Column(name = "hr_approved_by", length = 100)
    private String hrApprovedBy;

    @Column(name = "hr_approved_at")
    private LocalDateTime hrApprovedAt;

    @Column(name = "hr_rejected_by", length = 100)
    private String hrRejectedBy;

    @Column(name = "hr_rejected_at")
    private LocalDateTime hrRejectedAt;

    @Column(name = "hr_rejection_reason", length = 500)
    private String hrRejectionReason;

    // Finance link
    @Column(name = "payment_request_id")
    private UUID paymentRequestId;

    @Column(name = "payment_request_number", length = 30)
    private String paymentRequestNumber;

    // Bulk tracking
    @Column(name = "bulk_bonus_id")
    private UUID bulkBonusId;

    // Payroll link
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_id")
    private Payroll payroll;

    // Audit fields
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Site
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = BonusStatus.PENDING_HR_APPROVAL;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ========================================
    // BUSINESS METHODS
    // ========================================

    public void hrApprove(String approver) {
        if (status != BonusStatus.PENDING_HR_APPROVAL) {
            throw new IllegalStateException("Cannot approve bonus in status: " + status);
        }
        this.status = BonusStatus.HR_APPROVED;
        this.hrApprovedBy = approver;
        this.hrApprovedAt = LocalDateTime.now();
    }

    public void hrReject(String rejector, String rejectionReason) {
        if (status != BonusStatus.PENDING_HR_APPROVAL) {
            throw new IllegalStateException("Cannot reject bonus in status: " + status);
        }
        this.status = BonusStatus.HR_REJECTED;
        this.hrRejectedBy = rejector;
        this.hrRejectedAt = LocalDateTime.now();
        this.hrRejectionReason = rejectionReason;
    }

    public void markPendingPayment(UUID paymentRequestId, String paymentRequestNumber) {
        if (status != BonusStatus.HR_APPROVED) {
            throw new IllegalStateException("Cannot mark pending payment in status: " + status);
        }
        this.status = BonusStatus.PENDING_PAYMENT;
        this.paymentRequestId = paymentRequestId;
        this.paymentRequestNumber = paymentRequestNumber;
    }

    public void markPaid() {
        if (status != BonusStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Cannot mark paid in status: " + status);
        }
        this.status = BonusStatus.PAID;
    }

    public void cancel() {
        if (status == BonusStatus.PAID) {
            throw new IllegalStateException("Cannot cancel a paid bonus");
        }
        this.status = BonusStatus.CANCELLED;
    }

    public void revertToHrApproved() {
        if (status != BonusStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Cannot revert bonus in status: " + status);
        }
        this.status = BonusStatus.HR_APPROVED;
        this.paymentRequestId = null;
        this.paymentRequestNumber = null;
    }
}
