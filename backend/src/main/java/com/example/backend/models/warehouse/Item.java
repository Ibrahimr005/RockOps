package com.example.backend.models.warehouse;

import com.example.backend.models.transaction.TransactionItem;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "item_type_id", nullable = false)
    private ItemType itemType;

    private int quantity;

    // NEW: Price per unit for this specific item
    @Column(name = "unit_price")
    private Double unitPrice;

    // NEW: Total value (quantity * unitPrice) - calculated field
    @Column(name = "total_value")
    private Double totalValue;

    @ManyToOne
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnore
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    private ItemStatus itemStatus;

    @Builder.Default
    private boolean resolved = false;

    private LocalDateTime createdAt;
    private String createdBy;

    // NEW: Track who approved the price and when
    private String priceApprovedBy;
    private LocalDateTime priceApprovedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_source")
    private ItemSource itemSource;

    @Column(name = "source_reference")
    private String sourceReference;

    @Column(name = "merchant_name")
    private String merchantName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_item_id")
    @JsonIgnoreProperties({"items", "hibernateLazyInitializer", "handler"})
    private TransactionItem transactionItem;

    private String comment;

    public Item(ItemType itemType, Warehouse warehouse, int quantity, ItemStatus itemStatus) {
        this.itemType = itemType;
        this.warehouse = warehouse;
        this.quantity = quantity;
        this.itemStatus = itemStatus;
    }

    // Helper method to calculate total value
    public void calculateTotalValue() {
        if (unitPrice != null && quantity > 0) {
            this.totalValue = unitPrice * quantity;
        } else {
            this.totalValue = 0.0;
        }
    }

    public boolean isResolved() {
        return resolved;
    }

    public void setResolved(boolean resolved) {
        this.resolved = resolved;
    }

    @JsonProperty("batchNumber")
    public Integer getBatchNumber() {
        if (transactionItem != null && transactionItem.getTransaction() != null) {
            return transactionItem.getTransaction().getBatchNumber();
        }
        return null;
    }

    @JsonProperty("transactionId")
    public UUID getTransactionId() {
        if (transactionItem != null && transactionItem.getTransaction() != null) {
            return transactionItem.getTransaction().getId();
        }
        return null;
    }
}