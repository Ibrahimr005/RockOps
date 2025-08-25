package com.example.backend.models.merchant;

import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemCategory;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Merchant {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String contactEmail;

    private String contactPhone;

    private String contactSecondPhone;

    private String contactPersonName;

    private String address;

    private String preferredPaymentMethod;

    private Double reliabilityScore;

    private Double averageDeliveryTime;

    private String taxIdentificationNumber;

    private Date lastOrderDate;

    // Add photoUrl field like in Site model
    @Column(length = 500)
    private String photoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MerchantType merchantType;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "merchant_item_categories",
            joinColumns = @JoinColumn(name = "merchant_id"),
            inverseJoinColumns = @JoinColumn(name = "item_category_id")
    )
    private List<ItemCategory> itemCategories = new ArrayList<>();

    private String notes;

    @ManyToOne()
    @JoinColumn(name = "site_id")
    @JsonManagedReference
    private Site site;
}