package com.example.backend.models.procurement;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
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
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "delivery_item_receipts")
public class DeliveryItemReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_session_id", nullable = false)
    @JsonBackReference
    private DeliverySession deliverySession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    @JsonBackReference
    private PurchaseOrderItem purchaseOrderItem;

    @Column(nullable = false)
    private Double goodQuantity;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRedelivery = false;

    @OneToMany(mappedBy = "deliveryItemReceipt", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<PurchaseOrderIssue> issues = new ArrayList<>();
}