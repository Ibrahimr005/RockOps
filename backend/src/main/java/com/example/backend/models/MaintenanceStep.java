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
import java.util.UUID;

@Entity
@Table(name = "maintenance_steps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceStep {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_record_id", nullable = false)
    private MaintenanceRecord maintenanceRecord;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_contact_id", nullable = false)
    private Contact responsibleContact;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "step_type", nullable = false)
    private StepType stepType;
    
    @NotBlank(message = "Step description is required")
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "last_contact_date")
    private LocalDateTime lastContactDate;
    
    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;
    
    @NotNull(message = "Expected end date is required")
    @Future(message = "Expected end date must be in the future")
    @Column(name = "expected_end_date", nullable = false)
    private LocalDateTime expectedEndDate;
    
    @Column(name = "actual_end_date")
    private LocalDateTime actualEndDate;
    
    @NotBlank(message = "From location is required")
    @Column(name = "from_location", nullable = false)
    private String fromLocation;
    
    @NotBlank(message = "To location is required")
    @Column(name = "to_location", nullable = false)
    private String toLocation;
    
    @DecimalMin(value = "0.0", inclusive = true, message = "Step cost must be non-negative")
    @Column(name = "step_cost", precision = 10, scale = 2)
    private BigDecimal stepCost = BigDecimal.ZERO;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "is_final_step", nullable = false)
    private boolean finalStep = false;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Version
    @Column(name = "version")
    private Long version;
    
    public enum StepType {
        TRANSPORT, INSPECTION, REPAIR, TESTING, DIAGNOSIS, ESCALATION, RETURN_TO_SERVICE
    }
    
    // Helper methods
    public boolean isCompleted() {
        return actualEndDate != null;
    }
    
    public boolean isOverdue() {
        return !isCompleted() && LocalDateTime.now().isAfter(expectedEndDate);
    }
    
    public long getDurationInHours() {
        LocalDateTime endTime = actualEndDate != null ? actualEndDate : LocalDateTime.now();
        return java.time.Duration.between(startDate, endTime).toHours();
    }
    
    public boolean needsFollowUp() {
        return lastContactDate == null || 
               java.time.Duration.between(lastContactDate, LocalDateTime.now()).toDays() > 3;
    }
    
    public void completeStep() {
        this.actualEndDate = LocalDateTime.now();
    }
    
    public void updateLastContact() {
        this.lastContactDate = LocalDateTime.now();
    }
    
    // Get responsible person name from contact
    public String getResponsiblePersonName() {
        return responsibleContact != null ? responsibleContact.getFullName() : null;
    }
    
    public String getResponsiblePersonPhone() {
        return responsibleContact != null ? responsibleContact.getPhoneNumber() : null;
    }
    
    public String getResponsiblePersonEmail() {
        return responsibleContact != null ? responsibleContact.getEmail() : null;
    }
} 