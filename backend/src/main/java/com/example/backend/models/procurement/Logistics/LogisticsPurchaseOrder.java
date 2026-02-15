package com.example.backend.models.procurement.Logistics;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.fasterxml.jackson.annotation.JsonBackReference;
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
@Table(name = "logistics_purchase_orders")
public class LogisticsPurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_id", nullable = false)
    @JsonBackReference
    private Logistics logistics;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(name = "allocated_cost", nullable = false, precision = 15, scale = 2)
    private BigDecimal allocatedCost;

    @Column(name = "cost_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal costPercentage;

    @Column(name = "total_items_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalItemsValue;

    @OneToMany(mappedBy = "logisticsPurchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<LogisticsPurchaseOrderItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}