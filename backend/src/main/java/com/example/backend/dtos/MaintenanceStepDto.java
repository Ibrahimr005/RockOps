package com.example.backend.dtos;

import com.example.backend.models.MaintenanceStep;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MaintenanceStepDto {
    
    private UUID id;
    
    private UUID maintenanceRecordId;
    
    @NotNull(message = "Step type is required")
    private MaintenanceStep.StepType stepType;
    
    @NotBlank(message = "Step description is required")
    private String description;
    
    @NotNull(message = "Responsible contact is required")
    private UUID responsibleContactId;
    
    // Contact assignment
    private String contactEmail;
    private String contactSpecialization;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastContactDate;
    
    @NotNull(message = "Start date is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startDate;
    
    @NotNull(message = "Expected end date is required")
    @Future(message = "Expected end date must be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expectedEndDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime actualEndDate;
    
    @NotBlank(message = "From location is required")
    private String fromLocation;
    
    @NotBlank(message = "To location is required")
    private String toLocation;
    
    @DecimalMin(value = "0.0", inclusive = true, message = "Step cost must be non-negative")
    private BigDecimal stepCost;
    
    private String notes;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    private Long version;
    
    // Computed fields
    private Boolean isCompleted;
    private Boolean isOverdue;
    private Long durationInHours;
    private Boolean needsFollowUp;
    
    private Boolean isFinalStep;
    
    // Related data
    private List<ContactLogDto> contactLogs;
    
    // Handoff information
    private String nextStepType;
    private String nextResponsiblePerson;
    private String nextLocation;
    
    // Contact information (for backward compatibility)
    private String responsiblePerson;
    private String personPhoneNumber;
} 