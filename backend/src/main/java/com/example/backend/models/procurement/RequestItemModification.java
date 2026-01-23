// RequestItemModification.java
package com.example.backend.models.procurement;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestItemModification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "offer_id")
    @JsonBackReference
    private Offer offer;

    private LocalDateTime timestamp;
    private String actionBy; // username

    @Enumerated(EnumType.STRING)
    private ModificationAction action; // ADD, EDIT, DELETE

    // Item details at time of modification
    private UUID itemTypeId;
    private String itemTypeName;
    private String itemTypeMeasuringUnit;

    // For tracking what changed
    private Double oldQuantity;
    private Double newQuantity;
    private String oldComment;
    private String newComment;

    // Additional context
    private String notes;

    public enum ModificationAction {
        ADD, EDIT, DELETE
    }
}