package com.example.backend.models.warehouse;

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
public class MeasuringUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String name; // e.g., "kg", "liter", "piece", "meter"

    private String displayName; // e.g., "Kilogram", "Liter", "Piece", "Meter"

    private String abbreviation; // e.g., "kg", "L", "pcs", "m"

    private Boolean isActive = true;
}