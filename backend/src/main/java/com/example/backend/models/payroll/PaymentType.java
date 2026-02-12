package com.example.backend.models.payroll;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * PaymentType defines how employees are paid.
 * Examples: Bank Transfer, Cash, Cheque, Mobile Wallet
 *
 * Both HR and Finance can create payment types.
 */
@Entity
@Table(name = "payment_types", indexes = {
    @Index(name = "idx_payment_types_active", columnList = "is_active"),
    @Index(name = "idx_payment_types_code", columnList = "code")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentType {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Whether this payment type requires bank account details
     * (bank name, account number, account holder name)
     */
    @Column(name = "requires_bank_details", nullable = false)
    @Builder.Default
    private Boolean requiresBankDetails = false;

    /**
     * Whether this payment type requires wallet details
     * (mobile wallet number)
     */
    @Column(name = "requires_wallet_details", nullable = false)
    @Builder.Default
    private Boolean requiresWalletDetails = false;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
