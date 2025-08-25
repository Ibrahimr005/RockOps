package com.example.backend.models.transaction;

import com.example.backend.models.PartyType;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Basic transaction data
    @CreationTimestamp
    private LocalDateTime createdAt;
    private LocalDateTime transactionDate;
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;

    // Transaction meta information
    private String rejectionReason;
    private String acceptanceComment;
    private String description;
    private String addedBy;
    private String handledBy;
    private String approvedBy;

    // Party information
    @Enumerated(EnumType.STRING)
    private PartyType senderType;
    private UUID senderId;

    @Enumerated(EnumType.STRING)
    private PartyType receiverType;
    private UUID receiverId;

    @Column(unique = true)
    private Integer batchNumber;
    private UUID sentFirst;



    // Transaction items - new relationship
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties({"transaction", "hibernateLazyInitializer", "handler"})
    private List<TransactionItem> items;


    @Enumerated(EnumType.STRING)
    private TransactionPurpose purpose = TransactionPurpose.GENERAL; // Default to GENERAL

    // Add this field to your Transaction class
    @ManyToOne
    @JoinColumn(name = "maintenance_id")
    @JsonBackReference
    private InSiteMaintenance maintenance;


    // Helper method to add items
    public void addItem(TransactionItem item) {
        System.out.println("Inside addItem - setting transaction");
        if (items == null) System.out.println("Item list is null!");
        items.add(item);
        item.setTransaction(this);
        System.out.println("Item added");
    }

}
