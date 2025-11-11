package com.example.backend.models.procurement;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "purchase_order_deliveries")
public class PurchaseOrderDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    @JsonBackReference
    private PurchaseOrderItem purchaseOrderItem;

    // What was received in good condition in THIS delivery
    @Column(name = "received_good_quantity")
    private Double receivedGoodQuantity;

    // When this delivery was processed
    @Column(nullable = false)
    private LocalDateTime deliveredAt;

    // Who processed this delivery
    @Column(nullable = false)
    private String processedBy;

    // Optional notes about this delivery
    @Column(columnDefinition = "TEXT")
    private String deliveryNotes;

    // Is this a redelivery for a previous issue?
    @Column(name = "is_redelivery")
    private Boolean isRedelivery = false;

    // If redelivery, which issue triggered it?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "redelivery_for_issue_id")
    private PurchaseOrderIssue redeliveryForIssue;

    // Issues reported in THIS specific delivery
    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<PurchaseOrderIssue> issues = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (deliveredAt == null) {
            deliveredAt = LocalDateTime.now();
        }
        if (isRedelivery == null) {
            isRedelivery = false;
        }
    }
}