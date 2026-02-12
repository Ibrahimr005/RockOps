package com.example.backend.models.finance.Valuation;

import com.example.backend.models.equipment.Equipment;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Financial valuation tracking for equipment
 * Separates financial reporting from operational equipment data
 */
@Entity
@Table(name = "equipment_valuation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "equipment_id", nullable = false, unique = true)
    private Equipment equipment;

    // Purchase price (original cost)
    @Column(name = "purchase_price", nullable = false)
    private Double purchasePrice;

    // Current value (purchase price - depreciation)
    // For now = purchase price (depreciation will be added later)
    @Column(name = "current_value", nullable = false)
    private Double currentValue;

    // Current inventory value (consumables with status IN_WAREHOUSE)
    @Column(name = "current_inventory_value", nullable = false)
    @Builder.Default
    private Double currentInventoryValue = 0.0;

    // Total expenses (consumables with status CONSUMED)
    @Column(name = "total_expenses", nullable = false)
    @Builder.Default
    private Double totalExpenses = 0.0;

    // Depreciation (for future use)
    @Column(name = "accumulated_depreciation")
    @Builder.Default
    private Double accumulatedDepreciation = 0.0;

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
     * Calculate current value based on purchase price and depreciation
     */
    public void calculateCurrentValue() {
        this.currentValue = this.purchasePrice - (this.accumulatedDepreciation != null ? this.accumulatedDepreciation : 0.0);
        if (this.currentValue < 0) {
            this.currentValue = 0.0;
        }
    }
}