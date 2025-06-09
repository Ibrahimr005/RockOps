package com.example.backend.models.equipment;

import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ResolutionType;
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
public class ConsumableResolution {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "consumable_id", nullable = false)
    private Consumable consumable;

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

    private Integer correctedQuantity; // For counting error resolutions

    @Builder.Default
    private boolean fullyResolved = true; // Whether the issue was completely resolved
} 