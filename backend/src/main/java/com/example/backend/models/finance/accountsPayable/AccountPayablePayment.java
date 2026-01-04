package com.example.backend.models.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.models.merchant.Merchant;
import com.fasterxml.jackson.annotation.JsonBackReference;
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
@Table(name = "accounts_payable_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountPayablePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "payment_number", nullable = false, unique = true, length = 50)
    private String paymentNumber;

    @ManyToOne
    @JoinColumn(name = "payment_request_id", nullable = false, referencedColumnName = "id")
    @JsonBackReference
    private PaymentRequest paymentRequest;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 50)
    private PaymentMethod paymentMethod;

    @Column(name = "payment_account_id")
    private UUID paymentAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_account_type", length = 50)
    private AccountType paymentAccountType;

    @Column(name = "transaction_reference", length = 255)
    private String transactionReference;

    @ManyToOne
    @JoinColumn(name = "paid_to_merchant_id")
    private Merchant paidToMerchant;

    @Column(name = "paid_to_name", length = 255)
    private String paidToName;

    @Column(name = "processed_by_user_id", nullable = false)
    private UUID processedByUserId;

    @Column(name = "processed_by_user_name", length = 255)
    private String processedByUserName;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "receipt_file_path", length = 500)
    private String receiptFilePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private PaymentStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        processedAt = LocalDateTime.now();

        if (status == null) {
            status = PaymentStatus.COMPLETED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}