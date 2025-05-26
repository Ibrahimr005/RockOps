package com.example.backend.models.warehouse;

import com.example.backend.models.transaction.TransactionItem;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

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

    @ManyToOne
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    private ItemStatus itemStatus;

//    @ManyToOne
//    @JoinColumn(name = "transaction_id")
//    private Transaction transaction;

    @Builder.Default
    private boolean resolved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_item_id")
    @JsonBackReference("item-transactionItem")
    private TransactionItem transactionItem;


    public Item(ItemType itemType, Warehouse warehousez, int quantity, ItemStatus itemStatus) {
        this.itemType = itemType;
        this.warehouse = warehouse;
        this.quantity = quantity;
        this.itemStatus = itemStatus;
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