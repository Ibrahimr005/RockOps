package com.example.backend.models.merchant;

import com.example.backend.models.equipment.Document;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.models.contact.Contact;
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

    @Column(length = 500)
    private String photoUrl;

    // CHANGE THIS: From single merchantType to multiple merchantTypes
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "merchant_types", joinColumns = @JoinColumn(name = "merchant_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "merchant_type")
    @Builder.Default
    private List<MerchantType> merchantTypes = new ArrayList<>();

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

    @OneToMany(mappedBy = "merchant", cascade = CascadeType.ALL, orphanRemoval = false, fetch = FetchType.LAZY)
    @JsonManagedReference("merchant-contacts")
    @Builder.Default
    private List<Contact> contacts = new ArrayList<>();

    @OneToMany(mappedBy = "entityId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Document> documents = new ArrayList<>();
}