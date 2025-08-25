package com.example.backend.models.warehouse;

import com.example.backend.models.merchant.Merchant;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
public class ItemCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;
    private String description;

    @ManyToOne
    @JoinColumn(name = "parent_category_id")
    private ItemCategory parentCategory; // REMOVED @JsonBackReference - keep for serialization

    @OneToMany(mappedBy = "parentCategory")
    @JsonIgnore // CHANGED from @JsonManagedReference to @JsonIgnore
    private List<ItemCategory> childCategories = new ArrayList<>();

    @OneToMany(mappedBy = "itemCategory")
    @JsonIgnore // CHANGED from @JsonManagedReference to @JsonIgnore
    private List<ItemType> itemTypes = new ArrayList<>();

    @ManyToMany(mappedBy = "itemCategories")
    @JsonIgnore
    private List<Merchant> merchants = new ArrayList<>();
}