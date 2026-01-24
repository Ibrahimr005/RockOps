package com.example.backend.models.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestItemStatus;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_request_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "payment_request_id", nullable = false, referencedColumnName = "id")
    @JsonBackReference
    private PaymentRequest paymentRequest;

    @Column(name = "item_id")
    private UUID itemId;

    @Column(name = "item_name", nullable = false, length = 500)
    private String itemName;

    @Column(name = "item_description", columnDefinition = "TEXT")
    private String itemDescription;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "paid_amount", precision = 15, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "remaining_amount", precision = 15, scale = 2)
    private BigDecimal remainingAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private PaymentRequestItemStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "purchase_order_item_id")
    private UUID purchaseOrderItemId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (paidAmount == null) {
            paidAmount = BigDecimal.ZERO;
        }
        if (remainingAmount == null) {
            remainingAmount = totalPrice;
        }
        if (status == null) {
            status = PaymentRequestItemStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}