package com.example.backend.models.warehouse;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
    @JsonIgnore // CHANGED from @JsonManagedReference to @JsonIgnore
    private List<Employee> employees;

    @OneToMany(mappedBy = "warehouse", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore // CHANGED from @JsonManagedReference to @JsonIgnore
    private List<Item> items = new ArrayList<>();

    // Add this to your Warehouse entity
    @OneToMany(mappedBy = "warehouse", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"user", "warehouse"}) // Prevent circular reference
    private List<WarehouseEmployee> employeeAssignments = new ArrayList<>();

    public List<User> getAssignedEmployees() {
        return employeeAssignments.stream()
                .map(WarehouseEmployee::getUser)
                .collect(Collectors.toList());
    }


}