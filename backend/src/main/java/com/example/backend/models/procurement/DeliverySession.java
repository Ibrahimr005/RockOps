package com.example.backend.models.procurement;

import com.example.backend.models.merchant.Merchant;
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
@Table(name = "delivery_sessions")
public class DeliverySession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "merchant_id", nullable = false)
    @JsonManagedReference
    private Merchant merchant;

    @Column(nullable = false)
    private String processedBy;

    @Column(nullable = false)
    private LocalDateTime processedAt;

    @Column(columnDefinition = "TEXT")
    private String deliveryNotes;

    @OneToMany(mappedBy = "deliverySession", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DeliveryItemReceipt> itemReceipts = new ArrayList<>();

    @OneToMany(mappedBy = "deliverySession", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Logistics> logistics = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (processedAt == null) {
            processedAt = LocalDateTime.now();
        }
    }
}