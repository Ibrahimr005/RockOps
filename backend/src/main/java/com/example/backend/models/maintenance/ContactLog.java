package com.example.backend.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contact_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactLog {
    
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_step_id", nullable = false)
    private MaintenanceStep maintenanceStep;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_record_id", nullable = false)
    private MaintenanceRecord maintenanceRecord;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private Contact contact;
    
    @NotBlank(message = "Contact method is required")
    @Column(name = "contact_method", nullable = false)
    private String contactMethod;
    
    @NotBlank(message = "Contact person is required")
    @Column(name = "contact_person", nullable = false)
    private String contactPerson;
    
    @Column(name = "contact_details", columnDefinition = "TEXT")
    private String contactDetails;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "contact_status", nullable = false)
    private ContactStatus contactStatus;
    
    @Column(name = "response_received")
    private Boolean responseReceived = false;
    
    @Column(name = "response_details", columnDefinition = "TEXT")
    private String responseDetails;
    
    @Column(name = "follow_up_required")
    private Boolean followUpRequired = false;
    
    @Column(name = "follow_up_date")
    private LocalDateTime followUpDate;
    
    @CreationTimestamp
    @Column(name = "contact_date", nullable = false, updatable = false)
    private LocalDateTime contactDate;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    public enum ContactStatus {
        SUCCESSFUL, NO_ANSWER, LEFT_MESSAGE, CALL_BACK_REQUESTED, EMAIL_SENT, SMS_SENT
    }
    
    // Helper methods
    public boolean isFollowUpOverdue() {
        return followUpRequired && followUpDate != null && 
               LocalDateTime.now().isAfter(followUpDate);
    }
    
    public void markAsFollowUpRequired(LocalDateTime followUpDate) {
        this.followUpRequired = true;
        this.followUpDate = followUpDate;
    }
    
    public void markResponseReceived(String responseDetails) {
        this.responseReceived = true;
        this.responseDetails = responseDetails;
    }
} 