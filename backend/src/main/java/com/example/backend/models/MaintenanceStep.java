package com.example.backend.models;

import com.example.backend.models.StepType;
import com.example.backend.models.hr.Employee;
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
    @JoinColumn(name = "responsible_contact_id")
    private Contact responsibleContact;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_employee_id")
    private Employee responsibleEmployee;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "step_type_id", nullable = false)
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
    @Column(name = "expected_end_date", nullable = false)
    private LocalDateTime expectedEndDate;
    
    @Column(name = "actual_end_date")
    private LocalDateTime actualEndDate;
    
    @Column(name = "from_location")
    private String fromLocation;
    
    @Column(name = "to_location")
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
    
    // Get responsible person name from contact or employee
    public String getResponsiblePersonName() {
        if (responsibleEmployee != null) {
            return responsibleEmployee.getFirstName() + " " + responsibleEmployee.getLastName();
        }
        return responsibleContact != null ? responsibleContact.getFullName() : null;
    }
    
    public String getResponsiblePersonPhone() {
        if (responsibleEmployee != null) {
            return responsibleEmployee.getPhoneNumber();
        }
        return responsibleContact != null ? responsibleContact.getPhoneNumber() : null;
    }
    
    public String getResponsiblePersonEmail() {
        if (responsibleEmployee != null) {
            return responsibleEmployee.getEmail();
        }
        return responsibleContact != null ? responsibleContact.getEmail() : null;
    }
} 