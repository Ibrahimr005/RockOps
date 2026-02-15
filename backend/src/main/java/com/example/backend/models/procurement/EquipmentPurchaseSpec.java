package com.example.backend.models.procurement;

import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.models.equipment.EquipmentType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "equipment_purchase_spec")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentPurchaseSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_type_id", nullable = false)
    private EquipmentType equipmentType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_brand_id")
    private EquipmentBrand brand;

    private String model;

    private Integer manufactureYear;

    private String countryOfOrigin;

    @Column(columnDefinition = "TEXT")
    private String specifications;

    private Double estimatedBudget;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
