package com.example.backend.models.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Existing fields
    private double quantity;
    private double unitPrice;
    private double totalPrice;
    private String comment;
    private String status;
    private int estimatedDeliveryDays;
    private String deliveryNotes;

    private Double receivedQuantity; // Quantity actually received (null if not received yet)
    private LocalDateTime receivedAt; // When items were received
    private String receivedBy; // Who marked them as received

    // ADD THESE DIRECT RELATIONSHIPS:
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_type_id")
    @JsonManagedReference
    private ItemType itemType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "merchant_id")
    @JsonManagedReference
    private Merchant merchant;

    // Keep existing relationships
    @ManyToOne
    @JoinColumn(name = "purchase_order_id")
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @OneToOne
    @JoinColumn(name = "offer_item_id")
    @JsonManagedReference  // ORIGINAL VALUE
    private OfferItem offerItem;
}