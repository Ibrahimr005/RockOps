package com.example.backend.models.procurement;

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
public class Offer {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String createdBy;


    private String status; // DRAFT, SUBMITTED, APPROVED, REJECTED
    private String financeStatus;

    private LocalDateTime validUntil; // Offer validity period
    private String notes;

    private LocalDateTime submittedAtM;

    // Reference to the request order this offer is for
    @ManyToOne
    @JoinColumn(name = "request_order_id")
    @JsonManagedReference
    private RequestOrder requestOrder;

    // List of offer items (one for each request order item)
    @OneToMany(mappedBy = "offer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<OfferItem> offerItems = new ArrayList<>();

    private LocalDateTime updatedAt;
    private String updatedBy;
    private String rejectionReason;
}