package com.example.backend.models.hr;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vacation_balances",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"employee_id", "year"})
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacationBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonBackReference("employee-vacation-balance")
    private Employee employee;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "total_allocated")
    @Builder.Default
    private Integer totalAllocated = 0;

    @Column(name = "used_days")
    @Builder.Default
    private Integer usedDays = 0;

    @Column(name = "pending_days")
    @Builder.Default
    private Integer pendingDays = 0;

    @Column(name = "carried_forward")
    @Builder.Default
    private Integer carriedForward = 0;

    @Column(name = "bonus_days")
    @Builder.Default
    private Integer bonusDays = 0;

    // Audit fields
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Helper methods
    public Integer getRemainingDays() {
        return totalAllocated + carriedForward + bonusDays - usedDays - pendingDays;
    }

    public Integer getAvailableDays() {
        return totalAllocated + carriedForward + bonusDays - usedDays;
    }

    public boolean hasSufficientBalance(int requestedDays) {
        return getRemainingDays() >= requestedDays;
    }

    public void addUsedDays(int days) {
        this.usedDays += days;
    }

    public void addPendingDays(int days) {
        this.pendingDays += days;
    }

    public void removePendingDays(int days) {
        this.pendingDays = Math.max(0, this.pendingDays - days);
    }

    public double getUtilizationRate() {
        if (totalAllocated + carriedForward + bonusDays == 0) {
            return 0.0;
        }
        return (double) usedDays / (totalAllocated + carriedForward + bonusDays) * 100;
    }
}