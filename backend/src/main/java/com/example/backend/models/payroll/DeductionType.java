package com.example.backend.models.payroll;

import com.example.backend.models.site.Site;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DeductionType Entity - Configurable deduction types
 * Allows HR/Admin to define custom deduction categories
 * Examples: Tax, Insurance, Pension, Union Dues, Custom deductions
 */
@Entity
@Table(name = "deduction_types", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"name", "site_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeductionType {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Human-readable code (e.g., "TAX", "INS", "PEN")
    @Column(nullable = false, length = 20)
    private String code;

    // Display name
    @Column(nullable = false, length = 100)
    private String name;

    // Description of this deduction type
    @Column(length = 500)
    private String description;

    // Category for grouping/reporting
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeductionCategory category;

    // Whether this is a system-defined type (cannot be deleted)
    @Column(name = "is_system_defined", nullable = false)
    @Builder.Default
    private Boolean isSystemDefined = false;

    // Whether this type is active
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Whether this deduction is taxable
    @Column(name = "is_taxable", nullable = false)
    @Builder.Default
    private Boolean isTaxable = false;

    // Whether this deduction should appear on payslip
    @Column(name = "show_on_payslip", nullable = false)
    @Builder.Default
    private Boolean showOnPayslip = true;

    // Whether this deduction is mandatory (always applied)
    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = false;

    // Whether this deduction is calculated as a percentage
    @Column(name = "is_percentage")
    @Builder.Default
    private Boolean isPercentage = false;

    // Site relationship (for multi-site support)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;

    // Audit fields
    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Deduction Category for grouping
     */
    public enum DeductionCategory {
        STATUTORY("Statutory", "Government-mandated deductions like tax, social security"),
        BENEFITS("Benefits", "Employee benefit deductions like insurance, pension"),
        LOANS("Loans", "Loan repayments and advances"),
        VOLUNTARY("Voluntary", "Employee-elected deductions like union dues"),
        GARNISHMENT("Garnishment", "Court-ordered deductions"),
        OTHER("Other", "Miscellaneous deductions");

        private final String displayName;
        private final String description;

        DeductionCategory(String displayName, String description) {
            this.displayName = displayName;
            this.description = description;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getDescription() {
            return description;
        }
    }

    // ===================================================
    // LIFECYCLE CALLBACKS
    // ===================================================

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
        if (isSystemDefined == null) {
            isSystemDefined = false;
        }
        if (isTaxable == null) {
            isTaxable = false;
        }
        if (showOnPayslip == null) {
            showOnPayslip = true;
        }
        if (isMandatory == null) {
            isMandatory = false;
        }
        if (isPercentage == null) {
            isPercentage = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
