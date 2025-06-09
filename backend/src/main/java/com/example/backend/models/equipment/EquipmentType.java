package com.example.backend.models.equipment;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@Entity
public class EquipmentType {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = true)
    private String description;

    @OneToMany(mappedBy = "type", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Equipment> equipments = new ArrayList<>();

    @Column(nullable = true)
    private String driverPositionName;

    @Column(nullable = false)
    private boolean drivable = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "equipment_type_work_types",
        joinColumns = @JoinColumn(name = "equipment_type_id"),
        inverseJoinColumns = @JoinColumn(name = "work_type_id")
    )
    private List<WorkType> supportedWorkTypes = new ArrayList<>();

    public EquipmentType() {

    }

    // Methods to get driver position name or generate it if not explicitly set
    public String getRequiredDriverPosition() {
        // Use a standardized format: "<EquipmentType> Driver"
        // Or if it ends with 'crane', use "Operator" instead of "Driver"
        if (name.toLowerCase().contains("crane")) {
            return name + " Operator";
        }
        return name + " Driver";
    }

    // Get alternative position formats that might also be valid (for flexibility)
    public String[] getAlternativePositionFormats() {
        return new String[] {
                name + " Operator",
                name + " Driver",
                name.toLowerCase() + " driver",
                name.toLowerCase() + " operator"
        };
    }

    // Helper method to check if a work type is supported
    public boolean supportsWorkType(WorkType workType) {
        return supportedWorkTypes.contains(workType);
    }

    // Helper method to check if a work type is supported by ID
    public boolean supportsWorkType(UUID workTypeId) {
        return supportedWorkTypes.stream()
                .anyMatch(wt -> wt.getId().equals(workTypeId));
    }
}