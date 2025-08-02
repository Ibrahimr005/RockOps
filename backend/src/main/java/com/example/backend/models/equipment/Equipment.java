package com.example.backend.models.equipment;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@Entity
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Changed from String type to ManyToOne relationship with EquipmentType
    @ManyToOne
    @JoinColumn(name = "equipment_type_id", nullable = false)
    private EquipmentType type;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private String name;

    @ManyToOne
    @JoinColumn(name = "equipment_brand_id", nullable = false)
    private EquipmentBrand brand;

    @Column(nullable = false)
    private Year manufactureYear;

    @Column(nullable = false)
    private LocalDate purchasedDate;

    @Column(nullable = false)
    private LocalDate deliveredDate;

    @Column(nullable = false)
    private double egpPrice;

    @Column(nullable = true)
    private double dollarPrice;

    @ManyToOne
    @JoinColumn(name = "merchant_id")
    private Merchant purchasedFrom;

    @Column(nullable = true)
    private String examinedBy;

    @Column(nullable = true)
    private String equipmentComplaints;

    @Column(nullable = false)
    private String countryOfOrigin;

    @Column(nullable = false, unique = true)
    private String serialNumber;

    @Column(nullable = true)
    private double shipping;

    @Column(nullable = true)
    private double customs;

    @Column(nullable = true)
    private double taxes;


    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EquipmentStatus status;

    @Column(nullable = true)
    private String relatedDocuments;

    @Column(nullable = true)
    private Integer workedHours;

    @ManyToOne
    @JoinColumn(name = "site_id", referencedColumnName = "id")
    @JsonBackReference
    private Site site;

    @OneToOne
    @JoinColumn(name = "driver_id", referencedColumnName = "id")
    private Employee mainDriver;

    @ManyToOne
    @JoinColumn(name = "sub_driver_id", referencedColumnName = "id")
    private Employee subDriver;

    @OneToMany(mappedBy = "equipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Consumable> consumables = new ArrayList<>();





    public Equipment() {
        this.status = EquipmentStatus.AVAILABLE;
    }

    // Helper method to get combined model and name for display purposes
    public String getFullModelName() {
        return model + " " + name;
    }

    public EquipmentBrand getBrand() {
        return brand;
    }

    public void setBrand(EquipmentBrand brand) {
        this.brand = brand;
    }
}