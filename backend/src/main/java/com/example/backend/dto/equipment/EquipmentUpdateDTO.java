package com.example.backend.dto.equipment;

import com.example.backend.models.equipment.EquipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentUpdateDTO {
    private UUID typeId;
    private String model;
    private String name;
    private UUID brandId;
    private Integer manufactureYear;
    private LocalDate purchasedDate;
    private LocalDate deliveredDate;
    private Double egpPrice;
    private Double dollarPrice;
    private UUID purchasedFrom;
    private String examinedBy;
    private String equipmentComplaints;
    private String countryOfOrigin;
    private String serialNumber;
    private Double shipping;
    private Double customs;
    private Double taxes;
    private String modelNumber;
    private EquipmentStatus status;
    private String relatedDocuments;
    private Integer workedHours;
    private UUID siteId;
    private UUID mainDriverId;
    private UUID subDriverId;
}