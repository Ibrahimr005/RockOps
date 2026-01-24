package com.example.backend.models.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.maintenance.MaintenanceStep;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
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
@Table(name = "payment_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "request_number", nullable = false, unique = true, length = 50)
    private String requestNumber;

    @ManyToOne
    @JoinColumn(name = "purchase_order_id", nullable = true)
    private PurchaseOrder purchaseOrder;

    @ManyToOne
    @JoinColumn(name = "maintenance_step_id", nullable = true)
    private MaintenanceStep maintenanceStep;

    @ManyToOne
    @JoinColumn(name = "maintenance_record_id", nullable = true)
    private MaintenanceRecord maintenanceRecord;

    @ManyToOne
    @JoinColumn(name = "offer_financial_review_id")
    private OfferFinancialReview offerFinancialReview;

    @Column(name = "requested_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private PaymentRequestStatus status;

    @Column(name = "requested_by_user_id", nullable = false)
    private UUID requestedByUserId;

    @Column(name = "requested_by_user_name", length = 255)
    private String requestedByUserName;

    @Column(name = "requested_by_department", length = 100)
    private String requestedByDepartment;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    @Column(name = "reviewed_by_user_name", length = 255)
    private String reviewedByUserName;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_by_user_name", length = 255)
    private String approvedByUserName;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    @Column(name = "rejected_by_user_id")
    private UUID rejectedByUserId;

    @Column(name = "rejected_by_user_name", length = 255)
    private String rejectedByUserName;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "payment_scheduled_date")
    private LocalDate paymentScheduledDate;

    @Column(name = "total_paid_amount", precision = 15, scale = 2)
    private BigDecimal totalPaidAmount;

    @Column(name = "remaining_amount", precision = 15, scale = 2)
    private BigDecimal remainingAmount;

    // Merchant information
    @ManyToOne
    @JoinColumn(name = "merchant_id")
    private Merchant merchant;

    @Column(name = "merchant_name", length = 255)
    private String merchantName;

    @Column(name = "merchant_account_number", length = 100)
    private String merchantAccountNumber;

    @Column(name = "merchant_bank_name", length = 255)
    private String merchantBankName;

    @Column(name = "merchant_contact_person", length = 255)
    private String merchantContactPerson;

    @Column(name = "merchant_contact_phone", length = 50)
    private String merchantContactPhone;

    @Column(name = "merchant_contact_email", length = 255)
    private String merchantContactEmail;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @OneToMany(mappedBy = "paymentRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<PaymentRequestItem> paymentRequestItems = new ArrayList<>();

    @OneToMany(mappedBy = "paymentRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<AccountPayablePayment> payments = new ArrayList<>();

    @OneToMany(mappedBy = "paymentRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<PaymentRequestStatusHistory> statusHistory = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        requestedAt = LocalDateTime.now();

        if (totalPaidAmount == null) {
            totalPaidAmount = BigDecimal.ZERO;
        }
        if (remainingAmount == null) {
            remainingAmount = requestedAmount;
        }
        if (status == null) {
            status = PaymentRequestStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}