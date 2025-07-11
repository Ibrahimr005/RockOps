package com.example.backend.models.site;

import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.warehouse.Warehouse;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Site
{
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private String name;
    private String physicalAddress;
    private String companyAddress;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate creationDate;

    @Column(length = 500)
    private String photoUrl;

    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SitePartner> sitePartners = new ArrayList<>();


    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL) // Equipment is the owner
    @JsonBackReference // Prevents infinite loop
    private List<Equipment> equipment;

    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Warehouse> warehouses;

    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference
    private List<Employee> employees;

    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL)
    @JsonBackReference // for Merchant -> Site relationship
    private List<Merchant> merchants;

    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<FixedAssets> fixedAssets;

    // Helper methods to get counts
    @Transient
    private int equipmentCount;

    @Transient
    private int employeeCount;

    public int getEquipmentCount() {
        return equipment != null ? equipment.size() : 0;
    }

    public int getEmployeeCount() {
        return employees != null ? employees.size() : 0;
    }

    public void setEquipmentCount(int count) {
        this.equipmentCount = count;
    }

    public void setEmployeeCount(int count) {
        this.employeeCount = count;
    }
}