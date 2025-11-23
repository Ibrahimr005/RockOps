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
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String poNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status;

    @ManyToOne
    @JoinColumn(name = "request_order_id")
    private RequestOrder requestOrder;

    @OneToOne
    @JoinColumn(name = "offer_id")
    @JsonManagedReference
    private Offer offer;

    private String createdBy;
    private String approvedBy;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<PurchaseOrderItem> purchaseOrderItems = new ArrayList<>();

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DeliverySession> deliverySessions = new ArrayList<>();

    private LocalDateTime financeApprovalDate;
    private String paymentTerms;
    private LocalDateTime expectedDeliveryDate;
    private double totalAmount;
    private String currency;
}