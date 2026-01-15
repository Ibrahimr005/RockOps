package com.example.backend.models.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.procurement.Offer;
import com.fasterxml.jackson.annotation.JsonManagedReference;
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
@Table(name = "offer_financial_reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferFinancialReview {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "offer_id", nullable = true)
    @JsonManagedReference
    private Offer offer;

    @ManyToOne
    @JoinColumn(name = "maintenance_record_id", nullable = true)
    private MaintenanceRecord maintenanceRecord;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "budget_category", length = 100)
    private String budgetCategory;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    @Column(name = "reviewed_by_user_name", length = 255)
    private String reviewedByUserName;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private FinanceReviewStatus status;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "expected_payment_date")
    private LocalDate expectedPaymentDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}