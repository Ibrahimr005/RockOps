package com.example.backend.models.procurement.PurchaseOrderReturn;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "purchase_order_returns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private Merchant merchant;

    @Column(name = "return_number", unique = true, nullable = false, length = 100)
    private String returnNumber;

    @Column(name = "total_return_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalReturnAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private PurchaseOrderReturnStatus status = PurchaseOrderReturnStatus.PENDING;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "requested_by", nullable = false)
    private String requestedBy;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "purchaseOrderReturn", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PurchaseOrderReturnItem> returnItems = new ArrayList<>();

    // Helper methods
    public void addReturnItem(PurchaseOrderReturnItem item) {
        returnItems.add(item);
        item.setPurchaseOrderReturn(this);
    }

    public void calculateTotalReturnAmount() {
        this.totalReturnAmount = returnItems.stream()
                .map(PurchaseOrderReturnItem::getTotalReturnAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}