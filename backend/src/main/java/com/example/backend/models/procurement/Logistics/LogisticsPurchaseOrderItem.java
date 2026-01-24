package com.example.backend.models.procurement.Logistics;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
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
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "logistics_purchase_order_items")
public class LogisticsPurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_purchase_order_id", nullable = false)
    @JsonBackReference
    private LogisticsPurchaseOrder logisticsPurchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    private PurchaseOrderItem purchaseOrderItem;

    @Column(name = "item_type_name", nullable = false)
    private String itemTypeName;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalValue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}