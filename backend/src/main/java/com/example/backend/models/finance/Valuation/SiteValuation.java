package com.example.backend.models.finance.Valuation;

import com.example.backend.models.site.Site;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Financial valuation tracking for sites
 * Aggregates all warehouse, equipment, and fixed asset valuations
 */
@Entity
@Table(name = "site_valuation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "site_id", nullable = false, unique = true)
    private Site site;

    // Total current value (sum of all assets)
    @Column(name = "total_value", nullable = false)
    @Builder.Default
    private Double totalValue = 0.0;

    // Breakdown by category
    @Column(name = "warehouse_value", nullable = false)
    @Builder.Default
    private Double warehouseValue = 0.0;

    @Column(name = "equipment_value", nullable = false)
    @Builder.Default
    private Double equipmentValue = 0.0;

    @Column(name = "fixed_assets_value", nullable = false)
    @Builder.Default
    private Double fixedAssetsValue = 0.0;

    // Total expenses (sum of all expenses)
    @Column(name = "total_expenses", nullable = false)
    @Builder.Default
    private Double totalExpenses = 0.0;

    // Breakdown of expenses by category
    @Column(name = "warehouse_expenses", nullable = false)
    @Builder.Default
    private Double warehouseExpenses = 0.0;

    @Column(name = "equipment_expenses", nullable = false)
    @Builder.Default
    private Double equipmentExpenses = 0.0;

    @Column(name = "fixed_assets_expenses", nullable = false)
    @Builder.Default
    private Double fixedAssetsExpenses = 0.0;

    // Counts
    @Column(name = "warehouse_count")
    private Integer warehouseCount;

    @Column(name = "equipment_count")
    private Integer equipmentCount;

    @Column(name = "fixed_assets_count")
    private Integer fixedAssetsCount;

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

    /**
     * Calculate total value from all categories
     */
    public void calculateTotalValue() {
        this.totalValue =
                (this.warehouseValue != null ? this.warehouseValue : 0.0) +
                        (this.equipmentValue != null ? this.equipmentValue : 0.0) +
                        (this.fixedAssetsValue != null ? this.fixedAssetsValue : 0.0);
    }

    /**
     * Calculate total expenses from all categories
     */
    public void calculateTotalExpenses() {
        this.totalExpenses =
                (this.warehouseExpenses != null ? this.warehouseExpenses : 0.0) +
                        (this.equipmentExpenses != null ? this.equipmentExpenses : 0.0) +
                        (this.fixedAssetsExpenses != null ? this.fixedAssetsExpenses : 0.0);
    }
}