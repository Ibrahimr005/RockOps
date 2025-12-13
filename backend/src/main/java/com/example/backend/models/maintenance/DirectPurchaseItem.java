package com.example.backend.models.maintenance;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "direct_purchase_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectPurchaseItem {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "direct_purchase_ticket_id", nullable = false)
    private DirectPurchaseTicket directPurchaseTicket;

    @NotBlank(message = "Item name is required")
    @Size(max = 255, message = "Item name must not exceed 255 characters")
    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost per unit must be non-negative")
    @Column(name = "expected_cost_per_unit", precision = 10, scale = 2)
    private BigDecimal expectedCostPerUnit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Actual cost per unit must be non-negative")
    @Column(name = "actual_cost_per_unit", precision = 10, scale = 2)
    private BigDecimal actualCostPerUnit;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    // Calculated methods

    /**
     * Calculate total expected cost for this item
     * @return quantity × expectedCostPerUnit
     */
    public BigDecimal getTotalExpectedCost() {
        if (expectedCostPerUnit == null || quantity == null) {
            return BigDecimal.ZERO;
        }
        return expectedCostPerUnit.multiply(BigDecimal.valueOf(quantity));
    }

    /**
     * Calculate total actual cost for this item
     * @return quantity × actualCostPerUnit
     */
    public BigDecimal getTotalActualCost() {
        if (actualCostPerUnit == null || quantity == null) {
            return BigDecimal.ZERO;
        }
        return actualCostPerUnit.multiply(BigDecimal.valueOf(quantity));
    }

    /**
     * Check if expected cost has been set
     * @return true if expectedCostPerUnit is not null and greater than zero
     */
    public boolean hasExpectedCost() {
        return expectedCostPerUnit != null && expectedCostPerUnit.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Check if actual cost has been set
     * @return true if actualCostPerUnit is not null and greater than zero
     */
    public boolean hasActualCost() {
        return actualCostPerUnit != null && actualCostPerUnit.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Calculate cost difference (actual - expected)
     * @return difference between actual and expected total cost
     */
    public BigDecimal getCostDifference() {
        if (!hasExpectedCost() || !hasActualCost()) {
            return BigDecimal.ZERO;
        }
        return getTotalActualCost().subtract(getTotalExpectedCost());
    }

    /**
     * Check if actual cost exceeds expected cost
     * @return true if actual cost is greater than expected cost
     */
    public boolean isOverBudget() {
        return hasExpectedCost() && hasActualCost() && getCostDifference().compareTo(BigDecimal.ZERO) > 0;
    }
}
