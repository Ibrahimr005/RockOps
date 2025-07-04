package com.example.backend.models.transaction;

import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemType;
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

    private int quantity;
    private Integer receivedQuantity;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;

    private String rejectionReason;

    // 🆕 ADD THIS: The missing reverse relationship
    @OneToMany(mappedBy = "transactionItem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<Item> items = new ArrayList<>();
}