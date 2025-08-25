package com.example.backend.dtos;

import com.example.backend.models.ContactLog;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContactLogDto {
    
    private UUID id;
    
    private UUID maintenanceStepId;
    
    private UUID maintenanceRecordId;
    
    @NotBlank(message = "Contact method is required")
    private String contactMethod;
    
    @NotBlank(message = "Contact person is required")
    private String contactPerson;
    
    private String contactDetails;
    
    @NotNull(message = "Contact status is required")
    private ContactLog.ContactStatus contactStatus;
    
    private Boolean responseReceived;
    
    private String responseDetails;
    
    private Boolean followUpRequired;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime followUpDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime contactDate;
    
    private String notes;
    
    // Computed fields
    private Boolean isFollowUpOverdue;
    private Long daysSinceContact;
} 