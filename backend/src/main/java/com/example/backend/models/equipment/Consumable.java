package com.example.backend.models.equipment;


import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
public class Consumable {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "item_id", referencedColumnName = "id")
    private ItemType itemType; // Reference to Item type

    private int quantity;

    @Enumerated(EnumType.STRING)
    private ItemStatus status;

    // Legacy single transaction field - kept for backward compatibility during migration
    @ManyToOne
    @JoinColumn(name = "transaction_id")
    @JsonIgnore
    private Transaction transaction;

    // New relationship: List of transactions that contributed to this consumable
    @ManyToMany
    @JoinTable(
        name = "consumable_transactions",
        joinColumns = @JoinColumn(name = "consumable_id"),
        inverseJoinColumns = @JoinColumn(name = "transaction_id")
    )
    @JsonIgnore
    private List<Transaction> transactions = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name="equipment_id", referencedColumnName = "id")
    @JsonManagedReference
    private Equipment equipment;

    private boolean resolved = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
