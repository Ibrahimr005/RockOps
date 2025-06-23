package com.example.backend.models;

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
@Table(name = "maintenance_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRecord {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;
    
    @NotNull(message = "Equipment ID is required")
    @Column(name = "equipment_id", nullable = false)
    private UUID equipmentId;
    
    @Column(name = "equipment_info")
    private String equipmentInfo;
    
    @NotBlank(message = "Initial issue description is required")
    @Column(name = "initial_issue_description", nullable = false, columnDefinition = "TEXT")
    private String initialIssueDescription;
    
    @Column(name = "final_description", columnDefinition = "TEXT")
    private String finalDescription;
    
    @CreationTimestamp
    @Column(name = "creation_date", nullable = false, updatable = false)
    private LocalDateTime creationDate;
    
    @NotNull(message = "Expected completion date is required")
    @Future(message = "Expected completion date must be in the future")
    @Column(name = "expected_completion_date", nullable = false)
    private LocalDateTime expectedCompletionDate;
    
    @Column(name = "actual_completion_date")
    private LocalDateTime actualCompletionDate;
    
    @DecimalMin(value = "0.0", inclusive = true, message = "Total cost must be non-negative")
    @Column(name = "total_cost", precision = 10, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MaintenanceStatus status = MaintenanceStatus.ACTIVE;
    
    @OneToMany(mappedBy = "maintenanceRecord", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("startDate ASC")
    private List<MaintenanceStep> steps = new ArrayList<>();
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_responsible_contact_id")
    private Contact currentResponsibleContact;
    
    @UpdateTimestamp
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
    
    @Version
    @Column(name = "version")
    private Long version;
    
    public enum MaintenanceStatus {
        ACTIVE, COMPLETED, ON_HOLD, CANCELLED
    }
    
    // Helper methods
    public void addStep(MaintenanceStep step) {
        steps.add(step);
        step.setMaintenanceRecord(this);
    }
    
    public void removeStep(MaintenanceStep step) {
        steps.remove(step);
        step.setMaintenanceRecord(null);
    }
    
    public void calculateTotalCost() {
        this.totalCost = steps.stream()
                .map(MaintenanceStep::getStepCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    public boolean isOverdue() {
        return status == MaintenanceStatus.ACTIVE && 
               LocalDateTime.now().isAfter(expectedCompletionDate);
    }
    
    public long getDurationInDays() {
        if (actualCompletionDate != null) {
            return java.time.Duration.between(creationDate, actualCompletionDate).toDays();
        }
        return java.time.Duration.between(creationDate, LocalDateTime.now()).toDays();
    }
    
    // Get current responsible person from contact if available
    public String getCurrentResponsiblePersonName() {
        return currentResponsibleContact != null ? currentResponsibleContact.getFullName() : null;
    }
    
    public String getCurrentResponsiblePersonPhone() {
        return currentResponsibleContact != null ? currentResponsibleContact.getPhoneNumber() : null;
    }
    
    public String getCurrentResponsiblePersonEmail() {
        return currentResponsibleContact != null ? currentResponsibleContact.getEmail() : null;
    }
    
    // Update current responsible contact from the last completed step
    public void updateCurrentResponsibleContact() {
        if (steps != null && !steps.isEmpty()) {
            // Find the last completed step
            MaintenanceStep lastCompletedStep = steps.stream()
                    .filter(MaintenanceStep::isCompleted)
                    .max((s1, s2) -> s1.getActualEndDate().compareTo(s2.getActualEndDate()))
                    .orElse(null);
            
            if (lastCompletedStep != null && lastCompletedStep.getResponsibleContact() != null) {
                this.currentResponsibleContact = lastCompletedStep.getResponsibleContact();
            }
        }
    }
} 