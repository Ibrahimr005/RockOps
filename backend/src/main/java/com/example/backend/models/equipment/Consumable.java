package com.example.backend.models.equipment;


import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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

    @ManyToOne
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    @ManyToOne
    @JoinColumn(name="equipment_id", referencedColumnName = "id")
    @JsonManagedReference
    private Equipment equipment;

    private boolean resolved = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
