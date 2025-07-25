package com.example.backend.dtos;

import com.example.backend.models.Contact;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContactDto {
    
    private UUID id;
    
    @NotBlank(message = "First name is required")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    private String lastName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    private String phoneNumber;
    
    private String alternatePhone;
    
    @NotNull(message = "Contact type is required")
    private Contact.ContactType contactType;
    
    private String company;
    
    private String position;
    
    private String department;
    
    private String specialization;
    
    private String availabilityHours;
    
    private Boolean emergencyContact;
    
    private Contact.ContactMethod preferredContactMethod;
    
    private String notes;
    
    private Boolean isActive;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    private Long version;
    
    // Computed fields
    private String fullName;
    private Integer activeAssignments;
    private Boolean isAvailable;
    
    // Related data (optional, for detailed views)
    private List<MaintenanceStepDto> assignedSteps;
    private List<ContactLogDto> contactLogs;
} 