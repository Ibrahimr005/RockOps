package com.example.backend.models.finance.Valuation;

import com.example.backend.models.warehouse.Warehouse;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Financial valuation tracking for warehouses
 * Separates financial reporting from operational warehouse data
 */
@Entity
@Table(name = "warehouse_valuation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "warehouse_id", nullable = false, unique = true)
    private Warehouse warehouse;

    // Current inventory value (items with status IN_WAREHOUSE)
    @Column(name = "current_value", nullable = false)
    @Builder.Default
    private Double currentValue = 0.0;

    // Total expenses (items with status CONSUMED)
    @Column(name = "total_expenses", nullable = false)
    @Builder.Default
    private Double totalExpenses = 0.0;

    // Total items count (IN_WAREHOUSE)
    @Column(name = "total_items")
    private Integer totalItems;

    // Audit fields
    @Column(name = "last_calculated_at")
    private LocalDateTime lastCalculatedAt;

    @Column(name = "last_calculated_by")
    private String lastCalculatedBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}