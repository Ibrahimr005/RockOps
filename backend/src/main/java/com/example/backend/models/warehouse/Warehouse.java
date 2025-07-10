package com.example.backend.models.warehouse;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private String name;

    @Column(length = 500)
    private String photoUrl;

//    private int capacity;

    @ManyToOne
    @JoinColumn(name = "site_id", referencedColumnName = "id")
    private Site site;

    @OneToMany(mappedBy = "warehouse", cascade = CascadeType.ALL)
    @JsonManagedReference("warehouse-employee") // Add this annotation
    private List<Employee> employees;

    @OneToMany(mappedBy = "warehouse", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonBackReference // prevents infinite recursion in serialization
    private List<Item> items = new ArrayList<>();

    // New relation to WarehouseTransaction
}