package com.example.backend.dto.equipment;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.Year;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentDTO {
    private UUID id;
    private UUID typeId;
    private String typeName;
    private UUID brandId;
    private String brandName;
    private String model;
    private String name;
    private Year manufactureYear;
    private LocalDate purchasedDate;
    private LocalDate deliveredDate;
    private double egpPrice;
    private double dollarPrice;
    private String examinedBy;
    private String equipmentComplaints;
    private String countryOfOrigin;
    private String serialNumber;
    private double shipping;
    private double customs;
    private double taxes;
    private String modelNumber;
    private EquipmentStatus status;
    private String relatedDocuments;
    private Integer workedHours;
    private UUID siteId;
    private String siteName;
    private UUID mainDriverId;
    private String mainDriverName;
    private UUID subDriverId;
    private String subDriverName;
    private String imageUrl;
    private UUID purchasedFromId;
    private String purchasedFromName;
    private boolean drivable;

    // Convert Entity to DTO
    public static EquipmentDTO fromEntity(Equipment equipment) {
        if (equipment == null) return null;

        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(equipment.getId());

        // Handle type
        if (equipment.getType() != null) {
            dto.setTypeId(equipment.getType().getId());
            dto.setTypeName(equipment.getType().getName());
        }

        if (equipment.getBrand() != null) {
            dto.setBrandId(equipment.getBrand().getId());
            dto.setBrandName(equipment.getBrand().getName());
        }

        dto.setModel(equipment.getModel());
        dto.setName(equipment.getName());

        dto.setManufactureYear(equipment.getManufactureYear());
        dto.setPurchasedDate(equipment.getPurchasedDate());
        dto.setDeliveredDate(equipment.getDeliveredDate());
        dto.setEgpPrice(equipment.getEgpPrice());
        dto.setDollarPrice(equipment.getDollarPrice());
        dto.setPurchasedFromId(equipment.getPurchasedFrom() != null ? equipment.getPurchasedFrom().getId() : null);
        dto.setPurchasedFromName(equipment.getPurchasedFrom() != null ? equipment.getPurchasedFrom().getName() : null);        dto.setExaminedBy(equipment.getExaminedBy());
        dto.setEquipmentComplaints(equipment.getEquipmentComplaints());
        dto.setCountryOfOrigin(equipment.getCountryOfOrigin());
        dto.setSerialNumber(equipment.getSerialNumber());
        dto.setShipping(equipment.getShipping());
        dto.setCustoms(equipment.getCustoms());
        dto.setTaxes(equipment.getTaxes());
        dto.setModelNumber(equipment.getModelNumber());
        dto.setStatus(equipment.getStatus());
        dto.setRelatedDocuments(equipment.getRelatedDocuments());
        dto.setWorkedHours(equipment.getWorkedHours());
        dto.setDrivable(equipment.getType() != null ? equipment.getType().isDrivable() : false);

        // Handle site
        if (equipment.getSite() != null) {
            dto.setSiteId(equipment.getSite().getId());
            dto.setSiteName(equipment.getSite().getName());
        }

        // Handle main driver
        if (equipment.getMainDriver() != null) {
            dto.setMainDriverId(equipment.getMainDriver().getId());
            dto.setMainDriverName(equipment.getMainDriver().getFullName());
        }

        // Handle sub driver
        if (equipment.getSubDriver() != null) {
            dto.setSubDriverId(equipment.getSubDriver().getId());
            dto.setSubDriverName(equipment.getSubDriver().getFullName());
        }

        return dto;
    }
}