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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "contacts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contact {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;
    
    @NotBlank(message = "First name is required")
    @Column(name = "first_name", nullable = false)
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Column(name = "last_name", nullable = false)
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    
    @Column(name = "phone_number")
    private String phoneNumber;
    
    @Column(name = "alternate_phone")
    private String alternatePhone;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "contact_type", nullable = false)
    private ContactType contactType;
    
    @Column(name = "company")
    private String company;
    
    @Column(name = "position")
    private String position;
    
    @Column(name = "department")
    private String department;
    
    @Column(name = "specialization")
    private String specialization;
    
    @Column(name = "availability_hours")
    private String availabilityHours;
    
    @Column(name = "emergency_contact")
    @Builder.Default
    private Boolean emergencyContact = false;
    
    @Column(name = "preferred_contact_method")
    @Enumerated(EnumType.STRING)
    private ContactMethod preferredContactMethod;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Version
    @Column(name = "version")
    private Long version;
    
    // Relationships
    @OneToMany(mappedBy = "responsibleContact", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MaintenanceStep> assignedSteps = new ArrayList<>();
    
    @OneToMany(mappedBy = "contact", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ContactLog> contactLogs = new ArrayList<>();
    
    public enum ContactType {
        TECHNICIAN, SUPERVISOR, MANAGER, SUPPLIER, CONTRACTOR, CUSTOMER, INTERNAL_STAFF
    }
    
    public enum ContactMethod {
        PHONE, EMAIL, SMS, IN_PERSON, VIDEO_CALL
    }
    
    // Helper methods
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    public boolean isAvailable() {
        return isActive && (assignedSteps == null || !assignedSteps.stream()
                .anyMatch(step -> step.isOverdue() && !step.isCompleted()));
    }
    
    public int getActiveAssignments() {
        if (assignedSteps == null) {
            return 0;
        }
        return (int) assignedSteps.stream()
                .filter(step -> !step.isCompleted())
                .count();
    }
    
    public void addAssignedStep(MaintenanceStep step) {
        if (assignedSteps == null) {
            assignedSteps = new ArrayList<>();
        }
        assignedSteps.add(step);
        step.setResponsibleContact(this);
    }
    
    public void removeAssignedStep(MaintenanceStep step) {
        if (assignedSteps != null) {
            assignedSteps.remove(step);
            step.setResponsibleContact(null);
        }
    }
} 