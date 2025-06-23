package com.example.backend.dtos;

import com.example.backend.models.MaintenanceRecord;
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
public class MaintenanceRecordDto {
    
    private UUID id;
    
    @NotNull(message = "Equipment ID is required")
    private UUID equipmentId;
    
    private String equipmentInfo;
    
    @NotBlank(message = "Initial issue description is required")
    private String initialIssueDescription;
    
    private String finalDescription;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime creationDate;
    
    @NotNull(message = "Expected completion date is required")
    @Future(message = "Expected completion date must be in the future")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expectedCompletionDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime actualCompletionDate;
    
    @DecimalMin(value = "0.0", inclusive = true, message = "Total cost must be non-negative")
    private BigDecimal totalCost;
    
    private MaintenanceRecord.MaintenanceStatus status;
    
    private UUID currentResponsibleContactId;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastUpdated;
    
    private Long version;
    
    // Computed fields
    private Boolean isOverdue;
    private Long durationInDays;
    private Integer totalSteps;
    private Integer completedSteps;
    private Integer activeSteps;
    
    // Related data
    private List<MaintenanceStepDto> steps;
    
    // Dashboard fields
    private String currentStepDescription;
    private String currentStepResponsiblePerson;
    private LocalDateTime currentStepExpectedEndDate;
    private Boolean currentStepIsOverdue;
    
    // Equipment information
    private String equipmentName;
    private String equipmentModel;
    private String equipmentType;
    private String equipmentSerialNumber;
    private String site;
    
    // Contact information (for backward compatibility)
    private String currentResponsiblePerson;
    private String currentResponsiblePhone;
    private String currentResponsibleEmail;
} 