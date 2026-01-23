package com.example.backend.models.warehouse;

import com.example.backend.models.procurement.OfferItem;
import com.example.backend.models.procurement.RequestOrderItem;
import com.example.backend.models.transaction.TransactionItem;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
public class ItemType {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;
    private String comment;
    private String measuringUnit;
    private String status;
    private int minQuantity;
    private String serialNumber;

    // NEW: Base price for reference (not enforced)
    @Column(name = "base_price")
    private Double basePrice;

    // NEW: Last updated price info
    private LocalDateTime basePriceUpdatedAt;
    private String basePriceUpdatedBy;

    @OneToMany(mappedBy = "itemType")
    @JsonIgnore
    private List<Item> items = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "item_category_id", nullable = false)
    private ItemCategory itemCategory;

    @OneToMany(mappedBy = "itemType")
    @JsonIgnore
    private List<TransactionItem> transactionItems = new ArrayList<>();

    @OneToMany(mappedBy = "itemType")
    @JsonIgnore
    private List<RequestOrderItem> requestOrderItems = new ArrayList<>();

    @OneToMany(mappedBy = "itemType")
    @JsonIgnore
    private List<OfferItem> offerItems = new ArrayList<>();
}