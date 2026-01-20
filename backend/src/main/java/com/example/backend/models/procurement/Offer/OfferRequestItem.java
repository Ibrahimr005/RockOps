// OfferRequestItem.java
package com.example.backend.models.procurement.Offer;

import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modified request items specific to this offer.
 * If offer has these, they override the original RequestOrder items.
 */
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferRequestItem {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "offer_id")
    @JsonBackReference
    private Offer offer;

    @ManyToOne
    @JoinColumn(name = "item_type_id")
    @JsonManagedReference
    private ItemType itemType;

    private double quantity;
    private String comment;

    // Track which original request item this came from (if any)
    private UUID originalRequestOrderItemId;

    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime lastModifiedAt;
    private String lastModifiedBy;
}