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
public class  RequestOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String title;
    private String description;
    private LocalDateTime createdAt;
    private String createdBy;
    private String status;
    private String partyType;
    private UUID requesterId;
    private String requesterName;

    private LocalDateTime updatedAt;
    private String updatedBy;

    private LocalDateTime approvedAt;
    private String approvedBy;

    // New fields
    private String employeeRequestedBy;
    private LocalDateTime deadline;

    // Existing relationships
    @OneToMany(mappedBy = "requestOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference // ✅ Change to this!
    private List<RequestOrderItem> requestItems = new ArrayList<>();


    @OneToOne(mappedBy = "requestOrder", cascade = CascadeType.ALL)
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    private String rejectionReason;

    @OneToMany(mappedBy = "requestOrder", cascade = CascadeType.ALL)
    @JsonBackReference
    private List<Offer> offers = new ArrayList<>();
}