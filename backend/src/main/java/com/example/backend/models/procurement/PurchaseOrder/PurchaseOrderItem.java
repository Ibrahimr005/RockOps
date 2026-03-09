package com.example.backend.models.procurement.PurchaseOrder;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;
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
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private double quantity;
    private double unitPrice;
    private double totalPrice;
    private String comment;
    private String status;
    private int estimatedDeliveryDays;
    private String deliveryNotes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_type_id")
    @JsonManagedReference
    private ItemType itemType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_purchase_spec_id")
    private EquipmentPurchaseSpec equipmentSpec;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "merchant_id")
    @JsonManagedReference
    private Merchant merchant;

    @ManyToOne
    @JoinColumn(name = "purchase_order_id")
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @OneToOne
    @JoinColumn(name = "offer_item_id")
    @JsonManagedReference
    private OfferItem offerItem;

    @OneToMany(mappedBy = "purchaseOrderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DeliveryItemReceipt> itemReceipts = new ArrayList<>();

    @Column(name = "payment_status")
    @Enumerated(EnumType.STRING)
    private POItemPaymentStatus paymentStatus = POItemPaymentStatus.PENDING;

    @Column(name = "payment_request_item_id")
    private UUID paymentRequestItemId;
}