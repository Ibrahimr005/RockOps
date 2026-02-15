package com.example.backend.dto.procurement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentPurchaseSpecDTO {
    private String name;
    private String description;
    private UUID equipmentTypeId;
    private UUID equipmentBrandId;
    private String model;
    private Integer manufactureYear;
    private String countryOfOrigin;
    private String specifications;
    private Double estimatedBudget;
}
