package com.example.backend.models.finance.fixedAssets;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Builder
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "asset_disposals")
public class AssetDisposal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "asset_id", nullable = false)
    private FixedAssets asset;

    @Column(nullable = false)
    private LocalDate disposalDate;

    @Column(precision = 15, scale = 2)
    private BigDecimal saleAmount; // Can be null if thrown away/donated

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DisposalMethod disposalMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DisposalReason disposalReason;

    @Column(length = 500)
    private String notes;

    // Calculated at time of disposal
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal bookValueAtDisposal;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal gainLoss; // Sale Amount - Book Value

    @Column(length = 255)
    private String documentPath; // For disposal documentation

    @Column(nullable = false)
    private LocalDate createdDate;

    private String createdBy; // User who recorded the disposal
}