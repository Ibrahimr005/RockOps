package com.example.backend.models.procurement.RequestOrder;

import com.example.backend.models.warehouse.ItemType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private double quantity;
    private String comment;

    @ManyToOne
    @JoinColumn(name = "request_order_id")
    @JsonBackReference
    private RequestOrder requestOrder;

    @ManyToOne
    @JoinColumn(name = "item_type_id")
    // ✅ REMOVED @JsonManagedReference - it doesn't belong on @ManyToOne
    private ItemType itemType;
}