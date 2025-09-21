package com.example.backend.dto.hr.leave;

import com.example.backend.models.hr.LeaveRequest.LeaveStatus;
import com.example.backend.models.hr.LeaveRequest.LeaveType;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LeaveRequestResponseDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeDepartment;
    private String employeePosition;
    private LeaveType leaveType;
    private String leaveTypeDisplay;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;
    
    private LeaveStatus status;
    private String statusDisplay;
    private String reason;
    private Integer daysRequested;
    
    // Review details
    private String reviewedBy;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime reviewedAt;
    
    private String reviewComments;
    
    // Contact details
    private String emergencyContact;
    private String emergencyPhone;
    private String workDelegatedTo;
    private String delegationNotes;
    
    // Timestamps
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
    
    private String createdBy;
    
    // Additional computed fields
    private boolean canBeModified;
    private boolean isOverdue;
    private int workingDaysRequested;
}