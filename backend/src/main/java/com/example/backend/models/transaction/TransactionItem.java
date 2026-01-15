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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    // Store the breakdown of deducted items as JSON
    @Column(columnDefinition = "TEXT")
    private String deductedItemsJson;

    private Integer correctedQuantity; // For counting error resolutions
    @Builder.Default
    private Boolean fullyResolved = false; // Use Boolean to handle NULL values properly

    // 🆕 ADD THIS: The missing reverse relationship
    @OneToMany(mappedBy = "transactionItem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Item> items = new ArrayList<>();

    // Helper methods to work with deductedItems
    public void setDeductedItems(List<Map<String, Object>> deductedItems) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            this.deductedItemsJson = mapper.writeValueAsString(deductedItems);
        } catch (Exception e) {
            System.err.println("Failed to serialize deducted items: " + e.getMessage());
            this.deductedItemsJson = null;
        }
    }

    public List<Map<String, Object>> getDeductedItems() {
        if (deductedItemsJson == null || deductedItemsJson.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(deductedItemsJson, new TypeReference<List<Map<String, Object>>>(){});
        } catch (Exception e) {
            System.err.println("Failed to deserialize deducted items: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}