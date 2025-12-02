package com.example.backend.models.maintenance;

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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "direct_purchase_steps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DirectPurchaseStep {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "direct_purchase_ticket_id", nullable = false)
    private DirectPurchaseTicket directPurchaseTicket;

    @NotNull(message = "Step number is required")
    @Min(value = 1, message = "Step number must be 1 or 2")
    @Max(value = 2, message = "Step number must be 1 or 2")
    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @NotBlank(message = "Step name is required")
    @Column(name = "step_name", nullable = false)
    private String stepName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private DirectPurchaseStepStatus status = DirectPurchaseStepStatus.IN_PROGRESS;

    @Column(name = "responsible_person")
    private String responsiblePerson;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "expected_end_date")
    private LocalDate expectedEndDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @NotNull(message = "Expected cost is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Expected cost must be non-negative")
    @Column(name = "expected_cost", precision = 10, scale = 2, nullable = false)
    private BigDecimal expectedCost;

    @DecimalMin(value = "0.0", inclusive = true, message = "Advanced payment must be non-negative")
    @Column(name = "advanced_payment", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal advancedPayment = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Actual cost must be non-negative")
    @Column(name = "actual_cost", precision = 10, scale = 2)
    private BigDecimal actualCost;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "last_checked")
    private LocalDateTime lastChecked;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    // Calculated field: remaining cost
    public BigDecimal getRemainingCost() {
        if (actualCost == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal advanced = advancedPayment != null ? advancedPayment : BigDecimal.ZERO;
        return actualCost.subtract(advanced);
    }

    // Helper methods
    public boolean isCompleted() {
        return status == DirectPurchaseStepStatus.COMPLETED;
    }

    public boolean isOverdue() {
        if (isCompleted() || expectedEndDate == null) {
            return false;
        }
        return LocalDate.now().isAfter(expectedEndDate);
    }
}
