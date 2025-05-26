package com.example.backend.models.warehouse;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemResolution {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Enumerated(EnumType.STRING)
    private ResolutionType resolutionType;

    @Column(length = 1000)
    private String notes;

    private String resolvedBy;

    private String transactionId;

    @Builder.Default
    private LocalDateTime resolvedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private ItemStatus originalStatus;

    private int originalQuantity;
}