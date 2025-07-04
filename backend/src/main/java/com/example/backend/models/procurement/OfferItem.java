package com.example.backend.models.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor  // Only keep this constructor
public class OfferItem {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private double quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private String currency;

    @ManyToOne
    @JoinColumn(name = "merchant_id")
    private Merchant merchant;

    @ManyToOne
    @JoinColumn(name = "offer_id")
    @JsonBackReference
    private Offer offer;

    @ManyToOne
    @JoinColumn(name = "request_order_item_id")
    private RequestOrderItem requestOrderItem;

    @ManyToOne
    @JoinColumn(name = "item_type_id", nullable = true)
    @JsonManagedReference
    private ItemType itemType;

    private Integer estimatedDeliveryDays;
    private String deliveryNotes;
    private String comment;
    private String financeStatus;
    private String rejectionReason;
    private String financeApprovedBy;

    @OneToOne(mappedBy = "offerItem")
    @JsonBackReference
    private PurchaseOrderItem purchaseOrderItem;
}