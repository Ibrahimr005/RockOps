package com.example.backend.models.procurement.Logistics;

import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.merchant.Merchant;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "logistics")
public class Logistics {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "logistics_number", unique = true, length = 50)
    private String logisticsNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id")
    private Merchant merchant;

    @Column(name = "merchant_name")
    private String merchantName;

    @Column(name = "total_cost", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCost;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "carrier_company", nullable = false)
    private String carrierCompany;

    @Column(name = "driver_name", nullable = false)
    private String driverName;

    @Column(name = "driver_phone")
    private String driverPhone;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LogisticsStatus status;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_request_id")
    private PaymentRequest paymentRequest;

    @OneToMany(mappedBy = "logistics", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<LogisticsPurchaseOrder> purchaseOrders = new ArrayList<>();

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_by")
    private String rejectedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = LogisticsStatus.PENDING_APPROVAL;
        }
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Helper method to get payment request ID
    public UUID getPaymentRequestId() {
        return paymentRequest != null ? paymentRequest.getId() : null;
    }
}