package com.example.backend.models.finance.fixedAssets;

import com.example.backend.models.site.Site;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;

@Builder
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class FixedAssets
{
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;

    @Column(length = 500)
    private String description;

//    @Column(nullable = false)
//    private String category; // e.g., "Vehicle", "Equipment", "Furniture"

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal cost; // Original purchase price

    @Column(precision = 15, scale = 2)
    private BigDecimal salvageValue; // Expected value when disposed

    @Column(nullable = false)
    private Integer usefulLifeYears; // How many years it's expected to last

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DepreciationMethod depreciationMethod;

    @Column(nullable = false)
    private LocalDate purchaseDate;

    @Column(nullable = false)
    private LocalDate depreciationStartDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetStatus status;

    @Column(length = 100)
    private String serialNumber;


    // We'll add relationships later for maintenance and disposal

    // Calculated field - current book value
    @Transient
    private BigDecimal currentBookValue;

    // Calculated field - accumulated depreciation
    @Transient
    private BigDecimal accumulatedDepreciation;



    @ManyToOne
    @JoinColumn(name = "site_id", referencedColumnName = "id")
    //@JsonIgnore
    @JsonManagedReference
    private Site site;

}
