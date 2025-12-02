package com.example.backend.models.maintenance;

import com.example.backend.models.contact.Contact;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.merchant.Merchant;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "direct_purchase_tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectPurchaseTicket {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merchant_id", nullable = false)
    private Merchant merchant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_person_id", nullable = false)
    private Contact responsiblePerson;

    @NotBlank(message = "Spare part name is required")
    @Size(max = 255, message = "Spare part name must not exceed 255 characters")
    @Column(name = "spare_part", nullable = false, length = 255)
    private String sparePart;

    @NotNull(message = "Expected parts cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected parts cost must be non-negative")
    @Column(name = "expected_parts_cost", precision = 10, scale = 2, nullable = false)
    private BigDecimal expectedPartsCost;

    @NotNull(message = "Expected transportation cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected transportation cost must be non-negative")
    @Column(name = "expected_transportation_cost", precision = 10, scale = 2, nullable = false)
    private BigDecimal expectedTransportationCost;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private DirectPurchaseStatus status = DirectPurchaseStatus.IN_PROGRESS;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @OneToMany(mappedBy = "directPurchaseTicket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stepNumber ASC")
    @Builder.Default
    private List<DirectPurchaseStep> steps = new ArrayList<>();

    // Calculated field: total expected cost
    public BigDecimal getTotalExpectedCost() {
        if (expectedPartsCost == null || expectedTransportationCost == null) {
            return BigDecimal.ZERO;
        }
        return expectedPartsCost.add(expectedTransportationCost);
    }

    // Calculated field: total actual cost from completed steps
    public BigDecimal getTotalActualCost() {
        if (steps == null || steps.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return steps.stream()
                .filter(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED)
                .map(DirectPurchaseStep::getActualCost)
                .filter(cost -> cost != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Helper methods
    public void addStep(DirectPurchaseStep step) {
        if (steps == null) {
            steps = new ArrayList<>();
        }
        steps.add(step);
        step.setDirectPurchaseTicket(this);
    }

    public void removeStep(DirectPurchaseStep step) {
        if (steps != null) {
            steps.remove(step);
            step.setDirectPurchaseTicket(null);
        }
    }

    // Check if all steps are completed
    public boolean isFullyCompleted() {
        if (steps == null || steps.isEmpty()) {
            return false;
        }
        return steps.stream().allMatch(step -> step.getStatus() == DirectPurchaseStepStatus.COMPLETED);
    }

    // Status enum
    public enum DirectPurchaseStatus {
        IN_PROGRESS, COMPLETED, CANCELLED
    }
}
