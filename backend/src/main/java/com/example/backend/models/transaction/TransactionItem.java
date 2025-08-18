package com.example.backend.models.transaction;

import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.ResolutionType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "transaction_id")
    @JsonIgnoreProperties({"transactionItems", "hibernateLazyInitializer", "handler"})
    private Transaction transaction;

    @ManyToOne
    @JoinColumn(name = "item_type_id", nullable = false)
    private ItemType itemType;

    private int quantity; // Warehouse claimed sent quantity
    private Integer receivedQuantity; // Warehouse validation quantity (used in warehouse-to-warehouse)
    private Integer equipmentReceivedQuantity; // Equipment claimed received quantity (used when equipment is receiver)

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;

    private String rejectionReason;

    // Resolution information (copied from DTO for consistency)
    @Builder.Default
    private Boolean isResolved = false; // Use Boolean to handle NULL values properly
    @Enumerated(EnumType.STRING)
    private ResolutionType resolutionType;
    private String resolutionNotes;
    private String resolvedBy;
    private Integer correctedQuantity; // For counting error resolutions
    @Builder.Default
    private Boolean fullyResolved = false; // Use Boolean to handle NULL values properly

    // 🆕 ADD THIS: The missing reverse relationship
    @OneToMany(mappedBy = "transactionItem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Item> items = new ArrayList<>();
}