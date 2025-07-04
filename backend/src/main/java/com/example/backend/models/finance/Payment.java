package com.example.backend.models.finance;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Data
@AllArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Link to the invoice being paid
    // Example: Payment for "ABC Lumber Invoice #1234"
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    // How much money was paid
    // Example: $2,500.00 for partial payment of $5,000 invoice
    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than 0")
    @NotNull(message = "Payment amount is required")
    private BigDecimal amount;

    // When the payment was made
    @Column(name = "payment_date", nullable = false)
    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    // How the payment was made (cash, check, bank transfer, etc.)
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // Reference number for tracking
    // Example: Check #1001, Wire confirmation #ABC123
    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    // Notes about the payment
    // Example: "Partial payment for materials delivered to Oak Street project"
    @Column(name = "notes", length = 500)
    private String notes;

    // Current status of the payment
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    // Who created this payment record
    @Column(name = "created_by", nullable = false)
    private String createdBy;

    // When this payment record was created
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // When this payment record was last updated
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Add constructor
    public Payment() {
        this.createdAt = LocalDateTime.now();
    }

    // Add @PreUpdate method
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
