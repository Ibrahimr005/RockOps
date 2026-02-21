package com.example.backend.models.finance.incomingPayments;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "incoming_payment_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncomingPaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private Merchant merchant;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 50)
    private IncomingPaymentSource source = IncomingPaymentSource.REFUND;

    @Column(name = "source_reference_id")
    private UUID sourceReferenceId; // Links to PurchaseOrderReturn.id or other source entities

    @Column(name = "total_refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalRefundAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private IncomingPaymentStatus status = IncomingPaymentStatus.PENDING;

    // Balance information - filled when payment is confirmed
    @Enumerated(EnumType.STRING)
    @Column(name = "balance_type")
    private AccountType balanceType;

    @Column(name = "balance_account_id")
    private UUID balanceAccountId;

    @Column(name = "balance_account_name")
    private String balanceAccountName;

    @Column(name = "date_received")
    private LocalDate dateReceived;

    @Column(name = "finance_notes", columnDefinition = "TEXT")
    private String financeNotes;

    @Column(name = "confirmed_by")
    private String confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "incomingPaymentRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<IncomingPaymentRequestItem> incomingPaymentItems = new ArrayList<>();

    // Helper method to add item
    public void addIncomingPaymentItem(IncomingPaymentRequestItem item) {
        incomingPaymentItems.add(item);
        item.setIncomingPaymentRequest(this);
    }

    // Helper method to calculate total
    public void calculateTotalAmount() {
        this.totalRefundAmount = incomingPaymentItems.stream()
                .map(IncomingPaymentRequestItem::getTotalRefundAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}