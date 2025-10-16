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

    // Purchase Order identification
    private String poNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Purchase Order status (DRAFT, PENDING_PROCUREMENT_APPROVAL, APPROVED_BY_PROCUREMENT,
    // PENDING_FINANCE_APPROVAL, APPROVED, REJECTED)
    private String status;

    @ManyToOne
    @JoinColumn(name = "request_order_id") // Removed 'unique = true'
    private RequestOrder requestOrder;

    // Associated offer (the offer that generated this PO)
    @OneToOne
    @JoinColumn(name = "offer_id")
    @JsonManagedReference
    private Offer offer;

    // Purchase Order creators and approvers (string identifiers instead of User entities)
    private String createdBy;
    private String approvedBy;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference  // ORIGINAL VALUE
    private List<PurchaseOrderItem> purchaseOrderItems = new ArrayList<>();

    private LocalDateTime financeApprovalDate;

    // Payment and delivery information
    private String paymentTerms;
    private LocalDateTime expectedDeliveryDate;
    private double totalAmount;
    private String currency;
}